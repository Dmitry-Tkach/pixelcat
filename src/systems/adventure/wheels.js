import { TILE } from '../adventureMap.js';

// Water wheels, the star of level 2 (Mill Falls): a big wheel turning on its hub, with seats round
// its rim that stay level, like a ferris wheel's. The cat lands on a seat, rides it round and up, and
// jumps off. A level lists its wheels beside its map (mapBuilder's wheel()):
//   { col, row, radius, seats, periodMs, dir, seatWidth, broken }
//   col, row: the hub, in the middle of column col, on the top edge of row row. radius: cells from
//   the hub to a seat's top. seats: how many, evenly round. periodMs: one turn. dir: 1 turns
//   clockwise (a seat at the top moves right), -1 the other way. seatWidth: cells. broken: the
//   seats (by number, 0 starting at the top) that are rotten: they look like the others, but when
//   he lands on one it shakes and creaks, breaks and falls into the river, and grows back later
//   (BROKEN_SEAT). A wheel must keep at least one good seat.
// Plain code, no Phaser: where each seat is at any moment, and which cells its seats pass through,
// for the route checker (systems/adventureRoutes.js), which counts the whole ring as somewhere to
// stand, as it does a moving log's path: he can wait for a seat.

export const WHEEL = { radius: 4, seats: 6, periodMs: 14000, dir: 1, seatWidth: 3, broken: [] };

// A rotten seat: shakeMs from his landing to its breaking (time to jump to the next seat),
// wobbleDeg how far it rocks while it shakes, fallMs how long it takes to fall away, backMs until a
// new seat is back in its place.
export const BROKEN_SEAT = { shakeMs: 550, wobbleDeg: 5, fallMs: 450, fallPx: 260, backMs: 4500 };

export const wheelWith = (wheel) => ({ ...WHEEL, ...wheel });

// The hub, in px.
export function wheelHub({ col, row }) {
  return { x: col * TILE + TILE / 2, y: row * TILE };
}

// Seat `i`'s angle at `ms` (radians, 0 to the right of the hub, growing clockwise as y goes down).
// Seat 0 starts at the top.
export function seatAngle(wheel, i, ms) {
  const { seats, periodMs, dir } = wheelWith(wheel);
  return -Math.PI / 2 + (2 * Math.PI * i) / seats + dir * ((2 * Math.PI * ms) / periodMs);
}

// Seat `i` at `ms`: the middle of its top (where the cat stands), in px.
export function seatPlace(wheel, i, ms) {
  const w = wheelWith(wheel);
  const hub = wheelHub(w);
  const angle = seatAngle(w, i, ms);
  return { x: hub.x + Math.cos(angle) * w.radius * TILE, y: hub.y + Math.sin(angle) * w.radius * TILE };
}

// Every cell a seat's top passes through, all the way round, as "col,row".
export function wheelCells(wheel) {
  const w = wheelWith(wheel);
  const hub = wheelHub(w);
  const cells = new Set();
  const steps = 96;
  for (let s = 0; s < steps; s++) {
    const angle = (2 * Math.PI * s) / steps;
    const x = hub.x + Math.cos(angle) * w.radius * TILE;
    const y = hub.y + Math.sin(angle) * w.radius * TILE;
    const left = Math.round(x / TILE - w.seatWidth / 2);
    const row = Math.round(y / TILE);
    for (let c = 0; c < w.seatWidth; c++) cells.add(`${left + c},${row}`);
  }
  return cells;
}

// How fast a seat moves, in px a second.
export function seatSpeed(wheel) {
  const w = wheelWith(wheel);
  return (2 * Math.PI * w.radius * TILE * 1000) / w.periodMs;
}

// What's wrong with a level's wheels, as messages: a seat that runs into the ground or off the map.
export function wheelProblems(level) {
  const errors = [];
  const { map } = level;
  for (const [i, wheel] of (level.wheels ?? []).entries()) {
    const { seats, broken } = wheelWith(wheel);
    if (broken.some((seat) => !Number.isInteger(seat) || seat < 0 || seat >= seats)) errors.push(`wheel ${i + 1} has a broken seat it doesn't have`);
    if (new Set(broken).size >= seats) errors.push(`wheel ${i + 1} has no good seat`);
    for (const cell of wheelCells(wheel)) {
      const [c, r] = cell.split(',').map(Number);
      if (r < 0 || r >= map.length || c < 0 || c >= map[0].length) {
        errors.push(`wheel ${i + 1} goes off the map`);
        break;
      }
      if (map[r][c] === '#' || map[r - 1]?.[c] === '#') {
        errors.push(`wheel ${i + 1} runs into the ground at column ${c}, row ${r}`);
        break;
      }
    }
  }
  return errors;
}

// The green hub is a target (systems/AdventurePlatforms.js): a round hitting it turns the wheel the
// other way; three freeze rounds stop it for a while (data/adventure/freeze.js, TRAP_FREEZE).
//   hubShare: the hub's radius, as a share of the wheel's (a round within it hits it).
//   reverseCooldownMs: after a reverse, how long before another round can reverse it again: longer
//   than he can stay level with the hub on a seat (about 1.6 s), so a held burst flips it once, not
//   back again to where it was.
export const HUB = { hubShare: 0.35, reverseCooldownMs: 1800 };

// Whether a round at (x, y) hits the hub.
export function hitsHub(wheel, x, y) {
  const w = wheelWith(wheel);
  const hub = wheelHub(w);
  return Math.hypot(x - hub.x, y - hub.y) <= w.radius * TILE * HUB.hubShare;
}

// The wheel turned the other way, its seats where they are: its direction flipped, and its clock
// (ms, how long it has turned) flipped with it, so every seat's angle stays the same.
export function reversed({ dir, ms }) {
  return { dir: -dir, ms: -ms };
}
