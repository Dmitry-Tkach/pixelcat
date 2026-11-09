import Phaser from 'phaser';
import { GAME } from '../config/gameConfig.js';
import { ADVENTURE_LEVELS, adventureKey } from '../data/adventure/index.js';
import { animKey } from '../data/characters.js';
import { Cat } from '../entities/Cat.js';
import { InputController } from '../input/InputController.js';
import { MAX_FALL_SPEED, ONE_WAY, TILE, TILE_BIAS, readAdventureMap } from '../systems/adventureMap.js';
import { Effects } from '../ui/Effects.js';

const HERO = 'battleCat';
// reach: how far from a ladder's middle it can be grabbed. standStill: slower than this, the cat counts
// as standing at a ladder, so Down climbs down it rather than sliding past.
const CLIMB = { speed: 250, sideSpeed: 110, snap: 0.25, reach: 26, standStill: 60 };
const HURT = { invulnerableMs: 1300, knockX: 330, knockY: -640, blinkMs: 90 };
const PENALTY = { speedMultiplier: 0.6, durationMs: 600 };
const FALL_OUT_BELOW = 160; // below the bottom of the map, the cat has fallen out
const CAMERA = { lerp: 0.12, deadzoneW: 180, deadzoneH: 130, aheadY: 40 };
const BACKGROUND_DRIFT = { far: 0.12, near: 0.3 };
const SPIKE_HIT = { w: 52, h: 20 };
const BONUS_COINS = 3;
const CHEST_COINS = 5;
const END_SCREEN_MS = 1100;
const HUD_STYLE = { fontFamily: 'Fredoka, sans-serif', fontSize: '26px', fontStyle: '600', color: '#ffffff', stroke: '#1e2a4a', strokeThickness: 6 };

// An adventure level: the battle cat runs, jumps and climbs through a tile map, forward and upward,
// collecting coins and crystals, to the portal at the end. See data/adventure for the levels.
export class AdventureScene extends Phaser.Scene {
  constructor() {
    super('Adventure');
  }

  init({ levelIndex = 0 } = {}) {
    this.levelIndex = levelIndex;
    this.level = ADVENTURE_LEVELS[levelIndex];
  }

  create() {
    const { level } = this;
    this.overlay = this.registry.get('overlay');
    this.audio = this.registry.get('audio');
    this.effects = new Effects(this);
    this.art = (name) => adventureKey(level.world, name);
    this.layout = readAdventureMap(level.map);
    this.worldW = this.layout.cols * TILE;
    this.worldH = this.layout.rows * TILE;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH + FALL_OUT_BELOW * 2);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.physics.world.TILE_BIAS = TILE_BIAS;

    this.buildBackground();
    this.buildTiles();
    this.buildLadders();
    this.buildScenery();
    this.buildObjects();

    const start = this.layout.objects.find((o) => o.type === 'start');
    this.respawnAt = this.cellFeet(start);
    this.cat = new Cat(this, this.respawnAt.x, level.cat.speed, { character: HERO, y: this.respawnAt.y - 80 });
    this.cat.moveMode = 'free';
    this.cat.startRunning();
    this.cat.body.setMaxVelocityY(MAX_FALL_SPEED);
    this.physics.add.collider(this.cat, this.groundLayer, null, (cat, tile) => this.landsOn(tile), this);
    this.physics.add.collider(this.cat, this.solids, (cat, block) => this.bumpInto(block));
    this.physics.add.overlap(this.cat, this.pickups, (cat, item) => this.collect(item));
    this.physics.add.overlap(this.cat, this.spikes, (cat, spike) => this.hurt(spike.x));
    this.physics.add.overlap(this.cat, this.lanterns, (cat, lantern) => this.reachCheckpoint(lantern));
    this.physics.add.overlap(this.cat, this.portalZone, () => this.complete());
    this.physics.add.overlap(this.cat, this.chests, (cat, chest) => this.openChest(chest));

    this.hearts = level.hearts;
    this.coins = 0;
    this.gems = 0;
    this.hasKey = false;
    this.chestsOpened = 0;
    this.climbing = false;
    this.hurtMs = 0;
    this.playing = true;
    this.buildHud();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.setRoundPixels(true);
    cam.startFollow(this.cat, true, CAMERA.lerp, CAMERA.lerp, 0, CAMERA.aheadY);
    cam.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);
    cam.setBackgroundColor(level.sky ?? '#8fd18f');

    this.climbKeys = this.input.keyboard.addKeys({ up: 'UP', w: 'W', down: 'DOWN', s: 'S' });
    this.controls = new InputController(this, {
      onJump: (key) => this.jump(key),
      onSlide: (key) => this.slide(key),
      onPause: () => this.togglePause(),
    });

    const resize = () => this.fitToScreen();
    this.scale.on('resize', resize);
    this.events.once('shutdown', () => this.scale.off('resize', resize));
    this.fitToScreen();
    this.overlay.hide();
    this.startMusicSoon();
  }

  // Browsers only allow sound after a key press or a click, so the music waits for the first one.
  startMusicSoon() {
    if (this.audio.ctx) {
      this.audio.startMusic(this.level.music);
      return;
    }
    const start = () => {
      this.audio.unlock();
      if (this.playing) this.audio.startMusic(this.level.music);
    };
    this.input.keyboard.once('keydown', start);
    this.input.once('pointerdown', start);
  }

  // ----- Building the level -----

  buildBackground() {
    const layer = (name, depth) => this.add.tileSprite(0, 0, GAME.WIDTH, GAME.HEIGHT, this.art(name)).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.backFar = layer('back-far', -10);
    this.backNear = layer('back-near', -9);
  }

  buildTiles() {
    const map = this.make.tilemap({ data: this.layout.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', this.art('tiles'), TILE, TILE, 0, 0);
    this.groundLayer = map.createLayer(0, tileset, 0, 0).setDepth(2);
    this.groundLayer.setCollisionByExclusion([-1]);
    // Islands and bridges are only solid on top: the cat jumps up through them and lands on them.
    this.groundLayer.forEachTile((tile) => {
      if (ONE_WAY.has(tile.index)) tile.setCollision(false, false, true, false, false);
    });
  }

  buildLadders() {
    this.ladderCells = new Set(this.layout.ladders.map(({ col, row }) => `${col},${row}`));
    for (const { col, row } of this.layout.ladders) {
      this.add.image(col * TILE + TILE / 2, row * TILE, this.art('ladder')).setOrigin(0.5, 0).setDepth(3);
    }
  }

  buildScenery() {
    for (const { texture, col, row } of this.layout.scenery) {
      const x = col * TILE + TILE / 2;
      if (texture === 'roots') {
        // Roots hang from the bottom of the island above.
        this.add.image(x, row * TILE - 6, this.art('roots')).setOrigin(0.5, 0).setDepth(1);
      } else {
        this.add.image(x, (row + 1) * TILE + 4, this.art(texture)).setOrigin(0.5, 1).setDepth(1.5);
      }
    }
  }

  // The middle of a cell's floor, where things stand.
  cellFeet({ col, row }) {
    return { x: col * TILE + TILE / 2, y: (row + 1) * TILE };
  }

  buildObjects() {
    this.pickups = [];
    this.solids = [];
    this.spikes = [];
    this.lanterns = [];
    this.chests = [];
    this.totals = { coins: 0, gems: 0 };
    for (const object of this.layout.objects) {
      const { x, y } = this.cellFeet(object);
      const middle = y - TILE / 2;
      switch (object.type) {
        case 'coin': {
          const coin = this.physics.add.staticSprite(x, middle, this.art('coin-1')).play(adventureKey(this.level.world, 'coin-spin'));
          coin.body.setCircle(18, (coin.width - 36) / 2, (coin.height - 36) / 2);
          coin.kind = 'coin';
          this.pickups.push(coin);
          this.totals.coins += 1;
          break;
        }
        case 'gem':
        case 'heart':
        case 'key': {
          const item = this.physics.add.staticImage(x, middle, this.art(object.type)).setDepth(4);
          item.kind = object.type;
          this.tweens.add({ targets: item, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.pickups.push(item);
          if (object.type === 'gem') this.totals.gems += 1;
          break;
        }
        case 'bonus':
        case 'box':
        case 'stone': {
          const block = this.physics.add.staticImage(x, middle, this.art(object.type)).setDepth(3);
          block.kind = object.type;
          this.solids.push(block);
          break;
        }
        case 'spike': {
          // Only the points hurt: a low zone, narrower than the picture.
          this.add.image(x, y, this.art('spike')).setOrigin(0.5, 1).setDepth(3);
          const zone = this.add.zone(x, y - SPIKE_HIT.h / 2, SPIKE_HIT.w, SPIKE_HIT.h);
          this.physics.add.existing(zone, true);
          this.spikes.push(zone);
          break;
        }
        case 'checkpoint': {
          const lantern = this.physics.add.staticImage(x, y + 4, this.art('lantern')).setOrigin(0.5, 1).setDepth(3);
          lantern.refreshBody();
          lantern.respawn = { x, y };
          this.lanterns.push(lantern);
          break;
        }
        case 'chest': {
          const chest = this.physics.add.staticImage(x, y + 2, this.art('chest-locked')).setOrigin(0.5, 1).setDepth(3);
          chest.refreshBody();
          this.chests.push(chest);
          break;
        }
        case 'portal': {
          const portal = this.add.image(x, y + 6, this.art('portal')).setOrigin(0.5, 1).setDepth(3);
          this.tweens.add({ targets: portal, alpha: 0.8, duration: 900, yoyo: true, repeat: -1 });
          this.portalZone = this.add.zone(x, y - 60, 70, 110);
          this.physics.add.existing(this.portalZone, true);
          break;
        }
        default:
          break;
      }
    }
  }

  buildHud() {
    const fixed = (object) => object.setScrollFactor(0).setDepth(100);
    this.heartIcons = Array.from({ length: this.level.hearts }, (_, i) => fixed(this.add.image(34 + i * 44, 36, this.art('heart'))).setScale(0.75));
    fixed(this.add.image(38, 84, this.art('coin-1'))).setScale(0.75);
    this.coinText = fixed(this.add.text(62, 84, '0', HUD_STYLE).setOrigin(0, 0.5));
    fixed(this.add.image(150, 84, this.art('gem'))).setScale(0.75);
    this.gemText = fixed(this.add.text(172, 84, `0/${this.totals.gems}`, HUD_STYLE).setOrigin(0, 0.5));
    this.keyIcon = fixed(this.add.image(272, 84, this.art('key'))).setScale(0.8).setAlpha(0.3);
    this.hint = fixed(this.add.text(GAME.WIDTH / 2, 150, '', { ...HUD_STYLE, fontSize: '30px', align: 'center' }).setOrigin(0.5));
    this.showHint(`${this.level.title}\nRun, jump and climb up to the portal.\nDown + Space drops through an island`, 3600);
  }

  showHint(text, ms = 2200) {
    this.hint.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.hint);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: ms, duration: 400 });
  }

  updateHud() {
    this.heartIcons.forEach((icon, i) => icon.setAlpha(i < this.hearts ? 1 : 0.25));
    this.coinText.setText(String(this.coins));
    this.gemText.setText(`${this.gems}/${this.totals.gems}`);
    this.keyIcon.setAlpha(this.hasKey ? 1 : 0.3);
  }

  fitToScreen() {
    this.backFar.setSize(GAME.WIDTH, GAME.HEIGHT);
    this.backNear.setSize(GAME.WIDTH, GAME.HEIGHT);
    this.hint.setX(GAME.WIDTH / 2);
  }

  // ----- Moving -----

  // Islands hold the cat only when it's coming down onto them, not while it climbs or drops through.
  landsOn(tile) {
    if (!ONE_WAY.has(tile.index)) return true;
    if (this.climbing || this.cat.isDropping) return false;
    if (this.cat.body.bottom <= tile.pixelY + 12) this.cat.onPlatform = true;
    return true;
  }

  // The ladder cell the cat is in front of, or the one just under its feet, if any.
  ladderNear(below = false) {
    const { body } = this.cat;
    const col = Math.floor(body.center.x / TILE);
    if (Math.abs(body.center.x - (col * TILE + TILE / 2)) > CLIMB.reach) return null;
    const rows = below
      ? [Math.floor((body.bottom + 2) / TILE)]
      : Array.from({ length: Math.floor((body.bottom - 1) / TILE) - Math.floor(body.top / TILE) + 1 }, (_, i) => Math.floor(body.top / TILE) + i);
    const row = rows.find((r) => this.ladderCells.has(`${col},${r}`));
    return row === undefined ? null : { col, row, x: col * TILE + TILE / 2 };
  }

  // The top of the ladder in this column, as a world y.
  ladderTop(col, row) {
    let top = row;
    while (this.ladderCells.has(`${col},${top - 1}`)) top -= 1;
    return top * TILE;
  }

  get upHeld() {
    return this.climbKeys.up.isDown || this.climbKeys.w.isDown;
  }

  get downHeld() {
    return this.climbKeys.down.isDown || this.climbKeys.s.isDown;
  }

  jump(key) {
    if (!this.playing) return;
    if (this.climbing) {
      if (key === 'space') {
        this.stopClimbing();
        this.cat.startJump();
      }
      return;
    }
    // Up in front of a ladder climbs it.
    if (key === 'up' && this.ladderNear()) {
      this.startClimbing();
      return;
    }
    // Holding Down and pressing Space on an island drops through it.
    if (key === 'space' && this.downHeld && this.cat.onGround && this.cat.onPlatform) {
      this.cat.requestSlide();
      return;
    }
    this.cat.requestJump();
  }

  slide(key) {
    if (!this.playing || this.climbing) return;
    // Down while standing at the top of a ladder climbs down it. Running past one, Down slides, so a
    // ladder through the middle of an island doesn't catch the cat.
    const standing = Math.abs(this.cat.moveVelocity) < CLIMB.standStill;
    if (key === 'down' && standing && this.cat.onGround && this.ladderNear(true)) {
      this.startClimbing();
      return;
    }
    // On the ground or an island, Down slides. In the main game it drops through ledges, but here
    // the cat stands on islands most of the time, so dropping takes Down and Space together.
    if (this.cat.onGround) this.cat.beginSlide();
    else this.cat.requestSlide(); // in the air: a dive
  }

  startClimbing() {
    this.climbing = true;
    this.cat.endSlide();
    this.cat.body.setAllowGravity(false);
    this.cat.setVelocity(0, 0);
    this.cat.moveVelocity = 0;
    this.cat.play(animKey(HERO, 'fall'), true);
  }

  stopClimbing() {
    this.climbing = false;
    this.cat.body.setAllowGravity(true);
  }

  updateClimbing() {
    const ladder = this.ladderNear() ?? this.ladderNear(true);
    if (!ladder) {
      this.stopClimbing();
      return;
    }
    const direction = (this.downHeld ? 1 : 0) - (this.upHeld ? 1 : 0);
    const steer = this.controls.steer;
    this.cat.setVelocity(steer * CLIMB.sideSpeed, direction * CLIMB.speed);
    if (steer === 0) this.cat.x += (ladder.x - this.cat.body.center.x) * CLIMB.snap;
    else this.cat.setFlipX(steer < 0);
    // Off the top: it steps onto the island there. Off the bottom: it stands on the ground.
    if (direction < 0 && this.cat.body.bottom < this.ladderTop(ladder.col, ladder.row) - 2) this.stopClimbing();
    else if (direction > 0 && this.cat.body.blocked.down) this.stopClimbing();
  }

  // ----- Things happening -----

  collect(item) {
    if (!item.active) return;
    item.disableBody(true, false);
    const { x, y } = item;
    if (item.kind === 'coin') {
      this.coins += 1;
      this.audio.playSfx('treat');
    } else if (item.kind === 'gem') {
      this.gems += 1;
      this.audio.playSfx('pawPickup');
      this.effects.sparkle(x, y);
    } else if (item.kind === 'heart') {
      this.hearts = Math.min(this.level.hearts, this.hearts + 1);
      this.audio.playSfx('pawPickup');
    } else if (item.kind === 'key') {
      this.hasKey = true;
      this.audio.playSfx('pawPickup');
      this.showHint('You found the key! Now find the chest');
    }
    this.tweens.killTweensOf(item);
    this.tweens.add({ targets: item, y: y - 40, alpha: 0, scale: 1.3, duration: 260, onComplete: () => item.destroy() });
    this.updateHud();
  }

  // A ? block gives coins when the cat jumps into it from below.
  bumpInto(block) {
    if (block.kind !== 'bonus' || block.used) return;
    if (!this.cat.body.blocked.up || this.cat.body.top < block.body.bottom - 8) return;
    block.used = true;
    block.setTexture(this.art('bonus-used'));
    this.audio.playSfx('bump');
    this.tweens.add({ targets: block, y: block.y - 10, duration: 80, yoyo: true });
    for (let i = 0; i < BONUS_COINS; i++) {
      const coin = this.add.sprite(block.x, block.y - TILE / 2, this.art('coin-1')).play(adventureKey(this.level.world, 'coin-spin')).setDepth(4);
      this.tweens.add({ targets: coin, y: coin.y - 70 - i * 18, alpha: 0, delay: i * 90, duration: 420, onComplete: () => coin.destroy() });
    }
    this.coins += BONUS_COINS;
    this.updateHud();
  }

  openChest(chest) {
    if (chest.opened) return;
    if (!this.hasKey) {
      if (!chest.hinted) this.showHint('Locked. Find the key!');
      chest.hinted = true;
      return;
    }
    chest.opened = true;
    chest.setTexture(this.art('chest-open'));
    this.coins += CHEST_COINS;
    this.chestsOpened += 1;
    this.audio.playSfx('cheer');
    this.effects.confetti(chest.x, chest.y - 50);
    this.showHint(`Treasure! +${CHEST_COINS} coins`);
    this.updateHud();
  }

  reachCheckpoint(lantern) {
    if (lantern.lit) return;
    lantern.lit = true;
    this.respawnAt = lantern.respawn;
    this.audio.playSfx('checkpoint');
    this.effects.sparkle(lantern.x, lantern.y - 50);
    this.showHint('Checkpoint');
  }

  hurt(fromX) {
    if (this.hurtMs > 0 || !this.playing) return;
    this.loseHeart();
    if (!this.playing) return;
    const away = this.cat.x < fromX ? -1 : 1;
    if (this.climbing) this.stopClimbing();
    this.cat.applyPenalty(PENALTY);
    this.cat.moveVelocity = away * HURT.knockX;
    this.cat.setVelocity(away * HURT.knockX, HURT.knockY);
  }

  fellOut() {
    this.loseHeart();
    if (!this.playing) return;
    if (this.climbing) this.stopClimbing();
    this.cat.body.reset(this.respawnAt.x, this.respawnAt.y - 80);
    this.cat.moveVelocity = 0;
    this.cameras.main.flash(200, 255, 255, 255);
  }

  loseHeart() {
    this.hearts -= 1;
    this.hurtMs = HURT.invulnerableMs;
    this.audio.playSfx('hit');
    this.cameras.main.shake(160, 0.008);
    this.updateHud();
    if (this.hearts <= 0) this.gameOver();
  }

  complete() {
    if (!this.playing) return;
    this.endPlay();
    this.audio.stopMusic();
    this.audio.playSfx('escape');
    this.effects.confetti(this.cat.x, this.cat.y - 60);
    this.cat.play(animKey(HERO, 'victory'), true);
    this.time.delayedCall(END_SCREEN_MS, () => this.showEnd('Level complete!'));
  }

  gameOver() {
    this.endPlay();
    this.audio.stopMusic();
    this.cat.play(animKey(HERO, 'caught'), true);
    this.time.delayedCall(END_SCREEN_MS, () => this.showEnd('Out of hearts'));
  }

  endPlay() {
    this.playing = false;
    this.climbing = false;
    this.cat.body.setAllowGravity(true);
    this.cat.setVelocityX(0);
    this.cat.moveVelocity = 0;
  }

  showEnd(title) {
    const chest = this.chests.length ? `, treasure ${this.chestsOpened}/${this.chests.length}` : '';
    this.overlay.show({
      title,
      message: `Coins ${this.coins}, crystals ${this.gems}/${this.totals.gems}${chest}`,
      actions: [
        { label: 'Play again', primary: true, onClick: () => this.scene.restart({ levelIndex: this.levelIndex }) },
        { label: 'Back to Cat Escape', onClick: () => this.scene.start('Game', {}) },
      ],
    });
  }

  togglePause() {
    if (!this.playing && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.playing = false;
      this.physics.pause();
      this.anims.pauseAll();
      this.controls.releaseSteering();
      this.audio.pauseMusic();
      this.overlay.show({
        title: 'Paused',
        actions: [
          { label: 'Resume', primary: true, onClick: () => this.togglePause() },
          { label: 'Restart', onClick: () => this.scene.restart({ levelIndex: this.levelIndex }) },
          { label: 'Back to Cat Escape', onClick: () => this.scene.start('Game', {}) },
        ],
      });
    } else {
      this.overlay.hide();
      this.physics.resume();
      this.anims.resumeAll();
      this.audio.resumeMusic();
      this.playing = true;
    }
  }

  update(time, delta) {
    const cam = this.cameras.main;
    this.backFar.tilePositionX = cam.scrollX * BACKGROUND_DRIFT.far;
    this.backNear.tilePositionX = cam.scrollX * BACKGROUND_DRIFT.near;
    if (!this.playing) return;
    const ms = Math.min(delta, 50);
    this.controls.update(time);
    this.hurtMs = Math.max(0, this.hurtMs - ms);
    this.cat.setAlpha(this.hurtMs > 0 && Math.floor(this.hurtMs / HURT.blinkMs) % 2 ? 0.35 : 1);
    if (this.climbing) {
      this.updateClimbing();
    } else {
      this.cat.move(this.controls.steer);
      this.cat.tick(ms);
      // Holding Up as the cat reaches a ladder grabs it.
      if (this.upHeld && this.ladderNear()) this.startClimbing();
    }
    if (this.cat.body.top > this.worldH + FALL_OUT_BELOW) this.fellOut();
  }
}
