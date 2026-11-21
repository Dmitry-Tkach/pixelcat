import { FREE_MOVE } from '../../config/gameConfig.js';
import { SWIM } from '../../data/adventure/swim.js';
import { strokeSpeed, swimVelocity, swimsAt } from './pools.js';

// Swimming in a level's pools (data/adventure/swim.js). Once his middle is far enough under a
// pool's surface, he swims: the water's own gravity, slower across, his doggy-paddle (or treading
// water, still), and a bubble now and then. He floats at the surface (his middle `submerge` under
// it): strokes can't lift him out of the water, only a leap, and he's out only once his feet are. The scene sends him a jump press while he
// swims (stroke): a stroke up, or, at the surface, a leap out onto the bank. Out of the water, his
// own gravity is back; his leap out is his jump, so no double jump until he lands (the water's
// ledges are spaced for that: tests/adventure-dam.test.js).
export class AdventureSwimming {
  constructor(scene, cat, pools) {
    this.scene = scene;
    this.cat = cat;
    this.pools = pools;
    this.pool = null; // the pool he's swimming in, or null
    this.bubbleMs = 0;
    this.bubbles = pools.pools.length ? scene.add.particles(0, 0, 'fx-dot', {
      emitting: false, lifespan: 1400, speedY: { min: -90, max: -60 }, speedX: { min: -12, max: 12 },
      scale: { start: 0.25, end: 0.45 }, alpha: { start: 0.8, end: 0 }, tint: 0xe8fbff,
    }).setDepth(6.4) : null;
  }

  get active() {
    return this.pool !== null;
  }

  // A jump press in the water: a stroke up, or, near the surface, a leap out.
  stroke() {
    const { cat } = this;
    const { body } = cat;
    const vy = strokeSpeed(body.top, this.pool.surfaceY, SWIM);
    this.leaping = vy === SWIM.outJump; // a leap out: not held to a swimmer's speed until he's out
    if (this.leaping) {
      // Every leap starts from his floating height at the surface (his middle `submerge` under
      // it), so each is the same height, however deep in the surface band he pressed.
      const lift = body.center.y - (this.pool.surfaceY + SWIM.submerge);
      if (lift > 0) cat.setY(cat.y - lift);
      this.springOut();
      this.pools.splash(this.pool, cat.x, 'fishLeap');
    } else this.scene.audio.playSfx('swimStroke');
    body.setVelocityY(vy);
  }

  // Leaping out, he springs at his full running speed the way he's heading (at full momentum, so
  // he doesn't slow back to a swimmer's in the air), onto the bank.
  springOut() {
    const { cat } = this;
    const dir = Math.sign(cat.moveDirection ?? 0);
    if (!dir) return;
    cat.momentum = 1;
    cat.moveVelocity = dir * cat.topSpeed;
    cat.body.setVelocityX(cat.moveVelocity);
  }

  update(ms) {
    const { cat } = this;
    const { body } = cat;
    // On a ladder, the ladder moves him, in the water or out of it (a ladder up out of a pool): he
    // isn't swimming until he lets go of it.
    if (this.scene.climbing) {
      if (this.pool) this.leave();
      return;
    }
    if (!this.pool) {
      // In: his middle far enough under a pool's surface.
      const pool = this.pools.at(body.center.x, body.center.y);
      if (pool && swimsAt(body.center.y, pool.surfaceY, SWIM.submerge)) this.enter(pool);
      else return;
    } else {
      // Out: only once his feet are out of the water, or he's left its sides.
      const { pool } = this;
      if (body.bottom <= pool.surfaceY || body.center.x < pool.x || body.center.x >= pool.x + pool.w) { this.leave(); return; }
    }
    const { pool } = this;
    const { vx, vy } = swimVelocity(cat.moveVelocity, body.velocity.y, cat.topSpeed, SWIM);
    if (this.leaping && body.velocity.y < 0) {
      this.springOut(); // leaping out: his speed stays a leap's, up and across
    } else {
      this.leaping = false;
      cat.moveVelocity = vx;
      // He floats at the surface: no rising past it but by a leap.
      const floating = body.center.y <= pool.surfaceY + SWIM.submerge && vy < 0;
      body.setVelocity(vx, floating ? 0 : vy);
    }
    cat.swimRole = Math.abs(vx) > FREE_MOVE.IDLE_BELOW ? 'swim' : 'swimFloat';
    this.bubbleMs += ms;
    if (this.bubbleMs >= SWIM.bubbleEveryMs) {
      this.bubbleMs = 0;
      this.bubbles?.emitParticleAt(cat.x + (cat.flipX ? -28 : 28), body.top + 18, 1);
    }
  }

  enter(pool) {
    const { body } = this.cat;
    this.pool = pool;
    this.gravity = body.gravity.y; // his own, to give back as he leaves
    body.setGravityY(SWIM.gravity);
    if (body.velocity.y > 120) this.pools.splash(pool, this.cat.x); // he fell in
  }

  leave() {
    const { cat } = this;
    cat.body.setGravityY(this.gravity);
    cat.swimRole = null;
    cat.airJumpsLeft = 0; // his leap out was his jump: he gets it back by landing
    if (this.leaping) this.springOut();
    this.leaping = false;
    this.pool = null;
  }
}
