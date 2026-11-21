import { ONE_WAY, TILE } from '../adventureMap.js';
import { POOL } from '../../data/adventure/swim.js';
import { WATER, waterKey } from '../../data/adventure/water.js';
import { poolSegments, poolSurface } from './pools.js';

// A level's pools (systems/adventure/pools.js): water with a floor that the cat swims in, drawn as
// the bottomless gaps' water is (AdventureWater), in two layers: behind the ground, reaching a little
// under it at the sides so it meets the banks cleanly, and a see-through surface in front of him with
// a bright crest. The water picture is used once, for the surface and just under it; deeper, the
// water is its bottom colour, so a pool can be any depth with no repeat of its wavy top showing.
// Where ground covers the water (a cave it runs on into), it starts under that ground, with no
// surface (systems/adventure/pools.js, poolSegments). raise() lifts every pool to its next stage's
// surface, smoothly (POOL.riseMsPerRow).
const WAVE_TOP = 10; // where the body picture's wavy surface is, from its top (as AdventureWater)
const CREST_MIDDLE = 12;
const DROP_TINTS = [0xffffff, 0xbff4f0, 0x7fe3dc];
const UNDER_GROUND_SKIP = 48; // px of the water picture's top skipped where ground covers the water

export class AdventurePools {
  // tiles: the level's tiles (systems/adventureMap.js readAdventureMap), to see where ground covers
  // a pool's water.
  constructor(scene, pools, tiles = []) {
    this.scene = scene;
    this.stage = 0;
    this.solid = (c, r) => (tiles[r]?.[c] ?? -1) >= 0 && !ONE_WAY.has(tiles[r][c]);
    // The water picture's height, and the colour of its bottom row: the deep water's.
    const body = scene.textures.exists(waterKey('body')) ? scene.textures.get(waterKey('body')).getSourceImage() : { width: 1, height: 420 };
    this.bodyH = body.height;
    const bottom = scene.textures.exists(waterKey('body')) ? scene.textures.getPixel(Math.floor(body.width / 2), body.height - 1, waterKey('body')) : null;
    this.deepColour = bottom ? bottom.color : 0x1f6f8b;
    this.pools = pools.map((pool) => {
      const x = pool.cols[0] * TILE, w = (pool.cols[1] - pool.cols[0] + 1) * TILE;
      const made = { def: pool, x, w, bottomY: (pool.bottom + 1) * TILE, surfaceY: poolSurface(pool, 0) * TILE, row: null, parts: [] };
      this.place(made);
      return made;
    });
    this.drops = pools.length ? scene.add.particles(0, 0, 'fx-dot', {
      emitting: false, lifespan: { min: 450, max: 800 }, speed: { min: 160, max: 380 }, angle: { min: 245, max: 295 },
      gravityY: 950, scale: { start: 0.5, end: 0.1 }, tint: DROP_TINTS, alpha: { start: 1, end: 0.4 },
    }).setDepth(POOL.front.depth + 0.2) : null;
  }

  // A pool's water, part by part (poolSegments): where its surface is open, from the surface down,
  // with its crest; where ground covers it, from under the ground, no crest. The parts are made
  // again whenever the surface reaches another row (the water rising), and laid out every frame.
  place(pool) {
    const row = Math.floor(pool.surfaceY / TILE);
    if (row !== pool.row) {
      pool.row = row;
      for (const part of pool.parts) for (const layer of part.layers) layer.destroy();
      const first = pool.def.cols[0], last = pool.def.cols[1];
      pool.parts = poolSegments(pool.def, row, this.solid).map((seg) => this.makePart(seg, seg.from === first, seg.to === last));
    }
    for (const part of pool.parts) this.placePart(pool, part);
  }

  makePart(seg, leftEnd, rightEnd) {
    const { scene } = this;
    const tile = (key) => scene.add.tileSprite(0, 0, 1, 1, waterKey(key)).setOrigin(0, 0);
    const deep = (alpha, depth) => scene.add.rectangle(0, 0, 1, 1, this.deepColour, alpha).setOrigin(0, 0).setDepth(depth);
    const back = tile('body').setDepth(POOL.back.depth);
    const front = tile('body').setDepth(POOL.front.depth).setAlpha(POOL.front.alpha);
    const backDeep = deep(1, POOL.back.depth), frontDeep = deep(POOL.front.alpha, POOL.front.depth);
    const crest = seg.open ? tile('crest').setDepth(POOL.front.depth + 0.1) : null;
    // Under ground, the picture's wavy top is skipped: the water there is just water.
    if (!seg.open) { back.tilePositionY = UNDER_GROUND_SKIP; front.tilePositionY = UNDER_GROUND_SKIP; }
    return { ...seg, leftEnd, rightEnd, back, front, backDeep, frontDeep, crest, layers: [back, front, backDeep, frontDeep, crest].filter(Boolean) };
  }

  // Lays a part out from its top (the surface, or under its ground) down to its bottom. The
  // back layer reaches a little under the ground at the pool's own sides, so it meets the banks.
  placePart(pool, { from, to, top: topRow, bottom, open, leftEnd, rightEnd, back, front, backDeep, frontDeep, crest }) {
    const x = from * TILE, w = (to - from + 1) * TILE;
    const top = open ? pool.surfaceY - WAVE_TOP : topRow * TILE;
    const h = Math.max(1, (bottom + 1) * TILE - top);
    const surfaceH = Math.min(h, this.bodyH), deepH = Math.max(0, h - this.bodyH);
    const { reach } = POOL.back;
    const bx = x - (leftEnd ? reach : 0), bw = w + (leftEnd ? reach : 0) + (rightEnd ? reach : 0);
    back.setPosition(bx, top).setSize(bw, surfaceH);
    front.setPosition(x, top).setSize(w, surfaceH);
    backDeep.setPosition(bx, top + surfaceH).setSize(bw, deepH).setVisible(deepH > 0);
    frontDeep.setPosition(x, top + surfaceH).setSize(w, deepH).setVisible(deepH > 0);
    crest?.setPosition(x, pool.surfaceY - CREST_MIDDLE).setSize(w, 28);
  }

  // The pool a point (px) is in, its water as it is now (rising, perhaps), or null.
  at(x, y) {
    return this.pools.find((p) => x >= p.x && x < p.x + p.w && y >= p.surfaceY && y < p.bottomY) ?? null;
  }

  // The water rises a stage: every pool climbs to its next surface, a row in POOL.riseMsPerRow.
  raise() {
    this.stage += 1;
    for (const pool of this.pools) {
      const to = poolSurface(pool.def, this.stage) * TILE;
      if (to === pool.surfaceY) continue;
      this.scene.tweens.add({
        targets: pool, surfaceY: to, ease: 'Sine.easeInOut',
        duration: (Math.abs(to - pool.surfaceY) / TILE) * POOL.riseMsPerRow,
      });
    }
  }

  // Something breaks the surface at x (px) of a pool: drops fly up, and it sounds.
  splash(pool, x, sound = 'splash') {
    this.drops?.explode(WATER.splash.drops, x, pool.surfaceY);
    this.scene.audio.playSfx(sound);
  }

  // Each frame: the waves move, and rising water is laid out at its new height.
  update(ms) {
    const step = (WATER.waveSpeed * ms) / 1000;
    for (const pool of this.pools) {
      for (const part of pool.parts) {
        part.back.tilePositionX += step;
        part.front.tilePositionX += step;
        if (part.crest) part.crest.tilePositionX -= step;
      }
      this.place(pool);
    }
  }
}
