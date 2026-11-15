import { TILE } from '../../systems/adventureMap.js';

// The adventure's flying enemies: the pterodactyl (entities/AdventureBird.js). A level lists its
// birds beside its map, with mapBuilder's bird(kind, col, row, options):
//   diver   it waits at its home cell (col, row), bobbing, until the cat passes column `wake`. Then,
//           while he's on solid ground within its reach (not riding a wheel's seat, not in the air:
//           a hit there would throw him into the river), it screeches and flashes (warnMs), its aim
//           locked on where he was, and dives at that spot in a straight line, then climbs back
//           home and rests before it can dive again.
//   hover   it flies slowly up and down over its home cell, `loop` cells each way, and never dives:
//           an obstacle to time, a step to bounce off, or, frozen, a block of ice to stand on.
// Either one hurts by touch, is knocked out by one round, a stomp, a dash, a slide or the claw, and
// freezes in the air (a block of ice to stand on, hanging where it was). Its hit doesn't knock the
// cat sideways (softHit): over a wheel or the river, that would cost him a second heart.
// Plain numbers and code, no Phaser, so the dive's aim can be tested.

export const BIRD_KINDS = ['diver', 'hover'];

export const BIRD = {
  hp: 1,
  stompable: true,
  softHit: true,
  body: { w: 76, h: 40 }, // px: what hurts and what's hit, round its middle
  bob: { px: 8, ms: 1400 }, // waiting at home: a gentle bob
  flapMs: 110, // each frame of its wing flap
  // The diver.
  reach: { across: [2 * TILE, 9 * TILE], below: [TILE, 7 * TILE] }, // where the cat must be, from it, for it to dive
  firstAfterMs: 1000, // once awake, it's seen this long before its first warning
  warnMs: 700, // screech and flash, its aim locked
  diveSpeed: 620, // px a second: faster than his run (380), a little faster than a dart (560)
  angle: { minDeg: 20, maxDeg: 45 }, // below level: never straight down from above him
  overshoot: TILE * 1.5, // it flies on this far past where it aimed, then climbs back
  returnSpeed: 220, // px a second, back home
  restMs: 2000, // at home, before it can warn again
  // The hover.
  hover: { loop: 1.5, periodMs: 3200 }, // loop: cells up and down from home; periodMs: once up and back
};

// Its home, in px: the middle of its cell.
export const birdHome = ({ col, row }) => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });

// Whether the cat, at (x, y) (his body's middle), is where a diver at (bx, by) would dive at him.
export function inReach(bx, by, x, y, { reach } = BIRD) {
  const across = Math.abs(x - bx), below = y - by;
  return across >= reach.across[0] && across <= reach.across[1] && below >= reach.below[0] && below <= reach.below[1];
}

// The dive from (bx, by) at (x, y): its speed along x and y, held between minDeg and maxDeg below
// level, and how far it flies before it turns back (to the aim point, and a little past).
export function diveAt(bx, by, x, y, { diveSpeed, angle, overshoot } = BIRD) {
  const dx = x - bx, dy = Math.max(0, y - by);
  const dir = Math.sign(dx) || 1;
  const toRad = Math.PI / 180;
  const a = Math.min(angle.maxDeg * toRad, Math.max(angle.minDeg * toRad, Math.atan2(dy, Math.abs(dx))));
  return { vx: dir * diveSpeed * Math.cos(a), vy: diveSpeed * Math.sin(a), distance: Math.hypot(dx, dy) + overshoot, dir };
}

// Where a hovering bird is, `ms` into its loop: its home's height, plus up to `loop` cells up and down.
export function hoverY(homeY, ms, { hover } = BIRD) {
  return homeY - Math.sin((2 * Math.PI * ms) / hover.periodMs) * hover.loop * TILE;
}

// The owner's pterodactyl (prompts/forest-level/14-pterodactyl.md), cut by tools/adventure-ptero-art.mjs
// into square frames `cell` px across, facing left. Where each frame is on the sheet (row, column).
export const PTERO_ART = { cell: 160 };
const run = (name, row, from, count) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`${name}-${i}`, { row, col: from + i }]));
export const PTERO_FRAMES = {
  ...run('fly', 0, 0, 6), ...run('screech', 1, 0, 3), ...run('dive', 1, 3, 3),
  ...run('hit', 2, 0, 2), ...run('fall', 2, 2, 2), ...run('glide', 2, 4, 2),
};
export const PTERO_KEYS = Object.keys(PTERO_FRAMES).map((name) => `ptero-${name}`);
