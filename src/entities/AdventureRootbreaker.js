import Phaser from 'phaser';
import { ROOTBREAKER, coreDamage, nextAttack, rbKey, rootbreakerPhase } from '../data/adventure/rootbreaker.js';
import { TILE } from '../systems/adventureMap.js';
import { landsFromAbove } from '../systems/adventurePlatformLanding.js';

// The Rootbreaker, played (data/adventure/rootbreaker.js for his rules and numbers). He's his own
// boss, nothing like the troll: he stands behind his arena and never walks, his fists float and
// fight, and only his open core can be hurt. The scene fights him the way it fights any boss: it
// starts him, updates him, aims the cat's rounds at `sprite` (his core) through takeHit, and reads
// `brain` for his health bar. He hurts the cat himself (onHurtCat), so the scene doesn't ask what
// touching him does (ownTouch).
const DEPTH = { body: 1.8, face: 1.81, core: 1.82, fist: 5.8, seal: 5.81, shot: 6.3, laser: 6.4, warn: 6.35 };
const FIST_BOB = { px: 10, ms: 1600 };
const FIST_SPEED = 620; // px a second, flying back to rest or out to a sweep's start
const WAVE = { colour: 0x7dff6a, ms: 420 };
const ROCK_SHADOW = { w: 90, h: 16, alpha: 0.45 };
const CLINK_MS = 90;

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
    this.started = false;
    this.halted = false;
    this.defeated = false;
    this.coreOpen = false;
    this.attackCount = 0;
    this.phaseIndex = 0;
    this.leftovers = [];
    const r = ROOTBREAKER;
    const art = (name) => rbKey(name);

    // His body, standing on the floor behind the arena, his face and his core over it.
    this.body = scene.add.image(this.x, this.floorY, art('rb-body')).setOrigin(0.5, 1).setScale(r.scale.body).setDepth(DEPTH.body);
    const top = this.floorY - this.body.displayHeight, left = this.x - this.body.displayWidth / 2;
    const on = (at) => ({ x: left + at.x * this.body.displayWidth, y: top + at.y * this.body.displayHeight });
    const faceAt = on(r.faceAt), coreAt = on(r.coreAt);
    this.face = scene.add.image(faceAt.x, faceAt.y, art('rb-face-calm')).setScale(r.scale.body).setDepth(DEPTH.face);
    this.core = scene.add.image(coreAt.x, coreAt.y, art('rb-core-closed')).setScale(r.scale.body).setDepth(DEPTH.core);
    this.mouth = { x: faceAt.x, y: faceAt.y + this.face.displayHeight * 0.18 };
    this.eyes = { x: faceAt.x, y: faceAt.y - this.face.displayHeight * 0.05 };
    // What the cat's rounds aim at: his core (scene: moves.setBoss). Rounds into his stone elsewhere stop.
    this.sprite = scene.physics.add.image(coreAt.x, coreAt.y, art('rb-core-closed')).setScale(r.scale.body * 0.8).setVisible(false);
    this.sprite.body.setAllowGravity(false).setImmovable(true);
    this.stone = scene.add.zone(this.x, top + this.body.displayHeight / 2, this.body.displayWidth * 0.8, this.body.displayHeight);
    scene.physics.add.existing(this.stone, true);

    // His fists, one each side, floating; a stuck one is a step he can stand on.
    this.fistGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.fists = [-1, 1].map((side) => {
      const fist = scene.physics.add.image(0, 0, art('rb-fist')).setScale(r.scale.fist).setDepth(DEPTH.fist).setFlipX(side > 0);
      this.fistGroup.add(fist);
      fist.body.setAllowGravity(false).setImmovable(true).setSize(fist.width * 0.8, fist.height * 0.7);
      Object.assign(fist, { side, state: 'rest', ms: 0, sealHits: 0, cracked: false });
      fist.seal = scene.add.image(0, 0, art('rb-seal-cracked')).setScale(0.32, 0.6).setDepth(DEPTH.seal).setVisible(false);
      this.placeFist(fist, this.restOf(fist));
      return fist;
    });
    scene.physics.add.collider(cat, this.fistGroup, null, (cat_, fist) => fist.state === 'stuck' && landsFromAbove({
      bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height, top: fist.body.top, vy: cat.body.velocity.y,
    }));

    const self = this;
    this.brain = {
      get isDefeated() { return self.defeated; },
      get healthShare() { return Math.max(0, self.hp / ROOTBREAKER.health); },
      get isInvulnerable() { return !self.coreOpen; },
    };
    // The arena's own business (the scene updates it, and shakes it for his slams).
    this.arena = { update: () => {}, shake: () => scene.cameras.main.shake(200, 0.006) };
    this.clock = 0;
  }

  get phase() {
    return rootbreakerPhase(this.brain.healthShare);
  }

  start() {
    this.started = true;
    this.scene.cameras.main.shake(500, 0.008);
    this.scene.audio.playSfx('guardianRoar');
    this.setFace('blast', 900);
    this.state = 'rest';
    this.stateMs = ROOTBREAKER.restMs;
    // Rounds into his stone stop there; over his open core, the scene's overlap with `sprite` takes
    // them. Rounds into a fist stop on it, and in phase 2 a stuck one's seal cracks.
    const { moves } = this.scene;
    const bulletOf = (a, b) => (moves.bullets.contains(a) ? a : b);
    this.scene.physics.add.overlap(moves.bullets, this.stone, (a, b) => {
      const bullet = bulletOf(a, b);
      if (bullet.active && !this.coreHitBy(bullet)) moves.bulletStops(bullet);
    });
    this.scene.physics.add.overlap(moves.bullets, this.fistGroup, (a, b) => {
      const bullet = bulletOf(a, b);
      if (!bullet.active || this.defeated) return;
      this.shootSeal(bullet.x, bullet.y);
      moves.bulletStops(bullet);
    });
  }

  // A round into his stone, but over his open core, goes on to it (the scene's overlap with sprite).
  coreHitBy(bullet) {
    return this.coreOpen && this.sprite.getBounds().contains(bullet.x, bullet.y);
  }

  halt() {
    this.halted = true;
  }

  // A round, a blast or a move reached his core: it hurts only while open.
  takeHit(kind, x, y) {
    if (this.defeated) return;
    const damage = coreDamage(kind, this.coreOpen);
    if (!damage) {
      this.core.setTintFill(0xffffff);
      this.scene.time.delayedCall(CLINK_MS, () => this.core.clearTint());
      return;
    }
    const before = this.phase.index;
    this.hp = Math.max(0, this.hp - damage);
    this.core.setTintFill(0xffffff);
    this.scene.time.delayedCall(CLINK_MS, () => this.core.clearTint());
    this.scene.effects.impact(x, y, 0.8);
    if (this.hp === 0) return this.die();
    if (this.phase.index !== before) this.newPhase();
  }

  // Into a new phase: his core slams shut, he roars, and his attacks start again from the first.
  newPhase() {
    this.closeCore();
    this.attackCount = 0;
    this.setFace('blast', 1000);
    this.scene.audio.playSfx('guardianRoar');
    this.scene.cameras.main.shake(600, 0.01);
    for (const fist of this.fists) Object.assign(fist, { sealHits: 0, cracked: false });
  }

  die() {
    this.defeated = true;
    this.coreOpen = false;
    this.core.setTexture(rbKey('rb-core-shattered'));
    this.setFace('calm');
    this.face.setTint(0x777777);
    this.clearLeftovers();
    this.scene.audio.playSfx('smash');
    this.scene.cameras.main.shake(ROOTBREAKER.dieMs, 0.012);
    for (const fist of this.fists) {
      fist.state = 'dead';
      fist.body.enable = false;
      fist.seal.setVisible(false);
      this.scene.tweens.add({ targets: fist, y: this.floorY + 200, angle: fist.side * 40, alpha: 0, duration: 1200, ease: 'Quad.easeIn' });
    }
    this.scene.tweens.add({ targets: [this.body, this.face, this.core], y: `+=${TILE * 2}`, alpha: 0.35, duration: ROOTBREAKER.dieMs, ease: 'Quad.easeIn' });
    this.scene.time.delayedCall(ROOTBREAKER.dieMs, () => this.onDefeated());
  }

  // ----- Each frame -----

  update(ms) {
    this.clock += ms;
    if (this.halted || this.defeated) return;
    if (this.faceMs > 0 && (this.faceMs -= ms) <= 0) this.setFace('calm');
    if (this.coreMs > 0 && (this.coreMs -= ms) <= 0) this.closeCore();
    for (const fist of this.fists) this.updateFist(fist, ms);
    this.updateShots(ms);
    if (!this.started) return;
    this.stateMs -= ms;
    if (this.state === 'rest' && this.stateMs <= 0) this.beginAttack();
    else if (this.state !== 'rest' && this.attackDone()) {
      this.state = 'rest';
      this.stateMs = ROOTBREAKER.restMs / this.phase.speed;
    }
  }

  // The next attack in his phase's list.
  beginAttack() {
    const kind = nextAttack(this.phase, this.attackCount++);
    this.state = kind;
    const speed = this.phase.speed;
    if (kind === 'smash') this.smash(this.fists[this.attackCount % 2], speed);
    if (kind === 'sweep') this.sweep(this.fists[(this.attackCount + 1) % 2], speed);
    if (kind === 'blast') this.blast(speed);
    if (kind === 'laser') this.laser(speed);
    if (kind === 'rockfall') this.rockfall(speed);
  }

  // Whether the attack under way is over: his fists back at rest, nothing of it still flying.
  attackDone() {
    return this.stateMs <= 0 && this.fists.every((fist) => fist.state === 'rest') && this.leftovers.length === 0;
  }

  setFace(kind, ms = 0) {
    this.face.setTexture(rbKey(`rb-face-${kind}`));
    this.faceMs = ms;
  }

  // His core opens for a while (it cracks open first), then closes.
  openCore(ms) {
    if (this.coreOpen) {
      this.coreMs = ms;
      return;
    }
    this.core.setTexture(rbKey('rb-core-opening'));
    this.scene.time.delayedCall(220, () => {
      if (this.defeated) return;
      this.coreOpen = true;
      this.core.setTexture(rbKey('rb-core-open'));
      this.coreMs = ms;
      this.scene.audio.playSfx('checkpoint');
    });
  }

  closeCore() {
    this.coreOpen = false;
    this.coreMs = 0;
    if (!this.defeated) this.core.setTexture(rbKey('rb-core-closed'));
  }

  // ----- His fists -----

  restOf(fist) {
    const r = ROOTBREAKER.fistRest;
    return { x: this.x + fist.side * r.out, y: this.floorY - r.up + Math.sin((2 * Math.PI * this.clock) / FIST_BOB.ms + fist.side) * FIST_BOB.px };
  }

  placeFist(fist, { x, y }) {
    fist.body.reset(x, y);
    fist.seal.setPosition(x + (fist.side < 0 ? 1 : -1) * fist.displayWidth * 0.36, y).setVisible(fist.cracked);
  }

  // Moves a fist toward a place, no faster than `speed`; returns whether it's there.
  flyFist(fist, to, speed, ms) {
    const dx = to.x - fist.x, dy = to.y - fist.y, d = Math.hypot(dx, dy);
    const step = (speed * ms) / 1000;
    if (d <= step) {
      this.placeFist(fist, to);
      return true;
    }
    this.placeFist(fist, { x: fist.x + (dx / d) * step, y: fist.y + (dy / d) * step });
    return false;
  }

  // Smash: the fist rises over where the cat is, following him (its shadow on the floor), then
  // drops; the slam sends a wave along the floor; it sticks there a while, a step to stand on.
  smash(fist, speed) {
    const s = ROOTBREAKER.smash;
    Object.assign(fist, { state: 'tell', ms: s.tellMs / speed, speed });
    fist.shadow = this.scene.add.ellipse(fist.x, this.floorY, 120, 22, 0x000000, 0.4).setDepth(DEPTH.warn);
    this.stateMs = 0;
  }

  sweep(fist, speed) {
    const s = ROOTBREAKER.sweep;
    const from = fist.side < 0 ? this.left + fist.displayWidth / 2 : this.right - fist.displayWidth / 2;
    Object.assign(fist, { state: 'sweepOut', ms: s.tellMs / speed, speed, sweepFrom: from, sweepTo: fist.side < 0 ? this.right + 200 : this.left - 200 });
    this.stateMs = 0;
  }

  updateFist(fist, ms) {
    if (fist.state === 'dead') return;
    const s = ROOTBREAKER.smash;
    fist.ms -= ms;
    switch (fist.state) {
      case 'rest':
        this.placeFist(fist, this.restOf(fist));
        break;
      case 'tell': {
        // Over the cat, high up, following him a little behind.
        const target = { x: Phaser.Math.Clamp(this.cat.x, this.left + 60, this.right - 60), y: this.floorY - 5.5 * TILE };
        this.flyFist(fist, { x: fist.x + (target.x - fist.x) * Math.min(1, s.follow * ms / 120), y: target.y }, FIST_SPEED * 2, ms);
        fist.shadow.setPosition(fist.x, this.floorY).setAlpha(0.25 + 0.3 * (1 - Math.max(0, fist.ms) / s.tellMs));
        if (Math.floor(fist.ms / 90) % 2) fist.setTint(0xb8ff8a);
        else fist.clearTint();
        if (fist.ms <= 0) {
          fist.clearTint();
          fist.state = 'drop';
        }
        break;
      }
      case 'drop': {
        const bottom = this.floorY - fist.displayHeight * 0.1;
        const landed = this.flyFist(fist, { x: fist.x, y: bottom - fist.displayHeight / 2 }, s.dropSpeed, ms);
        this.hurtIfTouching(fist.getBounds(), fist.x);
        if (landed) this.slam(fist);
        break;
      }
      case 'stuck':
        if (fist.ms <= 0) fist.state = 'return';
        break;
      case 'return':
        if (this.flyFist(fist, this.restOf(fist), FIST_SPEED, ms)) fist.state = 'rest';
        break;
      case 'sweepOut':
        // Out to its side of the arena, low, glowing: the tell.
        this.flyFist(fist, { x: fist.sweepFrom, y: this.floorY - ROOTBREAKER.sweep.height }, FIST_SPEED * 1.5, ms);
        if (Math.floor(fist.ms / 90) % 2) fist.setTint(0xb8ff8a);
        else fist.clearTint();
        if (fist.ms <= 0) {
          fist.clearTint();
          fist.state = 'sweeping';
          fist.setFlipX(fist.sweepTo > fist.x); // knuckles first
          this.scene.audio.playSfx('maceWhoosh');
        }
        break;
      case 'sweeping': {
        const done = this.flyFist(fist, { x: fist.sweepTo, y: this.floorY - ROOTBREAKER.sweep.height }, ROOTBREAKER.sweep.speed * fist.speed, ms);
        this.hurtIfTouching(fist.getBounds(), fist.x);
        if (done) {
          fist.setFlipX(fist.side > 0);
          fist.state = 'return';
        }
        break;
      }
      default:
        break;
    }
  }

  // The fist hits the floor: dust, a shake, a wave along the floor either way (jump it, or be up on a
  // ledge), and it sticks. In phase 1 and 3 his core opens; in phase 2, its seal can be shot.
  slam(fist) {
    const s = ROOTBREAKER.smash;
    fist.state = 'stuck';
    fist.ms = s.stuckMs / fist.speed;
    fist.shadow?.destroy();
    this.scene.effects.dust(fist.x - 50, this.floorY, 8);
    this.scene.effects.dust(fist.x + 50, this.floorY, 8);
    this.scene.audio.playSfx('smash');
    this.onShake?.();
    const wave = this.scene.add.ellipse(fist.x, this.floorY - 6, 40, 14).setStrokeStyle(4, WAVE.colour, 0.9).setDepth(DEPTH.warn);
    this.scene.tweens.add({ targets: wave, scaleX: (s.waveReach * 2) / 40, alpha: 0, duration: WAVE.ms, onComplete: () => wave.destroy() });
    const { body } = this.cat;
    if (this.cat.onGround && Math.abs(body.bottom - this.floorY) < 12 && Math.abs(body.center.x - fist.x) < s.waveReach) this.onHurtCat(fist.x);
    if (this.phase.index !== 1) this.openCore(ROOTBREAKER.coreOpenMs[`phase${this.phase.index + 1}`]);
  }

  // ----- His shots: the mouth blast's balls, the laser, the rocks -----

  blast(speed) {
    const b = ROOTBREAKER.blast;
    this.setFace('warn', b.tellMs / speed);
    this.stateMs = b.tellMs / speed + b.balls * b.everyMs;
    this.scene.time.delayedCall(b.tellMs / speed, () => {
      if (this.defeated || this.halted) return;
      this.setFace('blast', b.balls * b.everyMs + 300);
      for (let i = 0; i < b.balls; i++) {
        this.scene.time.delayedCall(i * b.everyMs, () => {
          if (this.defeated || this.halted) return;
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

  laser(speed) {
    const l = ROOTBREAKER.laser;
    const height = l.heights[this.attackCount % l.heights.length];
    const y = this.floorY - height;
    this.setFace('warn', (l.tellMs + l.fireMs) / speed);
    const guide = this.scene.add.rectangle(this.left, y, this.right - this.left, 3, 0x7dff6a, 0.6).setOrigin(0, 0.5).setDepth(DEPTH.warn);
    this.scene.tweens.add({ targets: guide, alpha: 0.15, duration: 120, yoyo: true, repeat: -1 });
    this.stateMs = (l.tellMs + l.fireMs) / speed;
    this.scene.time.delayedCall(l.tellMs / speed, () => {
      guide.destroy();
      if (this.defeated || this.halted) return;
      const beam = this.scene.add.tileSprite(this.left, y, this.right - this.left, l.thick, rbKey('rb-laser')).setOrigin(0, 0.5).setDepth(DEPTH.laser);
      const item = { kind: 'laser', image: beam, ms: l.fireMs / speed, rect: { left: this.left, right: this.right, top: y - l.thick / 2, bottom: y + l.thick / 2 } };
      this.leftovers.push(item);
      this.scene.audio.playSfx('shot');
    });
  }

  rockfall(speed) {
    const r = ROOTBREAKER.rockfall;
    this.setFace('blast', 600);
    this.onShake?.();
    this.stateMs = r.tellMs / speed + r.rocks * r.everyMs;
    for (let i = 0; i < r.rocks; i++) {
      this.scene.time.delayedCall(i * r.everyMs, () => {
        if (this.defeated || this.halted) return;
        // The first lands where he is, the rest anywhere: a shadow shows each first.
        const x = i === 0 ? this.cat.x : Phaser.Math.Between(this.left + 40, this.right - 40);
        const shadow = this.scene.add.ellipse(x, this.floorY, ROCK_SHADOW.w, ROCK_SHADOW.h, 0x000000, ROCK_SHADOW.alpha).setDepth(DEPTH.warn);
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

  // Each frame: balls and rocks fly, the laser burns, and each hurts the cat it touches.
  updateShots(ms) {
    const dt = ms / 1000;
    this.leftovers = this.leftovers.filter((item) => {
      if (item.kind === 'laser') {
        item.ms -= ms;
        item.image.tilePositionX += 30;
        this.hurtIfTouching(item.rect, this.x);
        if (item.ms > 0) return true;
        item.image.destroy();
        return false;
      }
      const { image } = item;
      image.x += item.vx * dt;
      image.y += item.vy * dt;
      if (item.kind === 'rock') image.angle += 120 * dt;
      this.hurtIfTouching({ left: image.x - item.r, right: image.x + item.r, top: image.y - item.r, bottom: image.y + item.r }, image.x);
      const landed = item.kind === 'rock' && image.y >= this.floorY - item.r;
      const gone = image.x < this.left - 100 || image.x > this.right + 100 || image.y > this.floorY + 40;
      if (landed) {
        this.scene.effects.dust(image.x, this.floorY, 6);
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
    for (const fist of this.fists) fist.shadow?.destroy();
  }

  hurtIfTouching(rect, fromX) {
    const { body } = this.cat;
    if (body.right > rect.left && body.left < rect.right && body.bottom > rect.top && body.top < rect.bottom) this.onHurtCat(fromX);
  }

  // ----- Phase 2: a stuck fist's seal -----

  // A round at (x, y): into a stuck fist's seal, in phase 2, it cracks it a little; both cracked, his
  // core opens. Returns whether it hit a seal.
  shootSeal(x, y) {
    if (this.phase.index !== 1) return false;
    const fist = this.fists.find((f) => f.state === 'stuck' && !f.cracked && f.getBounds().contains(x, y));
    if (!fist) return false;
    fist.sealHits += 1;
    fist.setTintFill(0xffffff);
    this.scene.time.delayedCall(CLINK_MS, () => fist.clearTint());
    if (fist.sealHits >= ROOTBREAKER.sealHits) {
      fist.cracked = true;
      fist.seal.setVisible(true);
      this.scene.audio.playSfx('shatter');
      if (this.fists.every((f) => f.cracked)) {
        this.openCore(ROOTBREAKER.coreOpenMs.phase2);
        this.scene.time.delayedCall(ROOTBREAKER.coreOpenMs.phase2, () => {
          for (const f of this.fists) Object.assign(f, { cracked: false, sealHits: 0 });
        });
      }
    }
    return true;
  }
}
