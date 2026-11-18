// The Rootbreaker, the jungle path's boss in level 3 (Heart of the Tree): an ancient stone guardian
// whose body is part of the mountain, from the owner's design (images/levels/forest/levelel3-example
// boss-guardian.png and fight-flow.png). He stands behind his arena, facing the cat, and never walks;
// his fists, big mossy stones, float and fight, each held to his shoulder by a chain of glowing links. Only his core crystal, in his chest, can be hurt, and
// only while it's open:
//   phase 1, Awakening (100-66%): one fist at a time slams down where the cat is; a missed smash
//     sticks in the ground, and his core opens for a while. His mouth blasts balls of green energy.
//   phase 2, Enraged (66-33%): a fist sweeps low across his side of the arena, his eyes fire lasers
//     at the cat, and his shoulder stones strike.
// In every phase a missed smash opens his core, and so does breaking an arm.
// He can be hit anywhere on his body, but only while his core is open.
// In every phase his arms can be hurt: rounds, blasts, the bolt, the claw, a dash or a stomp on a
// fist wear its arm down (it cracks at half); broken, it shatters, his core opens, and it grows
// back after a while. With an arm gone, the other does its work.
//   phase 3, Overload (33-0%): everything faster, rocks fall from above, and every smash opens his
//     core.
// His parts are cut from the owner's sheet by tools/adventure-rootbreaker-art.mjs, and
// tools/adventure-rootbreaker-preview.mjs draws his poses as a picture. Plain numbers and
// code, no Phaser, so the fight's rules can be tested; entities/AdventureRootbreaker.js plays it.

// The sheet's pieces, in the rows the tool finds them in. Names starting with _ are cut but not
// used. The stone ring with its green glow (rb-link) makes the links of his arms.
export const RB_PIECES = [
  ['rb-body'],
  ['rb-face-calm', 'rb-face-warn', 'rb-face-blast'],
  ['rb-core-closed', 'rb-core-opening', 'rb-core-open', 'rb-core-shattered'],
  ['_fist', '_hand', 'rb-link', '_seal-cracked'],
  ['rb-ball', 'rb-laser', 'rb-rock-1', 'rb-rock-2'],
];
// His fists are the big mossy stone (rb-rock-1); the tool also makes it cracked (an arm worn down
// to half).
export const RB_FIST_LOOKS = ['rb-fist-cracked'];
export const RB_ART = [...RB_PIECES.flat(), ...RB_FIST_LOOKS].filter((name) => !name.startsWith('_'));
export const rbKey = (name) => `adventure-${name}`;
export const rbPath = (name) => `assets/adventure/bosses/rootbreaker/${name}.png`;

export const ROOTBREAKER = {
  name: 'The Rootbreaker',
  health: 60,
  // How he's shown: his body and face, his mouth's balls and the rocks, as shares of their drawn
  // size (his arms' size is arm.scale).
  scale: { body: 1.0, ball: 0.55, rock: 0.6 },
  // Where his face and his core sit on his body (shares of the body picture), measured by the tool.
  faceAt: { x: 0.513, y: 0.259 },
  coreAt: { x: 0.521, y: 0.685 },
  // His arms: each fist, a big mossy stone, floats free, held to the green ring at his shoulder
  // (shoulders, shares of the body picture) by a chain of glowing stone links that bows like a rope
  // (chainLinks): it can't look broken however the fist moves.
  //   scale: the stone's size, as a share of its drawing; box: its hit box, as a share of its
  //   picture; hold: where the chain holds it, as a share of its half-size from its middle, toward
  //   the shoulder; spin: how much of its swing the stone turns (a little, so its moss stays on top).
  shoulders: [{ x: 0.13, y: 0.54 }, { x: 0.87, y: 0.54 }],
  arm: { scale: 1.1, box: 0.82, hold: 0.6, spin: 0.3 },
  // The stone on each shoulder (the smaller mossy stone, rb-rock-2), over the green ring, his arm's
  // chain coming out from under it: its size, a share of its drawing.
  shoulderStone: { scale: 1.2 },
  // The chain: `links` stone rings, `linkFrom` of the ring's drawn size at the shoulder down to
  // `linkTo` at the fist. It's `length` px long: closer in than that, it bows out (at most `bowMost`
  // px), up and out like an elbow. It trails behind a fast fist (lag: px of bow for each px a
  // second the fist moves, at most lagMost), easing to its shape (ease: a share a second).
  chain: { links: 4, linkFrom: 0.42, linkTo: 0.26, length: 420, bowMost: 90, bowLeast: 16, lag: 0.08, lagMost: 120, ease: 9, bobPx: 4 },
  // How a fist turns: it swings toward the way its move wants it to point with the weight of stone
  // (a spring: stiff, and how fast its swing dies down), lagging behind when it moves fast.
  // lagDeg: how far it lags (degrees) at lagSpeed (px a second).
  fistSwing: { stiff: 70, settle: 7, lagDeg: 22, lagSpeed: 1800 },
  // Each fist hovers beside him: this far out from his middle and this far up from his feet (px),
  // pointing out and a little down (tilt, degrees: 0 level, 90 straight down), bobbing and swaying.
  fistRest: { out: 470, up: 160, tilt: 50, swayDeg: 6, bobPx: 10 },
  // Where he can be hit: his whole body (`across`, a share of his picture's width, from the floor
  // to the top of his head), but only while his core is open. Shut, a hit only sparks.
  bodyTarget: { across: 0.8 },
  // How far his feet sit into the ground (px), so his round rocks rest in it, not on it.
  sinkPx: 12,
  // Alive between attacks: he breathes (stretching up from his feet), and his eyes follow the cat.
  idle: { breathePx: 5, breatheMs: 3200, eyesPx: 9, swayDeg: 4 },
  // The camera, while he fights: it frames his whole arena, from this far above his feet to this far
  // below, gliding there in panMs.
  camera: { above: 700, below: 120, panMs: 900 },
  // Damage to his open core, by the kind of round or move that hits it.
  damage: { standard: 1, explosive: 4, laser: 1, freeze: 1, fire: 1, beam: 6, stomp: 2, dash: 2, rage: 3 },
  // The phases, by the share of his health left.
  phases: [
    { from: 1, name: 'Awakening', attacks: ['smash', 'blast', 'smash'], speed: 1 },
    { from: 0.66, name: 'Enraged', attacks: ['sweep', 'smash', 'shoulder', 'laser', 'smash'], speed: 1.15 },
    { from: 0.33, name: 'Overload', attacks: ['smash', 'rockfall', 'shoulder', 'laser', 'sweep', 'smash', 'shoulder', 'blast'], speed: 1.35 },
  ],
  // His attacks (ms, px, px a second). Each starts with a tell the cat can read.
  // smash, an overhead hammer blow: a wind-up (the fist hauled up and back, pointing up: raiseTilt),
  // the tell (high over the cat, following him, trembling, his shadow below), the drop (fast,
  // speeding up, the fist swinging over to land flat), the slam (squash, dust, shake, a ring along
  // the floor), stuck (flat on the floor, tugging to get free), and a slow, heavy lift back. Only the
  // fist itself hurts: the ring (waveMs, waveReach) is only a look, so a cat beside it is safe.
  smash: {
    windupMs: 480, tellMs: 900, follow: 0.9, high: 400, raiseTilt: -80, trembleDeg: 3, dropMs: 280,
    stuckMs: 2400, struggleMs: 260, tugDeg: 6, liftMs: 800, waveMs: 320, waveReach: 260,
  },
  // A short freeze of the whole fight when a fist lands (ms), so the blow feels heavy.
  hitStopMs: 70,
  // Where his fists work: each on its own side, from `inner` px out from his middle (closer in, it
  // would cover his core) to `edge` px short of the arena's wall. A cat closer in than that is
  // reached by his blasts and his lasers.
  reachZone: { inner: 190, edge: 80 },
  blast: { tellMs: 800, balls: 3, spreadDeg: 18, speed: 380, everyMs: 260 },
  // shoulder, the shoulder stone's strike: it shakes and glows green (the tell, shakePx), then pops
  // off and flies in an arc (arcPx high) to where the cat was when the tell began, lands, waits
  // there, and flies back. Only touching it as it flies hurts. With an arm broken, the stone on
  // that side strikes in its place, every other attack (in the phases that have this attack).
  shoulder: { tellMs: 950, shakePx: 4, flyMs: 560, arcPx: 170, waitMs: 500, returnMs: 700, spinDeg: 300 },
  // sweep, a backhand swing by the fist on the cat's side: hauled out to the wall, cocked back and
  // up and glowing (the wind-up), then swung low across his side of the arena toward his body, the
  // fist trailing, and back. height: px over the floor its middle passes; cockUp: how high it's
  // cocked (px over the floor) and cockTilt how it points then.
  sweep: { tellMs: 900, sweepMs: 650, height: 70, cockTilt: -50, cockUp: 150, returnMs: 700 },
  // laser, from his eyes at the cat: his eyes glow and a thin line from each follows the cat (the
  // tell), then stops following for the last `lockShare` of it (the moment to move), and the beams
  // burn along those lines to the floor or the walls. thick: the beams' thickness (px).
  laser: { tellMs: 1000, lockShare: 0.35, follow: 6, fireMs: 700, thick: 24 }, // follow: how fast the lines catch up with the cat
  rockfall: { tellMs: 900, rocks: 5, everyMs: 300, fallSpeed: 760 },
  restMs: 900, // between attacks
  coreOpenMs: { phase1: 2400, phase2: 3600, phase3: 2600 },
  // His arms' own health: hurt by the same damage as his core (damage), and by `hits` for the
  // moves his core doesn't feel that way; cracked at `crackedAt` of it, broken at none. Broken, his
  // core opens and the arm grows back after `regrowMs`, coming together over `rebuildMs`.
  armHealth: { full: 12, crackedAt: 0.5, regrowMs: 18000, rebuildMs: 900, hits: { bolt: 6, claw: 2 } },
  dieMs: 1800,
};

// The phase he's in, with this share of his health left: its number (0, 1, 2) and its settings.
export function rootbreakerPhase(share, { phases } = ROOTBREAKER) {
  let index = 0;
  phases.forEach((phase, i) => { if (share <= phase.from) index = i; });
  return { index, ...phases[index] };
}

// The attack after `count` attacks in this phase: its list, in turn.
export const nextAttack = (phase, count) => phase.attacks[count % phase.attacks.length];

// The attacks that need a fist.
const FIST_ATTACKS = new Set(['smash', 'sweep']);

// The attack he makes, with `count` attacks made in this phase, `fists` of his fists free to strike
// and `broken` of his arms broken: his list in turn, passing over a fist's attack while no fist is
// free. With an arm broken, in a phase that has the shoulder strike, every other attack is one.
// Returns the attack and how many turns of the list it took (to add to count).
export function pickAttack(phase, count, fists, broken = 0) {
  if (broken > 0 && phase.attacks.includes('shoulder') && count % 2 === 0) return { kind: 'shoulder', steps: 1 };
  for (let step = 0; step < phase.attacks.length; step++) {
    const kind = nextAttack(phase, count + step);
    if (fists > 0 || !FIST_ATTACKS.has(kind)) return { kind, steps: step + 1 };
  }
  return { kind: 'blast', steps: 1 }; // no fists, and nothing but fist attacks: he blasts
}

// What a hit of this kind does to one of his arms: the damage.
export function armDamage(kind, { damage, armHealth } = ROOTBREAKER) {
  return armHealth.hits[kind] ?? damage[kind] ?? 1;
}

// What a hit on his body does: its damage while his core's open; nothing while it's shut.
export function coreDamage(kind, open, { damage } = ROOTBREAKER) {
  return open ? damage[kind] ?? 1 : 0;
}

// Where a fist on side `side` (-1 left, 1 right) may work, for an x it's after: on its own side of
// his middle, no closer in than reachZone.inner, nor nearer the arena's walls than reachZone.edge.
export function inReach(x, side, middle, { left, right }, { inner, edge } = ROOTBREAKER.reachZone) {
  return side > 0 ? Math.min(Math.max(x, middle + inner), right - edge) : Math.max(Math.min(x, middle - inner), left + edge);
}

// Which way a fist swings (radians), for a tilt (degrees: 0 level, 90 straight down, -90 straight
// up) and the side it's toward (dir: -1 left, 1 right). The stone turns a share of it (arm.spin).
export const fistAngle = (tilt, dir) => {
  const a = (tilt * Math.PI) / 180;
  return dir > 0 ? a : Math.PI - a;
};

// The turn (radians) from angle a to angle b, the short way round.
export const turnBetween = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Where a beam from `from`, aimed at `toward`, ends: where it first meets the floor, a wall or the
// top of the arena (bounds: { left, right, top, floor }).
export function beamEnd(from, toward, { left, right, top, floor }) {
  const dx = toward.x - from.x, dy = toward.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  let t = Infinity;
  if (uy > 1e-6) t = Math.min(t, (floor - from.y) / uy);
  if (uy < -1e-6) t = Math.min(t, (top - from.y) / uy);
  if (ux > 1e-6) t = Math.min(t, (right - from.x) / ux);
  if (ux < -1e-6) t = Math.min(t, (left - from.x) / ux);
  if (!Number.isFinite(t)) t = 0;
  return { x: from.x + ux * t, y: from.y + uy * t };
}

// Whether a beam from `a` to `b`, `thick` px thick, touches a box { left, right, top, bottom }: the
// line, clipped to the box grown by half the beam's thickness.
export function beamTouches(a, b, thick, box) {
  const h = thick / 2;
  const l = box.left - h, r = box.right + h, t = box.top - h, bt = box.bottom + h;
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - l], [dx, r - a.x], [-dy, a.y - t], [dy, bt - a.y]]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const k = q / p;
    if (p < 0) t0 = Math.max(t0, k);
    else t1 = Math.min(t1, k);
    if (t0 > t1) return false;
  }
  return true;
}

// Where a shoulder stone is as it flies (t: 0 at `from`, 1 at `to`): along the line, lifted in an
// arc `arc` px high at its middle.
export function stoneFlight(from, to, t, arc) {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * arc };
}

// Where the chain holds a fist whose middle is at `at`: on its edge toward the shoulder (`mount`).
// size: the stone's picture { w, h }.
export function chainHold(at, mount, size, { scale, hold } = ROOTBREAKER.arm) {
  const dx = mount.x - at.x, dy = mount.y - at.y;
  const d = Math.hypot(dx, dy) || 1;
  const r = (Math.min(size.w, size.h) * scale * hold) / 2;
  return { x: at.x + (dx / d) * r, y: at.y + (dy / d) * r };
}

// How an arm's chain bows, from its shoulder (`from`) to where it holds its fist (`to`), on side `side`:
// slack (the fist closer in than the chain's length), it bows out from the straight line, up and
// out like an elbow, more the closer in; taut, hardly at all. Returns the push on its middle { x, y }.
export function chainBow(from, to, side, { length, bowMost, bowLeast } = ROOTBREAKER.chain) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  // Of the two ways off the line, the one more up and out.
  const a = { x: -dy / d, y: dx / d }, b = { x: dy / d, y: -dx / d };
  const way = side * a.x - a.y >= side * b.x - b.y ? a : b;
  const amount = Math.min(bowMost, bowLeast + Math.max(0, length - d) * 0.35);
  return { x: way.x * amount, y: way.y * amount };
}

const CHAIN_ENDS = 0.08; // the first and last links, this share of the way in from each end

// The links of an arm's chain, from `from` to `to`, its middle pushed by `bow` ({ x, y } px): `links`
// rings spaced along the curve, each turned along it and smaller toward the fist. Returns
// [{ x, y, rotation, size }] (size: a share of the ring's drawn size).
export function chainLinks(from, to, bow, { links, linkFrom, linkTo } = ROOTBREAKER.chain) {
  // A curve through the middle point pushed by `bow`: its control point is pushed twice as far.
  const c = { x: (from.x + to.x) / 2 + bow.x * 2, y: (from.y + to.y) / 2 + bow.y * 2 };
  const at = (t) => ({
    x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * c.x + t * t * to.x,
    y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * c.y + t * t * to.y,
  });
  return Array.from({ length: links }, (_, i) => {
    const t = CHAIN_ENDS + (1 - 2 * CHAIN_ENDS) * (i / Math.max(1, links - 1)); // first at the shoulder, last at the fist
    const p = at(t), ahead = at(Math.min(1, t + 0.01)), behind = at(Math.max(0, t - 0.01));
    return { ...p, rotation: Math.atan2(ahead.y - behind.y, ahead.x - behind.x), size: linkFrom + (linkTo - linkFrom) * (i / Math.max(1, links - 1)) };
  });
}

// The box round a fist (world px) whose middle is at `at`: what it hits with, what rounds stop
// on and, stuck, what's stood on. size: the stone's picture { w, h }.
export function fistBox(at, size, { scale, box } = ROOTBREAKER.arm) {
  const hw = (size.w * scale * box) / 2, hh = (size.h * scale * box) / 2;
  return { x: at.x, y: at.y, left: at.x - hw, right: at.x + hw, top: at.y - hh, bottom: at.y + hh };
}
