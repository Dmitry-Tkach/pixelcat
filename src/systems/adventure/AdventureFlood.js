import { TILE } from '../adventureMap.js';
import { FLOOD, SWIM } from '../../data/adventure/swim.js';
import { floodSurface } from './pools.js';

// Floods: a level's pools with a flood (systems/adventure/pools.js), the dam bursting. When the cat
// first passes its `from` column, standing on its `above` row or higher, the ground shakes, a roar,
// and the water rises on its own, steadily, to its top: he must climb out of its way. It doesn't look
// like the water he swims in (the owner: the same water, safe in one place and deadly in another,
// made no sense): it turns muddy brown and rushes (FLOOD), foam spraying along its top, twigs and
// leaves tumbling on it. Caught in it (his middle under its surface), he's swept away: he loses a
// heart and goes back to his checkpoint (the scene's fellOut), and it sinks back to its surface,
// calm and blue again, until he passes `from` again. AdventurePools draws it as it rises.
const BURST = { shakeMs: 700, shake: 0.006 };

export class AdventureFlood {
  // pools: the scene's AdventurePools.
  constructor(scene, pools) {
    this.scene = scene;
    this.pools = pools;
    this.floods = pools.pools.filter((pool) => pool.def.flood).map((pool) => ({ pool, ms: 0, rising: false, foamMs: 0, debrisMs: 0 }));
    if (!this.floods.length) return;
    this.foam = scene.add.particles(0, 0, 'fx-dot', {
      emitting: false, lifespan: { min: 300, max: 600 }, speedX: { min: 40, max: 160 }, speedY: { min: -120, max: -40 },
      gravityY: 400, scale: { start: FLOOD.foam.scale, end: 0.2 }, alpha: { start: 0.95, end: 0 }, tint: FLOOD.foam.tint,
    }).setDepth(6.7);
    this.debris = scene.add.particles(0, 0, 'fx-dot', {
      emitting: false, lifespan: { min: 1200, max: 2000 }, speedX: { min: 60, max: 140 }, speedY: { min: -30, max: 10 },
      scaleX: { min: FLOOD.debris.scale * 0.5, max: FLOOD.debris.scale }, scaleY: { min: 0.25, max: 0.45 }, rotate: { start: 0, end: 360 },
      alpha: { start: 1, end: 0.2 }, tint: FLOOD.debris.tints,
    }).setDepth(6.6);
  }

  // Each frame, after the cat has moved.
  update(ms, cat) {
    for (const flood of this.floods) {
      const { pool } = flood;
      if (!flood.rising) {
        const { from, above } = pool.def.flood;
        if (cat.x < from * TILE || cat.body.bottom > (above + 1) * TILE + 2) continue;
        this.burst(flood);
      }
      flood.ms += ms;
      pool.surfaceY = floodSurface(pool.def, flood.ms) * TILE;
      if (!pool.muddy) this.pools.setMuddy(pool, true);
      this.rush(flood, ms);
      const over = cat.x >= pool.x && cat.x < pool.x + pool.w;
      if (over && cat.body.center.y > pool.surfaceY + SWIM.submerge) this.sweep(flood);
    }
  }

  burst(flood) {
    flood.rising = true;
    flood.ms = 0;
    const { scene } = this;
    scene.cameras.main.shake(BURST.shakeMs, BURST.shake);
    scene.audio.playSfx('boom');
    scene.audio.playSfx('collapse');
  }

  // Foam and debris along the open water's top, where it's rising.
  rush(flood, ms) {
    const { pool } = flood;
    const open = pool.parts.filter((part) => part.open);
    if (!open.length) return;
    const somewhere = () => {
      const part = open[Math.floor(Math.random() * open.length)];
      return part.from * TILE + Math.random() * (part.to - part.from + 1) * TILE;
    };
    for (flood.foamMs += ms; flood.foamMs >= FLOOD.foam.perMs; flood.foamMs -= FLOOD.foam.perMs) this.foam.emitParticleAt(somewhere(), pool.surfaceY, 1);
    for (flood.debrisMs += ms; flood.debrisMs >= FLOOD.debris.perMs; flood.debrisMs -= FLOOD.debris.perMs) this.debris.emitParticleAt(somewhere(), pool.surfaceY + 4, 1);
  }

  // Caught: swept away, back to his checkpoint; the water sinks back, calm.
  sweep(flood) {
    const { scene } = this;
    scene.audio.playSfx('splash');
    scene.fellOut();
    scene.showHint(FLOOD.sweptHint, 1600);
    flood.rising = false;
    flood.ms = 0;
    flood.pool.surfaceY = flood.pool.def.surface * TILE;
    this.pools.setMuddy(flood.pool, false);
  }
}
