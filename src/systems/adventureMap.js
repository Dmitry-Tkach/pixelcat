// Reads an adventure level's map (see data/adventure/wood.js) into what the scene builds: the tile
// grid for the ground and islands, the ladders, and every object with its cell. Plain code, no
// Phaser, so tests can check levels.

export const TILE = 64;
// How deep into a tile the cat can sink in one physics step and still be pushed back out. Phaser's
// default, 16, is less than a falling cat moves in a step (18px, or 25px diving), so it fell
// through the ground. It stays well under a tile, so jumping up through an island still works.
export const TILE_BIAS = 40;
// The fastest the cat falls, so even a long drop moves less than TILE_BIAS in a physics step.
export const MAX_FALL_SPEED = 2200;
export const PHYSICS_STEPS_PER_SECOND = 60;

// Each tile's place in the world's tile strip (tools/adventure-art.mjs builds it in this order).
export const TILES = {
  groundTopLeft: 0,
  groundTop: 1,
  groundTopRight: 2,
  soilLeft: 3,
  soil: 4,
  soilRight: 5,
  ledgeLeft: 6,
  ledge: 7,
  ledgeRight: 8,
  bridge: 9,
};
// Tiles the cat lands on from above but passes through from below and from the sides.
export const ONE_WAY = new Set([TILES.ledgeLeft, TILES.ledge, TILES.ledgeRight, TILES.bridge]);

// What each object character places. Ground, islands, ladders and empty cells aren't objects.
export const OBJECTS = {
  '@': 'start',
  E: 'portal',
  C: 'checkpoint',
  o: 'coin',
  '*': 'gem',
  '+': 'heart',
  k: 'key',
  T: 'chest',
  '?': 'bonus',
  B: 'box',
  X: 'stone',
  '^': 'spike',
};
// Scenery, which the cat passes in front of.
export const SCENERY = {
  R: 'roots',
  b: 'bush-1',
  p: 'plant-1',
  s: 'statue',
  S: 'statue',
  '>': 'sign-right',
  '/': 'sign-up',
};

const isGround = (ch) => ch === '#';
const isIsland = (ch) => ch === '=';

export function readAdventureMap(map) {
  const rows = map.length;
  const cols = map[0].length;
  const at = (c, r) => (r < 0 || r >= rows || c < 0 || c >= cols ? '.' : map[r][c]);
  // A ladder on an island's row is also part of the island, so the cat can stand at the top.
  const islandAt = (c, r) => isIsland(at(c, r)) || (at(c, r) === 'H' && (isIsland(at(c - 1, r)) || isIsland(at(c + 1, r))));
  const tiles = [];
  const ladders = [];
  const objects = [];
  const scenery = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const ch = at(c, r);
      let tile = -1;
      if (isGround(ch)) {
        const open = (dc) => !isGround(at(c + dc, r));
        if (!isGround(at(c, r - 1))) {
          tile = open(-1) && !open(1) ? TILES.groundTopLeft : open(1) && !open(-1) ? TILES.groundTopRight : TILES.groundTop;
        } else {
          tile = open(-1) && !open(1) ? TILES.soilLeft : open(1) && !open(-1) ? TILES.soilRight : TILES.soil;
        }
      } else if (islandAt(c, r)) {
        const left = islandAt(c - 1, r);
        const right = islandAt(c + 1, r);
        tile = !left && right ? TILES.ledgeLeft : left && !right ? TILES.ledgeRight : TILES.ledge;
      } else if (ch === '-') {
        tile = TILES.bridge;
      }
      if (ch === 'H') ladders.push({ col: c, row: r });
      if (OBJECTS[ch]) objects.push({ type: OBJECTS[ch], col: c, row: r });
      if (SCENERY[ch]) scenery.push({ texture: SCENERY[ch], col: c, row: r });
      row.push(tile);
    }
    tiles.push(row);
  }
  return { rows, cols, tiles, ladders, objects, scenery };
}

// What's wrong with a level, as messages: an empty list means it's fine.
export function checkAdventureLevel(level) {
  const errors = [];
  const { map } = level;
  if (map.some((row) => row.length !== map[0].length)) errors.push('every row of the map must be the same width');
  const { objects, ladders, tiles } = readAdventureMap(map);
  const count = (type) => objects.filter((o) => o.type === type).length;
  if (count('start') !== 1) errors.push('the map needs exactly one start, @');
  if (count('portal') !== 1) errors.push('the map needs exactly one portal, E');
  if (count('chest') > 0 && count('key') < count('chest')) errors.push('each chest needs a key');
  // A ladder's top must be on an island or the ground, so the cat has somewhere to step off.
  const byCol = new Map();
  for (const { col, row } of ladders) byCol.set(col, [...(byCol.get(col) ?? []), row]);
  for (const [col, ladderRows] of byCol) {
    const top = Math.min(...ladderRows);
    if (tiles[top][col] < 0) errors.push(`the ladder in column ${col} doesn't reach an island`);
  }
  return errors;
}
