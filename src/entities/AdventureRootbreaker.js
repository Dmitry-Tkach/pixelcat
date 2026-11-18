import Phaser from 'phaser';
import {
  ROOTBREAKER, armDamage, beamEnd, beamTouches, chainBow, chainHold, chainLinks, stoneFlight, coreDamage, fistAngle, fistBox, inReach, pickAttack, rbKey, rootbreakerPhase, turnBetween,
} from '../data/adventure/rootbreaker.js';
import { TILE } from '../systems/adventureMap.js';
import { landsFromAbove } from '../systems/adventurePlatformLanding.js';

// The Rootbreaker, played (data/adventure/rootbreaker.js for his rules and numbers). He's his own
// boss, nothing like the troll: he stands behind his arena and never walks; his fists, big mossy
// stones, float and fight, each held to the green ring at his shoulder by a chain of glowing links;
// only his open core can be hurt. The scene fights him the way it fights any boss: it starts him, updates him,
// aims the cat's rounds at `sprite` (his core) through takeHit, reads `brain` for his health bar,
// and frames `frame` with the camera. He hurts the cat himself (onHurtCat), so the scene doesn't
// ask what touching him does (ownTouch).
//
// Every move has its weight: a wind-up the cat can read, a fast strike, a hard impact, and a heavy
// recovery, and a short freeze of the whole fight when a fist lands. Between attacks he breathes and
// his eyes follow the cat. Each fist swings toward the way its move points it with the weight of
// stone (the stone itself turning only a little, its moss on top). The chain bows like a rope,
// trailing behind a fast fist, its links bobbing, out from under the stone on his shoulder. His arms
// can be worn down and broken (hurtArm), and grow back. The shoulder stones strike too (shoulder).
const DEPTH = { body: 1.8, face: 1.81, glow: 1.815, core: 1.82, glowLine: 1.824, link: 1.826, shoulder: 1.83, fist: 5.8, shot: 6.3, warn: 6.35, laser: 6.4 };
const CHAIN_GLOW = { colour: 0x7dff6a, width: 10, alpha: 0.35 }; // the green glow along a chain
const CORE_TARGET = 0.8; // the core's target, as a share of its picture across
const STOMP_SPEED = 250; // px a second: landing on a stuck fist faster than this stomps it
const BREAK_SHAKE = { ms: 320, strength: 0.012 }; // the screen, as an arm shatters
const FIST = 'rb-rock-1'; // his fists' stone
const SHOULDER = 'rb-rock-2'; // his shoulders' stone
const STONE_GLOW = { colour: 0x7dff6a, scale: 2.2, alpha: 0.7 }; // a shoulder stone about to strike
const TETHER = { colour: 0x7dff6a, width: 5, alpha: 0.45 }; // the glow from his shoulder to its stone, away
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
    // The fist's size, from its picture.
    const fistImage = scene.textures.get(rbKey(FIST)).getSourceImage();
    this.fistSize = { w: fistImage.width, h: fistImage.height };
    const stoneImage = scene.textures.get(rbKey(SHOULDER)).getSourceImage();
    this.stoneSize = { w: stoneImage.width * r.shoulderStone.scale, h: stoneImage.height * r.shoulderStone.scale };
    this.hitStopMs = 0;

    // His body, standing on the floor behind the arena; his face, his core and its glow over it.
    this.body = scene.add.image(this.x, this.floorY, rbKey('rb-body')).setOrigin(0.5, 1).setScale(r.scale.body).setDepth(DEPTH.body);
    this.size = { w: this.body.displayWidth, h: this.body.displayHeight };
    this.face = scene.add.image(0, 0, rbKey('rb-face-calm')).setScale(r.scale.body).setDepth(DEPTH.face);
    this.coreGlow = scene.add.image(0, 0, 'fx-dot').setTint(0x7dff6a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow).setAlpha(0);
    this.core = scene.add.image(0, 0, rbKey('rb-core-closed')).setScale(r.scale.body).setDepth(DEPTH.core);
    this.eyeGlows = [-1, 1].map(() => scene.add.image(0, 0, 'fx-dot').setTint(0x9dff7a).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.warn).setAlpha(0));
    // What the cat's rounds aim at: a band as wide as his core, from the floor up to the height of
    // a round fired from a low ledge (ROOTBREAKER.coreTarget), placed in pose. The minigun fires low,
    // at the paws' height, so a round from the floor, from a low ledge or from a stuck fist all reach
    // it. His stone doesn't stop rounds: they fly through it to his core.
    this.sprite = scene.add.zone(0, 0, 10, 10);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setAllowGravity(false).setImmovable(true);
    const coreImage = scene.textures.get(rbKey('rb-core-closed')).getSourceImage();
    this.coreSize = { w: coreImage.width * r.scale.body * CORE_TARGET, h: coreImage.height * r.scale.body * CORE_TARGET };
    // The camera frames his whole arena while he fights.
    this.frame = { left: this.left, right: this.right, top: this.floorY - r.camera.above, bottom: this.floorY + r.camera.below };

    // His arms: a stone over the ring at his shoulder, a chain of links from under it, and the stone
    // fist. Each fist has an invisible box (`hit`) that hurts, stops rounds, and, stuck, is a step;
    // each shoulder stone one that stops rounds.
    this.fistGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.stoneGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.arms = [-1, 1].map((side, i) => {
      const hit = scene.add.zone(0, 0, 10, 10);
      this.fistGroup.add(hit);
      hit.body.setAllowGravity(false).setImmovable(true);
      const arm = {
        side, hit, shoulderAt: r.shoulders[i], state: 'rest', speed: 1, shake: 0,
        health: r.armHealth.full, brokenMs: 0, grow: 1, // grow: 0 to 1 as a broken arm comes back
        dashHit: false, // already hit by this dash
        fist: scene.add.image(0, 0, rbKey(FIST)).setScale(r.arm.scale).setDepth(DEPTH.fist),
        stone: {
          image: scene.add.image(0, 0, rbKey(SHOULDER)).setScale(r.shoulderStone.scale).setDepth(DEPTH.shoulder).setFlipX(side < 0),
          glow: scene.add.image(0, 0, 'fx-dot').setTint(STONE_GLOW.colour).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.shoulder - 0.001).setAlpha(0),
          tether: scene.add.graphics().setDepth(DEPTH.glowLine).setBlendMode(Phaser.BlendModes.ADD),
          hit: scene.add.zone(0, 0, 10, 10),
          state: 'home', // home, tell, fly, wait, back
          at: { x: 0, y: 0 }, from: null, to: null, t: 0, ms: 0, spin: 0, speed: 1,
        },
        links: Array.from({ length: r.chain.links }, () => scene.add.image(0, 0, rbKey('rb-link')).setDepth(DEPTH.link)),
        glowLine: scene.add.graphics().setDepth(DEPTH.glowLine).setBlendMode(Phaser.BlendModes.ADD),
        bow: { x: 0, y: 0 }, // the chain's bow, easing to its shape
        squash: { x: 1, y: 1 }, // the fist's squash when it lands
        ghosts: Array.from({ length: TRAIL.ghosts }, () => scene.add.image(0, 0, rbKey(FIST)).setScale(r.arm.scale).setDepth(DEPTH.fist - 0.01).setAlpha(0)),
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
      arm.vx = 0;
      arm.vy = 0;
      hit.arm = arm;
      this.stoneGroup.add(arm.stone.hit);
      arm.stone.hit.body.setAllowGravity(false).setImmovable(true).setSize(this.stoneSize.w * 0.8, this.stoneSize.h * 0.8);
      arm.stone.hit.setSize(this.stoneSize.w * 0.8, this.stoneSize.h * 0.8);
      return arm;
    });
    // A stuck fist is a step; landing on it hard stomps it.
    scene.physics.add.collider(cat, this.fistGroup, null, (cat_, hit) => {
      const lands = hit.arm.state === 'stuck' && landsFromAbove({
        bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height, top: hit.body.top, vy: cat.body.velocity.y,
      });
      if (lands && cat.body.velocity.y > STOMP_SPEED) this.hurtArm(hit.arm, 'stomp', cat.x, hit.body.top);
      return lands;
    });
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

  // Where a fist rests: beside him, bobbing as it floats.
  restOf(arm) {
    const { fistRest, idle } = ROOTBREAKER;
    return {
      x: this.x + arm.side * fistRest.out + Math.sin(this.clock / 900 + arm.side) * 6,
      y: this.floorY - fistRest.up + Math.sin((2 * Math.PI * this.clock) / idle.breatheMs + arm.side) * fistRest.bobPx,
    };
  }

  // The way a resting fist points: out and a little down, swaying.
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
    const vy = (arm.goal.y - arm.lastGoal.y) / Math.max(dt, 0.001);
    arm.lastGoal = { ...arm.goal };
    // Its speed, smoothed a little: the chain trails behind it.
    const smooth = 1 - Math.exp(-dt * 20);
    arm.vx += (vx - arm.vx) * smooth;
    arm.vy += (vy - arm.vy) * smooth;
    if (!arm.swing) return;
    const lag = Phaser.Math.Clamp(vx / s.lagSpeed, -1, 1) * Phaser.Math.DegToRad(s.lagDeg);
    arm.spin += turnBetween(arm.angle, arm.aim + lag) * s.stiff * dt;
    arm.spin *= Math.exp(-s.settle * dt);
    arm.angle += arm.spin * dt;
  }

  // Places everything for this frame: the body breathing and leaning, his eyes following the cat,
  // the core, and each arm reaching for its fist's goal.
  pose(ms) {
    const r = ROOTBREAKER;
    const breathe = this.defeated ? 0 : Math.sin((2 * Math.PI * this.clock) / r.idle.breatheMs) * r.idle.breathePx;
    // His feet stay planted, a little into the ground: he breathes by stretching up from them, and
    // leans down into a blow but never lifts off.
    if (!this.defeated) {
      this.body.setPosition(this.x + this.lean.x, this.floorY + r.sinkPx + Math.max(0, this.lean.y));
      this.body.setScale(r.scale.body, r.scale.body * (1 + breathe / this.size.h));
    }
    const h = this.body.displayHeight;
    const top = this.body.y - h, left = this.body.x - this.size.w / 2;
    const on = (at) => ({ x: left + at.x * this.size.w, y: top + at.y * h });
    const look = this.defeated ? 0 : Phaser.Math.Clamp((this.cat.x - this.x) / 600, -1, 1) * r.idle.eyesPx;
    const faceAt = on(r.faceAt), coreAt = on(r.coreAt);
    if (!this.defeated) {
      this.face.setPosition(faceAt.x + look, faceAt.y + this.faceNod);
      this.core.setPosition(coreAt.x, coreAt.y);
    }
    this.coreGlow.setPosition(coreAt.x, coreAt.y);
    const targetTop = Math.min(coreAt.y - this.coreSize.h / 2, this.floorY - r.coreTarget.up), targetH = this.floorY - targetTop;
    this.sprite.setSize(this.coreSize.w, targetH);
    this.sprite.body.setSize(this.coreSize.w, targetH);
    this.sprite.body.reset(coreAt.x, targetTop + targetH / 2);
    this.mouth = { x: this.face.x, y: this.face.y + this.face.displayHeight * 0.2 };
    this.eyes = [-1, 1].map((s) => ({ x: this.face.x + s * this.face.displayWidth * 0.11, y: this.face.y - this.face.displayHeight * 0.04 }));
    this.eyeGlows.forEach((glow, i) => glow.setPosition(this.eyes[i].x, this.eyes[i].y));
    for (const arm of this.arms) this.poseArm(arm, on(arm.shoulderAt), ms);
  }

  // One arm: the stone fist where its goal is, turned a little with its swing, cracked once it's
  // worn down to half; its hit box round it; and the chain from the shoulder ring to its edge,
  // bowing like a rope and trailing behind it when it moves fast, out of the hole of the stone
  // shoulder on his ring. A broken arm isn't there (but its shoulder is); one growing back comes
  // together (grow).
  poseArm(arm, ring, ms = 16) {
    if (arm.state === 'dead') return;
    const r = ROOTBREAKER, k = r.arm.scale;
    this.poseStone(arm, ring);
    if (arm.state === 'broken') return;
    const mount = ring;
    const angle = arm.angle + Phaser.Math.DegToRad(arm.tremble);
    const at = { x: arm.goal.x + arm.shake, y: arm.goal.y };
    const turn = turnBetween(fistAngle(0, arm.side), angle) * r.arm.spin;
    const cracked = arm.health <= r.armHealth.full * r.armHealth.crackedAt;
    arm.fist.setTexture(rbKey(cracked ? 'rb-fist-cracked' : FIST)).setPosition(at.x, at.y).setRotation(turn)
      .setScale(k * arm.squash.x * arm.grow, k * arm.squash.y * arm.grow).setAlpha(arm.grow);
    const box = fistBox(at, this.fistSize);
    arm.box = box;
    arm.hit.setSize(box.right - box.left, box.bottom - box.top);
    arm.hit.body.setSize(box.right - box.left, box.bottom - box.top);
    arm.hit.body.reset(box.x, box.y);
    // The chain, to the fist's edge: its bow eases to its shape, pushed back by the fist's speed.
    const hold = chainHold(at, mount, this.fistSize);
    const c = r.chain;
    const shape = chainBow(mount, hold, arm.side, c);
    const lag = { x: Phaser.Math.Clamp(-arm.vx * c.lag, -c.lagMost, c.lagMost), y: Phaser.Math.Clamp(-arm.vy * c.lag, -c.lagMost, c.lagMost) };
    const ease = 1 - Math.exp(-(Math.min(ms, 50) / 1000) * c.ease);
    arm.bow.x += (shape.x + lag.x - arm.bow.x) * ease;
    arm.bow.y += (shape.y + lag.y - arm.bow.y) * ease;
    const links = chainLinks(mount, hold, arm.bow, c);
    links.forEach((link, i) => {
      const bob = Math.sin(this.clock / 260 + i * 1.3 + arm.side) * c.bobPx;
      // Growing back, the links come one by one from his shoulder.
      const shown = Phaser.Math.Clamp(arm.grow * links.length - i, 0, 1);
      arm.links[i].setPosition(link.x, link.y + bob).setRotation(link.rotation).setScale(link.size * shown).setAlpha(shown);
    });
    // A faint green glow along it, the magic that holds it together.
    arm.glowLine.clear().lineStyle(CHAIN_GLOW.width, CHAIN_GLOW.colour, CHAIN_GLOW.alpha * arm.grow).beginPath().moveTo(mount.x, mount.y);
    for (const link of links) arm.glowLine.lineTo(link.x, link.y);
    arm.glowLine.lineTo(hold.x, hold.y).strokePath();
    // Fast, it leaves fading copies behind.
    arm.trail.unshift({ x: arm.fist.x, y: arm.fist.y, rotation: arm.fist.rotation, key: arm.fist.texture.key, ox: arm.fist.originX, oy: arm.fist.originY });
    if (arm.trail.length > TRAIL.ghosts * 2 + 1) arm.trail.pop();
    const fast = arm.state === 'drop' || arm.state === 'sweeping';
    arm.ghosts.forEach((ghost, i) => {
      const t = arm.trail[Math.min(arm.trail.length - 1, (i + 1) * 2)];
      ghost.setTexture(t.key).setOrigin(t.ox, t.oy).setPosition(t.x, t.y).setRotation(t.rotation)
        .setAlpha(fast ? TRAIL.alpha * (1 - i / TRAIL.ghosts) : 0);
    });
  }

  // Whether an arm is there to fight with: not broken, nor still growing back.
  whole(arm) {
    return arm.state !== 'broken' && arm.state !== 'rebuild' && arm.state !== 'dead';
  }

  // ----- The fight's life -----

  start() {
    this.started = true;
    this.roar(1200, 0.01);
    this.state = 'rest';
    this.stateMs = ROOTBREAKER.restMs * 1.5;
    // Rounds fly through his stone to his core, where the scene's overlap with `sprite` takes them
    // (stopping, sparking while it's shut). Rounds into a fist stop on it, and wear its arm down.
    const { moves } = this.scene;
    const bulletOf = (a, b) => (moves.bullets.contains(a) ? a : b);
    // Rounds into a shoulder stone stop on it, sparking: it can't be hurt.
    this.scene.physics.add.overlap(moves.bullets, this.stoneGroup, (a, b) => {
      const bullet = bulletOf(a, b);
      if (!bullet.active || this.defeated) return;
      this.spark(bullet.x, bullet.y);
      moves.bulletStops(bullet);
    });
    this.scene.physics.add.overlap(moves.bullets, this.fistGroup, (a, b) => {
      const bullet = bulletOf(a, b);
      const hit = bullet === a ? b : a;
      if (!bullet.active || this.defeated || !hit.arm) return;
      if (!this.hurtArm(hit.arm, bullet.kind, bullet.x, bullet.y)) this.spark(bullet.x, bullet.y);
      moves.bulletStops(bullet);
    });
  }

  halt() {
    if (this.hitStopMs > 0) this.endHitStop();
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
      arm.glowLine.clear();
      arm.stone.glow.setAlpha(0);
      arm.stone.tether.clear();
      for (const part of [arm.fist, arm.stone.image, ...arm.links]) {
        this.scene.tweens.add({ targets: part, y: this.floorY + 60, angle: arm.side * Phaser.Math.Between(20, 70), alpha: 0, duration: 1100, ease: 'Quad.easeIn', delay: Phaser.Math.Between(0, 300) });
      }
    }
    this.scene.tweens.add({ targets: [this.body, this.face, this.core], y: `+=${TILE * 3}`, alpha: 0.2, duration: ROOTBREAKER.dieMs, ease: 'Quad.easeIn', delay: 500 });
    this.scene.time.delayedCall(ROOTBREAKER.dieMs + 500, () => this.onDefeated());
  }

  // ----- Each frame -----

  update(ms) {
    // A freeze after a heavy blow: everything holds still for a moment, then goes on.
    if (this.hitStopMs > 0) {
      this.hitStopMs -= ms;
      if (this.hitStopMs <= 0) this.endHitStop();
      return;
    }
    this.clock += ms;
    // His lean eases back to standing.
    const ease = 1 - Math.exp(-ms / 160);
    this.lean.x -= this.lean.x * ease;
    this.lean.y -= this.lean.y * ease;
    if (this.halted || this.defeated) {
      for (const arm of this.arms) this.swingFist(arm, ms);
      this.pose(ms);
      return;
    }
    if (this.faceMs > 0 && (this.faceMs -= ms) <= 0) this.setFace('calm');
    this.updateCore(ms);
    for (const arm of this.arms) {
      if (arm.state === 'rest' || arm.state === 'rebuild') {
        arm.goal = this.restOf(arm);
        arm.aim = this.restAim(arm);
      }
      if (arm.state === 'broken' && (arm.brokenMs -= ms) <= 0) this.rebuildArm(arm);
      this.dashInto(arm);
      this.updateArm(arm, ms);
      this.swingFist(arm, ms);
      this.updateStone(arm, ms);
    }
    this.updateShots(ms);
    this.pose(ms);
    if (!this.started) return;
    this.stateMs -= ms;
    if (this.state === 'rest' && this.stateMs <= 0) this.beginAttack();
    else if (this.state !== 'rest' && this.attackDone()) {
      this.state = 'rest';
      this.stateMs = ROOTBREAKER.restMs / this.phase.speed;
    }
  }

  beginAttack() {
    const fists = this.arms.filter((arm) => this.whole(arm));
    const { kind, steps } = pickAttack(this.phase, this.attackCount, fists.length);
    this.attackCount += steps;
    this.state = kind;
    const speed = this.phase.speed;
    // A smash and a sweep are made by the fist on the cat's side; with that arm gone, by the other.
    const onSide = this.arms[this.cat.x < this.x ? 0 : 1];
    const near = this.whole(onSide) ? onSide : fists[0];
    // The shoulder stone strikes from the side whose arm is broken, else the cat's side.
    if (kind === 'shoulder') this.shoulderStrike(this.arms.find((arm) => !this.whole(arm)) ?? onSide, speed);
    if (kind === 'smash') this.smash(near, speed);
    if (kind === 'sweep') this.sweep(near, speed);
    if (kind === 'blast') this.blast(speed);
    if (kind === 'laser') this.laser(speed);
    if (kind === 'rockfall') this.rockfall(speed);
  }

  attackDone() {
    return this.stateMs <= 0 && this.arms.every((arm) => (arm.state === 'rest' || !this.whole(arm)) && arm.stone.state === 'home')
      && this.leftovers.length === 0;
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
  // An arm alone (the other broken) works both sides.
  zoneX(arm, x) {
    const alone = this.arms.some((other) => other !== arm && !this.whole(other));
    const side = alone ? Math.sign(x - this.x) || arm.side : arm.side;
    return inReach(x, side, this.x, { left: this.left, right: this.right });
  }

  // The height of a fist's middle lying flat on the floor.
  get fistOnFloor() {
    const { h } = this.fistSize, { scale, box } = ROOTBREAKER.arm;
    return this.floorY - (h * scale * box) / 2;
  }

  // Smash, an overhead hammer blow. The wind-up: the fist hauled up and back, pointing up, his body
  // leaning into it. The tell: high over the cat, following him a little behind, trembling, its
  // shadow growing on the floor. The drop: fast and speeding up, the fist swinging over as it falls
  // to land flat. Then the slam (squash, dust, stones, a shake, a ring along the floor), stuck there
  // tugging to get free (a step to stand on; in phase 1 and 3 his core opens), and a slow, heavy lift.
  smash(arm, speed) {
    const s = ROOTBREAKER.smash;
    arm.state = 'windup';
    arm.speed = speed;
    this.stateMs = 0;
    this.lean.x = arm.side * 12;
    this.lean.y = -4;
    this.aimFist(arm, s.raiseTilt);
    // Up in an arc: it swings out first, then rises, overshooting a little.
    this.scene.tweens.add({ targets: arm.goal, x: this.zoneX(arm, arm.goal.x + arm.side * 40), duration: s.windupMs / speed, ease: 'Sine.easeOut' });
    this.scene.tweens.add({
      targets: arm.goal, y: this.floorY - s.high, duration: s.windupMs / speed, ease: 'Back.easeOut',
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
        arm.fist.setTint(0xd8ffc8);
        arm.state = 'sweeping';
        this.scene.audio.playSfx('maceWhoosh');
        this.lean.x = -arm.side * 18;
        this.aimFist(arm, 0);
        this.scene.tweens.add({ targets: arm.goal, y: this.floorY - s.height, duration: (s.sweepMs * 0.35) / speed, ease: 'Quad.easeIn' });
        this.scene.tweens.add({
          targets: arm.goal, x: inner, duration: s.sweepMs / speed, ease: 'Cubic.easeIn',
          onComplete: () => {
            arm.fist.clearTint();
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
      arm.fist.setTint(Math.floor(arm.blinkMs / 90) % 2 ? 0xb8ff8a : 0xffffff);
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
      arm.fist.setTint(Math.floor(arm.tellMs / 80) % 2 ? 0xd0ffc0 : 0xffffff);
      if (arm.tellMs <= 0) {
        arm.fist.clearTint();
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
      if (arm.stuckMs < 500) arm.fist.setTint(Math.floor(arm.stuckMs / 70) % 2 ? 0xffffff : 0xd0ffc0);
      if (arm.stuckMs <= 0) {
        arm.shake = 0;
        arm.fist.clearTint();
        arm.state = 'lift';
        this.debris(3);
        this.flyStones(arm.goal.x, this.floorY, 3);
        // Wrenched free: it lifts slow and heavy, swinging back to its rest.
        this.aimFist(arm, ROOTBREAKER.fistRest.tilt);
        const rest = this.restOf(arm);
        // Up first, heavy, then across in an arc, settling with a little overshoot.
        this.scene.tweens.add({ targets: arm.goal, y: rest.y, duration: s.liftMs / arm.speed, ease: 'Back.easeOut' });
        this.scene.tweens.add({ targets: arm.goal, x: rest.x, duration: s.liftMs / arm.speed, ease: 'Sine.easeIn', onComplete: () => { arm.state = 'rest'; } });
      }
    }
  }

  // The fight freezes for a moment (the moves, the cat, the shots), so a blow feels heavy.
  hitStop(ms) {
    const { world } = this.scene.physics;
    if (this.halted || this.hitStopMs > 0 || world.isPaused) return;
    this.hitStopMs = ms;
    world.pause();
    this.scene.tweens.pauseAll();
  }

  endHitStop() {
    this.hitStopMs = 0;
    this.scene.physics.world.resume();
    this.scene.tweens.resumeAll();
  }

  // The fist hits the floor.
  slam(arm) {
    if (this.halted || this.defeated) return; // the fight's over: no more blows
    const s = ROOTBREAKER.smash;
    const x = arm.goal.x;
    arm.state = 'stuck';
    arm.stuckMs = s.stuckMs / arm.speed;
    arm.shadow?.destroy();
    arm.angle = fistAngle(0, arm.side);
    // His body dips toward the blow.
    this.lean.y = 10;
    this.lean.x = arm.side * 12;
    // Squash, and spring back.
    arm.squash = { x: 1.14, y: 0.84 };
    this.scene.tweens.add({ targets: arm.squash, x: 1, y: 1, duration: 240, ease: 'Back.easeOut' });
    this.scene.effects.dust(x - 90, this.floorY, 12);
    this.scene.effects.dust(x + 90, this.floorY, 12);
    this.flyStones(x, this.floorY, 7);
    this.scene.audio.playSfx('smash');
    this.scene.cameras.main.shake(280, 0.013);
    this.hitStop(ROOTBREAKER.hitStopMs);
    // A ring of dust along the floor both ways: only a look. Only the fist itself hurts.
    for (const dir of [-1, 1]) {
      const wave = this.scene.add.ellipse(x, this.floorY - 8, 70, 22, WAVE_COLOUR, 0.18).setStrokeStyle(5, WAVE_COLOUR, 0.95).setDepth(DEPTH.warn);
      this.scene.tweens.add({ targets: wave, x: x + dir * s.waveReach, scaleY: 0.5, alpha: 0, duration: s.waveMs, ease: 'Quad.easeOut', onComplete: () => wave.destroy() });
    }
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

  // Eye lasers, at the cat: his eyes glow and charge, a thin blinking line from each follows the cat,
  // then stops following (the moment to move); the beams burn from his eyes along the lines, to the
  // floor or the walls, sparking where they end (updateShots).
  laser(speed) {
    const l = ROOTBREAKER.laser;
    this.setFace('warn', (l.tellMs + l.fireMs) / speed);
    for (const glow of this.eyeGlows) this.scene.tweens.add({ targets: glow, alpha: 0.9, scale: 1.6, duration: l.tellMs / speed });
    this.stateMs = (l.tellMs + l.fireMs) / speed;
    const guide = this.scene.add.graphics().setDepth(DEPTH.warn);
    this.leftovers.push({ kind: 'aim', image: guide, ms: l.tellMs / speed, total: l.tellMs / speed, speed, target: { ...this.cat.body.center } });
    this.scene.time.delayedCall((l.tellMs + l.fireMs) / speed, () => {
      for (const glow of this.eyeGlows) this.scene.tweens.add({ targets: glow, alpha: 0, scale: 1, duration: 200 });
    });
  }

  // Where the arena's edges are, for a beam: its walls, the floor, and the top of the camera's frame.
  get beamBounds() {
    return { left: this.left, right: this.right, top: this.frame.top, floor: this.floorY };
  }

  // Rockfall: both fists rise over his head, pointing up, then clash together, knuckles in; the
  // screen shakes, dust falls, then rocks, each one's shadow first.
  rockfall(speed) {
    const r = ROOTBREAKER.rockfall;
    this.stateMs = r.tellMs / speed + r.rocks * r.everyMs + 600;
    const top = this.floorY - this.size.h + 20; // just over his head, still on screen
    const raiseMs = (r.tellMs * 0.6) / speed;
    for (const arm of this.arms.filter((a) => this.whole(a))) {
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

  // Each frame: the balls and rocks fly, the lasers aim and burn, each hurting the cat it touches.
  updateShots(ms) {
    const dt = ms / 1000;
    const l = ROOTBREAKER.laser;
    const fired = [];
    this.leftovers = this.leftovers.filter((item) => {
      if (item.kind === 'aim') {
        // The lines follow the cat, a little behind, until they lock; they blink faster near the end.
        item.ms -= ms;
        if (item.ms > item.total * l.lockShare) {
          const k = Math.min(1, l.follow * dt);
          item.target.x += (this.cat.body.center.x - item.target.x) * k;
          item.target.y += (this.cat.body.center.y - item.target.y) * k;
        }
        const locked = item.ms <= item.total * l.lockShare;
        const on = Math.floor(item.ms / (locked ? 60 : 120)) % 2 === 0;
        item.image.clear().lineStyle(locked ? 4 : 2, 0x7dff6a, on ? 0.8 : 0.3);
        for (const eye of this.eyes) {
          const end = beamEnd(eye, item.target, this.beamBounds);
          item.image.lineBetween(eye.x, eye.y, end.x, end.y);
        }
        if (item.ms > 0) return true;
        item.image.destroy();
        if (this.defeated || this.halted) return false;
        // Fire: a beam from each eye along its line, sized once (the line's locked, so its length
        // hardly changes; resizing it each frame would redraw it).
        const beams = this.eyes.map((eye) => {
          const end = beamEnd(eye, item.target, this.beamBounds);
          const length = Math.max(1, Math.ceil(Math.hypot(end.x - eye.x, end.y - eye.y)));
          return this.scene.add.tileSprite(eye.x, eye.y, length, l.thick, rbKey('rb-laser')).setOrigin(0, 0.5).setDepth(DEPTH.laser);
        });
        fired.push({ kind: 'laser', image: beams[0], images: beams, ms: l.fireMs / item.speed, target: item.target });
        this.scene.audio.playSfx('shot');
        this.scene.cameras.main.shake(l.fireMs / item.speed, 0.004);
        return false;
      }
      if (item.kind === 'laser') {
        item.ms -= ms;
        item.images.forEach((beam, i) => {
          const eye = this.eyes[i];
          const end = beamEnd(eye, item.target, this.beamBounds);
          beam.setPosition(eye.x, eye.y).setRotation(Math.atan2(end.y - eye.y, end.x - eye.x));
          beam.tilePositionX += 30;
          beam.setScale(1, 0.85 + Math.random() * 0.3);
          if (Math.random() < 0.3) this.scene.effects.impact(end.x, end.y, 0.35); // sparks where it burns
          if (beamTouches(eye, end, l.thick, this.cat.body)) this.onHurtCat(eye.x);
        });
        if (item.ms > 0) return true;
        for (const beam of item.images) beam.destroy();
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
    this.leftovers.push(...fired);
  }

  clearLeftovers() {
    for (const item of this.leftovers) for (const image of item.images ?? [item.image]) image.destroy();
    this.leftovers = [];
    for (const arm of this.arms) arm.shadow?.destroy();
  }

  hurtIfTouching(rect, fromX) {
    const { body } = this.cat;
    if (body.right > rect.left && body.left < rect.right && body.bottom > rect.top && body.top < rect.bottom) this.onHurtCat(fromX);
  }

  // ----- His shoulder stones -----

  // A shoulder stone: on its ring at home (shaking as it warns), else where its flight has it,
  // spinning, with a glow back to his shoulder; and its box, which stops rounds.
  poseStone(arm, ring) {
    const st = arm.stone, s = ROOTBREAKER.shoulder;
    if (st.state === 'home' || st.state === 'tell') {
      const shake = st.state === 'tell' ? s.shakePx : 0;
      st.at = { x: ring.x + Phaser.Math.FloatBetween(-1, 1) * shake, y: ring.y + Phaser.Math.FloatBetween(-1, 1) * shake };
    } else if (st.state === 'back') {
      st.at = stoneFlight(st.from, ring, Phaser.Math.Easing.Sine.InOut(Math.min(1, st.t)), s.arcPx * 0.5);
    }
    st.image.setPosition(st.at.x, st.at.y).setAngle(st.spin);
    st.hit.body.reset(st.at.x, st.at.y);
    // The tell's glow, growing; and away, the glow back to his shoulder.
    const tell = st.state === 'tell' ? 1 - st.ms / (s.tellMs / st.speed) : 0;
    st.glow.setPosition(st.at.x, st.at.y).setScale(STONE_GLOW.scale * (0.6 + 0.4 * tell)).setAlpha(st.state === 'tell' ? STONE_GLOW.alpha * tell : st.state === 'fly' ? STONE_GLOW.alpha * 0.6 : 0);
    st.tether.clear();
    if (st.state !== 'home' && st.state !== 'tell') {
      st.tether.lineStyle(TETHER.width, TETHER.colour, TETHER.alpha).lineBetween(ring.x, ring.y, st.at.x, st.at.y);
    }
  }

  // The shoulder strike: the stone shakes and glows, he leans toward the cat, and it marks where
  // the cat is now; then it flies there (updateStone).
  shoulderStrike(arm, speed) {
    const st = arm.stone, s = ROOTBREAKER.shoulder;
    this.stateMs = 0;
    st.state = 'tell';
    st.speed = speed;
    st.ms = s.tellMs / speed;
    st.to = { x: Phaser.Math.Clamp(this.cat.x, this.left + this.stoneSize.w, this.right - this.stoneSize.w), y: this.floorY - (this.stoneSize.h * 0.8) / 2 };
    this.lean.x = (this.cat.x < this.x ? -1 : 1) * 10;
    this.setFace('warn', st.ms);
    this.scene.audio.playSfx('checkpoint');
  }

  // Each frame: a shoulder stone's strike goes on. The tell counts down; it flies in an arc to the
  // marked place, hurting the cat it touches, and lands with a thud; it waits there, then flies home.
  updateStone(arm, ms) {
    const st = arm.stone, s = ROOTBREAKER.shoulder;
    if (st.state === 'tell') {
      st.ms -= ms;
      if (st.ms <= 0) {
        st.state = 'fly';
        st.t = 0;
        st.from = { ...st.at };
        this.scene.audio.playSfx('maceWhoosh');
      }
    } else if (st.state === 'fly') {
      st.t += (ms * st.speed) / s.flyMs;
      st.at = stoneFlight(st.from, st.to, Phaser.Math.Easing.Quadratic.In(Math.min(1, st.t)), s.arcPx);
      st.spin += (s.spinDeg * ms) / 1000 * (st.to.x < st.from.x ? -1 : 1);
      const hw = (this.stoneSize.w * 0.8) / 2, hh = (this.stoneSize.h * 0.8) / 2;
      this.hurtIfTouching({ left: st.at.x - hw, right: st.at.x + hw, top: st.at.y - hh, bottom: st.at.y + hh }, st.at.x);
      if (st.t >= 1) {
        st.state = 'wait';
        st.ms = s.waitMs;
        this.scene.effects.dust(st.at.x, this.floorY, 8);
        this.flyStones(st.at.x, this.floorY, 3);
        this.scene.audio.playSfx('smash');
        this.scene.cameras.main.shake(160, 0.006);
      }
    } else if (st.state === 'wait') {
      st.ms -= ms;
      if (st.ms <= 0) {
        st.state = 'back';
        st.t = 0;
        st.from = { ...st.at };
      }
    } else if (st.state === 'back') {
      st.t += (ms * st.speed) / s.returnMs;
      st.spin -= st.spin * Math.min(1, ms / 200); // it settles upright as it comes home
      if (st.t >= 1) {
        st.state = 'home';
        st.spin = 0;
        this.scene.audio.playSfx('bump');
      }
    }
  }

  // ----- His arms, hurt and broken -----

  // A hit of this kind at (x, y) on an arm: it wears it down, flashing and jolting; worn out, it
  // breaks. Returns whether it hit (a broken arm, or one growing back, isn't there to hit).
  hurtArm(arm, kind, x, y) {
    if (this.defeated || this.halted || !this.whole(arm)) return false;
    arm.health = Math.max(0, arm.health - armDamage(kind));
    arm.fist.setTintFill(0xffffff);
    this.scene.time.delayedCall(FLASH_MS, () => arm.fist.clearTint());
    this.scene.effects.impact(x, y, 0.5);
    this.flyStones(x, y, 1);
    arm.squash = { x: 0.9, y: 1.1 };
    this.scene.tweens.add({ targets: arm.squash, x: 1, y: 1, duration: 160, ease: 'Back.easeOut' });
    if (arm.health === 0) this.breakArm(arm);
    else if (this.scene.time.now - (arm.clinkAt ?? 0) > 120) {
      arm.clinkAt = this.scene.time.now;
      this.scene.audio.playSfx('bump');
    }
    return true;
  }

  // Each frame: the cat dashing into a fist hits it, once a dash.
  dashInto(arm) {
    const { moves } = this.scene;
    if (!moves?.isDashing) {
      arm.dashHit = false;
      return;
    }
    if (arm.dashHit || !arm.box || !this.whole(arm)) return;
    const { body } = this.cat;
    if (body.right > arm.box.left && body.left < arm.box.right && body.bottom > arm.box.top && body.top < arm.box.bottom) {
      arm.dashHit = true;
      this.hurtArm(arm, moves.isRaging ? 'rage' : 'dash', body.center.x, body.center.y);
    }
  }

  // A blow from the cat's moves (the claw, a blast, the bolt) over a box { left, right, top,
  // bottom }: it hits each arm it reaches, once (`seen` keeps the ones already hit, for the bolt).
  // Returns whether it hit one. The cat's moves call it (systems/AdventureMoves.js).
  strikeParts(kind, box, seen = null) {
    let struck = false;
    for (const arm of this.arms) {
      if (!arm.box || seen?.has(arm)) continue;
      const b = arm.box;
      if (box.right < b.left || box.left > b.right || box.bottom < b.top || box.top > b.bottom) continue;
      if (this.hurtArm(arm, kind, (Math.max(box.left, b.left) + Math.min(box.right, b.right)) / 2, (Math.max(box.top, b.top) + Math.min(box.bottom, b.bottom)) / 2)) {
        seen?.add(arm);
        struck = true;
      }
    }
    return struck;
  }

  // An arm worn out: the stone shatters, the chain's links drop and fade, he reels and roars, and
  // his core opens. It grows back after a while (rebuildArm).
  breakArm(arm) {
    const { armHealth } = ROOTBREAKER;
    this.scene.tweens.killTweensOf(arm.goal);
    this.scene.tweens.killTweensOf(arm);
    arm.shadow?.destroy();
    arm.shadow = null;
    arm.fist.clearTint();
    arm.state = 'broken';
    arm.brokenMs = armHealth.regrowMs;
    arm.hit.body.enable = false;
    const { x, y } = arm.fist;
    arm.fist.setVisible(false);
    for (const ghost of arm.ghosts) ghost.setAlpha(0);
    arm.glowLine.clear();
    // The stone in pieces, flying.
    this.flyStones(x, y, 10);
    this.scene.effects.dust(x, y, 14);
    this.scene.effects.impact(x, y, 1.3);
    this.scene.audio.playSfx('shatter');
    this.scene.cameras.main.shake(BREAK_SHAKE.ms, BREAK_SHAKE.strength);
    // The links drop to the floor and fade.
    for (const link of arm.links) {
      this.scene.tweens.add({
        targets: link, y: this.floorY - 10, angle: Phaser.Math.Between(-120, 120), duration: Phaser.Math.Between(450, 750), ease: 'Quad.easeIn',
        onComplete: () => this.scene.tweens.add({ targets: link, alpha: 0, duration: 400 }),
      });
    }
    this.flinch(16);
    this.roar(700, 0.008);
    this.openCore(ROOTBREAKER.coreOpenMs[`phase${this.phase.index + 1}`]);
  }

  // A broken arm grows back: the links come out of his shoulder one by one, and the stone forms at
  // their end, whole again.
  rebuildArm(arm) {
    const { armHealth } = ROOTBREAKER;
    arm.state = 'rebuild';
    arm.health = armHealth.full;
    arm.grow = 0;
    arm.goal = this.restOf(arm);
    arm.lastGoal = { ...arm.goal };
    arm.angle = arm.aim = this.restAim(arm);
    arm.spin = 0;
    arm.swing = true;
    arm.squash = { x: 1, y: 1 };
    arm.fist.setVisible(true).setAlpha(0);
    for (const link of arm.links) link.setAngle(0);
    this.scene.audio.playSfx('checkpoint');
    this.scene.tweens.add({
      targets: arm, grow: 1, duration: armHealth.rebuildMs, ease: 'Back.easeOut',
      onComplete: () => {
        if (arm.state !== 'rebuild') return;
        arm.state = 'rest';
        arm.hit.body.enable = true;
      },
    });
  }
}
