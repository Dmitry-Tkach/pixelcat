import Phaser from 'phaser';
import { BIG_LAND, BOSS, CLIMB_CAMERA, FREE_MOVE, GAME, SPRINT, VIEW } from '../config/gameConfig.js';
import { LEVELS, worldName } from '../data/levels/index.js';
import { CHASERS } from '../data/chasers.js';
import { ESCAPE_ANIMATION, HOME_ANIMATION } from '../data/screens.js';
import { THEMES } from '../data/themes.js';
import { BossFight } from '../entities/BossFight.js';
import { BOSSES } from '../data/bosses.js';
import { journeyMap } from '../ui/JourneyMap.js';
import { showHomeScreen } from '../ui/HomeScreen.js';
import { Cat } from '../entities/Cat.js';
import { Chaser } from '../entities/Chaser.js';
import { HayWagons } from '../entities/HayWagons.js';
import { ObstacleField } from '../entities/ObstacleField.js';
import { CatFlaps } from '../entities/CatFlaps.js';
import { PawBlocks } from '../entities/PawBlocks.js';
import { Crows } from '../entities/Crows.js';
import { CATNIP, CROW } from '../data/pickups.js';
import { Pickups } from '../entities/Pickups.js';
import { Platforms } from '../entities/Platforms.js';
import { ToyMouse } from '../entities/ToyMouse.js';
import { Treats } from '../entities/Treats.js';
import { ParallaxBackground } from '../entities/ParallaxBackground.js';
import { InputController } from '../input/InputController.js';
import { ChaseDirector, PACK_SPACING } from '../systems/ChaseDirector.js';
import { GameStateMachine, STATE } from '../systems/GameStateMachine.js';
import { StreakTracker } from '../systems/StreakTracker.js';
import { starGoals, starText, starsFor } from '../systems/stars.js';
import { Effects } from '../ui/Effects.js';
import { Hud } from '../ui/Hud.js';

const START_X = 0;
const END_SCREEN_DELAY_MS = 1000;
const HUG_START_MS = 260;
const HUG_SCREEN_DELAY_MS = 2600; // long enough to enjoy the hug before the menu covers it
const GROUND_HEIGHT = 80;
const WORLD_MARGIN = 4000;
// Two thresholds, so hovering around one value can't make the warning repeat.
const DANGER_ENTER = 0.3;
const DANGER_EXIT = 0.4;
const FINAL_DASH_SHAKE = 0.002;
const MUD_COLOR = 0x7a4f2a;
const HAY_COLOR = 0xf2c440;
const GRAB_PENALTY = { speedMultiplier: 0.6, durationMs: 700 };
const OFFSCREEN_MARGIN = 80; // how far past the left edge of the screen a chaser counts as out of sight
const SHORTCUT_CLEAR_AHEAD = 400; // a chaser doesn't take a shortcut with an obstacle this close to the cat
const ON_ROAD_HEIGHT = 5;
const BOSS_MIDDLE_HEIGHT = 110;
// Dust and sparks, which are only for looks.
const LANDING_DUST = 6;
const TAKE_OFF_DUST = 3;
const CRASH_DUST = 14;
const RUN_DUST_SHARE = 0.6; // running faster than this share of top speed kicks up dust
const IMPACT_AHEAD = 40;
const DITCH_SPLASH = 0x8cc6e6;
const CAT_FLAP_LEAD = 250;
const HOME_MUSIC = { track: 'home', bpm: 120 };
const CATNIP_HUE_MS = 700; // how fast the cat's catnip shimmer runs through the colours
const CATNIP_TINT_SATURATION = 0.45; // how much further ahead of the chaser a cat flap puts the cat
const IMPACT_HEIGHT = 70;
const MODE_HINTS = {
  free: 'Free move: left and right run, and you can stop',
  hybrid: 'Always running: right is faster, left is slower',
};

// Runs one level: it connects the entities and systems, and holds no game rules of its own.
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  // `checkpoint`, when restarting from one, holds where the cat was and what it had collected.
  // `screen` is the menu to open first when the level doesn't start straight away.
  init({ levelIndex = 0, autoStart = false, checkpoint = null, screen = 'menu' }) {
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];
    this.autoStart = autoStart;
    this.startPoint = checkpoint;
    this.firstScreen = screen;
  }

  create() {
    const { level } = this;
    this.overlay = this.registry.get('overlay');
    this.screenFx = this.registry.get('screenFx');
    this.audio = this.registry.get('audio');
    this.progress = this.registry.get('progress');
    this.overlay.hide();
    this.inDanger = false;
    const startX = this.startPoint?.x ?? START_X;
    this.savedCheckpoint = this.startPoint;
    this.nextHint = (level.hints ?? []).filter((hint) => hint.at <= startX).length;
    this.nextCheckpoint = (level.checkpoints ?? []).filter((x) => x <= startX).length;
    this.pawFiring = false;
    this.cameraRise = 0;
    this.cameraToRoad = false;
    this.streak = new StreakTracker(SPRINT.STREAK);
    this.effects = new Effects(this);

    this.cameras.main.setZoom(GAME.CAMERA_ZOOM);
    this.background = new ParallaxBackground(this, THEMES[level.theme], level.light);
    this.gate = this.createEscapeGate();
    this.obstacles = new ObstacleField(this, level, startX);

    this.chase = new ChaseDirector(level, { startX, rosterIndex: this.startPoint?.rosterIndex ?? 0 });
    this.tracker = this.chase.tracker;
    this.pickups = new Pickups(this, level, startX);
    this.platforms = new Platforms(this, level, startX);
    this.wagons = new HayWagons(this, level);
    this.treats = new Treats(this, level, startX);
    this.pawBlocks = new PawBlocks(this, level, startX);
    this.treats.total += this.pawBlocks.treatTotal;
    this.catFlaps = new CatFlaps(this, level, startX);
    this.crows = new Crows(this, { crows: (level.crows ?? []).filter(({ until }) => until > startX) }, CROW);
    this.catnipMs = 0;
    this.crowHits = 0;
    for (const x of (level.checkpoints ?? []).filter((flagX) => flagX > startX)) {
      this.add.image(x, GAME.GROUND_Y + 4, 'checkpoint-flag').setOrigin(0.15, 1).setDepth(3);
    }
    this.cat = new Cat(this, startX, level.cat.speed);
    this.cat.treats = this.startPoint?.treats ?? 0;
    this.cat.hasPaw = this.startPoint?.hasPaw ?? false;
    this.bonusTreats = this.startPoint?.bonusTreats ?? 0;
    this.toldAboutBonus = false;
    this.lastCatX = startX;
    this.cat.moveMode = this.registry.get('moveMode') ?? 'free';
    this.toldAboutLunge = false;
    this.grabs = this.startPoint?.grabs ?? 0;
    this.foundMouse = this.startPoint?.foundMouse ?? false;
    this.toyMouse = new ToyMouse(this, level, this.foundMouse);
    this.bossFight = level.boss ? new BossFight(this, level.boss) : null;
    this.finalDashDone = false;
    this.chaser = new Chaser(this, startX - this.tracker.gap, this.chase.chaser.character);
    this.catShadow = this.add.ellipse(0, GAME.GROUND_Y + 4, 96, 15, 0x1d1a44, 0.35).setDepth(3);
    this.chaserShadow = this.add.ellipse(0, GAME.GROUND_Y + 4, 140, 20, 0x1d1a44, 0.35).setDepth(3);
    this.followers = this.chase.followers.map((id) => new Chaser(this, startX - this.tracker.gap, CHASERS[id].character));
    for (const sound of ['jump', 'slide', 'land', 'doubleJump', 'dive', 'bounce']) {
      this.cat.on(sound, () => this.audio.playSfx(sound));
    }
    for (const event of ['doubleJump', 'bounce']) {
      this.cat.on(event, () => this.effects.puff(this.cat.x, this.cat.body.bottom));
    }
    this.cat.on('land', () => this.effects.dust(this.cat.x, this.cat.body.bottom, LANDING_DUST));
    this.cat.on('jump', () => this.effects.dust(this.cat.x, this.cat.body.bottom, TAKE_OFF_DUST));

    // The road, in pieces around any ditches, with a lower floor at the bottom of each ditch.
    const pieces = [];
    let from = -WORLD_MARGIN;
    for (const [left, right, depth] of ObstacleField.ditchSpans(level)) {
      pieces.push([from, left, 0], [left, right, depth]);
      from = right;
    }
    pieces.push([from, level.length + WORLD_MARGIN, 0]);
    for (const [left, right, depth] of pieces) {
      const ground = this.add.rectangle((left + right) / 2, GAME.GROUND_Y + depth + GROUND_HEIGHT / 2, right - left, GROUND_HEIGHT);
      this.physics.add.existing(ground, true);
      this.physics.add.collider(this.cat, ground);
    }
    this.obstacles.onHit(this.cat, (item) => this.handleHit(item));
    this.obstacles.onWallHit((item) => this.handleWallHit(item));
    this.obstacles.onAlert((sound) => this.audio.playSfx(sound));
    this.obstacles.onAvoided(() => this.handleAvoided());
    this.pickups.onCollect(this.cat, (type) => (type === 'catnip' ? this.startCatnip() : this.handlePawPickup()));
    this.crows.onEvents(() => this.audio.playSfx('whistle'), () => this.handleCrowHit());
    this.obstacles.unstoppable = () => this.catnipMs > 0;
    this.pawBlocks.onBump(this.cat, (item) => this.handleBlockBump(item));
    this.catFlaps.onUse((way) => this.handleFlapIn(way), () => this.handleFlapOut());
    this.platforms.onLand(this.cat);
    this.platforms.onCollapseEvents(() => this.audio.playSfx('creak'), () => this.audio.playSfx('collapse'));
    this.cat.on('bigLand', () => this.handleBigLand());
    this.wagons.onLand(this.cat);
    this.wagons.onBoard(() => {
      this.effects.puff(this.cat.x, this.cat.body.bottom, HAY_COLOR);
      this.audio.playSfx('hayRide');
    });
    this.obstacles.onFallIn(() => this.handleFallIn());
    this.obstacles.onSmash((item) => {
      this.audio.playSfx('smash');
      this.effects.impact(item.x, GAME.GROUND_Y - IMPACT_HEIGHT, 1.4);
      this.effects.dust(item.x, GAME.GROUND_Y, CRASH_DUST);
      this.cameras.main.shake(120, 0.006);
    });
    this.obstacles.onSplash(() => {
      this.effects.puff(this.cat.x, this.cat.body.bottom, MUD_COLOR);
      this.audio.playSfx('splat');
    });
    this.treats.onCollect(this.cat, (item) => {
      this.effects.sparkle(item.x, item.y - item.displayHeight / 2);
      this.handleTreat();
    });
    this.toyMouse.onCollect(this.cat, () => {
      this.foundMouse = true;
      this.hud.showHint('You found the toy mouse!');
      this.audio.playSfx('squeak');
    });
    this.physics.add.overlap(this.cat, this.gate, () => this.handleEscape());

    this.hud = new Hud(this, level, () => this.togglePause());
    this.hud.setChaser(this.chase.chaser.character);
    this.hud.setTreats(this.cat.treats + this.bonusTreats);
    this.hud.setPawReady(this.cat.hasPaw);
    this.controls = new InputController(this, {
      onJump: () => this.isPlaying && this.cat.requestJump(),
      onSlide: () => this.isPlaying && this.cat.requestSlide(),
      onPause: () => this.togglePause(),
      onPaw: () => this.usePaw(),
      onSwitchMode: () => this.switchMoveMode(),
    });
    this.state = new GameStateMachine((next) => this.onStateChange(next));

    // Runs after the physics step, so the camera and owner use this frame's cat position.
    this.events.on('postupdate', this.syncView, this);
    const pauseIfPlaying = () => this.isPlaying && this.togglePause();
    this.game.events.on(Phaser.Core.Events.BLUR, pauseIfPlaying);
    const relayout = () => this.hud.layout();
    this.scale.on('resize', relayout);
    this.events.once('shutdown', () => {
      this.scale.off('resize', relayout);
      this.events.off('postupdate', this.syncView, this);
      this.game.events.off(Phaser.Core.Events.BLUR, pauseIfPlaying);
    });

    this.syncView();
    this.screenFx.reveal();
    this.hud.update(this.tracker.safety, 0);
    if (this.chase.chaser.arrival) this.hud.showHint(this.chase.chaser.arrival);
    if (this.autoStart) this.state.to(STATE.PLAYING);
    else if (this.firstScreen === 'intro') this.showIntroScreen();
    else if (this.firstScreen === 'levels') this.showLevelsScreen();
    else this.showStartScreen();
  }

  createEscapeGate() {
    const { level } = this;
    const gate = this.physics.add.staticImage(level.length + 100, GAME.GROUND_Y - 62, THEMES[level.theme].gate);
    gate.setOrigin(0.5, 1).setDepth(2);
    gate.refreshBody();
    gate.body.setSize(40, 340, false);
    gate.body.setOffset(160, 0);
    return gate;
  }

  get isPlaying() {
    return this.state?.is(STATE.PLAYING);
  }

  update(time, delta) {
    if (!this.isPlaying) return;
    const ms = Math.min(delta, 50);
    this.lastFrameMs = ms;
    this.controls.update(time);
    this.cat.move(this.controls.steer);
    this.platforms.update(ms, this.cat);
    this.wagons.update(ms, this.cat);
    const fight = this.bossFight;
    fight?.update(ms, this.cat);
    this.cat.speedControl.setTerrain(this.obstacles.terrainUnder(this.cat));
    this.catFlaps.update(ms, this.cat);
    this.crows.update(ms, this.cat, this.catnipMs > 0);
    this.updateCatnip(ms);
    if (!this.catFlaps.isCarrying) this.cat.tick(ms);
    if (!this.catFlaps.isCarrying && this.cat.onGround && (this.cat.isSliding || Math.abs(this.cat.moveVelocity) > this.cat.topSpeed * RUN_DUST_SHARE)) {
      this.effects.runDust(this.cat, ms);
    }
    this.obstacles.update(ms, this.cat);
    const catHeight = GAME.GROUND_Y - this.cat.body.bottom;
    const catSpeed = (this.cat.x - this.lastCatX) / (ms / 1000);
    this.lastCatX = this.cat.x;
    // The family can't get into a boss's arena, so the chase is over from then on.
    if (fight?.hasStarted) {
      if (fight.isActive) this.hud.update(fight.healthShare, this.cat.x / this.level.length);
      else this.hud.update(0, this.cat.x / this.level.length);
    } else {
      const events = this.chase.update(ms, {
        catX: this.cat.x,
        catSpeed,
        catHeight,
        catRunning: this.cat.moveVelocity > FREE_MOVE.RUNNING_SPEED,
        ownerOffscreen: this.ownerOffscreen,
        safeForShortcut: this.safeForShortcut,
      });
      this.updateBonusHint();
      if (this.chase.isBeneathCat) this.chaser.hop(); // jumping up at the cat, just out of reach
      events.forEach((event) => this.handleChaseEvent(event));
      this.hud.update(this.tracker.safety, this.cat.x / this.level.length);
      this.updateDanger();
    }
    this.updateHints();
    this.updateCheckpoints();
    this.updateFinalDash();
    if ((this.tracker.isCaught && !fight?.hasStarted) || fight?.livesLeft === 0) this.state.to(STATE.FAILED);
  }

  get ownerOffscreen() {
    return this.tracker.gap > VIEW.CAT_OFFSET + OFFSCREEN_MARGIN;
  }

  // A chaser landing from a shortcut shouldn't catch the cat in the middle of something else.
  get safeForShortcut() {
    const { cat } = this;
    if (GAME.GROUND_Y - cat.body.bottom > ON_ROAD_HEIGHT || cat.body.blocked.right) return false;
    return !this.obstacles.items.some((item) => {
      const ahead = item.x - cat.x;
      return !item.passed && ahead > 0 && ahead < SHORTCUT_CLEAR_AHEAD;
    });
  }

  // Being out of sight makes treats worth double, so a lead is still worth having.
  updateBonusHint() {
    if (!this.level.shortcut) return;
    if (!this.ownerOffscreen) {
      this.toldAboutBonus = false;
    } else if (!this.toldAboutBonus) {
      this.toldAboutBonus = true;
      this.hud.showHint('Out of sight! Treats count double');
    }
  }

  switchMoveMode() {
    if (!this.isPlaying) return;
    const next = this.cat.moveMode === 'free' ? 'hybrid' : 'free';
    this.cat.moveMode = next;
    this.registry.set('moveMode', next);
    this.hud.showHint(MODE_HINTS[next]);
  }

  // The last moments of a finale: a burst of speed, with the screen shaking.
  updateFinalDash() {
    const dash = this.level.finalDash;
    if (!dash || this.finalDashDone || this.cat.x < dash.at) return;
    this.finalDashDone = true;
    const durationMs = dash.seconds * 1000;
    this.cat.applyBoost({ multiplier: dash.multiplier, durationMs });
    this.effects.startSprint(this.cat, durationMs);
    this.hud.showHint(dash.hint);
    this.audio.playSfx('sprint');
    this.cameras.main.shake(durationMs, FINAL_DASH_SHAKE);
  }

  // Warns once as the owner closes in, and keeps tense music playing until the cat pulls away.
  updateDanger() {
    const threshold = this.inDanger ? DANGER_EXIT : DANGER_ENTER;
    const inDanger = this.tracker.safety < threshold;
    if (inDanger === this.inDanger) return;
    this.inDanger = inDanger;
    this.audio.setDanger(inDanger);
    if (inDanger) this.audio.playSfx('danger');
  }

  updateHints() {
    const hints = this.level.hints ?? [];
    if (this.nextHint < hints.length && this.cat.x >= hints[this.nextHint].at) {
      this.hud.showHint(hints[this.nextHint].text);
      this.nextHint += 1;
    }
  }

  // Remembers progress on reaching a checkpoint, for restarting there if caught.
  updateCheckpoints() {
    const checkpoints = this.level.checkpoints ?? [];
    if (this.nextCheckpoint >= checkpoints.length || this.cat.x < checkpoints[this.nextCheckpoint]) return;
    this.savedCheckpoint = {
      x: checkpoints[this.nextCheckpoint],
      treats: this.cat.treats,
      hasPaw: Boolean(this.cat.hasPaw),
      bonusTreats: this.bonusTreats,
      rosterIndex: this.chase.rosterIndex,
    };
    this.nextCheckpoint += 1;
    this.hud.showHint('Checkpoint!');
    this.audio.playSfx('checkpoint');
  }

  handleTreat() {
    this.cat.treats += 1;
    if (this.level.shortcut && this.ownerOffscreen) this.bonusTreats += 1;
    this.hud.setTreats(this.cat.treats + this.bonusTreats);
    this.audio.playSfx('treat');
  }

  syncView() {
    const cam = this.cameras.main;
    this.updateCameraRise();
    cam.scrollY = VIEW.SCROLL_Y - this.cameraRise;
    if (!this.state?.is(STATE.COMPLETE)) this.placeCameraX(cam);
    this.background.sync(cam.scrollX, this.cameraRise);
    if ((this.isPlaying || this.state?.is(STATE.READY)) && !this.chase.isKnockedOut && !this.bossFight?.hasStarted) {
      const simplyChasing = this.chase.phase === 'chasing' && !this.chase.returningMs;
      this.chaser.follow(this.cat.x, this.chase.visibleDistance, this.obstacles.items, simplyChasing, this.lastFrameMs);
    }
    this.syncFollowers();
    this.treats.update(this.time.now, cam.worldView);
    this.obstacles.cull(cam.worldView.x, cam.worldView.right);
    this.catShadow.x = this.cat.x;
    this.chaserShadow.x = this.chaser.x;
    const airHeight = Math.max(0, GAME.GROUND_Y - this.cat.body.bottom);
    this.catShadow.setScale(1 - Math.min(0.5, airHeight / 450));
    this.chaserShadow.setScale(1 - Math.min(0.5, (GAME.GROUND_Y - this.chaser.y) / 300));
  }

  // Follows the cat, unless a boss's arena holds the camera still. It eases from one to the other.
  placeCameraX(cam) {
    const fight = this.bossFight;
    const target = fight?.isActive ? fight.cameraX : this.cat.x - VIEW.CAT_OFFSET;
    if (!fight?.hasStarted || !this.lastFrameMs) {
      cam.scrollX = target;
      return;
    }
    cam.scrollX += (target - cam.scrollX) * (1 - Math.exp(-BOSS.CAMERA_RATE * (this.lastFrameMs / 1000)));
  }

  // The arena has closed. The family are left outside it.
  handleBossStart(fight) {
    this.chaser.setVisible(false);
    this.chaser.hideWarning();
    this.chaserShadow.setVisible(false);
    this.followers.forEach((follower) => follower.setVisible(false));
    this.hud.showEdgeWarning(false);
    this.hud.showBoss(fight.definition.name, fight.definition.character);
    this.hud.setStreak(fight.livesLeft);
    this.hud.showHint(fight.definition.startHint);
    this.audio.setDanger(false);
    this.inDanger = false;
    this.audio.stopMusic();
    this.audio.startMusic(fight.definition.music);
  }

  handleCatHurt(lives) {
    this.hud.setStreak(lives);
    this.audio.playSfx('hit');
    this.cameras.main.shake(200, 0.01);
  }

  handleBossHit() {
    const { boss } = this.bossFight;
    this.effects.stars(boss.x, boss.y - BOSS_MIDDLE_HEIGHT);
    this.audio.playSfx('punch');
    this.cameras.main.shake(240, 0.012);
  }

  handleBossDefeated(fight) {
    this.audio.stopMusic();
    this.audio.playSfx('checkpoint');
    this.audio.startMusic(this.level.music);
    this.hud.hideBoss();
    this.hud.setStreak(0);
    this.hud.showHint(fight.definition.defeatHint);
  }

  // Follows a climbing cat upward. A normal jump never gets high enough to move the camera.
  updateCameraRise() {
    if (!this.lastFrameMs) return;
    const height = this.cameraToRoad ? 0 : GAME.GROUND_Y - this.cat.body.bottom;
    const target = Math.max(0, height - CLIMB_CAMERA.FOLLOW_ABOVE);
    const blend = 1 - Math.exp(-CLIMB_CAMERA.RATE * (this.lastFrameMs / 1000));
    this.cameraRise += (target - this.cameraRise) * blend;
  }

  // The rest of the family runs behind the front chaser, and keeps coming during a knockout.
  syncFollowers() {
    if (!(this.isPlaying || this.state?.is(STATE.READY)) || this.bossFight?.hasStarted) return;
    const base = this.chase.isKnockedOut ? this.tracker.maxGap - PACK_SPACING : this.tracker.gap;
    this.followers.forEach((follower, i) => {
      follower.follow(this.cat.x, base + PACK_SPACING * (i + 1), this.obstacles.items, false);
    });
  }

  handleHit(item) {
    if (!this.isPlaying) return;
    // On catnip, the cat bowls straight through.
    if (this.catnipMs > 0) {
      this.audio.playSfx('punch');
      this.effects.impact(this.cat.x + IMPACT_AHEAD, this.cat.y - IMPACT_HEIGHT, 1.2);
      return;
    }
    this.cat.applyPenalty(item.penalty);
    this.streak.recordHit();
    this.hud.setStreak(0);
    this.effects.stopSprint();
    this.audio.playSfx('hit');
    this.cameras.main.shake(140, 0.006);
    this.effects.impact(this.cat.x + IMPACT_AHEAD, this.cat.y - IMPACT_HEIGHT);
  }

  // The cat is stopped dead, and stays stopped until the player jumps over the wall.
  handleWallHit(item) {
    if (!this.isPlaying) return;
    if (this.cat.moveVelocity < FREE_MOVE.CRASH_SPEED) return; // just walked up to it
    this.cat.loseMomentum();
    this.streak.recordHit();
    this.hud.setStreak(0);
    this.effects.stopSprint();
    this.hud.showHint(item.stuckHint);
    this.audio.playSfx('thud');
    this.cameras.main.shake(180, 0.01);
    this.effects.impact(this.cat.x + IMPACT_AHEAD, this.cat.y - IMPACT_HEIGHT, 1.5);
    this.effects.dust(this.cat.x + IMPACT_AHEAD, this.cat.body.bottom, CRASH_DUST);
  }

  // An acorn from the crow, on the cat's head.
  handleCrowHit() {
    if (!this.isPlaying) return;
    this.crowHits += 1;
    this.handleHit({ penalty: CROW.penalty });
    if (!this.toldAboutCrow) {
      this.toldAboutCrow = true;
      this.hud.showHint('Watch for the shadow, and jump the acorns!');
    }
  }

  // Catnip: for a few seconds the cat runs faster, shimmers, and nothing slows it down.
  startCatnip() {
    this.catnipMs = CATNIP.seconds * 1000;
    this.cat.applyBoost({ multiplier: CATNIP.speedMultiplier, durationMs: this.catnipMs });
    this.effects.startSprint(this.cat, this.catnipMs);
    this.audio.playSfx('sprint');
    this.hud.showHint('Catnip! Nothing can stop you!');
  }

  updateCatnip(ms) {
    if (this.catnipMs <= 0) return;
    this.catnipMs = Math.max(0, this.catnipMs - ms);
    if (this.catnipMs === 0) {
      this.cat.clearTint();
      return;
    }
    const hue = (this.time.now / CATNIP_HUE_MS) % 1;
    this.cat.setTint(Phaser.Display.Color.HSVToRGB(hue, CATNIP_TINT_SATURATION, 1).color);
  }

  // A paw-print block, bumped from below: its treats, or a Super Paw.
  handleBlockBump(item) {
    this.audio.playSfx('bump');
    if (item.reward === 'superPaw') {
      if (!this.cat.hasPaw) this.handlePawPickup();
      return;
    }
    for (let i = 0; i < item.count; i++) this.handleTreat();
  }

  // Through a cat flap: everything on the road until the other flap is skipped.
  handleFlapIn(way) {
    this.audio.playSfx('dive');
    this.catShadow.setVisible(false);
    this.effects.stopSprint();
    for (const item of this.obstacles.items) {
      if (item.x > way.at && item.x < way.exitAt) item.passed = true;
    }
    if (!this.toldAboutFlap) {
      this.toldAboutFlap = true;
      this.hud.showHint('Through the cat flap! A shortcut through the gardens');
    }
  }

  // Out of the other flap, further ahead of the chaser than when the cat went in.
  handleFlapOut() {
    this.catShadow.setVisible(true);
    this.tracker.adjust(CAT_FLAP_LEAD);
    this.effects.puff(this.cat.x, GAME.GROUND_Y);
    this.audio.playSfx('bounce');
  }

  // Into a ditch: a splash, and the cat has to jump back out while the chaser closes in.
  handleFallIn() {
    if (!this.isPlaying) return;
    this.streak.recordHit();
    this.hud.setStreak(0);
    this.effects.stopSprint();
    this.effects.puff(this.cat.x, this.cat.body.bottom, DITCH_SPLASH);
    this.audio.playSfx('splat');
    if (!this.toldAboutDitch) {
      this.toldAboutDitch = true;
      this.hud.showHint('In the ditch! Jump out!');
    }
  }

  // A long drop: dust, a thump, and a burst of speed that rewards taking the high road.
  handleBigLand() {
    if (!this.isPlaying) return;
    this.effects.puff(this.cat.x, this.cat.body.bottom);
    this.effects.dust(this.cat.x, this.cat.body.bottom, CRASH_DUST);
    this.cameras.main.shake(180, BIG_LAND.SHAKE);
    this.cat.applyBoost({ multiplier: BIG_LAND.MULTIPLIER, durationMs: BIG_LAND.DURATION_MS });
    this.effects.startSprint(this.cat, BIG_LAND.DURATION_MS);
    this.audio.playSfx('sprint');
  }

  // Enough clean passes in a row earn a sprint, which pulls the cat away from the owner.
  handleAvoided() {
    if (!this.isPlaying) return;
    const earnedSprint = this.streak.recordAvoided();
    this.hud.setStreak(this.streak.count);
    if (!earnedSprint) return;
    this.cat.applyBoost({ multiplier: SPRINT.MULTIPLIER, durationMs: SPRINT.DURATION_MS });
    this.effects.startSprint(this.cat, SPRINT.DURATION_MS);
    this.hud.showHint('Sprint!');
    this.audio.playSfx('sprint');
  }

  handleChaseEvent(event) {
    switch (event) {
      case 'warn':
        if (!this.toldAboutLunge) {
          this.toldAboutLunge = true;
          this.hud.showHint('Lunge! Jump as they dash');
        }
        this.chaser.windUp();
        this.audio.playSfx('lungeWarn');
        break;
      case 'dash':
        this.chaser.dash();
        this.audio.playSfx('lungeDash');
        break;
      case 'grabbed':
        this.handleGrabbed();
        break;
      case 'dodged':
        this.chaser.fallDown();
        this.audio.playSfx('lungeMiss');
        this.handleAvoided();
        break;
      case 'recovered':
        this.chaser.startRunning();
        break;
      case 'returned':
        this.followers.shift()?.remove();
        this.chaser.comeBack(this.chase.chaser.character);
        this.hud.setChaser(this.chase.chaser.character);
        this.chaserShadow.setVisible(true);
        this.audio.playSfx('chaserBack');
        if (this.chase.chaser.arrival) this.hud.showHint(this.chase.chaser.arrival);
        break;
      case 'climbWarn':
        this.hud.showHint('They\'re climbing up! Move!');
        this.hud.showEdgeWarning(true);
        this.audio.playSfx('chaserRush');
        break;
      case 'climbCancel':
      case 'climbCatch':
        this.hud.showEdgeWarning(false);
        break;
      case 'shortcutWarn':
        this.hud.showHint('Look out! They know a shortcut!');
        this.hud.showEdgeWarning(true);
        this.audio.playSfx('chaserRush');
        break;
      case 'shortcutArrive':
        this.hud.showEdgeWarning(false);
        this.audio.playSfx('chaserBack');
        this.chaser.dropIn(() => {
          this.effects.puff(this.chaser.x, GAME.GROUND_Y);
          this.cameras.main.shake(140, 0.005);
        });
        break;
      default:
        break;
    }
  }

  handleGrabbed() {
    this.grabs += 1;
    this.cat.applyPenalty(GRAB_PENALTY);
    this.streak.recordHit();
    this.hud.setStreak(0);
    this.effects.stopSprint();
    this.chaser.stumble();
    this.audio.playSfx('hit');
    this.cameras.main.shake(200, 0.009);
  }

  handlePawPickup() {
    this.cat.hasPaw = true;
    this.hud.setPawReady(true);
    this.hud.showHint('Super Paw! Press E to use it');
    this.audio.playSfx('pawPickup');
  }

  // Fires the Super Paw at a boss.
  usePawOnBoss(fight) {
    this.cat.hasPaw = false;
    this.pawFiring = true;
    this.hud.setPawReady(false);
    const { boss } = fight;
    this.effects.punch(this.cat, () => boss.x, boss.y - BOSS_MIDDLE_HEIGHT, () => {
      this.pawFiring = false;
      if (this.isPlaying) fight.pawHit();
    });
  }

  // Fires the Super Paw, if the cat has one and there's someone to hit.
  usePaw() {
    if (!this.isPlaying || !this.cat.hasPaw || this.pawFiring) return;
    if (this.bossFight?.isActive) {
      this.usePawOnBoss(this.bossFight);
      return;
    }
    if (this.chase.isKnockedOut || this.bossFight?.hasStarted) return;
    this.cat.hasPaw = false;
    this.pawFiring = true;
    this.hud.setPawReady(false);
    const targetY = this.chaser.y - 130;
    this.effects.punch(this.cat, () => this.chaser.x + 50, targetY, () => {
      this.pawFiring = false;
      if (!this.isPlaying) return;
      const counter = this.chase.knockOut();
      this.effects.stars(this.chaser.x, targetY);
      this.chaser.flyOff();
      this.hud.showEdgeWarning(false);
      this.chaserShadow.setVisible(false);
      this.audio.setDanger(false);
      this.inDanger = false;
      this.audio.playSfx('punch');
      this.cameras.main.shake(260, 0.014);
      this.hud.showHint(counter ? 'Perfect counter!' : 'Knocked out!');
    });
  }

  handleEscape() {
    if (this.isPlaying) this.state.to(STATE.COMPLETE);
  }

  togglePause() {
    if (this.isPlaying) this.state.to(STATE.PAUSED);
    else if (this.state.is(STATE.PAUSED)) this.state.to(STATE.PLAYING);
  }

  onStateChange(next) {
    if (next === STATE.PLAYING) this.resumeOrBegin();
    else if (next === STATE.PAUSED) this.enterPause();
    else if (next === STATE.COMPLETE) this.enterComplete();
    else if (next === STATE.FAILED) this.enterFailed();
  }

  resumeOrBegin() {
    this.overlay.hide();
    if (this.physics.world.isPaused) {
      this.physics.resume();
      this.anims.resumeAll();
      this.tweens.resumeAll();
      this.time.paused = false;
      this.audio.resumeMusic();
      return;
    }
    this.cat.startRunning();
    this.chaser.startRunning();
    this.followers.forEach((follower) => follower.startRunning());
    this.audio.startMusic(this.level.music);
    if (this.level.startHint) this.hud.showHint(this.level.startHint);
    // A title card when starting from the beginning, not when carrying on from a checkpoint.
    if (!this.startPoint) this.screenFx.showTitle({ number: this.level.name, title: this.level.title, world: worldName(this.level) });
  }

  // The two sound toggles, shared by menus. Pressing one redraws its menu with the new label.
  soundToggles(redraw) {
    const { music, sound } = this.audio.settings;
    return [
      { label: `Music: ${music ? 'On' : 'Off'}`, onClick: () => { this.audio.toggleMusic(); redraw(); } },
      { label: `Sound: ${sound ? 'On' : 'Off'}`, onClick: () => { this.audio.toggleSound(); redraw(); } },
    ];
  }

  enterPause() {
    this.physics.pause();
    this.anims.pauseAll();
    this.tweens.pauseAll();
    this.time.paused = true;
    this.controls.releaseSteering();
    this.audio.pauseMusic();
    this.showPauseScreen();
  }

  showPauseScreen() {
    this.overlay.show({
      title: 'Paused',
      actions: [
        { label: 'Restart', onClick: () => this.loadLevel(this.levelIndex) },
        { label: 'Resume', primary: true, onClick: () => this.togglePause() },
        { label: 'Levels', onClick: () => this.openScreen(this.levelIndex, 'levels') },
        ...this.soundToggles(() => this.showPauseScreen()),
      ],
    });
  }

  enterComplete() {
    this.audio.stopMusic();
    this.audio.playSfx('escape');
    this.obstacles.stopMovers();
    this.crows.stop();
    this.progress.record(this.level.id, starsFor(this.starResult), this.cat.treats + this.bonusTreats, this.foundMouse);
    this.followers.forEach((follower) => follower.giveUp());
    this.chaser.giveUp();
    this.chaserShadow.setVisible(false);
    // The cat keeps running through the gate and disappears, to cheers and confetti.
    this.tweens.add({ targets: [this.cat, this.catShadow], alpha: 0, duration: 450, delay: 150 });
    this.effects.confetti(this.gate.x, this.gate.y - this.gate.displayHeight * 0.75);
    this.effects.sparkle(this.gate.x, this.gate.y - this.gate.displayHeight * 0.5);
    this.cameras.main.flash(220, 255, 250, 225);
    this.screenFx.showBanner('Escaped!');
    this.time.delayedCall(END_SCREEN_DELAY_MS, () => this.showCompleteScreen());
  }

  // The screen after being caught, or beaten.
  showCaughtScreen(message) {
    this.overlay.show({
      title: 'Caught!',
      message,
      actions: this.savedCheckpoint
        ? [
          { label: 'Restart level', onClick: () => this.loadLevel(this.levelIndex) },
          // Being caught counts as being grabbed, even when the run carries on from a checkpoint.
          { label: 'Continue from checkpoint', primary: true, onClick: () => this.loadLevel(this.levelIndex, { ...this.savedCheckpoint, grabs: this.grabs + 1, foundMouse: this.foundMouse }) },
        ]
        : [{ label: 'Try again', primary: true, onClick: () => this.loadLevel(this.levelIndex) }],
    });
  }

  // Beaten by a boss, who is very pleased with himself.
  enterBeaten(fight) {
    this.audio.stopMusic();
    this.audio.playSfx('caught');
    this.obstacles.stopMovers();
    this.crows.stop();
    this.cat.beCaught();
    fight.gloat();
    this.time.delayedCall(END_SCREEN_DELAY_MS, () => this.showCaughtScreen(fight.definition.beatenMessage));
  }

  enterFailed() {
    if (this.bossFight?.hasStarted) {
      this.enterBeaten(this.bossFight);
      return;
    }
    const { catchMessage, catchSound } = this.chase.chaser;
    const hugs = this.chaser.canHug;
    this.audio.stopMusic();
    this.audio.playSfx(catchSound ?? 'caught');
    this.obstacles.stopMovers();
    this.crows.stop();
    this.cat.beCaught();
    this.followers.forEach((follower) => follower.pose('idle'));
    // A chaser who climbed up leaps to the cat's ledge, and comes back down holding it.
    const feetY = this.chase.climbedUp ? this.cat.body.bottom : GAME.GROUND_Y;
    this.chaser.lungeAt(this.cat.x, feetY);
    if (hugs) {
      // The cat is part of the hug frames, so it disappears into their arms.
      this.time.delayedCall(HUG_START_MS, () => {
        this.cat.setVisible(false);
        this.catShadow.setVisible(false);
        this.chaser.hug(this.cat.x, feetY);
        this.cameraToRoad = true;
      });
    }
    this.time.delayedCall(hugs ? HUG_SCREEN_DELAY_MS : END_SCREEN_DELAY_MS, () => {
      this.showCaughtScreen(catchMessage ?? "Into the bath you go. There's still time for one more try.");
    });
  }

  showStartScreen() {
    const { hasStarted, nextIndex } = this.progress;
    if (!this.homeShown) {
      this.homeShown = true;
      showHomeScreen(this);
    }
    this.playHomeMusic();
    this.overlay.show({
      layout: 'home',
      title: 'Cat Escape',
      image: HOME_ANIMATION,
      message: "It's bath day, and the whole family wants to catch you. Run to the park!\nArrows: run. Space: jump, and again in the air. Down: slide. E: use a Super Paw.",
      actions: [
        { label: hasStarted ? 'Continue' : 'Play', primary: true, onClick: () => this.openScreen(nextIndex, 'intro') },
        { label: 'Levels', onClick: () => this.showLevelsScreen() },
        ...this.soundToggles(() => this.showStartScreen()),
      ],
    });
  }

  // The home screen's tune. Browsers only allow sound after a click or a key press, so before the
  // first one it waits, and starts then if the home screen is still showing.
  playHomeMusic() {
    if (this.audio.track === HOME_MUSIC.track) return;
    if (this.audio.ctx) {
      this.audio.startMusic(HOME_MUSIC);
      return;
    }
    const start = () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      this.audio.unlock();
      const onHome = this.overlay.root.classList.contains('home') || this.overlay.content.childElementCount > 0;
      if (onHome && this.audio.track === null) this.audio.startMusic(HOME_MUSIC);
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
  }

  // The level menu: a road from home to the parks, with a stop for each level.
  showLevelsScreen() {
    const stops = LEVELS.map((level, index) => {
      const result = this.progress.resultFor(level.id);
      const locked = !this.progress.isUnlocked(index);
      return {
        number: index + 1,
        title: level.title,
        detail: locked ? 'Locked' : `${starText(result?.stars ?? 0)}${result?.mouse ? ' 🐭' : ''}`,
        world: worldName(level),
        locked,
        current: index === this.progress.nextIndex,
        boss: level.boss ? BOSSES[level.boss.type].character : null,
        onPick: () => this.openScreen(index, 'intro'),
      };
    });
    this.overlay.show({
      title: 'Choose a level',
      message: `${this.progress.totalStars} of ${LEVELS.length * 3} stars, ${this.progress.totalMice} of ${LEVELS.length} toy mice`,
      content: journeyMap({ stops, instant: this.screenFx.instant }),
      actions: [{ label: 'Back', primary: true, onClick: () => this.openScreen(this.levelIndex, 'menu') }],
    });
  }

  showIntroScreen() {
    const { level } = this;
    this.overlay.show({
      title: level.title,
      message: `${level.name}\n${level.intro}`,
      actions: [
        { label: 'Levels', onClick: () => this.showLevelsScreen() },
        { label: 'Run!', primary: true, onClick: () => this.state.to(STATE.PLAYING) },
      ],
    });
  }

  showCompleteScreen() {
    const next = this.levelIndex + 1;
    const outro = this.level.outro ?? 'You got away, for now.';
    if (next < LEVELS.length) {
      this.overlay.show({
        title: 'Level complete!',
        image: ESCAPE_ANIMATION,
        message: `${outro}\n${this.treatSummary()}`,
        actions: [
          { label: 'Replay', onClick: () => this.openScreen(this.levelIndex, 'intro') },
          { label: 'Levels', onClick: () => this.openScreen(this.levelIndex, 'levels') },
          { label: 'Next level', primary: true, onClick: () => this.openScreen(next, 'intro') },
        ],
      });
    } else {
      this.overlay.show({
        title: 'You escaped!',
        image: ESCAPE_ANIMATION,
        message: `${outro}\n${this.treatSummary()}\nYou've earned ${this.progress.totalStars} of ${LEVELS.length * 3} stars.`,
        actions: [
          { label: 'Levels', onClick: () => this.openScreen(this.levelIndex, 'levels') },
          { label: 'Play again', primary: true, onClick: () => this.openScreen(0, 'intro') },
        ],
      });
    }
  }

  get starResult() {
    return { collected: this.cat.treats, total: this.treats.total, grabs: this.grabs };
  }

  // The stars earned, and what each one was for, so the player knows how to earn the rest.
  treatSummary() {
    const goals = starGoals(this.starResult);
    const mark = (done) => (done ? '✓' : '✗');
    const lines = [
      `${starText(starsFor(this.starResult))}`,
      `${mark(goals.treats)} ${this.cat.treats} of ${this.treats.total} treats   ${mark(goals.untouched)} ${goals.untouched ? 'Never grabbed' : 'Grabbed'}`,
    ];
    if (this.bonusTreats > 0) lines.push(`+${this.bonusTreats} bonus treats while out of sight`);
    lines.push(this.foundMouse ? '🐭 You found the toy mouse!' : 'A toy mouse is hiding somewhere here.');
    return lines.join('\n');
  }

  // Loads a level without starting it, showing one of the menus over it.
  openScreen(levelIndex, screen) {
    this.screenFx.cover(() => {
      this.time.paused = false;
      this.audio.stopMusic();
      this.anims.resumeAll();
      this.overlay.hide();
      this.scene.restart({ levelIndex, autoStart: false, screen });
    });
  }

  // Loads a level and starts it straight away.
  loadLevel(levelIndex, checkpoint = null) {
    this.screenFx.cover(() => {
      this.time.paused = false;
      this.audio.stopMusic();
      this.anims.resumeAll();
      this.overlay.hide();
      this.scene.restart({ levelIndex, autoStart: true, checkpoint });
    });
  }
}
