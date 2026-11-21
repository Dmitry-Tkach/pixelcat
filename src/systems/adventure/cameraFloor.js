// How low the camera may go, in every adventure level: GROUND_ROWS rows under the ground below the
// cat, so it always shows that much ground and no more, however deep the map goes under it for
// caves (the owner's rule, from the Wood levels, whose maps end four rows under their floor).
// It takes the deepest ground within AROUND columns either side of him, so near the edge of a
// cliff the camera still looks down to what's below it. Over no ground at all (a bridge over
// water), it goes to the map's bottom. Cracked floor (Z) and trapdoors (Y) count as ground, and so
// does every cell of a secret (hidden: covered(c, r), the level's secrets), so the camera doesn't
// give away a secret under or beside him (a hidden hole by the start showed the ground down to its
// cave). Inside a secret he looks from his own feet, down. A level can set its own camera.groundRows.
// Plain code, no Phaser.
export const GROUND_ROWS = 4;
export const AROUND = 3;
const SOLID = new Set(['#', 'Z', 'Y']);

// The bottom (px) the camera may show: map is the level's rows, col the cat's column, feetRow the
// row his feet are in (the top of what he stands on).
export function cameraBottom(map, col, feetRow, groundRows = GROUND_ROWS, tile = 64, around = AROUND, covered = () => false) {
  const rows = map.length, cols = map[0].length;
  let deepest = 0;
  for (let c = Math.max(0, col - around); c <= Math.min(cols - 1, col + around); c++) {
    let bottom = rows;
    for (let r = Math.max(0, feetRow); r < rows; r++) {
      if (SOLID.has(map[r][c]) || covered(c, r)) { bottom = Math.min(rows, r + groundRows); break; }
    }
    deepest = Math.max(deepest, bottom);
  }
  return deepest * tile;
}
