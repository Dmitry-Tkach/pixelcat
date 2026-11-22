import { readAdventureMap } from '../adventureMap.js';

// The cover over a secret cave (a level's secrets: { cols, rows }): the ground's own tiles, as the
// map would have them if the cave were solid ground, over the cave and one cell round it, so from
// outside it looks just like the ground about it (its wavy edge tiles become plain earth, and the
// cave's way out a wall). The scene draws them as a layer in front, fading while the cat is inside.
// Plain code, no Phaser: [{ col, row, tile, behind }], each tile its place in the world's tile strip;
// behind: earth behind the level's own tiles (an island over the secret's shaft), so the shaft's
// dark wall doesn't show round the island's rounded corners.
//   caves: the level's caves. Those round the secret (its shaft) count as solid too when the tiles
//   are worked out, so the earth under a shaft's island is plain earth, not a grassy top. The cover
//   is only over the secret and the ground round it: an island or cracked floor there is the
//   level's own, and shows.
export function secretCoverTiles(map, { cols: [c0, c1], rows: [r0, r1] }, caves = [], around = 1) {
  const rows = map.length, cols = map[0].length;
  const inSecret = (c, r) => c >= c0 && c <= c1 && r >= r0 && r <= r1;
  const inCave = (c, r) => caves.some(({ cols: [a, b], rows: [p, q] }) => c >= a && c <= b && r >= p && r <= q);
  const solid = map.map((line, r) => [...line].map((ch, c) => (inSecret(c, r) || inCave(c, r) ? '#' : ch)).join(''));
  const { tiles } = readAdventureMap(solid);
  const out = [];
  for (let r = Math.max(0, r0 - around); r <= Math.min(rows - 1, r1 + around); r++) {
    for (let c = Math.max(0, c0 - around); c <= Math.min(cols - 1, c1 + around); c++) {
      if (tiles[r][c] < 0) continue;
      if (inSecret(c, r) || map[r][c] === '#') out.push({ col: c, row: r, tile: tiles[r][c] });
      else if (inCave(c, r)) out.push({ col: c, row: r, tile: tiles[r][c], behind: true });
    }
  }
  return out;
}
