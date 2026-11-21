import Phaser from 'phaser';
import { GAME, MOVEMENT } from '../config/gameConfig.js';
import { ADVENTURE_HERO, ADVENTURE_LEVELS, PILLAR, adventureArtKey, adventureArtWorld, adventureKey } from '../data/adventure/index.js';
import { CHARACTERS, animKey } from '../data/characters.js';
import { AMMO } from '../data/adventure/ammo.js';
import { isFrozen } from '../systems/adventure/iceBlocks.js';
import { spreadFire } from '../systems/adventure/burning.js';
import { AdventureAmmoBelt } from '../ui/AdventureAmmoBelt.js';
import { AdventureBackdrop } from '../systems/adventure/AdventureBackdrop.js';
import { BACKDROPS } from '../data/adventure/backdrop.js';
import { DECOR } from '../data/adventure/decor.js';
import { moodAt } from '../data/adventure/moods.js';
import { WATER } from '../data/adventure/water.js';
import { AdventureWater } from '../systems/adventure/AdventureWater.js';
import { cellRandom, placeDecor } from '../systems/adventure/decorPlacement.js';
import { TILE_VARIANTS, TILE_VARIANT_SHARE } from '../data/adventure/tileVariants.js';
import { AMBIENCE } from '../data/adventure/ambience.js';
import { AdventureAmbience } from '../systems/adventure/AdventureAmbience.js';
import { GATES } from '../data/adventure/gates.js';
import { AdventureGates } from '../systems/adventure/AdventureGates.js';
import { TRAPS } from '../data/adventure/traps.js';
import { AdventureTraps } from '../systems/adventure/AdventureTraps.js';
import { AdventureScenery } from '../systems/adventure/AdventureScenery.js';
import { AdventureBird } from '../entities/AdventureBird.js';
import { AdventureRootbreaker } from '../entities/AdventureRootbreaker.js';
import { devPlace } from '../systems/adventure/devPlaces.js';
import { atBoss, cellKey, restore, snapshot } from '../systems/adventure/bossRetry.js';
import { AdventureCameraShots } from '../systems/adventure/AdventureCameraShots.js';
import { FLASH, FLASH_KEY } from '../data/adventure/gunners.js';
import { BOSS_FIGHTS } from '../data/adventure/bossFights.js';
import { AdventureBoss } from '../entities/AdventureBoss.js';
import { AdventureBossArena } from '../entities/AdventureBossArena.js';
import { AdventureEnemy } from '../entities/AdventureEnemy.js';
import { AdventureGunner } from '../entities/AdventureGunner.js';
import { Cat } from '../entities/Cat.js';
import { InputController } from '../input/InputController.js';
import { AdventureMoves } from '../systems/AdventureMoves.js';
import { AdventurePlatforms } from '../systems/AdventurePlatforms.js';
import { MAX_FALL_SPEED, ONE_WAY, TILE, TILE_BIAS, pillarFoot, readAdventureMap } from '../systems/adventureMap.js';
import { bossTouch } from '../systems/adventure/bosses/bossTouch.js';
import { AdventureBossBar } from '../ui/AdventureBossBar.js';
import { addMenuButton, showGameMenu } from '../ui/adventureGameMenu.js';
import { Effects } from '../ui/Effects.js';
import { showDizzyStars } from '../systems/adventure/dizzyStars.js';
import { AdventureDrawbridges } from '../systems/adventure/AdventureDrawbridges.js';
import { AdventureFish } from '../systems/adventure/AdventureFish.js';
import { AdventureStairs } from '../systems/adventure/AdventureStairs.js';
import { AdventureRocks } from '../systems/adventure/AdventureRocks.js';
import { AdventureScaffolds } from '../systems/adventure/AdventureScaffolds.js';
import { AdventureBricks } from '../systems/adventure/AdventureBricks.js';
import { AdventureFlood } from '../systems/adventure/AdventureFlood.js';
import { SPIKE_SEED, spikePicture, spikesOf } from '../data/adventure/spikes.js';
import { AdventurePools } from '../systems/adventure/AdventurePools.js';
import { AdventureSwimming } from '../systems/adventure/AdventureSwimming.js';
import { AdventureLevers } from '../systems/adventure/AdventureLevers.js';
import { AdventureDam } from '../systems/adventure/AdventureDam.js';
import { AdventurePoolFish } from '../systems/adventure/AdventurePoolFish.js';
import { everUnderwater, poolDecor } from '../systems/adventure/poolDecor.js';
import { AdventureMole } from '../entities/AdventureMole.js';
import { ENEMIES } from '../data/adventure/enemies.js';
import { cameraBottom } from '../systems/adventure/cameraFloor.js';
import { secretCoverTiles } from '../systems/adventure/secretCover.js';
import { vineRuns } from '../data/adventure/mapBuilder.js';

// reach: how far from a ladder's middle it can be grabbed. standStill: slower than this, the cat counts
// as standing at a ladder, so Down climbs down it rather than sliding past.
const CLIMB = { speed: 250, sideSpeed: 110, snap: 0.25, reach: 26, standStill: 60 };
// Pulling himself up onto the island at a ladder's top. It starts with his feet this far below the
// island's top, scaled to his size. He's drawn behind the island (depth: under the ground's 2) while
// he hoists himself up over the first riseFrames frames; the rest show him on top.
const CLIMB_UP = { below: 50, depth: 1.9, riseFrames: 2 };
const HURT = { invulnerableMs: 1300, knockX: 330, knockY: -640, blinkMs: 90 };
// A level's boss wakes once the cat stands this many cells inside his arena (updateBossFights).
const BOSS_WAKE_CELLS = 3;
const BOSS_CAMERA_PAN_MS = 900; // the camera's glide to frame a boss's arena
const BOSS_CAMERA_HEADROOM = 120; // px: in a boss fight, the camera rises to keep this much over the cat's head
const BOSS_CAMERA_EASE_MS = 140; // how fast it rises and settles
const PENALTY = { speedMultiplier: 0.6, durationMs: 600 };
const FALL_OUT_BELOW = 160; // below the bottom of the map, the cat has fallen out
const MOOD_WASH_DEPTH = 90; // the mood's colour over the screen: over the level, under the HUD (100)
const CAMERA = { lerp: 0.12, deadzoneW: 120, deadzoneH: 70 };
// Where the camera looks, from the cat, so the player sees where he's going and where he'd land:
//   below: normally a little below him, as what's beneath is what's dangerous
//   above: while he climbs a ladder up, above him instead
//   peek: standing still by an island's edge, well below him, to show where he'd land
//   ride: riding a moving log going down, this far below him, to show where it's taking him. Going
//         up, it looks `above` him, as on a ladder. A log is ground, so he never peeks off it.
//   ahead: this far in front of him, the way he runs or faces
//   stillMs: how long he stands by an edge before the camera peeks over. easeMs: how quickly it turns.
const LOOK = { below: 110, above: 120, peek: 250, ride: 180, ahead: 160, runningFrom: 120, stillMs: 350, easeMs: 300, edgeCells: 2 };
const BONUS_COINS = 3;
const CHEST_COINS = 5;
// The silver chest, for whoever finds its key off the main route: more coins, and explosive rounds.
const SILVER_CHEST = { coins: 8, ammo: 'explosive' };
// Landing on an enemy: the cat counts as coming from above if its feet were no lower than this
// below the enemy's top a step earlier, and it bounces off this fast.
const STOMP = { margin: 14, bounce: -760 };
// Touching a boss (systems/adventure/bosses/bossTouch.js): a jump on his head outside his weak
// moments bounces the cat this share as high; dashing, sliding or raging into him knocks the cat
// back this fast, across and up.
// onTop: with his feet this close below the top of the boss's body, the cat is on top of him.
const BOSS_TOUCH = { headBounceShare: 0.75, bounceOff: { x: 420, y: -460 }, onTop: 30 };
// The gunners' bullets: how far they fly before fading, their hitbox, and how big their flash is.
const ENEMY_BULLET = { range: 14 * TILE, size: 14, depth: 5 };
const END_SCREEN_MS = 1100;
const DROP = { fromY: TILE, ms: 700 }; // a pickup the arena drops falls from here, this long
const STARS = 3; // a level's stars are its crystals, up to this many
const HINT_AT_MS = 3200; // how long a hint along the way stays (level.hintsAt)
const POOL_DECOR_DEPTH = 2.06; // a pool floor's plants and stones: in front of the ground, behind him
const SECRET_COVER_DEPTH = 7; // in front of everything, the cat too, until he's inside
const SECRET_BEHIND_DEPTH = 1.99; // its earth behind an island over the shaft: over the cave wall, under the tiles
const BEAM_PIPS = { x: 98, y: 128, gap: 26, r: 8 };
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
  // retry: what he'd done before losing at the boss, to start again at the checkpoint (bossRetry.js).
  init({ levelIndex = 0, level = null, retry = null } = {}) {
    this.levelIndex = level ? -1 : levelIndex;
    this.level = level ?? ADVENTURE_LEVELS[levelIndex];
    this.restartData = level ? { level } : { levelIndex };
    this.retry = retry;
  }

  create() {
    const { level } = this;
    this.overlay = this.registry.get('overlay');
    this.audio = this.registry.get('audio');
    this.screenFx = this.registry.get('screenFx');
    this.screenFx?.reveal(); // the home screen covered over to come here
    this.effects = new Effects(this);
    // A world's own pictures, or the Wood world's where it has none (data/adventure/index.js).
    this.art = (name) => adventureArtKey(level.world, name);
    this.coinSpin = adventureKey(adventureArtWorld(level.world, 'coin-1'), 'coin-spin');
    this.layout = readAdventureMap(level.map);
    this.worldW = this.layout.cols * TILE;
    this.worldH = this.layout.rows * TILE;
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH + FALL_OUT_BELOW * 2);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.physics.world.TILE_BIAS = TILE_BIAS;

    this.buildBackground();
    this.buildTiles();
    this.buildDecor();
    // Water in the bottomless gaps, if the level has it (data/adventure/water.js).
    this.water = new AdventureWater(this, level.water, this.layout, this.worldH + FALL_OUT_BELOW);
    this.pools = new AdventurePools(this, level.pools ?? [], this.layout.tiles); // pools he swims in (systems/adventure/pools.js)
    this.flood = new AdventureFlood(this, this.pools); // a pool that floods: the dam bursting
    this.scenery = new AdventureScenery(this, level, this.art); // waterfalls, caves, covers (Mill Falls)
    const spikeCells = new Set(this.layout.objects.filter((o) => o.type === 'spike').map(({ col, row }) => `${col},${row}`));
    this.rocks = new AdventureRocks(this, level.rocks ?? [], { art: this.art, keepClear: (c, r) => spikeCells.has(`${c},${r}`) }); // cliffs from the rock kit, nothing hiding its spikes
    new AdventureScaffolds(this, level.walkways ?? [], { art: this.art, groundLayer: this.groundLayer, tiles: this.layout.tiles }); // timber walkways
    new AdventureBricks(this, level.masonry ?? [], { art: this.art, groundLayer: this.groundLayer }); // stone brick walls and pillars
    this.buildSecretCovers();
    this.splashed = false;
    this.buildLadders();
    this.buildScenery();
    // The start gate, the checkpoint flags and the portal's arch (data/adventure/gates.js).
    this.gates = new AdventureGates(this, GATES[level.world], this.layout);
    this.buildObjects();
    // The moving traps: maces, crushers, dart idols and bounce mushrooms (data/adventure/traps.js).
    this.traps = new AdventureTraps(this, TRAPS[level.world], level.traps ?? [], this.layout, (fromX) => this.hurt(fromX), (enemy) => this.knockOut(enemy));

    const start = this.layout.objects.find((o) => o.type === 'start');
    // While developing, ?at=<place> starts at a place the level names (systems/adventure/devPlaces.js).
    const place = devPlace();
    this.respawnAt = this.cellFeet(place?.levelIndex === this.levelIndex ? place.cell : start);
    this.cat = new Cat(this, this.respawnAt.x, level.cat.speed, { character: ADVENTURE_HERO.character, y: this.respawnAt.y - 80 });
    this.cat.setScale(this.cat.scaleX * ADVENTURE_HERO.scale).setAirSpeed(ADVENTURE_HERO.jump.airSpeed, ADVENTURE_HERO.jump.height);
    this.cat.moveMode = 'free';
    this.cat.startRunning();
    this.gates.open(this.cat);
    this.cat.body.setMaxVelocityY(MAX_FALL_SPEED);
    this.physics.add.collider(this.cat, this.groundLayer, null, (cat, tile) => this.landsOn(tile), this);
    this.physics.add.collider(this.cat, this.solids, (cat, block) => this.bumpInto(block));
    this.physics.add.overlap(this.cat, this.pickups, (cat, item) => this.collect(item));
    this.physics.add.overlap(this.cat, this.spikes, (cat, spike) => this.hurt(spike.x));
    this.physics.add.overlap(this.cat, this.lanterns, (cat, lantern) => this.reachCheckpoint(lantern));
    this.physics.add.overlap(this.cat, this.portalZone, () => {
      if (this.portalLocked && !this.tryPortalLock()) return;
      if (this.playing) this.gates.enter(this.cat);
      this.complete();
    });
    this.physics.add.overlap(this.cat, this.chests, (cat, chest) => this.openChest(chest));
    this.physics.add.collider(this.enemies, this.groundLayer);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.overlap(this.cat, this.enemies, (cat, enemy) => this.meetEnemy(enemy));
    // A burning enemy sets alight any other it touches (systems/adventure/burning.js).
    this.physics.add.overlap(this.enemies, this.enemies, (a, b) => spreadFire(a, b));
    // A frozen enemy is a block of ice he can stand on (systems/adventure/iceBlocks.js). Phaser only
    // counts standing on tiles and still bodies, so on top of the ice he's told he's standing, to jump.
    this.physics.add.collider(this.cat, this.enemies, (cat) => {
      if (cat.body.touching.down) cat.body.blocked.down = true;
    }, (cat, enemy) => isFrozen(enemy) && !this.climbing && !this.pullingUp);
    // The gunners' bullets fly through islands, but not the ground, and hurt the cat.
    this.enemyBullets = this.physics.add.group({ allowGravity: false });
    this.physics.add.collider(this.enemyBullets, this.groundLayer, (bullet) => bullet.destroy(), (bullet, tile) => !ONE_WAY.has(tile.index));
    // Against a list of blocks, Phaser passes the block first, so the bullet is the one in the group.
    this.physics.add.collider(this.enemyBullets, this.solids, (a, b) => (this.enemyBullets.contains(a) ? a : b).destroy());
    this.physics.add.overlap(this.cat, this.enemyBullets, (cat, bullet) => this.shotByGunner(bullet));
    this.platforms = new AdventurePlatforms(this, this.cat, {
      art: this.art,
      movers: level.movers,
      wheels: level.wheels,
      leaves: this.layout.objects.filter((o) => o.type === 'leaves' || o.type === 'cracked'),
      canLand: () => !this.climbing && !this.pullingUp,
    });
    this.traps.addColliders(this.cat, this.enemies, () => !this.climbing && !this.pullingUp);
    // Pterodactyls (data/adventure/birds.js): they dive at him on solid ground, or, for one that
    // takes riders, on a wheel's seat too; never in the air or climbing.
    this.birds = [];
    for (const bird of this.level.birds ?? []) {
      const pterodactyl = new AdventureBird(this, bird, (riders) => this.cat.onGround && !this.climbing && (riders || !this.platforms.riding), this.birds);
      this.enemies.add(pterodactyl);
      this.birds.push(pterodactyl.ready());
      this.totals.enemies += 1;
    }
    this.traps.keepBeats(this.birds); // idols that keep a hovering bird's beat (traps.js, beatOf)
    this.moves = new AdventureMoves(this, this.cat, {
      art: this.art,
      groundLayer: this.groundLayer,
      solids: this.solids,
      enemies: this.enemies,
      onKnockOut: (enemy) => this.knockOut(enemy),
      onAmmo: (message) => {
        if (message) this.showHint(message, 1400);
        this.updateHud();
      },
    });
    // A freeze round freezes a small trap (systems/adventure/trapIce.js).
    // and any round opens a spore bud (systems/adventure/sporeBuds.js).
    this.traps.watchShots(() => this.moves.bullets.getChildren(), (bullet) => (bullet.ammo.freeze ? this.moves.freezeLands(bullet) : this.moves.bulletStops(bullet)));
    // A round into a water wheel's hub reverses it, or freezes it (systems/AdventurePlatforms.js).
    this.platforms.watchShots(() => this.moves.bullets.getChildren(), (bullet) => (bullet.ammo.freeze ? this.moves.freezeLands(bullet) : this.moves.bulletStops(bullet)));
    // Drawbridges: a round into the switch, or the cat touching it, lowers the bridge
    // (systems/adventure/AdventureDrawbridges.js).
    this.drawbridges = new AdventureDrawbridges(this, this.cat, level.drawbridges ?? [], {
      art: this.art, canLand: () => !this.climbing && !this.pullingUp, spend: (bullet) => this.moves.bulletStops(bullet),
    });
    // Stairs he walks up and down, his feet kept on their slope (systems/adventure/AdventureStairs.js).
    this.stairs = new AdventureStairs(this, level.stairs ?? [], { art: this.art, ground: this.groundLayer });
    this.swimming = new AdventureSwimming(this, this.cat, this.pools);
    this.dam = new AdventureDam(this, level.dam, { art: this.art }); // the Grand Dam: lever i opens its gate i
    this.levers = new AdventureLevers(this, level.levers ?? [], { art: this.art, onPull: () => { this.pools.raise(); this.dam.open(this.pools.stage - 1); } }); // the gates open in the order the water rises
    // Fish leaping out of the water: they hurt the cat, and a round knocks one out (data/adventure/fish.js).
    this.fish = new AdventureFish(this, level.fish ?? [], {
      art: this.art, water: this.water, hurt: (fromX) => this.hurt(fromX), spend: (bullet) => this.moves.bulletStops(bullet),
    });
    this.poolFish = new AdventurePoolFish(this, level.poolFish ?? [], { art: this.art, hurt: (fromX) => this.hurt(fromX), spend: (bullet) => this.moves.bulletStops(bullet) });

    // Bosses: a test arena's one boss fights at once, and beating him finishes it. A level's own
    // bosses (level.bosses, data/adventure/bossArenas.js) wait in their arenas until the cat walks
    // in, and beating one opens his door; the portal finishes the level.
    this.bossFights = [];
    this.boss = this.bossArena = this.bossBar = this.bossFrame = null; // a restart forgets the last try's boss
    if (level.boss) this.startBoss(this.buildBoss(level.boss, true));
    for (const def of level.bosses ?? []) this.buildBoss(def, false);

    this.hearts = level.hearts;
    this.coins = 0;
    this.gems = 0;
    this.hasKey = false;
    this.hasSilverKey = false;
    this.portalLocked = Boolean(level.portalLocked);
    this.hintsShown = new Set();
    this.portalHinted = false;
    this.portalOpening = false;
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
    // The camera's own moments: shots that show what's ahead, zones that frame a set piece.
    this.shots = new AdventureCameraShots(this, level.camera,
      () => cam.startFollow(this.cat, true, CAMERA.lerp, CAMERA.lerp, this.look.x, this.look.y).setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH),
      () => ({ x: this.cat.x - this.look.x, y: this.shots.frameY(this.cat) ?? this.cat.y - this.look.y }));

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
    // Again after losing at the boss: as he left it, at the checkpoint (bossRetry.js).
    if (this.retry) {
      restore(this, this.retry, { armed: ADVENTURE_HERO.armed, openChest: (chest) => chest.setTexture(this.art(chest.silver ? 'chest-silver-open' : 'chest-open')) });
      this.updateHud();
    }
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

  // The world's backdrop: its layers, light rays, fog and leaves in front (data/adventure/backdrop.js).
  buildBackground() {
    this.backdrop = new AdventureBackdrop(this, BACKDROPS[this.level.world] ?? BACKDROPS.wood, this.art);
    // The mood's see-through colour over the whole screen, under the HUD (data/adventure/moods.js).
    this.moodWash = this.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0).setOrigin(0).setScrollFactor(0).setDepth(MOOD_WASH_DEPTH);
  }

  // The light and colour where the cat is, fading between the level's moods.
  updateMood() {
    const mood = moodAt(this.cat.x / TILE, this.level.moods);
    this.backdrop.setMood(mood);
    this.moodWash.setFillStyle(mood.wash, mood.washAlpha);
  }

  buildTiles() {
    const map = this.make.tilemap({ data: this.layout.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', this.art('tiles'), TILE, TILE, 0, 0);
    this.groundLayer = map.createLayer(0, tileset, 0, 0).setDepth(2);
    this.groundLayer.setCollisionByExclusion([-1]);
    // Islands and bridges are only solid on top: the cat jumps up through them and lands on them.
    // Trapdoors too, though they're drawn as the ground (systems/adventureMap.js, Y).
    this.trapdoors = new Set(this.layout.trapdoors.map(({ col, row }) => `${col},${row}`));
    this.groundLayer.forEachTile((tile) => {
      if (ONE_WAY.has(tile.index) || this.trapdoors.has(`${tile.x},${tile.y}`)) tile.setCollision(false, false, true, false, false);
    });
    // Now and then a variant's picture for the plain soil and ground (data/adventure/tileVariants.js),
    // after the collisions are set: the game still treats it as the plain tile.
    this.groundLayer.forEachTile((tile) => {
      const variants = TILE_VARIANTS[tile.index];
      if (!variants || cellRandom(tile.x, tile.y, 9) >= TILE_VARIANT_SHARE) return;
      tile.index = variants[Math.floor(cellRandom(tile.x, tile.y, 10) * variants.length)];
    });
    // Islands drawn by a picture instead (level.hiddenTiles: { cols, row }, a waterfall cliff's
    // ledges): still stood on, but not shown, so the picture's rock is the ledge.
    for (const { cols: [from, to], row } of this.level.hiddenTiles ?? []) {
      for (let c = from; c <= to; c++) this.groundLayer.getTileAt(c, row)?.setVisible(false);
    }
  }

  // A level's secret caves (level.secrets: { cols, rows }) hidden under the ground's own tiles, as if
  // the caves were solid (systems/adventure/secretCover.js), with the same picture variants as the
  // ground, in front of everything: each fades away while the cat is inside its cave.
  buildSecretCovers() {
    const tileset = this.groundLayer.tileset[0];
    (this.level.secrets ?? []).forEach((secret, i) => {
      // In front of everything; and behind the level's own tiles over the secret's shaft (an island).
      const layer = this.groundLayer.tilemap.createBlankLayer(`secret-${i}`, tileset).setDepth(SECRET_COVER_DEPTH);
      const under = this.groundLayer.tilemap.createBlankLayer(`secret-${i}-behind`, tileset).setDepth(SECRET_BEHIND_DEPTH);
      for (const { col, row, tile, behind } of secretCoverTiles(this.level.map, secret, this.level.caves ?? [])) {
        const variants = TILE_VARIANTS[tile];
        const shown = variants && cellRandom(col, row, 9) < TILE_VARIANT_SHARE ? variants[Math.floor(cellRandom(col, row, 10) * variants.length)] : tile;
        (behind ? under : layer).putTileAt(shown, col, row);
      }
      const { cols: [c0, c1], rows: [r0, r1] } = secret;
      this.scenery.addCover([layer, under], { left: c0 * TILE, right: (c1 + 1) * TILE, top: r0 * TILE, bottom: (r1 + 1) * TILE });
    });
  }

  // Whether a point (px) is by a hidden island (hiddenTiles), where no plants grow.
  byHiddenTiles(x, y) {
    const col = Math.floor(x / TILE), row = Math.floor(y / TILE);
    return (this.level.hiddenTiles ?? []).some(({ cols: [from, to], row: r }) => col >= from && col <= to && Math.abs(row - r) <= 1);
  }

  // The plants the level grows by itself: grass and flowers on the tops, vines under the islands
  // (data/adventure/decor.js, placed by systems/adventure/decorPlacement.js).
  buildDecor() {
    // Not under a pool's water: its floor has its own (systems/adventure/poolDecor.js), in front of
    // the ground, behind him and the water's front.
    const pools = this.level.pools ?? [];
    this.decor = placeDecor(this.layout, DECOR[this.level.world])
      .filter(({ x, y }) => !this.byHiddenTiles(x, y) && !everUnderwater(pools, Math.floor(x / TILE), Math.floor((y - 1) / TILE)))
      .map(({ picture, x, y, hang, depth, flip }) => {
        const image = this.add.image(x, y, this.art(picture)).setOrigin(0.5, hang ? 0 : 1).setDepth(depth).setFlipX(flip);
        image.hang = hang;
        return image;
      });
    for (const { picture, col, row } of poolDecor(this.level, this.layout.tiles)) {
      if (this.textures.exists(this.art(picture))) this.add.image(col * TILE + TILE / 2, (row + 1) * TILE, this.art(picture)).setOrigin(0.5, 1).setDepth(POOL_DECOR_DEPTH);
    }
    // Its moving life: fireflies, falling leaves, and the decoration swaying (data/adventure/ambience.js).
    this.ambience = new AdventureAmbience(this, AMBIENCE[this.level.world], this.decor);
  }

  buildLadders() {
    this.ladderCells = new Set(this.layout.ladders.map(({ col, row }) => `${col},${row}`));
    // A climbing vine (level.vines) is a ladder that looks like a vine: one picture repeated down its
    // whole length, at the vine picture's own width.
    const vines = new Set((this.level.vines ?? []).map(({ col, row }) => `${col},${row}`));
    for (const { col, row } of this.layout.ladders) {
      if (vines.has(`${col},${row}`)) continue;
      this.add.image(col * TILE + TILE / 2, row * TILE, this.art('ladder')).setOrigin(0.5, 0).setDepth(3);
    }
    for (const { col, top, bottom } of vineRuns(this.level.vines ?? [])) {
      const width = this.textures.get(this.art('vine')).getSourceImage().width;
      this.add.tileSprite(col * TILE + TILE / 2, top * TILE, width, (bottom - top + 1) * TILE, this.art('vine')).setOrigin(0.5, 0).setDepth(3);
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

  // A walking enemy, standing (or falling in) at x, y. The boss arena drops some in too.
  makeEnemy(kind, x, y) {
    const isSpike = (px, py) => this.spikeCells.has(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`);
    // One that burrows (the mole) pops out of the ground instead of walking (entities/AdventureMole.js).
    const Kind = ENEMIES[kind]?.burrows ? AdventureMole : AdventureEnemy;
    const enemy = new Kind(this, x, y, kind, { groundLayer: this.groundLayer, isSpike });
    enemy.on('swipe', () => {
      if (enemy.swipeLands(this.cat) && !this.moves.isRaging) this.hurt(enemy.x);
    });
    this.enemies.add(enemy);
    return enemy;
  }

  // The top of whatever is under x, island or ground: the highest solid tile in its column.
  surfaceAt(x) {
    const col = Math.max(0, Math.min(this.layout.cols - 1, Math.floor(x / TILE)));
    let row = 0;
    while (row < this.layout.rows && this.layout.tiles[row][col] < 0) row += 1;
    return row * TILE;
  }

  // A pickup falling from above to land on whatever is under x. It can only be collected once it
  // lands. It joins the level's pickups, so collecting it works as for any other.
  dropPickup(kind, x) {
    const landY = this.surfaceAt(x) - TILE / 2;
    const item = this.physics.add.staticImage(x, DROP.fromY, this.art(kind)).setDepth(4);
    item.kind = kind;
    item.body.enable = false;
    this.pickups.push(item);
    this.tweens.add({
      targets: item, y: landY, duration: DROP.ms, ease: 'Bounce.easeOut',
      onComplete: () => {
        if (!item.active) return;
        item.body.enable = true;
        item.refreshBody();
        this.tweens.add({ targets: item, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      },
    });
    return item;
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
    this.done = new Set(); // the cells of what he's taken, opened and knocked out (bossRetry.js)
    this.lit = new Set(); // and of the checkpoints he's lit
    this.spikeCells = new Set(this.layout.objects.filter((o) => o.type === 'spike').map(({ col, row }) => `${col},${row}`));
    for (const object of this.layout.objects) {
      const { x, y } = this.cellFeet(object);
      const middle = y - TILE / 2;
      const cell = cellKey(object);
      switch (object.type) {
        case 'coin': {
          // In front of the scenery, as the other pickups are (with none, a cave's wall or a background
          // picture covered them).
          const coin = this.physics.add.staticSprite(x, middle, this.art('coin-1')).play(this.coinSpin).setDepth(4);
          coin.body.setCircle(18, (coin.width - 36) / 2, (coin.height - 36) / 2);
          coin.kind = 'coin';
          coin.cell = cell;
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
        case 'ammo-laser':
        case 'ammo-freeze':
        case 'ammo-fire': {
          const texture = { rage: 'mushroom', weapon: 'minigun' }[object.type] ?? object.type;
          const item = this.physics.add.staticImage(x, middle, this.art(texture)).setDepth(4);
          item.kind = object.type;
          item.cell = cell;
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
          // The world's spike picture for this cell; only where it's drawn hurts (data/adventure/spikes.js).
          const picture = spikePicture(this.level.world, object.col, object.row, (c, r) => cellRandom(c, r, SPIKE_SEED));
          this.add.image(x, y, this.art(this.textures.exists(this.art(picture)) ? picture : 'spike')).setOrigin(0.5, 1).setDepth(3);
          const { hit } = spikesOf(this.level.world);
          const zone = this.add.zone(x, y - hit.h / 2, hit.w, hit.h);
          this.physics.add.existing(zone, true);
          this.spikes.push(zone);
          break;
        }
        case 'start':
          this.gates.buildStart(x, y);
          break;
        case 'checkpoint': {
          const lantern = this.gates.buildCheckpoint(x, y);
          lantern.respawn = { x, y };
          lantern.cell = cell;
          this.lanterns.push(lantern);
          break;
        }
        case 'chest':
        case 'silver-chest': {
          const silver = object.type === 'silver-chest';
          const chest = this.physics.add.staticImage(x, y + 2, this.art(silver ? 'chest-silver-locked' : 'chest-locked')).setOrigin(0.5, 1).setDepth(3);
          chest.silver = silver;
          chest.cell = cell;
          chest.refreshBody();
          this.chests.push(chest);
          break;
        }
        case 'enemy': {
          this.makeEnemy(object.kind, x, y).cell = cell;
          this.totals.enemies += 1;
          break;
        }
        case 'gunner': {
          const gunner = new AdventureGunner(this, x, y, object.kind, {
            groundLayer: this.groundLayer,
            fire: (from, bx, by, angle) => this.fireAtCat(from, bx, by, angle),
          });
          gunner.cell = cell;
          this.enemies.add(gunner);
          this.totals.enemies += 1;
          break;
        }
        case 'portal': {
          this.gates.buildPortal(x, y, object);
          // The Guardian Gate: locked until the cat brings the gold key.
          if (this.level.portalLocked) this.gates.lockPortal();
          this.portalZone = this.add.zone(x, y - 60, 70, 110);
          this.physics.add.existing(this.portalZone, true);
          break;
        }
        default:
          break;
      }
    }
  }

  // A boss, standing on his arena's floor at his column (def.floor, the floor's surface row; a test
  // arena's is the top of the ground at the bottom of his column). endsLevel: beating him finishes
  // the level; otherwise it opens his door (def.door: { col, rows: [top, bottom] }, stone blocks in
  // the way until then). His shock waves stop at the arena's walls, its first and last open columns.
  buildBoss(def, endsLevel) {
    const { kind, col, arena } = def;
    const { tiles } = this.layout;
    let row = def.floor;
    if (row === undefined) {
      row = this.layout.rows - 1;
      while (row > 0 && tiles[row - 1][col] >= 0) row -= 1;
    }
    const fight = { def, endsLevel, started: false, beaten: false, door: this.buildDoor(def.door) };
    // The Rootbreaker is his own boss (entities/AdventureRootbreaker.js), nothing like the troll.
    if (def.kind === 'rootbreaker') {
      fight.boss = new AdventureRootbreaker(this, {
        col, floor: row, arena, cat: this.cat,
        onHurtCat: (fromX) => this.hurt(fromX),
        onShake: () => this.cameras.main.shake(200, 0.006),
        onDefeated: () => (endsLevel ? this.complete() : this.bossBeaten(fight)),
      });
      fight.arena = fight.boss.arena;
      this.bossFights.push(fight);
      return fight;
    }
    fight.boss = new AdventureBoss(this, {
      kind,
      x: col * TILE + TILE / 2,
      feetY: row * TILE,
      cat: this.cat,
      arena: { left: arena.left * TILE, right: (arena.right + 1) * TILE },
      surfaceAt: (x) => this.surfaceAt(x),
      shots: { list: () => this.moves.bullets.getChildren(), stop: (bullet) => this.moves.bulletStops(bullet) },
      onHurtCat: (fromX) => this.hurt(fromX),
      onShake: () => this.bossArena.shake(),
      onDefeated: () => (endsLevel ? this.complete() : this.bossBeaten(fight)),
    });
    fight.arena = new AdventureBossArena({
      boss: fight.boss,
      cat: this.cat,
      left: arena.left * TILE,
      right: (arena.right + 1) * TILE,
      spawnEnemy: (enemyKind, x, y) => this.makeEnemy(enemyKind, x, y),
      dropPickup: (pickup, x) => this.dropPickup(pickup, x),
      roundsLeft: () => (this.moves.armed ? Object.values(this.moves.rounds).reduce((sum, n) => sum + n, 0) : Infinity),
    });
    this.bossFights.push(fight);
    return fight;
  }

  // The fight begins: he's the boss the scene updates, the cat's rounds and touch reach him, and
  // his health bar shows.
  startBoss(fight) {
    fight.started = true;
    this.boss = fight.boss;
    this.bossArena = fight.arena;
    this.moves.setBoss(this.boss);
    // A boss who hurts the cat himself (ownTouch) isn't asked what touching him does.
    if (!this.boss.ownTouch) this.physics.add.overlap(this.cat, this.boss.sprite, () => this.meetBoss());
    this.toldAboutHead = false;
    this.bossBar?.hide();
    const marks = this.boss.phaseMarks ?? BOSS_FIGHTS[fight.def.kind].phases.slice(1).map((phase) => phase.from);
    this.bossBar = new AdventureBossBar(this, { name: this.boss.name, marks });
    if (fight.def.hint) this.showHint(fight.def.hint, 3200);
    // A boss with a frame: the camera locks onto his whole arena, and his gate shuts behind the cat.
    if (this.boss.frame) this.lockCamera(this.boss.frame);
    fight.gate = this.buildDoor(fight.def.gate);
    this.boss.start();
  }

  // The camera glides to the middle of a boss's arena and stays, until he's beaten; it only rises
  // to keep the cat in view when he climbs or jumps high in the arena (liftBossCamera).
  lockCamera(frame) {
    const cam = this.cameras.main;
    cam.stopFollow();
    this.bossFrame = frame;
    cam.pan((frame.left + frame.right) / 2, (frame.top + frame.bottom) / 2, BOSS_CAMERA_PAN_MS, 'Sine.easeInOut');
  }

  // Each frame of a boss fight: the camera's held on the arena, but never lets the cat's head come
  // within BOSS_CAMERA_HEADROOM of the top; it rises after him and settles back as he comes down.
  liftBossCamera(ms) {
    const cam = this.cameras.main;
    if (!this.bossFrame || cam.panEffect.isRunning) return;
    const frame = this.bossFrame;
    const viewH = cam.height / cam.zoom;
    const held = (frame.top + frame.bottom) / 2 - viewH / 2; // the arena's own view
    const target = Math.min(held, this.cat.body.top - BOSS_CAMERA_HEADROOM);
    cam.scrollY += (target - cam.scrollY) * (1 - Math.exp(-ms / BOSS_CAMERA_EASE_MS));
  }

  unlockCamera() {
    this.bossFrame = null;
    this.cameras.main.startFollow(this.cat, true, CAMERA.lerp, CAMERA.lerp, this.look.x, this.look.y).setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);
  }

  // A level's boss starts once the cat is standing inside his arena, a little way in.
  updateBossFights() {
    for (const fight of this.bossFights) {
      if (fight.started || !this.cat.onGround) continue;
      const { left, right } = fight.def.arena;
      const x = this.cat.x / TILE;
      if (x >= left + BOSS_WAKE_CELLS && x <= right) this.startBoss(fight);
    }
  }

  // His door: stone blocks across the way out of his arena, solid to the cat, the enemies and the
  // rounds, until he's beaten. Above them, up to row `wallTo`, the wall goes on unseen, so he can't
  // jump over it from the arena's high branches.
  buildDoor(door) {
    if (!door) return [];
    const blocks = [];
    for (let r = door.wallTo ?? door.rows[0]; r <= door.rows[1]; r++) {
      const block = this.physics.add.staticImage(door.col * TILE + TILE / 2, r * TILE + TILE / 2, this.art('stone')).setDepth(3);
      block.setDisplaySize(TILE, TILE).refreshBody().setVisible(r >= door.rows[0]);
      blocks.push(block);
      this.solids.push(block);
    }
    return blocks;
  }

  // Beaten: his door and his gate crumble, the camera follows the cat again, and the way on is open.
  bossBeaten(fight) {
    fight.beaten = true;
    this.bossBar?.hide();
    this.audio.playSfx('smash');
    this.cameras.main.shake(300, 0.006);
    if (fight.boss.frame) this.unlockCamera();
    for (const block of [...fight.door, ...(fight.gate ?? [])]) {
      this.solids.splice(this.solids.indexOf(block), 1);
      this.effects.dust(block.x, block.y + TILE / 2, 6);
      this.tweens.add({ targets: block, alpha: 0, y: block.y + 20, duration: 500, onComplete: () => block.destroy() });
    }
    this.showHint(`You beat ${fight.boss.name}!\nThe way on is open`, 3000);
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
    // The minigun's ammo belt, once he has it: every kind he carries, the one he's firing lit up.
    this.ammoBelt = new AdventureAmmoBelt(this);
    this.hint = fixed(this.add.text(GAME.WIDTH / 2, 150, '', { ...HUD_STYLE, fontSize: '30px', align: 'center' }).setOrigin(0.5));
    // The game menu's button, in the top right corner (ui/adventureGameMenu.js). Esc and P open it too.
    this.menuButton = addMenuButton(this, () => this.togglePause());
    this.showHint(this.level.hint ?? `${this.level.title}\nRun, jump and climb up to the portal\nX claw · Shift dash · C beam · find the minigun to shoot`, 4200);
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
    this.ammoBelt.update(this.moves);
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
    this.backdrop.fit();
    this.moodWash.setSize(GAME.WIDTH, GAME.HEIGHT);
    this.hint.setX(GAME.WIDTH / 2);
    this.menuButton.layout();
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
  // climbs, over the edge when he stands at one, so a jump down is never blind, and the way a moving
  // log is taking him while he rides it.
  updateLook(ms) {
    const { cat, look } = this;
    const running = Math.abs(cat.moveVelocity) > LOOK.runningFrom;
    const riding = this.platforms.riding;
    const standing = cat.onGround && !running && !this.climbing && !this.pullingUp;
    look.edgeMs = standing && !riding && this.atEdge() ? look.edgeMs + ms : 0;
    let y = -LOOK.below;
    if (this.climbing && this.upHeld) y = LOOK.above;
    else if (riding && riding.body.velocity.y < 0) y = LOOK.above;
    else if (riding && riding.body.velocity.y > 0) y = -LOOK.ride;
    else if (look.edgeMs > LOOK.stillMs) y = -LOOK.peek;
    // In a camera zone, the camera holds its middle where the zone says, to show a whole set piece.
    const frame = this.shots.frameY(cat);
    if (frame !== null) y = cat.y - frame;
    // Ahead of him: the way he's running, or standing, the way he faces.
    const x = -(running ? Math.sign(cat.moveVelocity) : (cat.flipX ? -1 : 1)) * LOOK.ahead;
    const ease = 1 - Math.exp(-ms / LOOK.easeMs);
    look.x += (x - look.x) * ease;
    look.y += (y - look.y) * ease;
    this.cameras.main.setFollowOffset(look.x, look.y);
    this.lowerCameraEdge(ease);
  }

  // The camera stops a few rows under the ground below the cat, in every level (systems/adventure/
  // cameraFloor.js). The edge moves with the same easing as the camera, so it never jumps. A camera
  // shot may look anywhere: the edge goes back to the map's bottom while one plays.
  // The level's secrets count as ground for it, so it gives none away, unless he's inside one.
  lowerCameraEdge(ease) {
    const { body } = this.cat;
    const col = Math.floor(body.center.x / TILE), feetRow = Math.floor(body.bottom / TILE);
    const secrets = this.level.secrets ?? [];
    const inSecret = (c, r) => secrets.some(({ cols: [c0, c1], rows: [r0, r1] }) => c >= c0 && c <= c1 && r >= r0 && r <= r1);
    const covered = inSecret(col, Math.floor(body.center.y / TILE)) ? () => false : inSecret;
    const target = this.shots.playing ? this.worldH
      : cameraBottom(this.level.map, col, feetRow, this.level.camera?.groundRows, TILE, undefined, covered);
    this.look.bottom = this.look.bottom === undefined ? target : this.look.bottom + (target - this.look.bottom) * ease;
    this.cameras.main.setBounds(0, 0, this.worldW, Math.min(this.worldH, Math.round(this.look.bottom)));
  }

  // ----- Moving -----

  // Islands hold the cat only when it's coming down onto them, not while it climbs or drops through.
  landsOn(tile) {
    if (!ONE_WAY.has(tile.index) && !this.trapdoors.has(`${tile.x},${tile.y}`)) return true;
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
    if (this.shots.playing) return this.shots.skip(); // a camera shot: jump skips it
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
    if (this.swimming.active) { this.swimming.stroke(); return; } // in the water: a stroke
    this.cat.requestJump();
  }

  slide(key) {
    if (this.shots.playing) return this.shots.skip(); // a camera shot: slide skips it
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
    this.done.add(item.cell);
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
      const kind = item.kind.slice('ammo-'.length);
      this.moves.addAmmo(kind);
      this.audio.playSfx(AMMO[kind].sound); // each crate sounds like what's in it
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
      this.showHint(this.level.keyHint ?? 'You found the key! Now find the chest');
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
      const coin = this.add.sprite(block.x, block.y - TILE / 2, this.art('coin-1')).play(this.coinSpin).setDepth(4);
      this.tweens.add({ targets: coin, y: coin.y - 70 - i * 18, alpha: 0, delay: i * 90, duration: 420, onComplete: () => coin.destroy() });
    }
    this.coins += BONUS_COINS;
    this.updateHud();
  }

  // A level's hints along the way (level.hintsAt: { col, text }): each shown once, the first time the
  // cat reaches its column, to explain what to do there (the bridge to shoot down).
  showHintsAt() {
    for (const hint of this.level.hintsAt ?? []) {
      if (this.hintsShown.has(hint) || this.cat.x < hint.col * TILE) continue;
      this.hintsShown.add(hint);
      this.showHint(hint.text, HINT_AT_MS);
    }
  }

  // A locked portal opens with the gold key: true once it's open. Without the key, its door rattles,
  // and a hint says what to find.
  tryPortalLock() {
    if (!this.hasKey) {
      if (!this.portalHinted) {
        this.gates.rattleDoor();
        this.audio.playSfx('bump');
        this.showHint('The gate is locked. Find the key!');
      }
      this.portalHinted = true;
      return false;
    }
    if (!this.portalOpening) {
      this.portalOpening = true;
      this.gates.openDoor(() => { this.portalLocked = false; }); // he goes in once it's gone
      this.audio.playSfx('cheer');
    }
    return false;
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
    this.done.add(chest.cell);
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
    // Frozen, it's harmless ice: a dash, a slide or the rage shatters it.
    if (isFrozen(enemy)) {
      if (this.moves.isRaging || this.moves.isDashing || this.cat.isSliding) this.knockOut(enemy);
      return;
    }
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
      this.hurt(enemy.x, { soft: enemy.softHit });
    }
  }

  // Touching the boss: what happens is decided by bossTouch, from what the cat and the boss are doing.
  meetBoss() {
    if (!this.playing || this.moves.isFiringSpecial || this.climbing || this.pullingUp) return;
    const { boss, cat } = this;
    const { body } = cat;
    const him = boss.sprite.body;
    const fromAbove = body.velocity.y > 0 && body.prev.y + body.height <= him.top + STOMP.margin;
    const onTop = body.bottom <= him.top + BOSS_TOUCH.onTop;
    const { brain } = boss;
    const touch = bossTouch(
      { fromAbove, onTop, dashing: this.moves.isDashing, sliding: cat.isSliding, raging: this.moves.isRaging },
      { defeated: brain.isDefeated, weak: brain.isWeak, invulnerable: brain.isInvulnerable, touchHurts: brain.touchHurts },
    );
    const away = body.center.x < him.center.x ? -1 : 1;
    switch (touch) {
      case 'stomp':
        boss.takeHit('stomp', cat.x, him.top);
        cat.bounce(STOMP.bounce);
        this.audio.playSfx('bounce');
        break;
      case 'bounceHead':
        cat.bounce(STOMP.bounce * BOSS_TOUCH.headBounceShare);
        this.audio.playSfx('bump');
        if (!this.toldAboutHead) {
          this.toldAboutHead = true;
          this.showHint('Too tough! Jump on his head while his club is stuck');
        }
        break;
      case 'bounceOff':
        this.moves.endDash();
        cat.endSlide();
        boss.takeHit(this.moves.isRaging ? 'rage' : 'dash', body.center.x + away * -body.halfWidth, body.center.y);
        cat.moveVelocity = away * BOSS_TOUCH.bounceOff.x;
        cat.setVelocity(away * BOSS_TOUCH.bounceOff.x, BOSS_TOUCH.bounceOff.y * cat.airSpeed);
        this.audio.playSfx('bump');
        break;
      case 'hurt':
        this.hurt(him.center.x);
        break;
      case 'push': {
        // He's solid: out of him, on the side the cat is on.
        const overlap = away < 0 ? body.right - him.left : him.right - body.left;
        cat.x += away * overlap;
        if (Math.sign(cat.moveVelocity) === -away) cat.moveVelocity = 0;
        break;
      }
      default:
        break;
    }
  }

  // A gunner's shot, from its gun's end toward where the cat was, with a flash. A gunner with its
  // own bullet (the squirrel's acorn) throws that, spinning, with no flash (data/adventure/gunners.js).
  fireAtCat(gunner, x, y, angle) {
    if (!this.playing) return;
    const { bullet: picture = 'enemy-bullet', spinDeg = 0, noFlash = false } = gunner.info;
    const bullet = this.enemyBullets.create(x, y, this.art(picture)).setRotation(angle).setDepth(ENEMY_BULLET.depth);
    bullet.body.setSize(ENEMY_BULLET.size, ENEMY_BULLET.size);
    this.physics.velocityFromRotation(angle, gunner.info.bulletSpeed, bullet.body.velocity);
    if (spinDeg) bullet.body.setAngularVelocity(spinDeg);
    bullet.startX = x;
    bullet.startY = y;
    if (noFlash) {
      this.audio.playSfx('acornThrow');
      return;
    }
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
    if (enemy.cell) this.done.add(enemy.cell);
    this.knockedOut += 1;
    if (this.moves.addCharge()) this.showHint('Beam ready! Press C');
    this.updateHud();
  }

  reachCheckpoint(lantern) {
    if (lantern.lit) return;
    lantern.lit = true;
    this.lit.add(lantern.cell);
    this.gates.raise(lantern);
    this.respawnAt = lantern.respawn;
    this.audio.playSfx('checkpoint');
    this.effects.sparkle(lantern.x, lantern.y - 50);
    this.showHint('Checkpoint');
  }

  // soft: no knock sideways (a bird's hit: over a wheel or the river, it would cost a second heart).
  hurt(fromX, { soft = false } = {}) {
    // Not while a camera shot holds him: a film pause pauses the danger too.
    if (this.hurtMs > 0 || !this.playing || this.moves.isFiringSpecial || this.shots?.playing) return;
    this.moves.endDash();
    this.endPullUp();
    this.loseHeart();
    if (!this.playing) return;
    const away = this.cat.x < fromX ? -1 : 1;
    if (this.climbing) this.stopClimbing();
    this.cat.applyPenalty(PENALTY);
    if (soft) return;
    this.cat.moveVelocity = away * HURT.knockX;
    this.cat.setVelocity(away * HURT.knockX, HURT.knockY * this.cat.airSpeed);
  }

  // Falling into the water: a splash as he reaches it, and he's lost a little way under, as if he'd
  // fallen out of the level.
  updateWater(ms) {
    this.water.update(ms);
    this.flood.update(ms, this.cat); // before the pools are drawn, so a flood's water is where it's drawn
    this.pools.update(ms);
    this.dam.update(ms);
    this.swimming.update(ms);
    this.levers.update(this.cat);
    if (!this.water.any || !this.water.over(this.cat.x)) return;
    const { body } = this.cat;
    if (!this.splashed && body.bottom > this.water.surfaceY && body.velocity.y > 0) {
      this.splashed = true;
      this.water.splash(this.cat.x);
    }
    if (body.top > this.water.surfaceY + WATER.sinkPx) this.fellOut();
  }

  fellOut() {
    this.splashed = false;
    this.loseHeart();
    if (!this.playing) return;
    this.moves.endDash();
    this.endPullUp();
    if (this.climbing) this.stopClimbing();
    this.cat.body.reset(this.respawnAt.x, this.respawnAt.y - 80);
    this.cat.moveVelocity = 0;
    for (const bird of this.birds) bird.sleepAgain(this.respawnAt.x); // none waiting, awake, over him
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
    const title = this.level.boss && this.boss ? `You beat ${this.boss.name}!` : 'Level complete!';
    this.time.delayedCall(END_SCREEN_MS, () => this.showEnd(title, true));
  }

  gameOver() {
    this.endPlay();
    this.audio.stopMusic();
    this.cat.play(animKey(this.cat.character, 'caught'), true);
    showDizzyStars(this, this.cat);
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
    this.menuButton.setVisible(false);
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
        // Lost at the boss: again from the checkpoint before him, as he left it (bossRetry.js).
        ...(!won && atBoss(this)
          ? [{ label: 'Try again', primary: true, onClick: () => this.restartLevel(snapshot(this)) }, { label: 'From the start', onClick: () => this.restartLevel() }]
          : [{ label: won ? 'Play again' : 'Try again', primary: !(won && next), onClick: () => this.restartLevel() }]),
        { label: 'Map', onClick: () => this.goHome('map') },
        { label: 'Home', onClick: () => this.goHome() },
      ],
    });
  }

  // Back to the adventure's home screen, or with `screen` 'map', to its road map (AdventureMenuScene).
  goHome(screen = 'home') {
    const leave = () => {
      this.endPause();
      this.audio.stopMusic();
      this.overlay.hide();
      this.scene.start('AdventureMenu', { screen });
    };
    if (this.screenFx) this.screenFx.cover(leave);
    else leave();
  }

  // The level again, from its start; or, with `retry`, from the checkpoint as he left it.
  restartLevel(retry = null) {
    this.endPause();
    this.scene.restart(retry ? { ...this.restartData, retry } : this.restartData);
  }

  // Esc, P or the menu button: pauses the game behind the game menu, or carries on.
  togglePause() {
    if (!this.playing && !this.paused) return;
    if (this.paused) {
      this.overlay.hide();
      this.endPause();
      this.audio.resumeMusic();
      this.playing = true;
      return;
    }
    this.paused = true;
    this.playing = false;
    // Everything stops: physics, animations, tweens and timers, so nothing moves on behind the menu.
    this.physics.pause();
    this.anims.pauseAll();
    this.tweens.pauseAll();
    this.time.paused = true;
    this.controls.releaseSteering();
    this.audio.pauseMusic();
    showGameMenu(this, {
      resume: () => this.togglePause(),
      restart: () => this.restartLevel(),
      map: () => this.goHome('map'),
      home: () => this.goHome(),
    });
  }

  // Undoes the pause. Animations are paused for the whole game, not just this scene, so leaving the
  // level from the menu must undo it too, or the next screen's animations stay frozen.
  endPause() {
    this.paused = false;
    this.physics.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;
  }

  update(time, delta) {
    const cam = this.cameras.main;
    this.backdrop.update(cam, time);
    if (this.cat) this.updateMood();
    this.ambience.update(time);
    if (!this.playing) return;
    const ms = Math.min(delta, 50);
    this.controls.update(time);
    this.hurtMs = Math.max(0, this.hurtMs - ms);
    this.cat.setAlpha((this.hurtMs > 0 && Math.floor(this.hurtMs / HURT.blinkMs) % 2 ? 0.35 : 1) * this.gates.catAlpha);
    if (this.climbing) {
      this.updateClimbing();
    } else if (!this.pullingUp) {
      this.stairs.update(this.cat); // before he moves, so on the stairs he counts as standing
      this.cat.move(this.moves.isFiringSpecial || this.shots.update(this.cat) ? 0 : this.controls.steer);
      this.cat.tick(ms);
      // Holding Up as the cat reaches a ladder grabs it.
      if (this.upHeld && this.ladderNear() && !this.moves.isFiringSpecial) this.startClimbing();
    }
    this.moves.update(ms, { canAct: !this.climbing && !this.pullingUp && !this.shots.playing });
    for (const enemy of this.enemies.getChildren()) enemy.update(this.cat, ms);
    this.updateEnemyBullets();
    this.updateBossFights();
    if (this.boss) {
      this.liftBossCamera(ms);
      this.boss.update(ms);
      this.bossArena.update(ms);
      this.bossBar.update(ms, this.boss.brain.healthShare);
    }
    this.platforms.update(ms);
    this.drawbridges.update(this.cat, this.moves.bullets.getChildren(), this.moves.beam?.sprite);
    this.showHintsAt();
    this.fish.update(ms, this.cat, this.moves.bullets.getChildren());
    this.poolFish.update(ms, this.cat, this.moves.bullets.getChildren());
    this.scenery.update(ms, this.cat);
    this.traps.update(ms, this.cat);
    this.updateLook(ms);
    this.updateWater(ms);
    if (this.cat.body.top > this.worldH + FALL_OUT_BELOW) this.fellOut();
  }
}
