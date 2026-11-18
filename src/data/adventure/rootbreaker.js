// The Rootbreaker, the jungle path's boss in level 3 (Heart of the Tree): an ancient stone guardian
// whose body is part of the mountain, from the owner's design (images/levels/forest/levelel3-example
// boss-guardian.png and fight-flow.png). He stands behind his arena, facing the cat, and never walks;
// his big stone fists float and fight, each held to his shoulder by a chain of glowing links. Only his core crystal, in his chest, can be hurt, and
// only while it's open:
//   phase 1, Awakening (100-66%): one fist at a time slams down where the cat is; a missed smash
//     sticks in the ground, and his core opens for a while. His mouth blasts balls of green energy.
//   phase 2, Enraged (66-33%): a fist sweeps low across his side of the arena, and his eyes fire a
//     laser across it, high or low; a stuck fist's target lights up, shooting it cracks its seal,
//     and with both seals broken his core opens.
//   phase 3, Overload (33-0%): everything faster, rocks fall from above, and every smash opens his
//     core.
// His parts are cut from the owner's two sheets by tools/adventure-rootbreaker-art.mjs, and
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
// His fists, from the owner's second sheet (images/levels/forest/guardian-parts.png): the big fist
// with its cuff and its green target, drawn pointing right (r) and left (l), so the moss is always
// on top. The sheet's other pieces (a whole golem, and stiff arm pieces) aren't used.
export const RB_ARM_PIECES = [
  ['_golem', '_golem-angry'],
  ['_r-shoulder', '_r-upper', '_r-fore', 'rb-r-fist'],
  ['rb-l-fist', '_l-fore', '_l-upper', '_l-shoulder'],
];
// Each fist's target, as the tool makes it: lit (the owner's art: shoot here), dim (stone), and
// cracked (its seal broken, in phase 2).
export const RB_FIST_LOOKS = ['rb-r-fist-dim', 'rb-r-fist-cracked', 'rb-l-fist-dim', 'rb-l-fist-cracked'];
export const RB_ART = [...RB_PIECES.flat(), ...RB_ARM_PIECES.flat(), ...RB_FIST_LOOKS].filter((name) => !name.startsWith('_'));
export const rbKey = (name) => `adventure-${name}`;
export const rbPath = (name) => `assets/adventure/bosses/rootbreaker/${name}.png`;

// The fist's picture, as shares of the right-pointing one (x across, y down; the left is its
// mirror): its cuff (`root`, where his arm's chain holds it) and the middle of the big fist (`end`,
// where the target is).
export const RB_FIST_JOINTS = { root: { x: 0.06, y: 0.52 }, end: { x: 0.8, y: 0.55 } };
// The big fist's own block (without the cuff), as shares of the fist piece: what hits, what the cat
// stands on, and what rounds stop on.
export const RB_FIST_BLOCK = { x0: 0.47, x1: 1, y0: 0.05, y1: 0.95 };

export const ROOTBREAKER = {
  name: 'The Rootbreaker',
  health: 60,
  // How he's shown: his body and face, his mouth's balls and the rocks, as shares of their drawn
  // size (his arms' size is arm.scale).
  scale: { body: 1.0, ball: 0.55, rock: 0.6 },
  // Where his face and his core sit on his body (shares of the body picture), measured by the tool.
  faceAt: { x: 0.513, y: 0.259 },
  coreAt: { x: 0.521, y: 0.685 },
  // His arms: each fist floats free, held to the green ring at his shoulder (shoulders, shares of
  // the body picture) by a chain of glowing stone links that bows like a rope (chainLinks): it
  // can't look broken however the fist moves. scale: the fist's size, as a share of the owner's
  // drawing. swapAt: a fist turning past straight up or down swaps to the other way's drawing (moss
  // on top) only this far past it, so it doesn't flicker there.
  shoulders: [{ x: 0.13, y: 0.54 }, { x: 0.87, y: 0.54 }],
  arm: { scale: 0.55, swapAt: 0.25 },
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
  // Alive between attacks: he breathes, and his eyes follow the cat.
  idle: { breathePx: 5, breatheMs: 3200, eyesPx: 9, swayDeg: 4 },
  // The camera, while he fights: it frames his whole arena, from this far above his feet to this far
  // below, gliding there in panMs.
  camera: { above: 700, below: 120, panMs: 900 },
  // Damage to his open core, by the kind of round or move that hits it.
  damage: { standard: 1, explosive: 4, laser: 1, freeze: 1, fire: 1, beam: 6, stomp: 2, dash: 2, rage: 3 },
  // The phases, by the share of his health left.
  phases: [
    { from: 1, name: 'Awakening', attacks: ['smash', 'blast', 'smash'], speed: 1 },
    { from: 0.66, name: 'Enraged', attacks: ['sweep', 'smash', 'laser', 'smash'], speed: 1.15 },
    { from: 0.33, name: 'Overload', attacks: ['smash', 'rockfall', 'laser', 'sweep', 'smash', 'blast'], speed: 1.35 },
  ],
  // His attacks (ms, px, px a second). Each starts with a tell the cat can read.
  // smash, an overhead hammer blow: a wind-up (the fist hauled up and back, pointing up: raiseTilt),
  // the tell (high over the cat, following him, trembling, his shadow below), the drop (fast,
  // speeding up, the fist swinging over to land flat), the slam (squash, dust, shake, a wave along
  // the floor), stuck (flat on the floor, tugging to get free), and a slow, heavy lift back.
  smash: {
    windupMs: 480, tellMs: 900, follow: 0.9, high: 400, raiseTilt: -80, trembleDeg: 3, dropMs: 280,
    stuckMs: 2400, struggleMs: 260, tugDeg: 6, liftMs: 800, waveMs: 320, waveReach: 480,
  },
  // A short freeze of the whole fight when a fist lands (ms), so the blow feels heavy.
  hitStopMs: 70,
  // Where his fists work: each on its own side, from `inner` px out from his middle (closer in, it
  // would cover his core) to `edge` px short of the arena's wall. A cat closer in than that is
  // reached by the smash's wave, his blasts and his lasers.
  reachZone: { inner: 190, edge: 80 },
  blast: { tellMs: 800, balls: 3, spreadDeg: 18, speed: 380, everyMs: 260 },
  // sweep, a backhand swing by the fist on the cat's side: hauled out to the wall, cocked back and
  // up and glowing (the wind-up), then swung low across his side of the arena toward his body, the
  // fist trailing, and back. height: px over the floor its middle passes; cockUp: how high it's
  // cocked (px over the floor) and cockTilt how it points then.
  sweep: { tellMs: 900, sweepMs: 650, height: 70, cockTilt: -50, cockUp: 150, returnMs: 700 },
  laser: { tellMs: 1000, fireMs: 700, heights: [60, 200], thick: 26 }, // over the floor (px): one jumped, one passed under
  rockfall: { tellMs: 900, rocks: 5, everyMs: 300, fallSpeed: 760 },
  restMs: 900, // between attacks
  coreOpenMs: { phase1: 2400, phase2: 3600, phase3: 2600 },
  sealHits: 3, // rounds to crack a fist's seal, in phase 2
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

// What a hit does to his core: the damage, or 0 if it's closed.
export function coreDamage(kind, open, { damage } = ROOTBREAKER) {
  return open ? damage[kind] ?? 1 : 0;
}

// Where a fist on side `side` (-1 left, 1 right) may work, for an x it's after: on its own side of
// his middle, no closer in than reachZone.inner, nor nearer the arena's walls than reachZone.edge.
export function inReach(x, side, middle, { left, right }, { inner, edge } = ROOTBREAKER.reachZone) {
  return side > 0 ? Math.min(Math.max(x, middle + inner), right - edge) : Math.max(Math.min(x, middle - inner), left + edge);
}

// Which way a fist points (radians, from its cuff to its middle), for a tilt (degrees: 0 level, 90
// straight down, -90 straight up) and the side it points to (dir: -1 left, 1 right).
export const fistAngle = (tilt, dir) => {
  const a = (tilt * Math.PI) / 180;
  return dir > 0 ? a : Math.PI - a;
};

// The turn (radians) from angle a to angle b, the short way round.
export const turnBetween = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Which drawing a piece pointing `angle` uses: the right-pointing one (1) or the left (-1). It keeps
// the one it has (`now`) until it's turned `swapAt` past straight up or down, so it doesn't flicker.
export function pieceSide(angle, now, swapAt) {
  const c = Math.cos(angle);
  if (now > 0 ? c < -swapAt : c > swapAt) return -now;
  return now;
}

// The fist's joints in its drawing: its root (its cuff, as shares of the picture), and the way from
// its cuff to its middle (px, at `scale`), for the right-pointing drawing (dir 1) or the left (-1).
// size: the right-pointing picture's { w, h }.
export function fistJoints(size, scale, dir, { root, end } = RB_FIST_JOINTS) {
  const v = { x: (end.x - root.x) * size.w * scale * dir, y: (end.y - root.y) * size.h * scale };
  return { root: { x: dir > 0 ? root.x : 1 - root.x, y: root.y }, v, length: Math.hypot(v.x, v.y), angle: Math.atan2(v.y, v.x) };
}

// A fist whose middle is at `at`, pointing `angle` (radians), in the drawing it used last (`now`):
// which drawing it uses now (side), its cuff (where its picture turns: origin, as shares; and x, y)
// and its turn (rotation, radians).
export function placeFist(at, angle, size, now, { scale, swapAt } = ROOTBREAKER.arm) {
  const side = pieceSide(angle, now, swapAt);
  const j = fistJoints(size, scale, side);
  return { side, origin: j.root, x: at.x - Math.cos(angle) * j.length, y: at.y - Math.sin(angle) * j.length, rotation: angle - j.angle };
}

// How an arm's chain bows, from its shoulder (`from`) to its fist's cuff (`to`), on side `side`:
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
    const t = (i + 0.5) / links;
    const p = at(t), ahead = at(Math.min(1, t + 0.01)), behind = at(Math.max(0, t - 0.01));
    return { ...p, rotation: Math.atan2(ahead.y - behind.y, ahead.x - behind.x), size: linkFrom + (linkTo - linkFrom) * (i / Math.max(1, links - 1)) };
  });
}

// The box round a fist's big block (world px), for a fist whose middle is at `at`, pointing `angle`:
// what it hits with and what's stood on. size: its picture { w, h }.
export function fistBox(at, angle, size, scale = ROOTBREAKER.arm.scale, block = RB_FIST_BLOCK) {
  const along = (block.x1 - block.x0) * size.w * scale / 2, across = (block.y1 - block.y0) * size.h * scale / 2;
  const back = ((block.x0 + block.x1) / 2 - RB_FIST_JOINTS.end.x) * size.w * scale; // its middle, from the fist's
  const c = Math.cos(angle), s = Math.sin(angle);
  const x = at.x + c * back, y = at.y + s * back;
  const hw = Math.abs(c) * along + Math.abs(s) * across, hh = Math.abs(s) * along + Math.abs(c) * across;
  return { x, y, left: x - hw, right: x + hw, top: y - hh, bottom: y + hh };
}
