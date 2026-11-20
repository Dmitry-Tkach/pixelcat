import { readAdventureMap } from '../adventureMap.js';

// The cover over a secret cave (a level's secrets: { cols, rows }): the ground's own tiles, as the
// map would have them if the cave were solid ground, over the cave and one cell round it, so from
// outside it looks just like the ground about it (its wavy edge tiles become plain earth, and the
// cave's way out a wall). The scene draws them as a layer in front, fading while the cat is inside.
// Plain code, no Phaser: [{ col, row, tile }], each tile its place in the world's tile strip.
export function secretCoverTiles(map, { cols: [c0, c1], rows: [r0, r1] }, around = 1) {
  const rows = map.length, cols = map[0].length;
  const solid = map.map((line, r) => [...line].map((ch, c) => (c >= c0 && c <= c1 && r >= r0 && r <= r1 ? '#' : ch)).join(''));
  const { tiles } = readAdventureMap(solid);
  const out = [];
  for (let r = Math.max(0, r0 - around); r <= Math.min(rows - 1, r1 + around); r++) {
    for (let c = Math.max(0, c0 - around); c <= Math.min(cols - 1, c1 + around); c++) {
      if (tiles[r][c] >= 0) out.push({ col: c, row: r, tile: tiles[r][c] });
    }
  }
  return out;
}
