import { TILE } from '../../systems/adventureMap.js';

// The adventure's flying enemies: the pterodactyl (entities/AdventureBird.js). A level lists its
// birds beside its map, with mapBuilder's bird(kind, col, row, options):
// Divers take turns: one doesn't start its warning while another is warning or diving, or within
// apartMs of a dive's end, so two never come at him together. After he falls in the river and comes
// back at a checkpoint, the divers not yet reached go back to sleep, so none waits for him there.
//   diver   it waits at its home cell (col, row), bobbing (or, with `patrol`, flying slowly to and
//           fro that many cells each way), until the cat passes column `wake`. Then, while he's on
//           solid ground within its reach (or, with `riders`, on a wheel's seat too: not in the air),
//           it screeches and flashes (warnMs), its aim locked on where he was, and dives at that
//           spot in a straight line, then climbs back home and rests before it can dive again.
// Any bird can take { look: 'green' } (PTERO_LOOKS) to wear the green pterodactyl.
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
  body: { w: 54, h: 28 }, // px: what hurts and what's hit, round its middle
  bob: { px: 8, ms: 1400 }, // waiting at home: a gentle bob
  flapMs: 110, // each frame of its wing flap
  // The diver.
  reach: { across: [2 * TILE, 9 * TILE], below: [TILE, 7 * TILE] }, // where the cat must be, from it, for it to dive
  firstAfterMs: 1000, // once awake, it's seen this long before its first warning
  warnMs: 700, // screech and flash, its aim locked
  diveSpeed: 620, // px a second: faster than his run (420), a little faster than a dart (560)
  angle: { minDeg: 20, maxDeg: 45 }, // below level: never straight down from above him
  overshoot: TILE * 1.5, // it flies on this far past where it aimed, then climbs back
  returnSpeed: 220, // px a second, back home
  restMs: 2000, // at home, before it can warn again
  apartMs: 1000, // one bird dives at a time: another waits until this long after a dive has ended
  sounds: { screech: 'pteroScreech', dive: 'maceWhoosh' }, // the dive's whoosh is the cue to jump
  // The hover.
  hover: { loop: 1.5, periodMs: 3200 }, // loop: cells up and down from home; periodMs: once up and back
  patrolMs: 5000, // a patrolling diver: once to and fro
  homeSpeed: 260, // px a second at most, flying back onto its beat
};

// Where a diver waits, `ms` into its waiting: its home, bobbing, and, with `patrol` (cells), flying
// to and fro that far each way.
export function waitingAt(home, ms, patrol = 0, { bob, patrolMs } = BIRD) {
  return {
    x: home.x + Math.sin((2 * Math.PI * ms) / patrolMs) * patrol * TILE,
    y: home.y + Math.sin((2 * Math.PI * ms) / bob.ms) * bob.px,
  };
}

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
export const PTERO_ART = { cell: 112 };
const run = (name, row, from, count) => Object.fromEntries(Array.from({ length: count }, (_, i) => [`${name}-${i}`, { row, col: from + i }]));
export const PTERO_FRAMES = {
  ...run('fly', 0, 0, 6), ...run('screech', 1, 0, 3), ...run('dive', 1, 3, 3),
  ...run('hit', 2, 0, 2), ...run('fall', 2, 2, 2), ...run('glide', 2, 4, 2),
};
// Its looks: the orange one (ptero-<frame>), and a green one (ptero2-<frame>, from a second sheet
// the owner drew). A bird picks its look with { look: 'green' }.
export const PTERO_LOOKS = { orange: 'ptero', green: 'ptero2' };
export const PTERO_KEYS = Object.values(PTERO_LOOKS).flatMap((prefix) => Object.keys(PTERO_FRAMES).map((name) => `${prefix}-${name}`));
