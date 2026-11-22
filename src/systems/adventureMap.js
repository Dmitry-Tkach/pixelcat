// Reads an adventure level's map (see data/adventure/wood.js) into what the scene builds: the tile
// grid for the ground and islands, the ladders, and every object with its cell. Plain code, no
// Phaser, so tests can check levels.
import { trapProblems } from './adventure/trapLogic.js';
import { wheelProblems } from './adventure/wheels.js';
import { drawbridgeProblems } from './adventure/drawbridges.js';
import { rockProblems } from './adventure/rockLayout.js';
import { poolProblems } from './adventure/pools.js';
import { walkwayProblems } from './adventure/scaffoldLayout.js';
import { masonryProblems } from './adventure/brickLayout.js';
import { fishProblems } from '../data/adventure/fish.js';

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
  // Earth with open air under it (an overhang, a cave's roof): soil with an island's wavy bottom,
  // after the soil's and the top's variants in the strip (data/adventure/tileVariants.js).
  underLeft: 15,
  under: 16,
  underRight: 17,
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
  m: 'rage',
  w: 'weapon',
  a: 'ammo-standard',
  e: 'ammo-explosive',
  z: 'ammo-laser',
  f: 'ammo-freeze',
  h: 'ammo-fire',
  k: 'key',
  T: 'chest',
  j: 'silver-key',
  U: 'silver-chest',
  '%': 'leaves', // a crumbling leafy ledge: it falls soon after the cat lands, and grows back
  Z: 'cracked', // cracked floor in the ground: it breaks when the cat lands on it, into a secret below, for good
  '?': 'bonus',
  B: 'box',
  X: 'stone',
  '^': 'spike',
};
// Enemies, by kind (see data/adventure/enemies.js). Each walks to and fro on what it stands on.
export const ENEMY_LETTERS = {
  g: 'goon',
  c: 'cone',
  v: 'spiky',
  P: 'pumpkin', // the Autumn world's walker you stomp
  V: 'boar', // the Autumn world's spiky one, that charges
  M: 'mole', // the Autumn world's mole miner: pops out of the ground
  Q: 'crab', // the Autumn world's river crab: scuttles on the banks and the riverbed, snaps its claw
};
// Gunners, by kind (see data/adventure/gunners.js). Each stands where it is and shoots at the cat.
export const GUNNER_LETTERS = {
  1: 'blaster',
  2: 'raygun',
  3: 'rifle',
  4: 'squirrel', // the Autumn world's: throws acorns
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

// Every cell a moving log covers somewhere along its path: from where it starts, `across` cells to
// the right (or left, if negative) and `up` cells up (or down, if negative), `width` cells wide.
export function moverCells({ col, row, width = 3, across = 0, up = 0 }) {
  const cells = new Set();
  const steps = Math.max(Math.abs(across), Math.abs(up));
  for (let i = 0; i <= steps; i++) {
    const c = col + Math.round((across * i) / (steps || 1));
    const r = row - Math.round((up * i) / (steps || 1));
    for (let w = 0; w < width; w++) cells.add(`${c + w},${r}`);
  }
  return cells;
}

// Earth pillars (R) only hold up low islands: at most this many tiles above what's below them.
export const PILLAR_MAX_TILES = 4;

// The row a pillar under an island stands on: the first ground or island below its cell, if it's
// within PILLAR_MAX_TILES. Otherwise null, and there's no pillar.
export function pillarFoot(tiles, col, row) {
  for (let below = row; below < tiles.length && below - row <= PILLAR_MAX_TILES; below++) {
    if (tiles[below][col] >= 0) return below;
  }
  return null;
}

const isGround = (ch) => ch === '#';
// Cracked floor (Z) sits in the ground's surface, so the ground beside it joins it as if it were ground.
// A trapdoor (Y) too: a cell of the ground's surface drawn as ground, but one-way, with a ladder down
// through it (a ladder's top cell beside a trapdoor is part of it): standing on it, Down climbs him
// down the ladder into what's under it (a secret), and he climbs back up through it.
const shapesGround = (ch) => isGround(ch) || ch === 'Z' || ch === 'Y';
const isIsland = (ch) => ch === '=';

export function readAdventureMap(map) {
  const rows = map.length;
  const cols = map[0].length;
  const at = (c, r) => (r < 0 || r >= rows || c < 0 || c >= cols ? '.' : map[r][c]);
  // A ladder on an island's row is also part of the island, so the cat can stand at the top; one on
  // a bridge's row (a walkway's deck) is part of the bridge.
  const islandAt = (c, r) => isIsland(at(c, r)) || (at(c, r) === 'H' && (isIsland(at(c - 1, r)) || isIsland(at(c + 1, r))));
  const bridgeAt = (c, r) => at(c, r) === '-' || (at(c, r) === 'H' && (at(c - 1, r) === '-' || at(c + 1, r) === '-'));
  const trapdoorAt = (c, r) => at(c, r) === 'Y' || (at(c, r) === 'H' && (at(c - 1, r) === 'Y' || at(c + 1, r) === 'Y'));
  const groundLike = (c, r) => shapesGround(at(c, r)) || trapdoorAt(c, r);
  const trapdoors = [];
  const tiles = [];
  const ladders = [];
  const objects = [];
  const scenery = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const ch = at(c, r);
      let tile = -1;
      if (isGround(ch) || trapdoorAt(c, r)) {
        if (trapdoorAt(c, r)) trapdoors.push({ col: c, row: r });
        const open = (dc) => !groundLike(c + dc, r);
        if (!groundLike(c, r - 1)) {
          tile = open(-1) && !open(1) ? TILES.groundTopLeft : open(1) && !open(-1) ? TILES.groundTopRight : TILES.groundTop;
        } else if (r + 1 < rows && !groundLike(c, r + 1)) {
          tile = open(-1) && !open(1) ? TILES.underLeft : open(1) && !open(-1) ? TILES.underRight : TILES.under;
        } else {
          tile = open(-1) && !open(1) ? TILES.soilLeft : open(1) && !open(-1) ? TILES.soilRight : TILES.soil;
        }
      } else if (islandAt(c, r)) {
        const left = islandAt(c - 1, r);
        const right = islandAt(c + 1, r);
        tile = !left && right ? TILES.ledgeLeft : left && !right ? TILES.ledgeRight : TILES.ledge;
      } else if (bridgeAt(c, r)) {
        tile = TILES.bridge;
      }
      if (ch === 'H') ladders.push({ col: c, row: r });
      if (OBJECTS[ch]) objects.push({ type: OBJECTS[ch], col: c, row: r });
      if (ENEMY_LETTERS[ch]) objects.push({ type: 'enemy', kind: ENEMY_LETTERS[ch], col: c, row: r });
      if (GUNNER_LETTERS[ch]) objects.push({ type: 'gunner', kind: GUNNER_LETTERS[ch], col: c, row: r });
      if (SCENERY[ch]) scenery.push({ texture: SCENERY[ch], col: c, row: r });
      row.push(tile);
    }
    tiles.push(row);
  }
  return { rows, cols, tiles, ladders, objects, scenery, trapdoors };
}

// What's wrong with a level, as messages: an empty list means it's fine.
export function checkAdventureLevel(level) {
  const errors = [];
  const { map } = level;
  if (map.some((row) => row.length !== map[0].length)) errors.push('every row of the map must be the same width');
  const { objects, ladders, tiles } = readAdventureMap(map);
  const count = (type) => objects.filter((o) => o.type === type).length;
  if (count('start') !== 1) errors.push('the map needs exactly one start, @');
  // A boss's arena ends when he's beaten, so it has no portal; every other level needs one.
  if (level.boss && count('portal') !== 0) errors.push('a boss arena ends when he is beaten, so it has no portal');
  if (!level.boss && count('portal') !== 1) errors.push('the map needs exactly one portal, E');
  if (level.boss && (tiles[map.length - 1]?.[level.boss.col] ?? -1) < 0) errors.push(`the boss in column ${level.boss.col} has no floor under him`);
  // A level's own bosses: each on his arena's floor (floor: its surface row), inside the arena, with
  // his door, if any, inside the map.
  for (const [i, { kind, col, floor, arena, door }] of (level.bosses ?? []).entries()) {
    const name = `boss ${i + 1} (${kind})`;
    if (!arena || col < arena.left || col > arena.right) errors.push(`${name} stands outside his arena`);
    if ((tiles[floor]?.[col] ?? -1) < 0 || (tiles[floor - 1]?.[col] ?? -1) >= 0) errors.push(`${name} has no floor at row ${floor}, column ${col}`);
    if (door && (door.col < 0 || door.col >= map[0].length || door.rows[0] < 0 || door.rows[1] >= map.length)) errors.push(`${name}'s door is off the map`);
  }
  if (count('chest') > 0 && count('key') < count('chest')) errors.push('each chest needs a key');
  if (count('silver-chest') > 0 && count('silver-key') < count('silver-chest')) errors.push('each silver chest needs a silver key');
  // A moving log's path mustn't run into the ground.
  for (const [i, { col, row, width, across = 0, up = 0 }] of (level.movers ?? []).entries()) {
    for (const cell of moverCells({ col, row, width, across, up })) {
      const [c, r] = cell.split(',').map(Number);
      if (r < 0 || r >= map.length || c < 0 || c >= map[0].length) errors.push(`moving log ${i + 1} goes off the map`);
      else if (map[r][c] === '#') errors.push(`moving log ${i + 1} runs into the ground at column ${c}, row ${r}`);
    }
  }
  for (const { kind, col, row } of objects.filter((o) => o.type === 'enemy' || o.type === 'gunner')) {
    if ((tiles[row + 1]?.[col] ?? -1) < 0) errors.push(`the ${kind} in column ${col} isn't standing on anything`);
  }
  for (const { col, row } of readAdventureMap(map).scenery.filter((s) => s.texture === 'roots')) {
    if (pillarFoot(tiles, col, row) === null) errors.push(`the pillar in column ${col}, row ${row} is too high above the ground to stand on it`);
  }
  // The moving traps must stand on something, hang from something, and clear the ground.
  errors.push(...trapProblems(level, readAdventureMap(map)));
  errors.push(...wheelProblems(level));
  errors.push(...drawbridgeProblems(level));
  errors.push(...rockProblems(level));
  errors.push(...poolProblems(level));
  errors.push(...walkwayProblems(level), ...masonryProblems(level));
  errors.push(...fishProblems(level));
  // A locked portal (the Guardian Gate) opens only with the gold key, so the level needs one.
  if (level.portalLocked && count('key') < 1) errors.push('a locked portal needs a key, k');
  // A ladder's top must be on an island or the ground, so the cat has somewhere to step off.
  const byCol = new Map();
  for (const { col, row } of ladders) byCol.set(col, [...(byCol.get(col) ?? []), row]);
  for (const [col, ladderRows] of byCol) {
    const top = Math.min(...ladderRows);
    if (tiles[top][col] < 0) errors.push(`the ladder in column ${col} doesn't reach an island`);
  }
  return errors;
}
