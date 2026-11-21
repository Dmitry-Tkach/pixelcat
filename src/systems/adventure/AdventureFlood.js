import { TILE } from '../adventureMap.js';
import { SWIM } from '../../data/adventure/swim.js';
import { floodSurface } from './pools.js';

// Floods: a level's pools with a flood (systems/adventure/pools.js), the dam bursting. When the cat
// first passes its `from` column, standing on its `above` row or higher, the ground shakes and the water rises on its own, steadily, to its
// top: he must climb out of its way. While it rises it's rushing water: caught in it (his middle
// under its surface), he loses a heart and goes back to his checkpoint (the scene's fellOut), and it
// sinks back to its surface, still, until he passes `from` again. AdventurePools draws it as it
// rises, part by part, over the ground it covers.
const BURST = { shakeMs: 700, shake: 0.006 };

export class AdventureFlood {
  // pools: the scene's AdventurePools.
  constructor(scene, pools) {
    this.scene = scene;
    this.floods = pools.pools.filter((pool) => pool.def.flood).map((pool) => ({ pool, ms: 0, rising: false }));
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
      const over = cat.x >= pool.x && cat.x < pool.x + pool.w;
      if (over && cat.body.center.y > pool.surfaceY + SWIM.submerge) {
        this.scene.fellOut();
        this.sink(flood);
      }
    }
  }

  burst(flood) {
    flood.rising = true;
    flood.ms = 0;
    this.scene.cameras.main.shake(BURST.shakeMs, BURST.shake);
    this.scene.audio.playSfx('splash');
  }

  sink(flood) {
    flood.rising = false;
    flood.ms = 0;
    flood.pool.surfaceY = flood.pool.def.surface * TILE;
  }
}
