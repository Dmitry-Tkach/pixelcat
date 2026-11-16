import Phaser from 'phaser';
import { ROOTBREAKER, armPose, coreDamage, nextAttack, rbKey, rootbreakerPhase } from '../data/adventure/rootbreaker.js';
import { TILE } from '../systems/adventureMap.js';
import { landsFromAbove } from '../systems/adventurePlatformLanding.js';

// The Rootbreaker, played (data/adventure/rootbreaker.js for his rules and numbers). He's his own
// boss, nothing like the troll: he stands behind his arena and never walks; his arms reach out from
// the green rings at his shoulders, bending at a glowing elbow, to fists that fight; only his open
// core can be hurt. The scene fights him the way it fights any boss: it starts him, updates him,
// aims the cat's rounds at `sprite` (his core) through takeHit, reads `brain` for his health bar,
// and frames `frame` with the camera. He hurts the cat himself (onHurtCat), so the scene doesn't
// ask what touching him does (ownTouch).
//
// Every move has its weight: a wind-up the cat can read, a fast strike, a hard impact, and a heavy
// recovery. Between attacks he breathes and his eyes follow the cat. His arm bones are drawn in
// code until the owner draws them (prompts/forest-level/22-rootbreaker-arms.md).
const DEPTH = { body: 1.8, face: 1.81, glow: 1.815, core: 1.82, arm: 5.7, elbow: 5.72, fist: 5.8, seal: 5.81, shot: 6.3, warn: 6.35, laser: 6.4 };
const STAND_IN = { bone: 'adventure-rb-bone', elbow: 'adventure-rb-elbow' };
const WAVE_COLOUR = 0x7dff6a;
const ROCK_SHADOW = { w: 90, h: 16, alpha: 0.45 };
const FLASH_MS = 90;
const CORE_CLOSING_MS = 700; // the core flickers this long before it shuts
const TRAIL = { ghosts: 4, alpha: 0.35 }; // fading copies behind a fast fist

export class AdventureRootbreaker {
  // col: his middle's column; floor: the arena floor's surface row; arena: its first and last open
  // columns.
  constructor(scene, { col, floor, arena, cat, onHurtCat, onDefeated, onShake }) {
    this.scene = scene;
    this.cat = cat;
    this.onHurtCat = onHurtCat;
    this.onDefeated = onDefeated;
    this.onShake = onShake;
    this.x = col * TILE + TILE / 2;
    this.floorY = floor * TILE;
    this.left = arena.left * TILE;
    this.right = (arena.right + 1) * TILE;
    this.name = ROOTBREAKER.name;
    this.ownTouch = true;
    this.phaseMarks = ROOTBREAKER.phases.slice(1).map((phase) => phase.from);
    this.hp = ROOTBREAKER.health;
    this.clock = 0;
    this.started = false;
    this.halted = false;
    this.defeated = false;
    this.coreOpen = false;
    this.coreMs = 0;
    this.faceNod = 0;
    this.attackCount = 0;
    this.leftovers = [];
    this.lean = { x: 0, y: 0 }; // his body's lean and flinch, easing back (px)
    const r = ROOTBREAKER;
    makeStandIns(scene);

    // His body, standing on the floor behind the arena; his face, his core and its glow over it.
    this.body = scene.add.image(this.x, this.floorY, rbKey('rb-body')).setOrigin(0.5, 1).setScale(r.scale.body).setDepth(DEPTH.body);
    this.size = { w: this.body.displayWidth, h: this.body.displayHeight };
    this.face = scene.add.image(0, 0, rbKey('rb-face-calm')).setScale(r.scale.body).setDepth(DEPTH.face);
    this.coreGlow = scene.add.image(0, 0, 'fx-dot').setTint(0x7dff6a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow).setAlpha(0);
    this.core = scene.add.image(0, 0, rbKey('rb-core-closed')).setScale(r.scale.body).setDepth(DEPTH.core);
    this.eyeGlows = [-1, 1].map(() => scene.add.image(0, 0, 'fx-dot').setTint(0x9dff7a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.warn).setAlpha(0));
    // What the cat's rounds aim at: his core. Rounds into his stone elsewhere stop.
    this.sprite = scene.physics.add.image(0, 0, rbKey('rb-core-closed')).setScale(r.scale.body * 0.8).setVisible(false);
    this.sprite.body.setAllowGravity(false).setImmovable(true);
    this.stone = scene.add.zone(this.x, this.floorY - this.size.h / 2, this.size.w * 0.8, this.size.h);
    scene.physics.add.existing(this.stone, true);
    // The camera frames his whole arena while he fights.
    this.frame = { left: this.left, right: this.right, top: this.floorY - r.camera.above, bottom: this.floorY + r.camera.below };

    // His arms: an upper arm, a glowing elbow, a forearm, and the fist; a stuck fist is a step.
    this.fistGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.arms = [-1, 1].map((side, i) => {
      const fist = scene.physics.add.image(0, 0, rbKey('rb-fist')).setScale(r.scale.fist).setDepth(DEPTH.fist).setFlipX(side > 0);
      this.fistGroup.add(fist);
      fist.body.setAllowGravity(false).setImmovable(true).setSize(fist.width * 0.8, fist.height * 0.7);
      const arm = {
        side, fist, shoulderAt: r.shoulders[i], state: 'rest', speed: 1, sealHits: 0, cracked: false, shake: 0,
        upper: scene.add.image(0, 0, STAND_IN.bone).setOrigin(0, 0.5).setDepth(DEPTH.arm),
        fore: scene.add.image(0, 0, STAND_IN.bone).setOrigin(0, 0.5).setDepth(DEPTH.arm),
        elbow: scene.add.image(0, 0, STAND_IN.elbow).setDepth(DEPTH.elbow),
        seal: scene.add.image(0, 0, rbKey('rb-seal-cracked')).setScale(0.3, 0.55).setDepth(DEPTH.seal).setVisible(false),
        ghosts: Array.from({ length: TRAIL.ghosts }, () => scene.add.image(0, 0, rbKey('rb-fist')).setScale(r.scale.fist).setDepth(DEPTH.fist - 0.01).setAlpha(0)),
        trail: [],
      };
      arm.goal = this.restOf(arm); // where the fist is heading: its moves tween it
      fist.arm = arm;
      return arm;
    });
    scene.physics.add.collider(cat, this.fistGroup, null, (cat_, fist) => fist.arm.state === 'stuck' && landsFromAbove({
      bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height, top: fist.body.top, vy: cat.body.velocity.y,
    }));
    this.pose();

    const self = this;
    this.brain = {
      get isDefeated() { return self.defeated; },
      get healthShare() { return Math.max(0, self.hp / ROOTBREAKER.health); },
      get isInvulnerable() { return !self.coreOpen; },
    };
    // The arena's own business (the scene updates it, and shakes it).
    this.arena = { update: () => {}, shake: () => scene.cameras.main.shake(200, 0.006) };
  }

  get phase() {
    return rootbreakerPhase(this.brain.healthShare);
  }

  // ----- His body, face, core and arms, placed each frame -----

  // Where a fist rests: beside him, drifting a little.
  restOf(arm) {
    const { fistRest, idle } = ROOTBREAKER;
    return {
      x: this.x + arm.side * fistRest.out + Math.sin(this.clock / 900 + arm.side) * 6,
      y: this.floorY - fistRest.up + Math.sin((2 * Math.PI * this.clock) / idle.breatheMs + arm.side) * 10,
    };
  }

  // Places everything for this frame: the body breathing and leaning, his eyes following the cat,
  // the core, and each arm reaching for its fist's goal.
  pose() {
    const r = ROOTBREAKER;
    const breathe = this.defeated ? 0 : Math.sin((2 * Math.PI * this.clock) / r.idle.breatheMs) * r.idle.breathePx;
    if (!this.defeated) this.body.setPosition(this.x + this.lean.x, this.floorY + breathe + this.lean.y);
    const top = this.body.y - this.size.h, left = this.body.x - this.size.w / 2;
    const on = (at) => ({ x: left + at.x * this.size.w, y: top + at.y * this.size.h });
    const look = this.defeated ? 0 : Phaser.Math.Clamp((this.cat.x - this.x) / 600, -1, 1) * r.idle.eyesPx;
    const faceAt = on(r.faceAt), coreAt = on(r.coreAt);
    if (!this.defeated) {
      this.face.setPosition(faceAt.x + look, faceAt.y + this.faceNod);
      this.core.setPosition(coreAt.x, coreAt.y);
    }
    this.coreGlow.setPosition(coreAt.x, coreAt.y);
    this.sprite.body.reset(coreAt.x, coreAt.y);
    this.mouth = { x: this.face.x, y: this.face.y + this.face.displayHeight * 0.2 };
    this.eyes = [-1, 1].map((s) => ({ x: this.face.x + s * this.face.displayWidth * 0.11, y: this.face.y - this.face.displayHeight * 0.04 }));
    this.eyeGlows.forEach((glow, i) => glow.setPosition(this.eyes[i].x, this.eyes[i].y));
    for (const arm of this.arms) this.poseArm(arm, on(arm.shoulderAt));
  }

  // One arm: its fist goes where its goal is, as near as the arm reaches; the wrist is on the fist's
  // body side; the bones and the elbow fill in between, the elbow bending outward.
  poseArm(arm, shoulder) {
    if (arm.state === 'dead') return;
    const r = ROOTBREAKER;
    const { fist } = arm;
    const wristOff = -arm.side * fist.displayWidth * r.wrist; // toward his body
    const { elbow, wrist } = armPose(shoulder, { x: arm.goal.x + wristOff, y: arm.goal.y }, r.arm, arm.side);
    const x = wrist.x - wristOff + arm.shake, y = wrist.y;
    fist.body.reset(x, y);
    arm.seal.setPosition(wrist.x, y).setVisible(arm.cracked);
    bone(arm.upper, shoulder, elbow, r.arm.thick);
    bone(arm.fore, elbow, wrist, r.arm.thick * 0.85);
    arm.elbow.setPosition(elbow.x, elbow.y).setDisplaySize(r.arm.elbow * 2, r.arm.elbow * 2);
    // Fast, it leaves fading copies behind.
    arm.trail.unshift({ x, y });
    if (arm.trail.length > TRAIL.ghosts * 2 + 1) arm.trail.pop();
    const fast = arm.state === 'drop' || arm.state === 'sweeping';
    arm.ghosts.forEach((ghost, i) => {
      const at = arm.trail[Math.min(arm.trail.length - 1, (i + 1) * 2)];
      ghost.setPosition(at.x, at.y).setFlipX(fist.flipX).setAlpha(fast ? TRAIL.alpha * (1 - i / TRAIL.ghosts) : 0);
    });
  }

  // ----- The fight's life -----

  start() {
    this.started = true;
    this.roar(1200, 0.01);
    this.state = 'rest';
    this.stateMs = ROOTBREAKER.restMs * 1.5;
    // Rounds into his stone stop there, sparking; over his open core, the scene's overlap with
    // `sprite` takes them. Rounds into a fist stop on it, and in phase 2 a stuck one's seal cracks.
    const { moves } = this.scene;
    const bulletOf = (a, b) => (moves.bullets.contains(a) ? a : b);
    this.scene.physics.add.overlap(moves.bullets, this.stone, (a, b) => {
      const bullet = bulletOf(a, b);
      if (!bullet.active || this.coreHitBy(bullet)) return;
      this.spark(bullet.x, bullet.y);
      moves.bulletStops(bullet);
    });
    this.scene.physics.add.overlap(moves.bullets, this.fistGroup, (a, b) => {
      const bullet = bulletOf(a, b);
      if (!bullet.active || this.defeated) return;
      if (!this.shootSeal(bullet.x, bullet.y)) this.spark(bullet.x, bullet.y);
      moves.bulletStops(bullet);
    });
  }

  coreHitBy(bullet) {
    return this.coreOpen && this.sprite.getBounds().contains(bullet.x, bullet.y);
  }

  halt() {
    this.halted = true;
  }

  // A roar: his mouth wide, the screen shaking, moss and pebbles falling off him.
  roar(ms, strength) {
    this.setFace('blast', ms);
    this.scene.audio.playSfx('guardianRoar');
    this.scene.cameras.main.shake(ms, strength);
    this.debris(10);
  }

  // Pebbles and moss falling off his body.
  debris(count) {
    for (let i = 0; i < count; i++) {
      const x = this.x + Phaser.Math.Between(-this.size.w / 2.4, this.size.w / 2.4);
      const y = this.floorY - Phaser.Math.Between(this.size.h * 0.3, this.size.h * 0.9);
      const bit = this.scene.add.image(x, y, rbKey(`rb-rock-${1 + (i % 2)}`)).setScale(Phaser.Math.FloatBetween(0.12, 0.22)).setDepth(DEPTH.core + 0.01);
      this.scene.tweens.add({
        targets: bit, y: this.floorY - 6, angle: Phaser.Math.Between(-180, 180), duration: Phaser.Math.Between(500, 900), ease: 'Quad.easeIn',
        delay: Phaser.Math.Between(0, 300),
        onComplete: () => this.scene.tweens.add({ targets: bit, alpha: 0, duration: 400, onComplete: () => bit.destroy() }),
      });
    }
  }

  // A round, a blast or a move reached his core: it hurts only while open.
  takeHit(kind, x, y) {
    if (this.defeated) return;
    const damage = coreDamage(kind, this.coreOpen);
    if (!damage) {
      this.spark(x, y);
      return;
    }
    const before = this.phase.index;
    this.hp = Math.max(0, this.hp - damage);
    this.core.setTintFill(0xffffff);
    this.scene.time.delayedCall(FLASH_MS, () => this.core.clearTint());
    this.scene.effects.impact(x, y, 0.9);
    this.flinch(4 + damage * 2);
    if (this.hp === 0) {
      this.die();
      return;
    }
    if (this.phase.index !== before) this.newPhase();
  }

  // A round off his stone: a little spark and a clink. It's protected.
  spark(x, y) {
    this.scene.effects.impact(x, y, 0.35);
    if (this.scene.time.now - (this.clinkAt ?? 0) > 120) {
      this.clinkAt = this.scene.time.now;
      this.scene.audio.playSfx('bump');
    }
  }

  // His body jolts back, and settles.
  flinch(px) {
    this.lean.y = -px * 0.3;
    this.lean.x = (this.cat.x < this.x ? 1 : -1) * px;
  }

  // Into a new phase: his core slams shut, he roars, moss and rocks fall, and his glow grows.
  newPhase() {
    this.closeCore(true);
    this.attackCount = 0;
    this.roar(1300, 0.014);
    this.debris(18);
    for (const arm of this.arms) Object.assign(arm, { sealHits: 0, cracked: false });
    this.body.setTint([0xffffff, 0xe0ffd8, 0xc8ffb8][this.phase.index]);
    this.state = 'rest';
    this.stateMs = 1400; // a beat to breathe after the roar
  }

  die() {
    this.defeated = true;
    this.closeCore(true);
    this.core.setTexture(rbKey('rb-core-shattered'));
    this.coreGlow.setAlpha(0.9).setScale(3);
    this.scene.tweens.add({ targets: this.coreGlow, alpha: 0, scale: 6, duration: 700 });
    this.clearLeftovers();
    this.scene.audio.playSfx('shatter');
    this.scene.cameras.main.shake(ROOTBREAKER.dieMs, 0.014);
    this.setFace('calm');
    // His light goes out, his face greying in steps, and he crumbles into the ground.
    [0, 400, 800].forEach((ms, i) => this.scene.time.delayedCall(ms, () => this.face.setTint([0xb0b0b0, 0x888888, 0x666666][i])));
    for (let i = 0; i < 4; i++) this.scene.time.delayedCall(i * 350, () => this.debris(12));
    for (const arm of this.arms) {
      arm.state = 'dead';
      arm.fist.body.enable = false;
      arm.seal.setVisible(false);
      for (const ghost of arm.ghosts) ghost.setAlpha(0);
      for (const part of [arm.fist, arm.upper, arm.fore, arm.elbow]) {
        this.scene.tweens.add({ targets: part, y: this.floorY + 60, angle: arm.side * Phaser.Math.Between(20, 70), alpha: 0, duration: 1100, ease: 'Quad.easeIn', delay: Phaser.Math.Between(0, 300) });
      }
    }
    this.scene.tweens.add({ targets: [this.body, this.face, this.core], y: `+=${TILE * 3}`, alpha: 0.2, duration: ROOTBREAKER.dieMs, ease: 'Quad.easeIn', delay: 500 });
    this.scene.time.delayedCall(ROOTBREAKER.dieMs + 500, () => this.onDefeated());
  }

  // ----- Each frame -----

  update(ms) {
    this.clock += ms;
    // His lean eases back to standing.
    const ease = 1 - Math.exp(-ms / 160);
    this.lean.x -= this.lean.x * ease;
    this.lean.y -= this.lean.y * ease;
    if (this.halted || this.defeated) {
      this.pose();
      return;
    }
    if (this.faceMs > 0 && (this.faceMs -= ms) <= 0) this.setFace('calm');
    this.updateCore(ms);
    for (const arm of this.arms) {
      if (arm.state === 'rest') arm.goal = this.restOf(arm);
      this.updateArm(arm, ms);
    }
    this.updateShots(ms);
    this.pose();
    if (!this.started) return;
    this.stateMs -= ms;
    if (this.state === 'rest' && this.stateMs <= 0) this.beginAttack();
    else if (this.state !== 'rest' && this.attackDone()) {
      this.state = 'rest';
      this.stateMs = ROOTBREAKER.restMs / this.phase.speed;
    }
  }

  beginAttack() {
    const kind = nextAttack(this.phase, this.attackCount++);
    this.state = kind;
    const speed = this.phase.speed;
    // A smash is made by the fist on the cat's side; a sweep by the other, crossing toward him.
    const near = this.arms[this.cat.x < this.x ? 0 : 1], far = this.arms[this.cat.x < this.x ? 1 : 0];
    if (kind === 'smash') this.smash(near, speed);
    if (kind === 'sweep') this.sweep(far, speed);
    if (kind === 'blast') this.blast(speed);
    if (kind === 'laser') this.laser(speed);
    if (kind === 'rockfall') this.rockfall(speed);
  }

  attackDone() {
    return this.stateMs <= 0 && this.arms.every((arm) => arm.state === 'rest') && this.leftovers.length === 0;
  }

  setFace(kind, ms = 0) {
    this.face.setTexture(rbKey(`rb-face-${kind}`));
    this.faceMs = ms;
  }

  // ----- His core -----

  // It cracks open, then glows and pulses; it flickers before it shuts.
  openCore(ms) {
    if (this.coreOpen) {
      this.coreMs = Math.max(this.coreMs, ms);
      return;
    }
    this.core.setTexture(rbKey('rb-core-opening'));
    this.lean.y = -4;
    this.scene.time.delayedCall(240, () => {
      if (this.defeated) return;
      this.coreOpen = true;
      this.coreMs = ms;
      this.core.setTexture(rbKey('rb-core-open'));
      this.scene.audio.playSfx('checkpoint');
    });
  }

  closeCore(now = false) {
    this.coreOpen = false;
    this.coreMs = 0;
    this.coreGlow.setAlpha(0);
    this.core.setAlpha(1).setScale(ROOTBREAKER.scale.body);
    if (this.defeated) return;
    if (now) {
      this.core.setTexture(rbKey('rb-core-closed'));
      return;
    }
    this.core.setTexture(rbKey('rb-core-opening'));
    this.scene.time.delayedCall(180, () => {
      if (!this.coreOpen && !this.defeated) this.core.setTexture(rbKey('rb-core-closed'));
    });
  }

  updateCore(ms) {
    if (!this.coreOpen) return;
    this.coreMs -= ms;
    const pulse = 0.5 + 0.5 * Math.sin(this.clock / 110);
    this.coreGlow.setAlpha(0.35 + 0.35 * pulse).setScale(2.4 + 0.5 * pulse);
    this.core.setScale(ROOTBREAKER.scale.body * (1 + 0.04 * pulse));
    // Closing soon: it flickers.
    if (this.coreMs < CORE_CLOSING_MS) this.core.setAlpha(Math.floor(this.coreMs / 80) % 2 ? 0.55 : 1);
    if (this.coreMs <= 0) this.closeCore();
  }

  // ----- His attacks -----

  // Smash: the fist pulls back and up (the wind-up), rises over the cat and follows him, its shadow
  // growing on the floor (the tell), drops (fast, speeding up), slams (squash, dust, stones, a
  // shake, a wave along the floor), sticks there struggling (a step to stand on; in phase 1 and 3 his
  // core opens), and lifts back, slow and heavy.
  smash(arm, speed) {
    const s = ROOTBREAKER.smash;
    arm.state = 'windup';
    arm.speed = speed;
    this.stateMs = 0;
    this.lean.x = arm.side * 10;
    this.scene.tweens.add({
      targets: arm.goal, x: arm.goal.x + arm.side * 60, y: arm.goal.y - 90, duration: s.windupMs / speed, ease: 'Back.easeOut',
      onComplete: () => {
        if (this.defeated) return;
        arm.state = 'tell';
        arm.shadow = this.scene.add.ellipse(arm.goal.x, this.floorY, 60, 14, 0x000000, 0.25).setDepth(DEPTH.warn);
        arm.tellMs = s.tellMs / speed;
      },
    });
  }

  // Sweep: the fist swings out low to its far side, glowing (the wind-up), then sweeps fast across
  // the arena toward the cat, and returns.
  sweep(arm, speed) {
    const s = ROOTBREAKER.sweep;
    arm.state = 'sweepOut';
    arm.speed = speed;
    arm.blinkMs = 0;
    this.stateMs = 0;
    const low = this.floorY - s.height;
    const from = arm.side < 0 ? this.left + 90 : this.right - 90;
    const to = arm.side < 0 ? this.right - 90 : this.left + 90;
    this.lean.x = arm.side * 14;
    this.scene.tweens.add({
      targets: arm.goal, x: from, y: low, duration: s.tellMs / speed, ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.defeated) return;
        arm.fist.setTint(0xd8ffc8);
        arm.state = 'sweeping';
        this.scene.audio.playSfx('maceWhoosh');
        this.lean.x = -arm.side * 18;
        this.scene.tweens.add({
          targets: arm.goal, x: to, duration: s.sweepMs / speed, ease: 'Cubic.easeIn',
          onComplete: () => {
            arm.fist.clearTint();
            arm.state = 'return';
            const rest = this.restOf(arm);
            this.scene.tweens.add({ targets: arm.goal, x: rest.x, y: rest.y, duration: s.returnMs / speed, ease: 'Sine.easeInOut', onComplete: () => { arm.state = 'rest'; } });
          },
        });
      },
    });
  }

  updateArm(arm, ms) {
    const s = ROOTBREAKER.smash;
    if (arm.state === 'sweepOut') {
      arm.blinkMs += ms;
      arm.fist.setTint(Math.floor(arm.blinkMs / 90) % 2 ? 0xb8ff8a : 0xffffff);
    }
    if (arm.state === 'tell') {
      // Over the cat, high, following him a little behind; the shadow grows and darkens.
      const target = Phaser.Math.Clamp(this.cat.x, this.left + 70, this.right - 70);
      arm.goal.x += (target - arm.goal.x) * Math.min(1, (s.follow * ms) / 160);
      arm.goal.y += (this.floorY - s.high - arm.goal.y) * Math.min(1, ms / 140);
      arm.tellMs -= ms;
      const t = 1 - Math.max(0, arm.tellMs) / (s.tellMs / arm.speed);
      arm.shadow.setPosition(arm.fist.x, this.floorY).setSize(60 + 80 * t, 14 + 8 * t).setAlpha(0.2 + 0.35 * t);
      arm.fist.setTint(Math.floor(arm.tellMs / 80) % 2 ? 0xd0ffc0 : 0xffffff);
      if (arm.tellMs <= 0) {
        arm.fist.clearTint();
        arm.state = 'drop';
        const contact = this.floorY - arm.fist.displayHeight * 0.38;
        this.scene.tweens.add({ targets: arm.goal, y: contact, duration: s.dropMs / arm.speed, ease: 'Quad.easeIn', onComplete: () => this.slam(arm) });
      }
    }
    if (arm.state === 'drop' || arm.state === 'sweeping') this.hurtIfTouching(arm.fist.getBounds(), arm.fist.x);
    if (arm.state === 'stuck') {
      // Struggling to pull free: a shake now and then, a strain at the end.
      arm.stuckMs -= ms;
      arm.shake = Math.floor(arm.stuckMs / s.struggleMs) % 3 === 0 ? Phaser.Math.FloatBetween(-4, 4) : 0;
      if (arm.stuckMs < 500) arm.fist.setTint(Math.floor(arm.stuckMs / 70) % 2 ? 0xffffff : 0xd0ffc0);
      if (arm.stuckMs <= 0) {
        arm.shake = 0;
        arm.fist.clearTint();
        arm.state = 'lift';
        this.debris(3);
        const rest = this.restOf(arm);
        this.scene.tweens.add({ targets: arm.goal, x: rest.x, y: rest.y, duration: s.liftMs / arm.speed, ease: 'Sine.easeInOut', onComplete: () => { arm.state = 'rest'; } });
      }
    }
  }

  // The fist hits the floor.
  slam(arm) {
    const s = ROOTBREAKER.smash;
    const { fist } = arm;
    arm.state = 'stuck';
    arm.stuckMs = s.stuckMs / arm.speed;
    arm.shadow?.destroy();
    this.lean.y = 6;
    // Squash, and spring back.
    fist.setScale(ROOTBREAKER.scale.fist * 1.12, ROOTBREAKER.scale.fist * 0.86);
    this.scene.tweens.add({ targets: fist, scaleX: ROOTBREAKER.scale.fist, scaleY: ROOTBREAKER.scale.fist, duration: 220, ease: 'Back.easeOut' });
    this.scene.effects.dust(fist.x - 70, this.floorY, 10);
    this.scene.effects.dust(fist.x + 70, this.floorY, 10);
    this.flyStones(fist.x, this.floorY, 6);
    this.scene.audio.playSfx('smash');
    this.scene.cameras.main.shake(260, 0.012);
    // The wave, along the floor both ways.
    for (const dir of [-1, 1]) {
      const wave = this.scene.add.ellipse(fist.x, this.floorY - 8, 70, 22, WAVE_COLOUR, 0.18).setStrokeStyle(5, WAVE_COLOUR, 0.95).setDepth(DEPTH.warn);
      this.scene.tweens.add({ targets: wave, x: fist.x + dir * s.waveReach, scaleY: 0.5, alpha: 0, duration: s.waveMs, ease: 'Quad.easeOut', onComplete: () => wave.destroy() });
    }
    const { body } = this.cat;
    if (this.cat.onGround && Math.abs(body.bottom - this.floorY) < 12 && Math.abs(body.center.x - fist.x) < s.waveReach) this.onHurtCat(fist.x);
    if (this.phase.index !== 1) this.openCore(ROOTBREAKER.coreOpenMs[`phase${this.phase.index + 1}`]);
  }

  // Stones thrown up where a fist lands or a rock breaks.
  flyStones(x, y, count) {
    for (let i = 0; i < count; i++) {
      const bit = this.scene.add.image(x, y - 10, rbKey(`rb-rock-${1 + (i % 2)}`)).setScale(Phaser.Math.FloatBetween(0.14, 0.26)).setDepth(DEPTH.shot);
      const dx = Phaser.Math.Between(-140, 140);
      this.scene.tweens.add({ targets: bit, x: x + dx, y: y - Phaser.Math.Between(60, 140), angle: dx * 2, duration: 260, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: bit, y: y + 10, alpha: 0, duration: 340, delay: 260, ease: 'Quad.easeIn', onComplete: () => bit.destroy() });
    }
  }

  // Mouth blast: his head pulls back, light gathers in his mouth, then a snap forward with each ball.
  blast(speed) {
    const b = ROOTBREAKER.blast;
    this.setFace('warn', b.tellMs / speed);
    this.stateMs = b.tellMs / speed + b.balls * b.everyMs;
    this.scene.tweens.add({ targets: this, faceNod: -10, duration: b.tellMs / speed, ease: 'Sine.easeOut' });
    const gather = this.scene.add.image(this.mouth.x, this.mouth.y, 'fx-dot').setTint(0x9dff7a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.warn).setScale(0.2);
    this.scene.tweens.add({ targets: gather, scale: 2.2, alpha: 0.9, duration: b.tellMs / speed, onComplete: () => gather.destroy() });
    this.scene.time.delayedCall(b.tellMs / speed, () => {
      if (this.defeated || this.halted) return;
      this.setFace('blast', b.balls * b.everyMs + 300);
      for (let i = 0; i < b.balls; i++) {
        this.scene.time.delayedCall(i * b.everyMs, () => {
          if (this.defeated || this.halted) return;
          this.faceNod = 8;
          this.scene.tweens.add({ targets: this, faceNod: 0, duration: b.everyMs * 0.8, ease: 'Sine.easeOut' });
          const aim = Math.atan2(this.cat.body.center.y - this.mouth.y, this.cat.body.center.x - this.mouth.x)
            + Phaser.Math.DegToRad((i - (b.balls - 1) / 2) * b.spreadDeg);
          const ball = this.scene.add.image(this.mouth.x, this.mouth.y, rbKey('rb-ball')).setScale(ROOTBREAKER.scale.ball).setDepth(DEPTH.shot)
            .setRotation(aim + Math.PI);
          this.leftovers.push({ kind: 'ball', image: ball, vx: Math.cos(aim) * b.speed * speed, vy: Math.sin(aim) * b.speed * speed, r: 24 });
          this.scene.audio.playSfx('ignite');
        });
      }
    });
  }

  // Eye laser: a thin line shows its height, his eyes charge up, and the beam burns across the arena,
  // sparking along it.
  laser(speed) {
    const l = ROOTBREAKER.laser;
    const height = l.heights[this.attackCount % l.heights.length];
    const y = this.floorY - height;
    this.setFace('warn', (l.tellMs + l.fireMs) / speed);
    const guide = this.scene.add.rectangle(this.left, y, this.right - this.left, 3, 0x7dff6a, 0.6).setOrigin(0, 0.5).setDepth(DEPTH.warn);
    this.scene.tweens.add({ targets: guide, alpha: 0.15, duration: 120, yoyo: true, repeat: -1 });
    for (const glow of this.eyeGlows) this.scene.tweens.add({ targets: glow, alpha: 0.9, scale: 1.6, duration: l.tellMs / speed });
    this.stateMs = (l.tellMs + l.fireMs) / speed;
    this.scene.time.delayedCall(l.tellMs / speed, () => {
      this.scene.tweens.killTweensOf(guide);
      guide.destroy();
      if (this.defeated || this.halted) return;
      const beam = this.scene.add.tileSprite(this.left, y, this.right - this.left, l.thick, rbKey('rb-laser')).setOrigin(0, 0.5).setDepth(DEPTH.laser);
      this.leftovers.push({ kind: 'laser', image: beam, ms: l.fireMs / speed, y, rect: { left: this.left, right: this.right, top: y - l.thick / 2, bottom: y + l.thick / 2 } });
      this.scene.audio.playSfx('shot');
      this.scene.cameras.main.shake(l.fireMs / speed, 0.004);
    });
    this.scene.time.delayedCall((l.tellMs + l.fireMs) / speed, () => {
      for (const glow of this.eyeGlows) this.scene.tweens.add({ targets: glow, alpha: 0, scale: 1, duration: 200 });
    });
  }

  // Rockfall: both fists pound together over his head, the screen shakes, dust falls, then rocks,
  // each one's shadow first.
  rockfall(speed) {
    const r = ROOTBREAKER.rockfall;
    this.stateMs = r.tellMs / speed + r.rocks * r.everyMs + 600;
    const top = this.floorY - this.size.h - 60;
    for (const arm of this.arms) {
      arm.state = 'pound';
      this.scene.tweens.add({
        targets: arm.goal, x: this.x + arm.side * 90, y: top, duration: (r.tellMs * 0.6) / speed, ease: 'Back.easeIn',
        onComplete: () => {
          const rest = this.restOf(arm);
          this.scene.tweens.add({ targets: arm.goal, x: rest.x, y: rest.y, duration: 600, delay: 200, ease: 'Sine.easeInOut', onComplete: () => { arm.state = 'rest'; } });
        },
      });
    }
    this.scene.time.delayedCall((r.tellMs * 0.6) / speed, () => {
      if (this.defeated || this.halted) return;
      this.setFace('blast', 500);
      this.scene.audio.playSfx('smash');
      this.scene.cameras.main.shake(600, 0.012);
      this.debris(8);
    });
    for (let i = 0; i < r.rocks; i++) {
      this.scene.time.delayedCall(r.tellMs / speed + i * r.everyMs, () => {
        if (this.defeated || this.halted) return;
        const x = i === 0 ? this.cat.x : Phaser.Math.Between(this.left + 40, this.right - 40);
        const shadow = this.scene.add.ellipse(x, this.floorY, ROCK_SHADOW.w * 0.4, ROCK_SHADOW.h, 0x000000, 0.15).setDepth(DEPTH.warn);
        this.scene.tweens.add({ targets: shadow, scaleX: 2.5, alpha: ROCK_SHADOW.alpha, duration: r.tellMs / speed });
        this.scene.time.delayedCall(r.tellMs / speed, () => {
          shadow.destroy();
          if (this.defeated || this.halted) return;
          const rock = this.scene.add.image(x, this.scene.cameras.main.worldView.top - 60, rbKey(`rb-rock-${1 + (i % 2)}`))
            .setScale(ROOTBREAKER.scale.rock).setDepth(DEPTH.shot);
          this.leftovers.push({ kind: 'rock', image: rock, vx: 0, vy: r.fallSpeed, r: 34 });
        });
      });
    }
  }

  // Each frame: the balls and rocks fly, the laser burns, each hurting the cat it touches.
  updateShots(ms) {
    const dt = ms / 1000;
    this.leftovers = this.leftovers.filter((item) => {
      if (item.kind === 'laser') {
        item.ms -= ms;
        item.image.tilePositionX += 30;
        item.image.setScale(1, 0.85 + Math.random() * 0.3);
        if (Math.random() < 0.4) this.scene.effects.impact(Phaser.Math.Between(this.left, this.right), item.y, 0.25);
        this.hurtIfTouching(item.rect, this.x);
        if (item.ms > 0) return true;
        item.image.destroy();
        return false;
      }
      const { image } = item;
      image.x += item.vx * dt;
      image.y += item.vy * dt;
      if (item.kind === 'rock') image.angle += 140 * dt;
      this.hurtIfTouching({ left: image.x - item.r, right: image.x + item.r, top: image.y - item.r, bottom: image.y + item.r }, image.x);
      const landed = item.kind === 'rock' && image.y >= this.floorY - item.r;
      const gone = image.x < this.left - 100 || image.x > this.right + 100 || image.y > this.floorY + 40;
      if (landed) {
        this.scene.effects.dust(image.x, this.floorY, 6);
        this.flyStones(image.x, this.floorY, 4);
        this.scene.audio.playSfx('smash');
      }
      if (landed || gone) {
        image.destroy();
        return false;
      }
      return true;
    });
  }

  clearLeftovers() {
    for (const item of this.leftovers) item.image.destroy();
    this.leftovers = [];
    for (const arm of this.arms) arm.shadow?.destroy();
  }

  hurtIfTouching(rect, fromX) {
    const { body } = this.cat;
    if (body.right > rect.left && body.left < rect.right && body.bottom > rect.top && body.top < rect.bottom) this.onHurtCat(fromX);
  }

  // ----- Phase 2: a stuck fist's seal -----

  // A round at (x, y): into a stuck fist, in phase 2, it cracks its seal a little; three, and it
  // breaks; both broken, his core opens. Returns whether it hit a seal.
  shootSeal(x, y) {
    if (this.phase.index !== 1) return false;
    const arm = this.arms.find((a) => a.state === 'stuck' && !a.cracked && a.fist.getBounds().contains(x, y));
    if (!arm) return false;
    arm.sealHits += 1;
    arm.fist.setTintFill(0xffffff);
    this.scene.time.delayedCall(FLASH_MS, () => arm.fist.clearTint());
    this.scene.effects.impact(x, y, 0.5);
    if (arm.sealHits >= ROOTBREAKER.sealHits) {
      arm.cracked = true;
      this.scene.audio.playSfx('shatter');
      this.flinch(10);
      if (this.arms.every((a) => a.cracked)) {
        this.openCore(ROOTBREAKER.coreOpenMs.phase2);
        this.scene.time.delayedCall(ROOTBREAKER.coreOpenMs.phase2, () => {
          for (const a of this.arms) Object.assign(a, { cracked: false, sealHits: 0 });
        });
      }
    }
    return true;
  }
}

// An arm bone (an image, origin at its left middle) from one point to another, this thick.
function bone(image, from, to, thick) {
  image.setPosition(from.x, from.y).setRotation(Math.atan2(to.y - from.y, to.x - from.x))
    .setDisplaySize(Math.max(1, Math.hypot(to.x - from.x, to.y - from.y)), thick);
}

// The arm bones and the elbow, drawn in code until the owner's art: a mossy stone bone, and a stone
// joint with a glowing green ring.
function makeStandIns(scene) {
  if (!scene.textures.exists(STAND_IN.bone)) {
    const g = scene.make.graphics({ add: false });
    const w = 256, h = 72;
    g.fillStyle(0x4c4636).fillRoundedRect(0, 4, w, h - 8, 26);
    g.fillStyle(0x8e8468).fillRoundedRect(3, 7, w - 6, h - 16, 24);
    g.fillStyle(0xa79c7c).fillRoundedRect(10, 12, w - 20, 14, 7);
    g.fillStyle(0x5f583f, 0.6);
    for (let x = 48; x < w - 20; x += 52) g.fillRect(x, 12, 4, h - 26); // its carved bands
    g.fillStyle(0x7fb24a).fillRoundedRect(20, 4, w - 40, 7, 3); // moss along its top
    g.generateTexture(STAND_IN.bone, w, h);
    g.destroy();
  }
  if (!scene.textures.exists(STAND_IN.elbow)) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x4c4636).fillCircle(40, 40, 39);
    g.fillStyle(0x8e8468).fillCircle(40, 40, 35);
    g.lineStyle(8, 0x58d84a).strokeCircle(40, 40, 22);
    g.lineStyle(3, 0xd8ffc8).strokeCircle(40, 40, 22);
    g.fillStyle(0x5f583f).fillCircle(40, 40, 12);
    g.generateTexture(STAND_IN.elbow, 80, 80);
    g.destroy();
  }
}
