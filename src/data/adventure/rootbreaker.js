// The Rootbreaker, the jungle path's boss in level 3 (Heart of the Tree): an ancient stone guardian
// whose body is part of the mountain, from the owner's design (images/levels/forest/levelel3-example
// boss-guardian.png and fight-flow.png). He stands behind his arena, facing the cat, and never walks;
// his stone arms reach out from his shoulders, and his big fists fight. Only his core crystal, in his chest, can be hurt, and
// only while it's open:
//   phase 1, Awakening (100-66%): one fist at a time slams down where the cat is; a missed smash
//     sticks in the ground, and his core opens for a while. His mouth blasts balls of green energy.
//   phase 2, Enraged (66-33%): a fist sweeps low across his side of the arena, and his eyes fire a
//     laser across it, high or low; a stuck fist's target lights up, shooting it cracks its seal,
//     and with both seals broken his core opens.
//   phase 3, Overload (33-0%): everything faster, rocks fall from above, and every smash opens his
//     core.
// His parts are cut from the owner's two sheets by tools/adventure-rootbreaker-art.mjs, and
// tools/adventure-rootbreaker-preview.mjs draws his arms' poses as a picture. Plain numbers and
// code, no Phaser, so the fight's rules can be tested; entities/AdventureRootbreaker.js plays it.

// The sheet's pieces, in the rows the tool finds them in. Names starting with _ are cut but not
// used: his old fists, hand and seals, before his new arms.
export const RB_PIECES = [
  ['rb-body'],
  ['rb-face-calm', 'rb-face-warn', 'rb-face-blast'],
  ['rb-core-closed', 'rb-core-opening', 'rb-core-open', 'rb-core-shattered'],
  ['_fist', '_hand', '_seal', '_seal-cracked'],
  ['rb-ball', 'rb-laser', 'rb-rock-1', 'rb-rock-2'],
];
// His arms, from the owner's second sheet (images/levels/forest/guardian-parts.png). Each arm has
// four pieces: the shoulder, the upper arm, the elbow with the forearm, and the big fist with its
// green target. The sheet has each arm twice: pointing right (r) and pointing left (l), so the moss
// is always on top. Its top row (a whole golem) isn't used.
export const RB_ARM_PIECES = [
  ['_golem', '_golem-angry'],
  ['rb-r-shoulder', 'rb-r-upper', 'rb-r-fore', 'rb-r-fist'],
  ['rb-l-fist', 'rb-l-fore', 'rb-l-upper', 'rb-l-shoulder'],
];
// Each fist's target, as the tool makes it: lit (the owner's art: shoot here), dim (stone), and
// cracked (its seal broken, in phase 2).
export const RB_FIST_LOOKS = ['rb-r-fist-dim', 'rb-r-fist-cracked', 'rb-l-fist-dim', 'rb-l-fist-cracked'];
export const RB_ART = [...RB_PIECES.flat(), ...RB_ARM_PIECES.flat(), ...RB_FIST_LOOKS].filter((name) => !name.startsWith('_'));
export const rbKey = (name) => `adventure-${name}`;
export const rbPath = (name) => `assets/adventure/bosses/rootbreaker/${name}.png`;

// Where each arm piece joins the next, as shares of the right-pointing piece's picture (x across,
// y down); the left-pointing piece is its mirror. Measured on the owner's sheet.
//   shoulder: `mount` sits on the green ring at his shoulder, `socket` is where the upper arm comes out;
//   upper: from its `root` (in the socket) to its `end` (under the elbow);
//   fore: from the elbow ring's middle (`root`) to the wrist (`end`, under the fist's cuff);
//   fist: from its cuff (`root`) to the middle of the big fist (`end`), where the target is.
export const RB_JOINTS = {
  shoulder: { root: { x: 0.4, y: 0.5 }, end: { x: 0.87, y: 0.42 } },
  upper: { root: { x: 0.2, y: 0.6 }, end: { x: 0.9, y: 0.6 } },
  fore: { root: { x: 0.224, y: 0.5 }, end: { x: 0.74, y: 0.5 } },
  fist: { root: { x: 0.34, y: 0.52 }, end: { x: 0.8, y: 0.55 } },
};
// The big fist's own block (without the cuff), as shares of the fist piece: what hits, what the cat
// stands on, and what rounds stop on.
export const RB_FIST_BLOCK = { x0: 0.47, x1: 1, y0: 0.05, y1: 0.95 };

export const ROOTBREAKER = {
  name: 'The Rootbreaker',
  health: 60,
  // How he's shown: his body and face, his mouth's balls and the rocks, as shares of their drawn
  // size (his arms' size is arm.scale).
  scale: { body: 1.5, ball: 0.7, rock: 0.8 },
  // Where his face and his core sit on his body (shares of the body picture), measured by the tool.
  faceAt: { x: 0.513, y: 0.259 },
  coreAt: { x: 0.521, y: 0.685 },
  // His arms turn at the green ring at each shoulder (shoulders, shares of the body picture): the
  // shoulder guard and the upper arm, the elbow and forearm, and the fist, each a stiff stone piece
  // turning at its joint (layArm). scale: the pieces' size, as a share of the owner's drawing.
  // swapAt: a piece turning past straight up or down swaps to the other way's drawing (moss on top)
  // only this far past it, so it doesn't flicker there. wristBend: the most a wrist bends (degrees).
  shoulders: [{ x: 0.13, y: 0.54 }, { x: 0.87, y: 0.54 }],
  arm: { scale: 0.9, swapAt: 0.25, wristBend: 40 },
  // How a fist turns: it swings toward the way its move wants it to point with the weight of stone
  // (a spring: stiff, and how fast its swing dies down), lagging behind when it moves fast.
  // lagDeg: how far it lags (degrees) at lagSpeed (px a second).
  fistSwing: { stiff: 70, settle: 7, lagDeg: 22, lagSpeed: 1800 },
  // Each fist rests beside him: this far out from his middle and this far up from his feet (px),
  // pointing out and down (tilt, degrees: 0 level, 90 straight down), swaying a little.
  fistRest: { out: 540, up: 140, tilt: 60, swayDeg: 6 },
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
    windupMs: 480, tellMs: 900, follow: 0.9, high: 560, raiseTilt: -60, trembleDeg: 3, dropMs: 280,
    stuckMs: 2400, struggleMs: 260, tugDeg: 6, liftMs: 800, waveMs: 320, waveReach: 520,
  },
  // Where his fists work: each on its own side, from `inner` px out from his middle (closer in, his
  // arm would cross his front) to `edge` px short of the arena's wall. A cat closer in than that is
  // reached by the smash's wave, his blasts and his lasers.
  reachZone: { inner: 330, edge: 110 },
  blast: { tellMs: 800, balls: 3, spreadDeg: 18, speed: 380, everyMs: 260 },
  // sweep, a backhand swing by the fist on the cat's side: hauled out to the wall, cocked back and
  // up and glowing (the wind-up), then swung low across his side of the arena toward his body, the
  // fist trailing, and back. height: px over the floor its middle passes; cockUp: how high it's
  // cocked (px over the floor) and cockTilt how it points then.
  sweep: { tellMs: 900, sweepMs: 650, height: 85, cockTilt: -50, cockUp: 150, returnMs: 700 },
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

// Where an arm's elbow is, for its shoulder and the wrist it reaches for (each { x, y }): the arm
// bends at the elbow, its bones `upper` and `fore` long. Like a real elbow, it bends one way only:
// out (to its side `out`: -1 left, 1 right) when the arm reaches up, down when it reaches out level,
// in under his shoulder (tucked behind his body) when it reaches down. So it never flips from one
// side to the other. A wrist beyond reach is pulled in, the arm straight. Returns the elbow and the
// wrist.
export function armPose(shoulder, wrist, { upper, fore }, out) {
  const dx = wrist.x - shoulder.x, dy = wrist.y - shoulder.y;
  const reach = upper + fore - 0.001;
  let d = Math.hypot(dx, dy);
  const w = d > reach ? { x: shoulder.x + (dx / d) * reach, y: shoulder.y + (dy / d) * reach } : { ...wrist };
  d = Math.min(Math.max(d, Math.abs(upper - fore) + 0.001), reach);
  // The elbow's angle off the shoulder-to-wrist line (the law of cosines), on its one side.
  const along = Math.atan2(w.y - shoulder.y, w.x - shoulder.x);
  const bend = Math.acos(Math.min(1, Math.max(-1, (upper * upper + d * d - fore * fore) / (2 * upper * d))));
  const a = along + out * bend;
  return { elbow: { x: shoulder.x + Math.cos(a) * upper, y: shoulder.y + Math.sin(a) * upper }, wrist: w };
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

// A whole arm: from its shoulder to a fist whose middle should be at `goal`, pointing as near
// `angle` as its wrist lets it. The forearm and fist make one long bone, bent at the wrist, and the
// elbow fills in (armPose). The wrist bends at most `wristBend` (radians) off the forearm's line to
// point the fist; and more, up to WRIST_MOST, only when the fist must come in close to the
// shoulder, folding it back as an arm does. A fist beyond reach comes as near as it can.
// lengths: { upper, fore, fist } (px, the fist's from its cuff to its middle). Returns the elbow,
// the wrist, the fist's middle and the way the fist points.
export function armReach(socket, goal, angle, lengths, out, wristBend = Math.PI / 4) {
  const { upper, fore, fist } = lengths;
  const longFor = (b) => Math.sqrt(fore * fore + fist * fist + 2 * fore * fist * Math.cos(b));
  const offFor = (b) => Math.atan2(fist * Math.sin(b), fore + fist * Math.cos(b));
  // The longest the forearm and fist can be, bent, for the elbow to bend comfortably.
  const d = Math.hypot(goal.x - socket.x, goal.y - socket.y);
  const roomy = d + upper * (1 - WRIST_ROOM);
  let bendAt = 0, pose, forearm = angle;
  const solve = () => {
    pose = armPose(socket, goal, { upper, fore: longFor(bendAt) }, out);
    forearm = Math.atan2(pose.wrist.y - pose.elbow.y, pose.wrist.x - pose.elbow.x) - offFor(bendAt);
  };
  for (let pass = 0; pass < 4; pass++) {
    solve();
    bendAt = Math.max(-wristBend, Math.min(wristBend, turnBetween(forearm, angle)));
    if (longFor(bendAt) > roomy) {
      // Too long to fit: fold the wrist further, the way the fist wants to turn.
      const fold = Math.min(WRIST_MOST, Math.acos(Math.max(-1, Math.min(1, (roomy * roomy - fore * fore - fist * fist) / (2 * fore * fist)))));
      bendAt = (turnBetween(forearm, angle) >= 0 ? 1 : -1) * Math.max(Math.abs(bendAt), fold);
    }
  }
  solve();
  const { elbow } = pose;
  const wrist = { x: elbow.x + Math.cos(forearm) * fore, y: elbow.y + Math.sin(forearm) * fore };
  const pointing = forearm + bendAt;
  return { elbow, wrist, fist: { x: wrist.x + Math.cos(pointing) * fist, y: wrist.y + Math.sin(pointing) * fist }, angle: pointing };
}
const WRIST_MOST = (115 * Math.PI) / 180; // the most a wrist folds, to bring the fist in close
const WRIST_ROOM = 0.3; // how far from fully folded (a share of the upper arm) the elbow stays

// An arm piece's joints in its drawing: its root (the joint it turns at, as shares of the picture)
// and the way from its root to its end (px, at `scale`), for the right-pointing drawing (dir 1) or
// the left (-1). size: the right-pointing picture's { w, h }.
export function pieceJoints(name, size, scale, dir, joints = RB_JOINTS) {
  const { root, end } = joints[name];
  const x = dir > 0 ? root.x : 1 - root.x;
  const v = { x: (end.x - root.x) * size.w * scale * dir, y: (end.y - root.y) * size.h * scale };
  return { root: { x, y: root.y }, v, length: Math.hypot(v.x, v.y), angle: Math.atan2(v.y, v.x) };
}

// The turn (radians) from angle a to angle b, the short way round.
export const turnBetween = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Which drawing a piece pointing `angle` uses: the right-pointing one (1) or the left (-1). It keeps
// the one it has (`now`) until it's turned `swapAt` past straight up or down, so it doesn't flicker.
export function pieceSide(angle, now, swapAt) {
  const c = Math.cos(angle);
  if (now > 0 ? c < -swapAt : c > swapAt) return -now;
  return now;
}

// Every piece of one arm, laid out for a fist whose middle should be at `goal`, pointing as near
// `angle` as its wrist lets it (armReach).
//   mount: where its shoulder turns (the green ring on his body); side: the arm's side (-1 left,
//   1 right); sizes: each piece's right-pointing picture { w, h }; sides: the drawing each piece
//   used last time ({ shoulder, upper, fore, fist }: -1 or 1), so they swap without flicker.
// The shoulder and the upper arm are one stiff bone, like a shoulder guard over the arm. Returns, for
// each piece, which drawing it uses (side), the joint it turns at (origin, shares of its picture),
// where that joint is (x, y) and its turn (rotation, radians); where the fist's middle ended up
// (fistAt) and the way it points (angle); and the bones' lengths.
export function layArm({ mount, side, goal, angle, sizes, sides, arm = ROOTBREAKER.arm }) {
  const { scale, swapAt, wristBend } = arm;
  const length = (name) => pieceJoints(name, sizes[name], scale, 1).length;
  const lengths = { shoulder: length('shoulder'), upper: length('shoulder') + length('upper'), fore: length('fore'), fist: length('fist') };
  const reach = armReach(mount, goal, angle, lengths, side, (wristBend * Math.PI) / 180);
  const piece = (name, from, a) => {
    const drawing = pieceSide(a, sides?.[name] ?? side, swapAt);
    const j = pieceJoints(name, sizes[name], scale, drawing);
    return { side: drawing, origin: j.root, x: from.x, y: from.y, rotation: a - j.angle };
  };
  const along = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
  const upperAngle = along(mount, reach.elbow);
  const socket = { x: mount.x + Math.cos(upperAngle) * lengths.shoulder, y: mount.y + Math.sin(upperAngle) * lengths.shoulder };
  return {
    shoulder: piece('shoulder', mount, upperAngle),
    upper: piece('upper', socket, upperAngle),
    fore: piece('fore', reach.elbow, along(reach.elbow, reach.wrist)),
    fist: piece('fist', reach.wrist, reach.angle),
    fistAt: reach.fist,
    angle: reach.angle, // the way the fist points
    lengths,
  };
}

// The box round a fist's big block (world px), for a fist whose middle is at `at`, pointing `angle`:
// what it hits with and what's stood on. size: its picture { w, h }.
export function fistBox(at, angle, size, scale = ROOTBREAKER.arm.scale, block = RB_FIST_BLOCK) {
  const along = (block.x1 - block.x0) * size.w * scale / 2, across = (block.y1 - block.y0) * size.h * scale / 2;
  const back = ((block.x0 + block.x1) / 2 - RB_JOINTS.fist.end.x) * size.w * scale; // its middle, from the fist's
  const c = Math.cos(angle), s = Math.sin(angle);
  const x = at.x + c * back, y = at.y + s * back;
  const hw = Math.abs(c) * along + Math.abs(s) * across, hh = Math.abs(s) * along + Math.abs(c) * across;
  return { x, y, left: x - hw, right: x + hw, top: y - hh, bottom: y + hh };
}
