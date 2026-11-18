import Phaser from 'phaser';
import { RB_FIST_BLOCK, ROOTBREAKER, coreDamage, fistAngle, fistBox, inReach, layArm, nextAttack, rbKey, rootbreakerPhase, turnBetween } from '../data/adventure/rootbreaker.js';
import { TILE } from '../systems/adventureMap.js';
import { landsFromAbove } from '../systems/adventurePlatformLanding.js';

// The Rootbreaker, played (data/adventure/rootbreaker.js for his rules and numbers). He's his own
// boss, nothing like the troll: he stands behind his arena and never walks; his stone arms reach out
// from the green rings at his shoulders, bending at the elbow, to the big fists that fight; only his
// open core can be hurt. The scene fights him the way it fights any boss: it starts him, updates him,
// aims the cat's rounds at `sprite` (his core) through takeHit, reads `brain` for his health bar,
// and frames `frame` with the camera. He hurts the cat himself (onHurtCat), so the scene doesn't
// ask what touching him does (ownTouch).
//
// Every move has its weight: a wind-up the cat can read, a fast strike, a hard impact, and a heavy
// recovery. Between attacks he breathes and his eyes follow the cat. His arms are the owner's stone
// pieces (images/levels/forest/guardian-parts.png), laid out by layArm each frame: the arm behind his
// body (so it never hides his core), the fist in front. Each fist swings toward the way its move
// points it with the weight of stone, and its target lights up when it can be shot.
const DEPTH = { upper: 1.79, shoulder: 1.793, fore: 1.796, body: 1.8, face: 1.81, glow: 1.815, core: 1.82, fist: 5.8, shot: 6.3, warn: 6.35, laser: 6.4 };
const ARM_PIECES = ['shoulder', 'upper', 'fore', 'fist'];
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
    // Each arm piece's size, from its right-pointing picture.
    this.armSizes = Object.fromEntries(ARM_PIECES.map((name) => {
      const image = scene.textures.get(rbKey(`rb-r-${name}`)).getSourceImage();
      return [name, { w: image.width, h: image.height }];
    }));

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

    // His arms: the shoulder, the upper arm, the elbow and forearm, and the big fist. Each fist's
    // block is an invisible box (`hit`) that hurts, stops rounds, and, stuck, is a step.
    this.fistGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.arms = [-1, 1].map((side, i) => {
      const hit = scene.add.zone(0, 0, 10, 10);
      this.fistGroup.add(hit);
      hit.body.setAllowGravity(false).setImmovable(true);
      const piece = (name) => scene.add.image(0, 0, rbKey(`rb-r-${name}`)).setScale(r.arm.scale).setDepth(DEPTH[name]);
      const arm = {
        side, hit, shoulderAt: r.shoulders[i], state: 'rest', speed: 1, sealHits: 0, cracked: false, shake: 0,
        pieces: Object.fromEntries(ARM_PIECES.map((name) => [name, piece(name)])),
        sides: {}, // the drawing each piece used last frame (layArm)
        squash: { x: 1, y: 1 }, // the fist's squash when it lands
        ghosts: Array.from({ length: TRAIL.ghosts }, () => scene.add.image(0, 0, rbKey('rb-r-fist')).setScale(r.arm.scale).setDepth(DEPTH.fist - 0.01).setAlpha(0)),
        trail: [],
      };
      arm.goal = this.restOf(arm); // where the fist's middle is heading: its moves tween it
      // The way the fist points (radians): it swings toward `aim` (a spring), unless a move turns it
      // itself (`swing` false).
      arm.aim = this.restAim(arm);
      arm.angle = arm.aim;
      arm.spin = 0;
      arm.swing = true;
      arm.tremble = 0;
      arm.lastGoal = { ...arm.goal };
      hit.arm = arm;
      return arm;
    });
    scene.physics.add.collider(cat, this.fistGroup, null, (cat_, hit) => hit.arm.state === 'stuck' && landsFromAbove({
      bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height, top: hit.body.top, vy: cat.body.velocity.y,
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

  // The way a resting fist points: out and down, swaying a little.
  restAim(arm) {
    const { fistRest } = ROOTBREAKER;
    return fistAngle(fistRest.tilt + Math.sin(this.clock / 1300 + arm.side) * fistRest.swayDeg, arm.side);
  }

  // Points a fist for a move: tilt (degrees: 0 level, 90 down, -90 up), toward `dir` (-1 left, 1
  // right; its own side if not given). It swings there with the weight of stone.
  aimFist(arm, tilt, dir = arm.side) {
    arm.aim = fistAngle(tilt, dir);
    arm.swing = true;
  }

  // Turns a fist itself, to `angle` the short way round, over `ms` (the hammer swing of a drop).
  turnFist(arm, angle, ms, ease) {
    arm.swing = false;
    arm.spin = 0;
    const to = arm.angle + turnBetween(arm.angle, angle);
    this.scene.tweens.add({ targets: arm, angle: to, duration: ms, ease });
  }

  // Each frame: a fist swinging on its own swings toward its aim, lagging behind when it moves fast.
  swingFist(arm, ms) {
    const s = ROOTBREAKER.fistSwing, dt = Math.min(ms, 50) / 1000;
    const vx = (arm.goal.x - arm.lastGoal.x) / Math.max(dt, 0.001);
    arm.lastGoal = { ...arm.goal };
    if (!arm.swing) return;
    const lag = Phaser.Math.Clamp(vx / s.lagSpeed, -1, 1) * Phaser.Math.DegToRad(s.lagDeg);
    arm.spin += turnBetween(arm.angle, arm.aim + lag) * s.stiff * dt;
    arm.spin *= Math.exp(-s.settle * dt);
    arm.angle += arm.spin * dt;
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

  // One arm: its pieces laid out from its shoulder to its fist's goal (layArm), each in the drawing
  // that keeps its moss on top; the fist's target lit, unlit or cracked; its hit box on its block.
  poseArm(arm, mount) {
    if (arm.state === 'dead') return;
    const k = ROOTBREAKER.arm.scale;
    const angle = arm.angle + Phaser.Math.DegToRad(arm.tremble);
    const lay = layArm({ mount, side: arm.side, goal: { x: arm.goal.x + arm.shake, y: arm.goal.y }, angle, sizes: this.armSizes, sides: arm.sides });
    const look = this.fistLook(arm);
    for (const name of ARM_PIECES) {
      const at = lay[name];
      arm.sides[name] = at.side;
      const key = rbKey(`rb-${at.side > 0 ? 'r' : 'l'}-${name}${name === 'fist' ? look : ''}`);
      arm.pieces[name].setTexture(key).setOrigin(at.origin.x, at.origin.y).setPosition(at.x, at.y).setRotation(at.rotation);
    }
    arm.pieces.fist.setScale(k * arm.squash.x, k * arm.squash.y);
    const box = fistBox(lay.fistAt, lay.angle, this.armSizes.fist);
    arm.box = box;
    arm.hit.setSize(box.right - box.left, box.bottom - box.top);
    arm.hit.body.setSize(box.right - box.left, box.bottom - box.top);
    arm.hit.body.reset(box.x, box.y);
    // Fast, it leaves fading copies behind.
    const { fist } = arm.pieces;
    arm.trail.unshift({ x: fist.x, y: fist.y, rotation: fist.rotation, key: fist.texture.key, ox: fist.originX, oy: fist.originY });
    if (arm.trail.length > TRAIL.ghosts * 2 + 1) arm.trail.pop();
    const fast = arm.state === 'drop' || arm.state === 'sweeping';
    arm.ghosts.forEach((ghost, i) => {
      const at = arm.trail[Math.min(arm.trail.length - 1, (i + 1) * 2)];
      ghost.setTexture(at.key).setOrigin(at.ox, at.oy).setPosition(at.x, at.y).setRotation(at.rotation)
        .setAlpha(fast ? TRAIL.alpha * (1 - i / TRAIL.ghosts) : 0);
    });
  }

  // A fist's target: cracked once its seal's broken; lit while it can be shot (stuck, in phase 2);
  // else carved stone.
  fistLook(arm) {
    if (arm.cracked) return '-cracked';
    if (this.started && !this.defeated && this.phase.index === 1 && arm.state === 'stuck') return '';
    return '-dim';
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
      arm.hit.body.enable = false;
      for (const ghost of arm.ghosts) ghost.setAlpha(0);
      for (const part of Object.values(arm.pieces)) {
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
      for (const arm of this.arms) this.swingFist(arm, ms);
      this.pose();
      return;
    }
    if (this.faceMs > 0 && (this.faceMs -= ms) <= 0) this.setFace('calm');
    this.updateCore(ms);
    for (const arm of this.arms) {
      if (arm.state === 'rest') {
        arm.goal = this.restOf(arm);
        arm.aim = this.restAim(arm);
      }
      this.updateArm(arm, ms);
      this.swingFist(arm, ms);
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
    // A smash and a sweep are made by the fist on the cat's side.
    const near = this.arms[this.cat.x < this.x ? 0 : 1];
    if (kind === 'smash') this.smash(near, speed);
    if (kind === 'sweep') this.sweep(near, speed);
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

  // Where this arm's fist may work, for an x it's after (inReach): its own side of the arena.
  zoneX(arm, x) {
    return inReach(x, arm.side, this.x, { left: this.left, right: this.right });
  }

  // The height of a fist's middle lying flat on the floor.
  get fistOnFloor() {
    const { fist } = this.armSizes;
    return this.floorY - ((RB_FIST_BLOCK.y1 - RB_FIST_BLOCK.y0) * fist.h * ROOTBREAKER.arm.scale) / 2;
  }

  // Smash, an overhead hammer blow. The wind-up: the fist hauled up and back, pointing up, his body
  // leaning into it. The tell: high over the cat, following him a little behind, trembling, its
  // shadow growing on the floor. The drop: fast and speeding up, the fist swinging over as it falls
  // to land flat. Then the slam (squash, dust, stones, a shake, a wave along the floor), stuck there
  // tugging to get free (a step to stand on; in phase 1 and 3 his core opens), and a slow, heavy lift.
  smash(arm, speed) {
    const s = ROOTBREAKER.smash;
    arm.state = 'windup';
    arm.speed = speed;
    this.stateMs = 0;
    this.lean.x = arm.side * 12;
    this.lean.y = -4;
    this.aimFist(arm, s.raiseTilt);
    this.scene.tweens.add({
      targets: arm.goal, x: this.zoneX(arm, arm.goal.x + arm.side * 40), y: this.floorY - s.high, duration: s.windupMs / speed, ease: 'Back.easeOut',
      onComplete: () => {
        if (this.defeated) return;
        arm.state = 'tell';
        arm.shadow = this.scene.add.ellipse(arm.goal.x, this.floorY, 60, 14, 0x000000, 0.25).setDepth(DEPTH.warn);
        arm.tellMs = s.tellMs / speed;
      },
    });
  }

  // Sweep, a backhand swing: the fist hauled out to the wall, cocked back and up, glowing (the
  // wind-up); then swung low across its side of the arena toward his body, trailing behind its arm;
  // and back.
  sweep(arm, speed) {
    const s = ROOTBREAKER.sweep;
    arm.state = 'sweepOut';
    arm.speed = speed;
    arm.blinkMs = 0;
    this.stateMs = 0;
    const wall = this.zoneX(arm, arm.side > 0 ? this.right : this.left);
    const inner = this.zoneX(arm, this.x);
    this.lean.x = arm.side * 14;
    this.aimFist(arm, s.cockTilt);
    this.scene.tweens.add({
      targets: arm.goal, x: wall, y: this.floorY - s.cockUp, duration: s.tellMs / speed, ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.defeated) return;
        arm.pieces.fist.setTint(0xd8ffc8);
        arm.state = 'sweeping';
        this.scene.audio.playSfx('maceWhoosh');
        this.lean.x = -arm.side * 18;
        this.aimFist(arm, 0);
        this.scene.tweens.add({ targets: arm.goal, y: this.floorY - s.height, duration: (s.sweepMs * 0.35) / speed, ease: 'Quad.easeIn' });
        this.scene.tweens.add({
          targets: arm.goal, x: inner, duration: s.sweepMs / speed, ease: 'Cubic.easeIn',
          onComplete: () => {
            arm.pieces.fist.clearTint();
            arm.state = 'return';
            const rest = this.restOf(arm);
            this.aimFist(arm, ROOTBREAKER.fistRest.tilt);
            this.scene.tweens.add({ targets: arm.goal, x: rest.x, y: rest.y, duration: s.returnMs / speed, ease: 'Sine.easeInOut', onComplete: () => { arm.state = 'rest'; } });
          },
        });
      },
    });
  }

  updateArm(arm, ms) {
    const s = ROOTBREAKER.smash;
    arm.tremble = 0;
    if (arm.state === 'sweepOut') {
      arm.blinkMs += ms;
      arm.pieces.fist.setTint(Math.floor(arm.blinkMs / 90) % 2 ? 0xb8ff8a : 0xffffff);
    }
    if (arm.state === 'tell') {
      // Over the cat, high, following him a little behind, trembling; the shadow grows and darkens.
      const target = this.zoneX(arm, this.cat.x);
      arm.goal.x += (target - arm.goal.x) * Math.min(1, (s.follow * ms) / 160);
      arm.goal.y += (this.floorY - s.high - arm.goal.y) * Math.min(1, ms / 140);
      arm.tellMs -= ms;
      const t = 1 - Math.max(0, arm.tellMs) / (s.tellMs / arm.speed);
      arm.tremble = Phaser.Math.FloatBetween(-1, 1) * s.trembleDeg * t;
      arm.shadow.setPosition(arm.goal.x, this.floorY).setSize(60 + 100 * t, 14 + 8 * t).setAlpha(0.2 + 0.35 * t);
      arm.pieces.fist.setTint(Math.floor(arm.tellMs / 80) % 2 ? 0xd0ffc0 : 0xffffff);
      if (arm.tellMs <= 0) {
        arm.pieces.fist.clearTint();
        arm.state = 'drop';
        // Down it comes, swinging over to land flat, pointing away from his body.
        this.lean.x = arm.side * 20;
        this.turnFist(arm, fistAngle(0, arm.side), s.dropMs / arm.speed, 'Quad.easeIn');
        this.scene.tweens.add({ targets: arm.goal, y: this.fistOnFloor, duration: s.dropMs / arm.speed, ease: 'Quad.easeIn', onComplete: () => this.slam(arm) });
      }
    }
    if ((arm.state === 'drop' || arm.state === 'sweeping') && arm.box) this.hurtIfTouching(arm.box, arm.goal.x);
    if (arm.state === 'stuck') {
      // Tugging to pull free: now and then a heave, the fist rocking and the arm shaking; a strain at
      // the end.
      arm.stuckMs -= ms;
      const heave = Math.floor(arm.stuckMs / s.struggleMs) % 3 === 0;
      arm.shake = heave ? Phaser.Math.FloatBetween(-4, 4) : 0;
      arm.tremble = heave ? Math.sin(this.clock / 40) * s.tugDeg : 0;
      if (arm.stuckMs < 500) arm.pieces.fist.setTint(Math.floor(arm.stuckMs / 70) % 2 ? 0xffffff : 0xd0ffc0);
      if (arm.stuckMs <= 0) {
        arm.shake = 0;
        arm.pieces.fist.clearTint();
        arm.state = 'lift';
        this.debris(3);
        this.flyStones(arm.goal.x, this.floorY, 3);
        // Wrenched free: it lifts slow and heavy, swinging back to its rest.
        this.aimFist(arm, ROOTBREAKER.fistRest.tilt);
        const rest = this.restOf(arm);
        this.scene.tweens.add({ targets: arm.goal, x: rest.x, y: rest.y, duration: s.liftMs / arm.speed, ease: 'Sine.easeInOut', onComplete: () => { arm.state = 'rest'; } });
      }
    }
  }

  // The fist hits the floor.
  slam(arm) {
    const s = ROOTBREAKER.smash;
    const x = arm.goal.x;
    arm.state = 'stuck';
    arm.stuckMs = s.stuckMs / arm.speed;
    arm.shadow?.destroy();
    arm.angle = fistAngle(0, arm.side);
    this.lean.y = 8;
    // Squash, and spring back.
    arm.squash = { x: 1.14, y: 0.84 };
    this.scene.tweens.add({ targets: arm.squash, x: 1, y: 1, duration: 240, ease: 'Back.easeOut' });
    this.scene.effects.dust(x - 90, this.floorY, 12);
    this.scene.effects.dust(x + 90, this.floorY, 12);
    this.flyStones(x, this.floorY, 7);
    this.scene.audio.playSfx('smash');
    this.scene.cameras.main.shake(280, 0.013);
    // The wave, along the floor both ways.
    for (const dir of [-1, 1]) {
      const wave = this.scene.add.ellipse(x, this.floorY - 8, 70, 22, WAVE_COLOUR, 0.18).setStrokeStyle(5, WAVE_COLOUR, 0.95).setDepth(DEPTH.warn);
      this.scene.tweens.add({ targets: wave, x: x + dir * s.waveReach, scaleY: 0.5, alpha: 0, duration: s.waveMs, ease: 'Quad.easeOut', onComplete: () => wave.destroy() });
    }
    const { body } = this.cat;
    if (this.cat.onGround && Math.abs(body.bottom - this.floorY) < 12 && Math.abs(body.center.x - x) < s.waveReach) this.onHurtCat(x);
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

  // Rockfall: both fists rise over his head, pointing up, then clash together, knuckles in; the
  // screen shakes, dust falls, then rocks, each one's shadow first.
  rockfall(speed) {
    const r = ROOTBREAKER.rockfall;
    this.stateMs = r.tellMs / speed + r.rocks * r.everyMs + 600;
    const top = this.floorY - this.size.h + 20; // just over his head, still on screen
    const raiseMs = (r.tellMs * 0.6) / speed;
    for (const arm of this.arms) {
      arm.state = 'pound';
      this.aimFist(arm, -80);
      this.scene.tweens.add({
        targets: arm.goal, x: this.x + arm.side * 230, y: top - 60, duration: raiseMs * 0.7, ease: 'Sine.easeOut',
        onComplete: () => {
          if (this.defeated) return;
          this.aimFist(arm, 0, -arm.side); // knuckles in, toward each other
          this.scene.tweens.add({
            targets: arm.goal, x: this.x + arm.side * 150, y: top, duration: raiseMs * 0.3, ease: 'Back.easeIn',
            onComplete: () => {
              const rest = this.restOf(arm);
              this.aimFist(arm, ROOTBREAKER.fistRest.tilt);
              this.scene.tweens.add({ targets: arm.goal, x: rest.x, y: rest.y, duration: 650, delay: 220, ease: 'Sine.easeInOut', onComplete: () => { arm.state = 'rest'; } });
            },
          });
        },
      });
    }
    this.scene.time.delayedCall(raiseMs, () => {
      if (this.defeated || this.halted) return;
      this.setFace('blast', 500);
      this.scene.audio.playSfx('smash');
      this.scene.cameras.main.shake(600, 0.012);
      this.scene.effects.impact(this.x, top, 1.2);
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

  // ----- Phase 2: a stuck fist's seal, the target on it -----

  // A round at (x, y): into a stuck fist, in phase 2 (its target lit), it cracks its seal a little;
  // three, and it breaks; both broken, his core opens. Returns whether it hit a seal.
  shootSeal(x, y) {
    if (this.phase.index !== 1) return false;
    const arm = this.arms.find((a) => a.state === 'stuck' && !a.cracked && a.box && inBox(a.box, x, y));
    if (!arm) return false;
    arm.sealHits += 1;
    arm.pieces.fist.setTintFill(0xffffff);
    this.scene.time.delayedCall(FLASH_MS, () => arm.pieces.fist.clearTint());
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

// Whether (x, y) is inside a box { left, right, top, bottom }.
const inBox = (box, x, y) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
