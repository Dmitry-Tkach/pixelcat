import Phaser from 'phaser';
import { ROUNDS, SHOT_LOOK, roundFit, shotKey } from './shotLook.js';

// Draws how the minigun's shots look (their settings are in shotLook.js): each round's glowing
// picture, the glow at the muzzle and the shell cases thrown out, trails, the sparks where a round
// hits, and the explosive round's bigger blast. Its particle emitters are made once, for the level,
// and each effect bursts from them, so firing fast doesn't make new objects.
export class ShotEffects {
  constructor(scene) {
    this.scene = scene;
    const { depth } = SHOT_LOOK;
    // Settings read as each particle is made, so one emitter serves every round and both directions.
    this.facing = 1;
    this.tint = 0xffffff;
    const burst = (texture, config, at = depth) => scene.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(at);
    const { casing, trail, blast } = SHOT_LOOK;
    this.casings = burst(shotKey('casing'), {
      lifespan: casing.ms, speed: { min: casing.speed[0], max: casing.speed[1] },
      angle: { onEmit: () => this.casingAngle() },
      gravityY: casing.gravity, rotate: { start: 0, end: casing.spin }, alpha: { start: 1, end: 0, ease: 'Quad.easeIn' },
    }, depth - 2);
    // Sparks: the shared star-shaped spark (ui/Effects.js), in the round's colour.
    this.sparks = burst('fx-spark', {
      lifespan: { min: 180, max: 340 }, speed: { min: 140, max: 360 }, angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 }, rotate: { min: 0, max: 180 }, blendMode: 'ADD',
      tint: { onEmit: () => this.tint },
    });
    this.glows = burst(shotKey('glow'), {
      lifespan: trail.glowMs, speed: 0, scale: { start: trail.glowSize, end: 0 }, alpha: { start: 0.8, end: 0 },
      blendMode: 'ADD', tint: { onEmit: () => this.tint },
    }, depth - 1);
    this.embers = burst('fx-dot', {
      lifespan: { min: 380, max: 760 }, speed: { min: 80, max: 340 }, angle: { min: 200, max: 340 },
      gravityY: 520, scale: { start: 0.45, end: 0 }, blendMode: 'ADD', tint: [0xffe066, blast.colour, 0xff5a1f],
    });
    this.smoke = burst(shotKey('smoke'), {
      lifespan: { min: trail.smokeMs, max: trail.smokeMs * 2 }, speed: { min: 10, max: 50 }, angle: { min: 240, max: 300 },
      scale: { start: trail.smokeSize[0], end: trail.smokeSize[1] * 2 }, alpha: { start: 0.55, end: 0 },
      rotate: { min: 0, max: 360 }, tint: trail.smokeTint,
    }, depth - 1);
  }

  // Shell cases fly up and back, over his shoulder, whichever way he faces.
  casingAngle() {
    const [low, high] = SHOT_LOOK.casing.angle;
    const angle = Phaser.Math.Between(low, high);
    return this.facing > 0 ? angle : 180 - angle;
  }

  // Dresses a new bullet as its round: its picture, glowing or not, its head at the muzzle, and its
  // hitbox (w by h on screen) on its head.
  styleBullet(bullet, kind, dir, hitbox) {
    const round = ROUNDS[kind];
    const { origin, body } = roundFit(round, dir, hitbox);
    bullet.setTexture(shotKey(round.picture)).setScale(round.scale).setFlipX(dir < 0).setOrigin(origin, 0.5)
      .setBlendMode(round.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    bullet.body.setSize(body.w, body.h, false).setOffset(body.x, body.y);
    bullet.trailMs = 0;
  }

  // As a round leaves the barrel: a glow there, and a shell case thrown out.
  muzzle(x, y, dir, kind) {
    const round = ROUNDS[kind];
    const { muzzle, casing } = SHOT_LOOK;
    const glow = this.scene.add.image(x, y, shotKey('glow')).setDepth(SHOT_LOOK.depth).setTint(round.colour)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(muzzle.size);
    this.scene.tweens.add({ targets: glow, scale: muzzle.size * 0.3, alpha: 0, duration: muzzle.ms, onComplete: () => glow.destroy() });
    if (round.casing) {
      this.facing = dir;
      this.casings.explode(1, x - dir * casing.back, y);
    }
  }

  // What a round leaves behind it as it flies: a glow, or smoke and embers.
  trail(bullet, kind, ms) {
    const { trail } = ROUNDS[kind];
    if (!trail) return;
    bullet.trailMs -= ms;
    if (bullet.trailMs > 0) return;
    bullet.trailMs = trail.everyMs;
    if (trail.glow) {
      this.tint = ROUNDS[kind].colour;
      this.glows.explode(1, bullet.x, bullet.y);
    }
    if (trail.smoke) {
      this.smoke.explode(1, bullet.x, bullet.y);
      this.embers.explode(1, bullet.x, bullet.y);
    }
  }

  // Where a round hits something: a flash and sparks of its colour, and against a wall, a little
  // smoke.
  hit(x, y, kind, { wall = false } = {}) {
    const { colour } = ROUNDS[kind];
    const { hit } = SHOT_LOOK;
    this.flash(x, y, colour, hit.flashSize, hit.flashMs);
    this.tint = colour;
    this.sparks.explode(hit.sparks, x, y);
    if (kind === 'laser') this.ring(x, y, colour, hit.ring, hit.flashMs * 2);
    if (wall) this.smoke.explode(hit.dust, x, y);
  }

  // An explosive round's burst, on top of its explosion: a bright flash, a ring rushing out, embers
  // flying, and smoke rising.
  blast(x, y) {
    const { blast } = SHOT_LOOK;
    this.flash(x, y, blast.colour, blast.flashSize, blast.flashMs);
    this.ring(x, y, blast.colour, blast.ring, blast.ringMs);
    this.embers.explode(blast.embers, x, y);
    this.smoke.explode(blast.smoke, x, y);
  }

  flash(x, y, colour, size, ms) {
    const flash = this.scene.add.image(x, y, shotKey('glow')).setDepth(SHOT_LOOK.depth).setTint(colour)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(size * 0.6);
    this.scene.tweens.add({ targets: flash, scale: size, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => flash.destroy() });
  }

  ring(x, y, colour, size, ms) {
    const ring = this.scene.add.image(x, y, 'fx-ring').setDepth(SHOT_LOOK.depth).setTint(colour).setScale(0.2 * size).setAlpha(0.9);
    this.scene.tweens.add({ targets: ring, scale: size, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
  }
}
