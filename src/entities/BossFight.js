import { BOSS, GAME } from '../config/gameConfig.js';
import { BOSSES } from '../data/bosses.js';
import { OBSTACLES } from '../data/obstacles.js';
import { THEMES } from '../data/themes.js';
import { BossDirector } from '../systems/BossDirector.js';
import { Boss } from './Boss.js';
import { GunnerBoss } from './GunnerBoss.js';

// The code that moves each style of boss. See data/bosses.js.
const STYLES = { brawler: Boss, gunner: GunnerBoss };

const WALL_THICKNESS = 60;
const WALL_BODY_HEIGHT = 1600;
const WALL_DROP_MS = 300;
const WALL_DROP_FROM = 700;
const FLASH_MS = 120;
const OPEN_MS = 500;

// One boss fight, from the arena closing to the way out opening. The scene is told what happens
// through handleBossStart, handleCatHurt, handleBossHit and handleBossDefeated.
export class BossFight {
  constructor(scene, { type, at }) {
    this.scene = scene;
    this.definition = BOSSES[type];
    this.director = new BossDirector(this.definition);
    this.left = at;
    this.right = at + BOSS.ARENA_WIDTH;
    this.livesLeft = BOSS.LIVES;
    this.hasStarted = false;
    this.isOver = false;
    this.safeMs = 0;
    this.toldNotYet = false;
    this.cat = null;
    const { theme } = scene.level;
    this.wallTexture = OBSTACLES[THEMES[theme].swap?.gateWall ?? 'gateWall'].texture;
    const BossStyle = STYLES[this.definition.style];
    this.boss = new BossStyle(scene, this.right - BOSS.WALL_MARGIN * 2, this.definition, this.director);
    // He waits in front of the far wall, in plain sight, as the cat runs in.
    this.rightWall = this.addWallArt(this.right);
  }

  addWallArt(x) {
    return this.scene.add.image(x, GAME.GROUND_Y + GAME.GROUND_OVERLAP, this.wallTexture).setOrigin(0.5, 1).setDepth(4);
  }

  addWallBody(x) {
    const wall = this.scene.add.zone(x, GAME.GROUND_Y - WALL_BODY_HEIGHT / 2, WALL_THICKNESS, WALL_BODY_HEIGHT);
    this.scene.physics.add.existing(wall, true);
    return wall;
  }

  get isActive() {
    return this.hasStarted && !this.isOver;
  }

  get healthShare() {
    return this.director.health / this.definition.health;
  }

  // Centers the arena on screen.
  get cameraX() {
    return (this.left + this.right) / 2 - GAME.WIDTH / 2;
  }

  start(cat) {
    this.hasStarted = true;
    this.cat = cat;
    const { scene } = this;
    const leftArt = this.addWallArt(this.left);
    const landedY = leftArt.y;
    leftArt.y = landedY - WALL_DROP_FROM;
    scene.tweens.add({ targets: leftArt, y: landedY, duration: WALL_DROP_MS, ease: 'Quad.easeIn' });
    this.leftWallArt = leftArt;
    this.leftWall = this.addWallBody(this.left);
    this.rightWallBody = this.addWallBody(this.right);
    scene.physics.add.collider(cat, [this.leftWall, this.rightWallBody]);
    scene.physics.add.overlap(cat, this.boss.hitZone, () => this.handleTouch());
    this.director.start();
    scene.audio.playSfx('thud');
    scene.cameras.main.shake(180, 0.008);
    scene.handleBossStart(this);
  }

  // Coming down on his head is a stomp. Otherwise, touching him only hurts during an attack.
  handleTouch() {
    const { cat, director } = this;
    if (!this.isActive || director.state === 'hurt') return;
    const zoneTop = this.boss.hitZone.body.top;
    if (cat.body.velocity.y > 0 && cat.body.bottom <= zoneTop + BOSS.STOMP_TOLERANCE) {
      this.handleStomp();
    } else if (director.isDangerous) {
      this.hurtCat();
    }
  }

  handleStomp() {
    const { cat, director, scene } = this;
    cat.bounce(BOSS.STOMP_BOUNCE);
    if (director.isVulnerable) {
      this.applyHit(director.hit());
    } else if (!this.toldNotYet) {
      this.toldNotYet = true;
      scene.hud.showHint(this.definition.notYetHint);
    }
  }

  // A Super Paw lands whatever he's doing.
  pawHit() {
    this.applyHit(this.director.hit({ always: true }));
  }

  applyHit(events) {
    if (events.length === 0) return;
    this.scene.handleBossHit();
    this.handleEvents(events);
  }

  hurtCat() {
    const { cat, scene, boss } = this;
    if (this.safeMs > 0 || this.livesLeft === 0) return;
    this.livesLeft -= 1;
    this.safeMs = BOSS.HURT_SAFE_MS;
    cat.applyPenalty(BOSS.HURT_PENALTY);
    cat.setVelocityY(BOSS.KNOCK_UP_VELOCITY);
    cat.moveVelocity = cat.x < boss.x ? -BOSS.KNOCK_BACK_SPEED : BOSS.KNOCK_BACK_SPEED;
    scene.tweens.add({ targets: cat, alpha: 0.35, duration: FLASH_MS, yoyo: true, repeat: Math.floor(BOSS.HURT_SAFE_MS / (FLASH_MS * 2)) - 1, onComplete: () => cat.setAlpha(1) });
    scene.handleCatHurt(this.livesLeft);
  }

  handleEvents(events) {
    for (const event of events) {
      this.boss.handleEvent(event, this.cat);
      const { attackData } = this.director;
      if (event === 'attackWindup') this.playSound(attackData.warnSound, 'lungeWarn');
      if (event === 'attackActive') this.playSound(attackData.sound, 'lungeDash');
      if (event === 'defeated') this.finish();
    }
  }

  // An attack's own sound, or the usual one when it names none. null means silence.
  playSound(name, usual) {
    const sound = name === undefined ? usual : name;
    if (sound) this.scene.audio.playSfx(sound);
  }

  // The far wall comes down, and the cat is free to run on.
  finish() {
    this.isOver = true;
    const { scene } = this;
    scene.handleBossDefeated(this);
    this.rightWallBody.destroy();
    this.leftWall.destroy();
    scene.tweens.add({ targets: this.rightWall, y: this.rightWall.y + WALL_DROP_FROM, alpha: 0, duration: OPEN_MS, ease: 'Quad.easeIn' });
    this.boss.hitZone.destroy();
    this.boss.clearAttacks?.();
  }

  gloat() {
    this.boss.gloat();
  }

  update(ms, cat) {
    if (!this.hasStarted) {
      if (cat.x >= this.left + BOSS.ENTER_BEFORE_LOCK) this.start(cat);
      return;
    }
    if (this.isOver) return;
    this.safeMs = Math.max(0, this.safeMs - ms);
    this.handleEvents(this.director.update(ms));
    const limits = { left: this.left + BOSS.WALL_MARGIN, right: this.right - BOSS.WALL_MARGIN };
    const outcome = this.boss.update(ms, limits, cat);
    if (outcome === 'crash') {
      this.scene.audio.playSfx('thud');
      this.scene.cameras.main.shake(220, 0.012);
    }
    if (outcome) this.handleEvents(this.director.finishActive());
    if (this.boss.reaches(cat)) this.hurtCat();
  }
}
