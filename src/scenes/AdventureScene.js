import Phaser from 'phaser';
import { GAME, MOVEMENT } from '../config/gameConfig.js';
import { ADVENTURE_HERO, ADVENTURE_LEVELS, PILLAR, adventureKey } from '../data/adventure/index.js';
import { CHARACTERS, animKey } from '../data/characters.js';
import { AMMO } from '../data/adventure/ammo.js';
import { FLASH, FLASH_KEY } from '../data/adventure/gunners.js';
import { BOSS_FIGHTS } from '../data/adventure/bossFights.js';
import { AdventureBoss } from '../entities/AdventureBoss.js';
import { AdventureEnemy } from '../entities/AdventureEnemy.js';
import { AdventureGunner } from '../entities/AdventureGunner.js';
import { Cat } from '../entities/Cat.js';
import { InputController } from '../input/InputController.js';
import { AdventureMoves } from '../systems/AdventureMoves.js';
import { AdventurePlatforms } from '../systems/AdventurePlatforms.js';
import { MAX_FALL_SPEED, ONE_WAY, TILE, TILE_BIAS, pillarFoot, readAdventureMap } from '../systems/adventureMap.js';
import { AdventureBossBar } from '../ui/AdventureBossBar.js';
import { Effects } from '../ui/Effects.js';

// reach: how far from a ladder's middle it can be grabbed. standStill: slower than this, the cat counts
// as standing at a ladder, so Down climbs down it rather than sliding past.
const CLIMB = { speed: 250, sideSpeed: 110, snap: 0.25, reach: 26, standStill: 60 };
// Pulling himself up onto the island at a ladder's top. It starts with his feet this far below the
// island's top, scaled to his size. He's drawn behind the island (depth: under the ground's 2) while
// he hoists himself up over the first riseFrames frames; the rest show him on top.
const CLIMB_UP = { below: 50, depth: 1.9, riseFrames: 2 };
const HURT = { invulnerableMs: 1300, knockX: 330, knockY: -640, blinkMs: 90 };
const PENALTY = { speedMultiplier: 0.6, durationMs: 600 };
const FALL_OUT_BELOW = 160; // below the bottom of the map, the cat has fallen out
const CAMERA = { lerp: 0.12, deadzoneW: 120, deadzoneH: 70 };
// Where the camera looks, from the cat, so the player sees where he's going and where he'd land:
//   below: normally a little below him, as what's beneath is what's dangerous
//   above: while he climbs a ladder up, above him instead
//   peek: standing still by an island's edge, well below him, to show where he'd land
//   ahead: this far in front of him, the way he runs or faces
//   stillMs: how long he stands by an edge before the camera peeks over. easeMs: how quickly it turns.
const LOOK = { below: 110, above: 120, peek: 250, ahead: 160, runningFrom: 120, stillMs: 350, easeMs: 300, edgeCells: 2 };
const BACKGROUND_DRIFT = { far: 0.12, near: 0.3 };
const SPIKE_HIT = { w: 52, h: 20 };
const BONUS_COINS = 3;
const CHEST_COINS = 5;
// The silver chest, for whoever finds its key off the main route: more coins, and explosive rounds.
const SILVER_CHEST = { coins: 8, ammo: 'explosive' };
// Landing on an enemy: the cat counts as coming from above if its feet were no lower than this
// below the enemy's top a step earlier, and it bounces off this fast.
const STOMP = { margin: 14, bounce: -760 };
// The gunners' bullets: how far they fly before fading, their hitbox, and how big their flash is.
const ENEMY_BULLET = { range: 14 * TILE, size: 14, depth: 5 };
const END_SCREEN_MS = 1100;
const STARS = 3; // a level's stars are its crystals, up to this many
const BEAM_PIPS = { x: 98, y: 128, gap: 26, r: 8 };
const AMMO_HUD = { x: 44, y: 166, textGap: 34 };
// An earth pillar starts this far up inside the island it holds, and stands this far into the ground.
const PILLAR_FIT = { underIsland: 6, intoGround: 6, depth: 1 };
const HUD_STYLE = { fontFamily: 'Fredoka, sans-serif', fontSize: '26px', fontStyle: '600', color: '#ffffff', stroke: '#1e2a4a', strokeThickness: 6 };

// An adventure level: the battle cat runs, jumps and climbs through a tile map, forward and upward,
// collecting coins and crystals, to the portal at the end. See data/adventure for the levels.
export class AdventureScene extends Phaser.Scene {
  constructor() {
    super('Adventure');
  }

  // A level from the road map by its place in ADVENTURE_LEVELS, or one given whole, such as a boss's
  // test arena (data/adventure/bossArenas.js).
  init({ levelIndex = 0, level = null } = {}) {
    this.levelIndex = level ? -1 : levelIndex;
    this.level = level ?? ADVENTURE_LEVELS[levelIndex];
    this.restartData = level ? { level } : { levelIndex };
  }

  create() {
    const { level } = this;
    this.overlay = this.registry.get('overlay');
    this.audio = this.registry.get('audio');
    this.screenFx = this.registry.get('screenFx');
    this.screenFx?.reveal(); // the home screen covered over to come here
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
    this.cat = new Cat(this, this.respawnAt.x, level.cat.speed, { character: ADVENTURE_HERO.character, y: this.respawnAt.y - 80 });
    this.cat.setScale(this.cat.scaleX * ADVENTURE_HERO.scale);
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
    this.physics.add.collider(this.enemies, this.groundLayer);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.overlap(this.cat, this.enemies, (cat, enemy) => this.meetEnemy(enemy));
    // The gunners' bullets fly through islands, but not the ground, and hurt the cat.
    this.enemyBullets = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.enemyBullets, this.groundLayer, (bullet) => bullet.destroy(), (bullet, tile) => !ONE_WAY.has(tile.index));
    // Against a list of blocks, Phaser passes the block first, so the bullet is the one in the group.
    this.physics.add.collider(this.enemyBullets, this.solids, (a, b) => (this.enemyBullets.contains(a) ? a : b).destroy());
    this.physics.add.overlap(this.cat, this.enemyBullets, (cat, bullet) => this.shotByGunner(bullet));
    this.platforms = new AdventurePlatforms(this, this.cat, {
      art: this.art,
      movers: level.movers,
      leaves: this.layout.objects.filter((o) => o.type === 'leaves'),
      canLand: () => !this.climbing && !this.pullingUp,
    });
    this.moves = new AdventureMoves(this, this.cat, {
      art: this.art,
      groundLayer: this.groundLayer,
      solids: this.solids,
      enemies: this.enemies,
      onKnockOut: (enemy) => this.knockOut(enemy),
      onNoWeapon: () => this.showHint('No weapon yet: find the minigun!'),
      onAmmo: (message) => {
        if (message) this.showHint(message, 1400);
        this.updateHud();
      },
    });

    if (level.boss) this.buildBoss();

    this.hearts = level.hearts;
    this.coins = 0;
    this.gems = 0;
    this.hasKey = false;
    this.hasSilverKey = false;
    this.chestsOpened = 0;
    this.knockedOut = 0;
    this.climbing = false;
    this.pullingUp = false;
    this.hurtMs = 0;
    this.playing = true;
    this.buildHud();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldW, this.worldH);
    cam.setRoundPixels(true);
    cam.startFollow(this.cat, true, CAMERA.lerp, CAMERA.lerp, 0, -LOOK.below);
    this.look = { x: 0, y: -LOOK.below, edgeMs: 0 };
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
        this.buildPillar(col, row);
      } else {
        this.add.image(x, (row + 1) * TILE + 4, this.art(texture)).setOrigin(0.5, 1).setDepth(1.5);
      }
    }
  }

  // An earth pillar holding up a low island above this cell, down to the ground or island below it:
  // its cap, as many copies of its middle as fit (every other one upside down, so they join, and an
  // odd number, so the last meets the base), squeezed or stretched a little to fill the height, and
  // its base. Under a high island, or over a pit, there's none: a long one looks wrong.
  buildPillar(col, row) {
    const x = col * TILE + TILE / 2;
    const top = row * TILE - PILLAR_FIT.underIsland;
    const below = pillarFoot(this.layout.tiles, col, row);
    if (below === null) return;
    const bottom = below * TILE + PILLAR_FIT.intoGround;
    const capH = PILLAR.middleFrom - PILLAR.capFrom;
    const segmentH = PILLAR.baseFrom - PILLAR.middleFrom;
    const baseH = PILLAR.height - PILLAR.baseFrom;
    const middle = Math.max(segmentH / 2, bottom - top - capH - baseH);
    let count = Math.max(1, Math.round(middle / segmentH));
    if (count % 2 === 0) count += 1;
    const each = middle / count;
    for (let i = 0; i < count; i++) {
      const segment = this.add.image(x, top + capH + i * each, this.art('pillar-middle')).setOrigin(0.5, 0).setFlipY(i % 2 === 1).setDepth(PILLAR_FIT.depth);
      segment.setDisplaySize(segment.width, each + 1); // a pixel over, so no seam shows
    }
    this.add.image(x, top, this.art('pillar-cap')).setOrigin(0.5, 0).setDepth(PILLAR_FIT.depth);
    this.add.image(x, bottom, this.art('pillar-base')).setOrigin(0.5, 1).setDepth(PILLAR_FIT.depth);
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
    // A physics group: only those take part in collisions, and one that's knocked out and gone leaves
    // the colliders by itself. The world has no gravity (the cat brings his own), so the group gives
    // each enemy his, to stand on the ground and find its edges.
    this.enemies = this.physics.add.group({ gravityY: MOVEMENT.GRAVITY, maxVelocityY: MAX_FALL_SPEED });
    this.totals = { coins: 0, gems: 0, enemies: 0 };
    const spikeCells = new Set(this.layout.objects.filter((o) => o.type === 'spike').map(({ col, row }) => `${col},${row}`));
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
        case 'key':
        case 'silver-key':
        case 'rage':
        case 'weapon':
        case 'ammo-standard':
        case 'ammo-explosive':
        case 'ammo-laser': {
          const texture = { rage: 'mushroom', weapon: 'minigun' }[object.type] ?? object.type;
          const item = this.physics.add.staticImage(x, middle, this.art(texture)).setDepth(4);
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
        case 'chest':
        case 'silver-chest': {
          const silver = object.type === 'silver-chest';
          const chest = this.physics.add.staticImage(x, y + 2, this.art(silver ? 'chest-silver-locked' : 'chest-locked')).setOrigin(0.5, 1).setDepth(3);
          chest.silver = silver;
          chest.refreshBody();
          this.chests.push(chest);
          break;
        }
        case 'enemy': {
          const enemy = new AdventureEnemy(this, x, y, object.kind, { groundLayer: this.groundLayer, isSpike: (px, py) => spikeCells.has(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`) });
          enemy.on('swipe', () => {
            if (enemy.swipeLands(this.cat) && !this.moves.isRaging) this.hurt(enemy.x);
          });
          this.enemies.add(enemy);
          this.totals.enemies += 1;
          break;
        }
        case 'gunner': {
          const gunner = new AdventureGunner(this, x, y, object.kind, {
            groundLayer: this.groundLayer,
            fire: (from, bx, by, angle) => this.fireAtCat(from, bx, by, angle),
          });
          this.enemies.add(gunner);
          this.totals.enemies += 1;
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

  // The level's boss, standing on the floor at his column, with his health bar. Beating him finishes
  // the level. His shock waves stop at the arena's walls, its first and last open columns.
  buildBoss() {
    const { kind, col, arena } = this.level.boss;
    // The floor: the top of the ground at the bottom of his column, under any islands.
    const { tiles } = this.layout;
    let row = this.layout.rows - 1;
    while (row > 0 && tiles[row - 1][col] >= 0) row -= 1;
    this.boss = new AdventureBoss(this, {
      kind,
      x: col * TILE + TILE / 2,
      feetY: row * TILE,
      cat: this.cat,
      arena: { left: arena.left * TILE, right: (arena.right + 1) * TILE },
      onHurtCat: (fromX) => this.hurt(fromX),
      onDefeated: () => this.complete(),
    });
    this.moves.setBoss(this.boss);
    this.bossBar = new AdventureBossBar(this, { name: this.boss.name, marks: BOSS_FIGHTS[kind].phases.slice(1).map((phase) => phase.from) });
    this.boss.start();
  }

  buildHud() {
    const fixed = (object) => object.setScrollFactor(0).setDepth(100);
    this.heartIcons = Array.from({ length: this.level.hearts }, (_, i) => fixed(this.add.image(34 + i * 44, 36, this.art('heart'))).setScale(0.75));
    fixed(this.add.image(38, 84, this.art('coin-1'))).setScale(0.75);
    this.coinText = fixed(this.add.text(62, 84, '0', HUD_STYLE).setOrigin(0, 0.5));
    fixed(this.add.image(150, 84, this.art('gem'))).setScale(0.75);
    this.gemText = fixed(this.add.text(172, 84, `0/${this.totals.gems}`, HUD_STYLE).setOrigin(0, 0.5));
    this.keyIcon = fixed(this.add.image(272, 84, this.art('key'))).setScale(0.8).setAlpha(0.3);
    // The silver key, only in levels with a silver chest.
    const silver = this.chests.some((chest) => chest.silver);
    this.silverKeyIcon = fixed(this.add.image(318, 84, this.art('silver-key'))).setScale(0.8).setAlpha(0.3).setVisible(silver);
    // The beam's charge: a pip for each enemy knocked out, up to a full beam.
    fixed(this.add.text(24, 128, 'BEAM', { ...HUD_STYLE, fontSize: '20px' }).setOrigin(0, 0.5));
    this.beamPips = fixed(this.add.graphics());
    this.drawBeamPips();
    // The minigun's rounds, once he has it: the kind he's firing and how many are left.
    this.ammoIcon = fixed(this.add.image(AMMO_HUD.x, AMMO_HUD.y, this.art('bullet'))).setVisible(false);
    this.ammoText = fixed(this.add.text(AMMO_HUD.x + AMMO_HUD.textGap, AMMO_HUD.y, '', { ...HUD_STYLE, fontSize: '22px' }).setOrigin(0, 0.5)).setVisible(false);
    this.hint = fixed(this.add.text(GAME.WIDTH / 2, 150, '', { ...HUD_STYLE, fontSize: '30px', align: 'center' }).setOrigin(0.5));
    this.showHint(this.level.hint ?? `${this.level.title}\nRun, jump and climb up to the portal\nShift dash · C beam · find the minigun to shoot`, 4200);
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
    this.silverKeyIcon.setAlpha(this.hasSilverKey ? 1 : 0.3);
    this.drawBeamPips();
    const { armed, ammo, rounds } = this.moves;
    const ammoDef = AMMO[ammo];
    const others = Object.keys(AMMO).filter((kind) => kind !== ammo && rounds[kind] > 0).length;
    this.ammoIcon.setVisible(armed).setTexture(this.art(ammoDef.bullet));
    this.ammoText.setVisible(armed).setColor(rounds[ammo] > 0 ? ammoDef.colour : '#ff6b6b')
      .setText(`${rounds[ammo]}${others ? '  Q: swap' : ''}`);
  }

  drawBeamPips() {
    const { charge } = this.moves;
    const full = this.moves.specialReady;
    this.beamPips.clear();
    for (let i = 0; i < this.moves.chargeNeeded; i++) {
      const x = BEAM_PIPS.x + i * BEAM_PIPS.gap;
      this.beamPips.fillStyle(0x1e2a4a, 1).fillCircle(x, BEAM_PIPS.y, BEAM_PIPS.r + 3);
      this.beamPips.fillStyle(i < charge ? (full ? 0x7fd8ff : 0x3f8cff) : 0x55627a, 1).fillCircle(x, BEAM_PIPS.y, BEAM_PIPS.r);
    }
  }

  fitToScreen() {
    this.backFar.setSize(GAME.WIDTH, GAME.HEIGHT);
    this.backNear.setSize(GAME.WIDTH, GAME.HEIGHT);
    this.hint.setX(GAME.WIDTH / 2);
    this.bossBar?.layout();
  }

  // ----- The camera -----

  // Whether there's no floor just ahead of where he stands, in the way he faces: an island's edge.
  atEdge() {
    const { body } = this.cat;
    const dir = this.cat.flipX ? -1 : 1;
    for (let cell = 1; cell <= LOOK.edgeCells; cell++) {
      const x = body.center.x + dir * cell * TILE * 0.6;
      if (this.groundLayer.getTileAtWorldXY(x, body.bottom + 8)) return false;
    }
    return true;
  }

  // Turns the camera, smoothly, to where the player needs to see: ahead as he runs, above as he
  // climbs, and over the edge when he stands at one, so a jump down is never blind.
  updateLook(ms) {
    const { cat, look } = this;
    const running = Math.abs(cat.moveVelocity) > LOOK.runningFrom;
    const standing = cat.onGround && !running && !this.climbing && !this.pullingUp;
    look.edgeMs = standing && this.atEdge() ? look.edgeMs + ms : 0;
    let y = -LOOK.below;
    if (this.climbing && this.upHeld) y = LOOK.above;
    else if (look.edgeMs > LOOK.stillMs) y = -LOOK.peek;
    // Ahead of him: the way he's running, or standing, the way he faces.
    const x = -(running ? Math.sign(cat.moveVelocity) : (cat.flipX ? -1 : 1)) * LOOK.ahead;
    const ease = 1 - Math.exp(-ms / LOOK.easeMs);
    look.x += (x - look.x) * ease;
    look.y += (y - look.y) * ease;
    this.cameras.main.setFollowOffset(look.x, look.y);
  }

  // ----- Moving -----

  // Islands hold the cat only when it's coming down onto them, not while it climbs or drops through.
  landsOn(tile) {
    if (!ONE_WAY.has(tile.index)) return true;
    if (this.climbing || this.pullingUp || this.cat.isDropping) return false;
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
    if (!this.playing || this.pullingUp || this.moves.isFiringSpecial) return;
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
    this.moves.endDash();
    this.cat.requestJump();
  }

  slide(key) {
    if (!this.playing || this.climbing || this.pullingUp || this.moves.isFiringSpecial) return;
    // Down while standing at the top of a ladder climbs down it. Running past one, Down slides, so a
    // ladder through the middle of an island doesn't catch the cat.
    const standing = Math.abs(this.cat.moveVelocity) < CLIMB.standStill;
    if (key === 'down' && standing && this.cat.onGround && this.ladderNear(true)) {
      this.startClimbing();
      return;
    }
    // On the ground or an island, Down slides. In the main game it drops through ledges, but here the
    // cat stands on islands most of the time, so it never drops through: it jumps or walks off.
    if (this.cat.onGround) this.cat.beginSlide();
    else this.cat.requestSlide(); // in the air: a dive
  }

  startClimbing() {
    this.climbing = true;
    this.cat.endSlide();
    this.cat.body.setAllowGravity(false);
    this.cat.setVelocity(0, 0);
    this.cat.moveVelocity = 0;
    this.cat.play(animKey(this.cat.character, 'climb'), true);
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
    // Climbing up or down has its own animation; holding still on the ladder, he hangs.
    const anim = direction === 0 && steer === 0 ? 'hang' : direction > 0 ? 'climbDown' : 'climb';
    this.cat.play(animKey(this.cat.character, anim), true);
    // Near the top: he pulls himself up onto the island. Off the bottom: he stands on the ground.
    const top = this.ladderTop(ladder.col, ladder.row);
    const ontoIsland = ONE_WAY.has(this.groundLayer.getTileAt(ladder.col, top / TILE)?.index);
    if (direction < 0 && ontoIsland && this.cat.body.bottom <= top + CLIMB_UP.below * this.cat.scaleY) this.startPullUp(top);
    else if (direction < 0 && this.cat.body.bottom < top - 2) this.stopClimbing();
    else if (direction > 0 && this.cat.body.blocked.down) this.stopClimbing();
  }

  // He hoists himself up from behind the island's edge while his climb-up plays, then stands on top.
  startPullUp(top) {
    this.climbing = false;
    this.pullingUp = true;
    this.cat.setVelocity(0, 0);
    this.cat.y += top + CLIMB_UP.below * this.cat.scaleY - this.cat.body.bottom;
    this.catDepth = this.cat.depth;
    this.cat.setDepth(CLIMB_UP.depth);
    this.cat.play(animKey(this.cat.character, 'climbUp'));
    const { frames, fps } = CHARACTERS[this.cat.character].anims.climbUp;
    this.pullUpTween = this.tweens.add({
      targets: this.cat, y: this.cat.y - CLIMB_UP.below * this.cat.scaleY,
      duration: (CLIMB_UP.riseFrames / fps) * 1000, ease: 'Sine.easeOut',
    });
    this.pullUpTimer = this.time.delayedCall((frames / fps) * 1000, () => {
      this.cat.body.reset(this.cat.x, this.cat.y + top - this.cat.body.bottom);
      this.endPullUp();
    });
  }

  endPullUp() {
    if (!this.pullingUp) return;
    this.pullUpTimer?.remove();
    this.pullUpTween?.remove();
    this.pullingUp = false;
    this.cat.setDepth(this.catDepth);
    this.cat.body.setAllowGravity(true);
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
    } else if (item.kind.startsWith('ammo-')) {
      this.moves.addAmmo(item.kind.slice('ammo-'.length));
      this.audio.playSfx('pawPickup');
    } else if (item.kind === 'weapon') {
      this.cat.changeCharacter(ADVENTURE_HERO.armed);
      this.moves.arm();
      this.audio.playSfx('cheer');
      this.effects.sparkle(x, y);
      this.showHint('The minigun! X to shoot, hold for a burst');
    } else if (item.kind === 'rage') {
      this.moves.startRage();
      this.showHint('RAGE!');
    } else if (item.kind === 'key') {
      this.hasKey = true;
      this.audio.playSfx('pawPickup');
      this.showHint('You found the key! Now find the chest');
    } else if (item.kind === 'silver-key') {
      this.hasSilverKey = true;
      this.audio.playSfx('pawPickup');
      this.showHint('A silver key! Somewhere there is a silver chest');
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

  // The gold chest takes the gold key, and the silver chest the silver one.
  openChest(chest) {
    if (chest.opened) return;
    if (!(chest.silver ? this.hasSilverKey : this.hasKey)) {
      if (!chest.hinted) this.showHint(chest.silver ? 'Locked. Find the silver key!' : 'Locked. Find the key!');
      chest.hinted = true;
      return;
    }
    chest.opened = true;
    chest.setTexture(this.art(chest.silver ? 'chest-silver-open' : 'chest-open'));
    this.chestsOpened += 1;
    this.audio.playSfx('cheer');
    this.effects.confetti(chest.x, chest.y - 50);
    if (chest.silver) {
      this.coins += SILVER_CHEST.coins;
      this.moves.addAmmo(SILVER_CHEST.ammo);
      this.showHint(`Silver treasure! +${SILVER_CHEST.coins} coins and explosive rounds`);
    } else {
      this.coins += CHEST_COINS;
      this.showHint(`Treasure! +${CHEST_COINS} coins`);
    }
    this.updateHud();
  }

  // Landing on an enemy knocks it out and bounces the cat up, unless it's spiky. Sliding or dashing
  // into one knocks it out too, and in a rage anything he touches is knocked out. Any other touch
  // hurts him.
  meetEnemy(enemy) {
    if (enemy.dead || !this.playing || this.moves.isFiringSpecial) return;
    const { body } = this.cat;
    const feetBefore = body.prev.y + body.height;
    const fromAbove = body.velocity.y > 0 && feetBefore <= enemy.body.top + STOMP.margin;
    if (this.moves.isRaging || this.moves.isDashing) {
      this.knockOut(enemy);
      this.audio.playSfx('smash');
    } else if (fromAbove && enemy.info.stompable) {
      this.knockOut(enemy);
      this.cat.bounce(STOMP.bounce);
      this.audio.playSfx('bounce');
    } else if (this.cat.isSliding && !fromAbove) {
      this.knockOut(enemy);
      this.audio.playSfx('smash');
    } else {
      this.hurt(enemy.x);
    }
  }

  // A gunner's shot, from its gun's end toward where the cat was, with a flash.
  fireAtCat(gunner, x, y, angle) {
    if (!this.playing) return;
    const bullet = this.enemyBullets.create(x, y, this.art('enemy-bullet')).setRotation(angle).setDepth(ENEMY_BULLET.depth);
    bullet.body.setSize(ENEMY_BULLET.size, ENEMY_BULLET.size);
    this.physics.velocityFromRotation(angle, gunner.info.bulletSpeed, bullet.body.velocity);
    bullet.startX = x;
    bullet.startY = y;
    const flash = this.add.sprite(x, y, FLASH_KEY, 'flash-0').setRotation(angle).setDepth(ENEMY_BULLET.depth + 1)
      .setOrigin(FLASH.origin.x / FLASH.size.w, FLASH.origin.y / FLASH.size.h);
    flash.play(FLASH_KEY).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => flash.destroy());
    this.audio.playSfx('shot');
  }

  // In a rage, or firing his beam, the shots don't hurt him.
  shotByGunner(bullet) {
    if (!bullet.active || !this.playing) return;
    this.effects.impact(bullet.x, bullet.y, 0.5);
    bullet.destroy();
    if (!this.moves.isRaging) this.hurt(bullet.x);
  }

  updateEnemyBullets() {
    for (const bullet of this.enemyBullets.getChildren().slice()) {
      if (Phaser.Math.Distance.Between(bullet.startX, bullet.startY, bullet.x, bullet.y) > ENEMY_BULLET.range) bullet.destroy();
    }
  }

  knockOut(enemy) {
    if (enemy.dead) return;
    this.effects.impact(enemy.x, enemy.body.center.y);
    enemy.knockOut();
    this.knockedOut += 1;
    if (this.moves.addCharge()) this.showHint('Beam ready! Press C');
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
    if (this.hurtMs > 0 || !this.playing || this.moves.isFiringSpecial) return;
    this.moves.endDash();
    this.endPullUp();
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
    this.moves.endDash();
    this.endPullUp();
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
    this.cat.play(animKey(this.cat.character, 'victory'), true);
    // Its stars are the crystals he found, kept with the adventure's progress. A test arena isn't
    // part of it.
    if (!this.level.test) this.registry.get('adventureProgress')?.record(this.level.id, Math.min(STARS, this.gems), this.coins);
    this.bossBar?.hide();
    const title = this.boss ? `You beat ${this.boss.name}!` : 'Level complete!';
    this.time.delayedCall(END_SCREEN_MS, () => this.showEnd(title, true));
  }

  gameOver() {
    this.endPlay();
    this.audio.stopMusic();
    this.cat.play(animKey(this.cat.character, 'caught'), true);
    this.time.delayedCall(END_SCREEN_MS, () => this.showEnd('Out of hearts'));
  }

  endPlay() {
    this.playing = false;
    this.moves.stop();
    this.endPullUp();
    this.climbing = false;
    this.cat.body.setAllowGravity(true);
    this.cat.setVelocityX(0);
    this.cat.moveVelocity = 0;
    for (const enemy of this.enemies.getChildren()) enemy.halt();
    this.boss?.halt();
    this.enemyBullets.clear(true, true);
  }

  showEnd(title, won = false) {
    const chest = this.chests.length ? `, treasure ${this.chestsOpened}/${this.chests.length}` : '';
    const next = this.level.test ? null : ADVENTURE_LEVELS[this.levelIndex + 1];
    this.overlay.show({
      title,
      message: `Coins ${this.coins}, crystals ${this.gems}/${this.totals.gems}${chest}, enemies ${this.knockedOut}/${this.totals.enemies}`,
      actions: [
        ...(won && next ? [{ label: 'Next level', primary: true, onClick: () => this.scene.restart({ levelIndex: this.levelIndex + 1 }) }] : []),
        { label: won ? 'Play again' : 'Try again', primary: !(won && next), onClick: () => this.scene.restart(this.restartData) },
        { label: 'Map', onClick: () => this.goHome('adventure') },
        { label: 'Home', onClick: () => this.goHome() },
      ],
    });
  }

  // Back to the adventure's home screen, or with `screen` 'adventure', to its road map.
  goHome(screen = 'adventure-home') {
    const leave = () => {
      this.anims.resumeAll();
      this.audio.stopMusic();
      this.overlay.hide();
      this.scene.start('Game', { screen });
    };
    if (this.screenFx) this.screenFx.cover(leave);
    else leave();
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
          { label: 'Restart', onClick: () => this.scene.restart(this.restartData) },
          { label: 'Map', onClick: () => this.goHome('adventure') },
          { label: 'Home', onClick: () => this.goHome() },
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
    } else if (!this.pullingUp) {
      this.cat.move(this.moves.isFiringSpecial ? 0 : this.controls.steer);
      this.cat.tick(ms);
      // Holding Up as the cat reaches a ladder grabs it.
      if (this.upHeld && this.ladderNear() && !this.moves.isFiringSpecial) this.startClimbing();
    }
    this.moves.update(ms, { canAct: !this.climbing && !this.pullingUp });
    for (const enemy of this.enemies.getChildren()) enemy.update(this.cat, ms);
    this.updateEnemyBullets();
    if (this.boss) {
      this.boss.update(ms);
      this.bossBar.update(ms, this.boss.brain.healthShare);
    }
    this.platforms.update(ms);
    this.updateLook(ms);
    if (this.cat.body.top > this.worldH + FALL_OUT_BELOW) this.fellOut();
  }
}
