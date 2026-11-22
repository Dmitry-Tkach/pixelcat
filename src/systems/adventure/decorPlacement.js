import { ONE_WAY, TILE, TILES } from '../adventureMap.js';
import { DECOR_KEEP_CLEAR } from '../../data/adventure/decor.js';
import { cellRandom } from './cellRandom.js';

// Places a level's automatic decoration (data/adventure/decor.js) from its map (systems/adventureMap.js
// readAdventureMap): which picture goes where. Plain code, no Phaser, so tests can check it. It's
// chosen "at random" by a number worked out from each cell, so a level is decorated the same way
// every time.
//   returns [{ picture, x, y, hang, depth, flip }]: x, y in the world, in px. Standing plants have
//   (x, y) at the middle of their bottom; hanging vines at the middle of their top (hang: true).

const TOPS = new Set([TILES.groundTopLeft, TILES.groundTop, TILES.groundTopRight, TILES.ledgeLeft, TILES.ledge, TILES.ledgeRight]);
const ISLANDS = new Set([...ONE_WAY].filter((tile) => tile !== TILES.bridge));

export { cellRandom }; // (systems/adventure/cellRandom.js)

export function placeDecor(layout, rules) {
  if (!rules) return [];
  const { tiles, rows, cols, ladders, objects, scenery = [] } = layout;
  const tileAt = (c, r) => (r < 0 || r >= rows || c < 0 || c >= cols ? -1 : tiles[r][c]);
  const ladderCells = new Set(ladders.map(({ col, row }) => `${col},${row}`));
  // Earth pillars stand under some islands: no vines there.
  const pillarCells = new Set(scenery.filter((s) => s.texture === 'roots').map(({ col, row }) => `${col},${row}`));
  const clearCells = new Set(objects.filter((o) => DECOR_KEEP_CLEAR.has(o.type)).map(({ col, row }) => `${col},${row}`));
  const pick = (list, c, r, salt) => list[Math.floor(cellRandom(c, r, salt) * list.length)];
  const nudge = (jitter, c, r, salt) => Math.round((cellRandom(c, r, salt) * 2 - 1) * jitter);
  const placed = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = tileAt(c, r);
      const { tops, under } = rules;
      // On top: open air above, no ladder there, and not where something important stands.
      if (tops && TOPS.has(tile) && tileAt(c, r - 1) < 0 && !ladderCells.has(`${c},${r - 1}`) && !ladderCells.has(`${c},${r}`)
        && !clearCells.has(`${c},${r - 1}`) && cellRandom(c, r, 1) < tops.chance) {
        placed.push({
          picture: pick(tops.pictures, c, r, 2), x: c * TILE + TILE / 2 + nudge(tops.jitter, c, r, 3), y: r * TILE + tops.sink,
          hang: false, depth: tops.depth, flip: cellRandom(c, r, 4) < 0.5,
        });
      }
      // Under an island: open air below, and no ladder or pillar there.
      if (under && ISLANDS.has(tile) && tileAt(c, r + 1) < 0 && !ladderCells.has(`${c},${r}`) && !ladderCells.has(`${c},${r + 1}`)
        && !pillarCells.has(`${c},${r + 1}`)
        && cellRandom(c, r, 5) < under.chance) {
        placed.push({
          picture: pick(under.pictures, c, r, 6), x: c * TILE + TILE / 2 + nudge(under.jitter, c, r, 7), y: (r + 1) * TILE - under.sink,
          hang: true, depth: under.depth, flip: cellRandom(c, r, 8) < 0.5,
        });
      }
    }
  }
  return placed;
}
