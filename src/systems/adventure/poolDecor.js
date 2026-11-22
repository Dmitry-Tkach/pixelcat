import { cellRandom } from './cellRandom.js';
import { poolAt } from './pools.js';

// The decoration on a level's pool floors (the owner's underwater pieces, prompts/hidden-dam/07): on
// floor cells under the water, chosen "at random" by each cell's number, the same every time, never
// two side by side. The ground's own plants don't grow there (POOL_DECOR_DEEPEST: under any stage's
// water). Plain code: [{ picture, col, row }], standing on the floor under cell (col, row).
export const POOL_DECOR = {
  share: 0.45,
  pictures: ['uw-weed-1', 'uw-weed-2', 'uw-plants-1', 'uw-plants-2', 'uw-stone-1', 'uw-stone-2', 'uw-pebbles-1', 'uw-pebbles-2', 'uw-shell-1', 'uw-shell-2', 'uw-plank-1', 'uw-plank-2'],
};
export const POOL_DECOR_DEEPEST = 99; // a stage past every pool's last: its highest water

// Whether cell (col, row) is ever under a pool's water (at its highest stage).
export const everUnderwater = (pools, col, row) => poolAt(pools, col, row, POOL_DECOR_DEEPEST) !== null;

export function poolDecor(level, tiles) {
  const pools = level.pools ?? [];
  const placed = [];
  let last = -10;
  for (const pool of pools) {
    for (let c = pool.cols[0]; c <= pool.cols[1]; c++) {
      for (let r = pool.surface; r <= pool.bottom; r++) {
        if (tiles[r]?.[c] >= 0 || !(tiles[r + 1]?.[c] >= 0)) continue; // an open cell on a floor
        if (c - last < 2 || cellRandom(c, r, 41) >= POOL_DECOR.share) continue;
        placed.push({ picture: POOL_DECOR.pictures[Math.floor(cellRandom(c, r, 42) * POOL_DECOR.pictures.length)], col: c, row: r });
        last = c;
      }
    }
  }
  return placed;
}
