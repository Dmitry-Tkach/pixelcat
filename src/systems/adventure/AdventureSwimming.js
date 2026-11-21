import { FREE_MOVE } from '../../config/gameConfig.js';
import { SWIM } from '../../data/adventure/swim.js';
import { strokeSpeed, swimVelocity, swimsAt } from './pools.js';

// Swimming in a level's pools (data/adventure/swim.js). Each frame, once his middle is far enough
// under a pool's surface, he floats: the water's own gravity, slower across, his doggy-paddle
// (or treading water, still), and a bubble now and then. The scene sends him a jump press while he
// swims (stroke): a stroke up, or, at the surface, a leap out onto the bank. Out of the water, his
// own gravity is back, and his double jump too.
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

  // A jump press in the water.
  stroke() {
    const { body } = this.cat;
    const vy = strokeSpeed(body.top, this.pool.surfaceY, SWIM);
    body.setVelocityY(vy);
    if (vy === SWIM.outJump) this.pools.splash(this.pool, this.cat.x, 'fishLeap'); // a leap out
    else this.scene.audio.playSfx('swimStroke');
  }

  update(ms) {
    const { cat } = this;
    const { body } = cat;
    const pool = this.pools.at(body.center.x, body.center.y);
    const swimming = pool && swimsAt(body.center.y, pool.surfaceY, SWIM.submerge) ? pool : null;
    if (swimming && !this.pool) this.enter(swimming);
    else if (!swimming && this.pool) this.leave();
    if (!this.pool) return;
    this.pool = swimming;
    const { vx, vy } = swimVelocity(cat.moveVelocity, body.velocity.y, cat.topSpeed, SWIM);
    cat.moveVelocity = vx;
    body.setVelocity(vx, vy);
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
    cat.airJumpsLeft = 1;
    this.pool = null;
  }
}
