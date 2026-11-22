import { TILE, TILES } from '../adventureMap.js';

// Where the portal's flame posts stand (data/adventure/gates.js), from the level's map. Plain code,
// no Phaser, so tests can check it. A post stands on each side of the portal, postGap px from its
// middle, but only where its whole foot (postFoot px wide) has ground to stand on and nothing else
// in the way: never over a gap or an edge, inside a wall, or on a block. It's both posts or none, so
// the portal never looks lopsided.

const STANDS_ON = new Set([TILES.groundTopLeft, TILES.groundTop, TILES.groundTopRight, TILES.ledgeLeft, TILES.ledge, TILES.ledgeRight, TILES.bridge]);
const IN_THE_WAY = new Set(['box', 'stone', 'bonus', 'spike', 'chest', 'silver-chest', 'checkpoint']);

// portal: its cell { col, row }. Returns the x (px, in the world) of the two posts, or none.
export function portalPosts(layout, portal, { postGap, postFoot }) {
  const { tiles, rows, cols, objects } = layout;
  const tileAt = (c, r) => (r < 0 || r >= rows || c < 0 || c >= cols ? -1 : tiles[r][c]);
  const taken = new Set(objects.filter((o) => IN_THE_WAY.has(o.type)).map(({ col, row }) => `${col},${row}`));
  const middle = portal.col * TILE + TILE / 2;
  const fits = (x) => [x - postFoot / 2, x + postFoot / 2 - 1].every((edge) => {
    const col = Math.floor(edge / TILE);
    return tileAt(col, portal.row) < 0 && STANDS_ON.has(tileAt(col, portal.row + 1)) && !taken.has(`${col},${portal.row}`);
  });
  const posts = [middle - postGap, middle + postGap];
  return posts.every(fits) ? posts : [];
}
