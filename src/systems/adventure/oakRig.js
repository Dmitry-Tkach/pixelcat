// The Walking Oak as a cut-out puppet (the Autumn world's boss: prompts/autumn-level/hollow-oak/03):
// ONE drawing of each of its parts (tools/cut-oak-parts.mjs cuts them and measures their joints),
// moved smoothly every screen frame, as Rayman Legends moves its big bosses. Strips of whole frames
// drawn by ChatGPT jerked: it redraws every leaf a little differently in each frame.
// Plain code, no Phaser: oakPose works out where every part goes at a moment of a move; the game
// (and the preview page, src/pages/oakPreview.js) draws them.
//
// Its skeleton: two legs (a thigh and a lower leg each) under its hips; its trunk on its hips; its
// head on the trunk's neck, its crown on the head; two arms (an upper arm and a forearm each) at the
// trunk's shoulders. The back arm and leg are the same pictures as the front ones, a little darker.
// Every limb part is placed by its joint (its `start` pivot), turned so it points where the move
// says; the next part hangs from its other end (its `end` pivot). Its feet are kept on the ground:
// its hips sit as high as its longer-reaching leg allows.
//
// Angles in a move are in degrees: 0 is a limb hanging straight down; a positive swing turns it
// forwards (the way the oak faces, to the right). A knee's bend sends the foot back; an elbow's bend
// brings the forearm forwards. lean: its trunk tipping forwards; tilt: its head on its neck; sway: its
// crown on its head.

// How the parts sit together (px, in the parts' drawn size). legGap: between its two hips. stretch:
// how long its arms and legs are against their drawings, and how big its crown and head (the preview's
// sliders; never past what keeps them under their drawn size in the game). shade: how dark its back
// arm and leg are.
export const OAK_RIG = {
  legGap: 80,
  arms: 1, legs: 1, crown: 1.25, head: 0.92,
  shade: { arm: 0.7, leg: 0.78 },
};

// The order the parts are drawn in, back to front.
const ORDER = ['backArm', 'backLeg', 'frontLeg', 'trunk', 'crown', 'head', 'frontArm'];

const rad = (deg) => (deg * Math.PI) / 180;
const turn = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

// A value through a move's keys ([[second, value], ...]), eased between them; held past the last.
export function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

// Its moves: each a pose at a moment (seconds since it began), and how long one takes (loop: it
// repeats). A pose: face (which head), lean, tilt, sway, breath (its trunk a little taller), the
// swing and bend of each arm and leg, fist (its claws closed), flash (it's hit).
const wave = (t, period, phase = 0) => Math.sin(((t / period) + phase) * Math.PI * 2);
export const OAK_MOVES = {
  asleep: {
    loop: 2.6,
    pose: (t) => ({
      face: 'asleep', lean: -2, tilt: 7 + wave(t, 2.6) * 1.5, sway: wave(t, 4.1) * 1.5, breath: wave(t, 2.6) * 0.015,
      arms: { back: [4, 8], front: [6 + wave(t, 2.6, 0.2) * 2, 10] }, legs: { back: [-4, 2], front: [5, 2] },
    }),
  },
  idle: {
    loop: 1.6,
    pose: (t) => ({
      face: 'awake', lean: 5, tilt: 0, sway: wave(t, 3.2) * 2, breath: wave(t, 1.6) * 0.02,
      arms: { back: [22 + wave(t, 1.6) * 3, 40], front: [28 + wave(t, 1.6, 0.25) * 4, 45] }, legs: { back: [-14, 10], front: [16, 10] },
    }),
  },
  wake: {
    loop: 2.6,
    pose: (t) => ({
      face: t < 0.8 ? 'asleep' : t < 1.15 ? 'awake' : t < 1.9 ? 'roar' : 'awake',
      lean: keyed([[0, -2], [0.8, -2], [1.15, 0], [1.4, -8], [1.9, -6], [2.3, 14]], t),
      tilt: keyed([[0, 7], [0.8, 7], [1.15, -2], [1.9, -4], [2.3, 2]], t),
      sway: keyed([[0, 0], [1.2, 0], [1.4, 6], [1.6, -5], [1.9, 3], [2.3, 0]], t), breath: keyed([[0, 0], [1.2, 0], [1.4, 0.03], [2.3, 0]], t),
      arms: {
        back: [keyed([[0, 4], [1.15, 10], [1.45, 150], [1.9, 145], [2.3, 30]], t), keyed([[0, 8], [1.45, 20], [2.3, 45]], t)],
        front: [keyed([[0, 6], [1.15, 12], [1.45, 160], [1.9, 155], [2.3, 35]], t), keyed([[0, 10], [1.45, 20], [2.3, 50]], t)],
      },
      legs: { back: [keyed([[0, -4], [2.3, -16]], t), keyed([[0, 2], [2.3, 24]], t)], front: [keyed([[0, 5], [2.3, 18]], t), keyed([[0, 2], [2.3, 24]], t)] },
    }),
  },
  run: {
    loop: 0.72,
    pose: (t) => {
      const s = wave(t, 0.72), c = wave(t, 0.72, 0.25);
      return {
        face: 'roar', lean: 14 + c * 2, tilt: -3, sway: wave(t, 0.36, -0.15) * 3, breath: 0,
        arms: { back: [20 + s * 38, 45 - s * 10], front: [20 - s * 38, 45 + s * 10] },
        // A leg swings forwards and back; its knee bends most as it passes under, lifting its foot.
        legs: { back: [-s * 34, 18 + Math.max(0, -c) * 50], front: [s * 34, 18 + Math.max(0, c) * 50] },
        bob: Math.abs(c) * -10,
      };
    },
  },
  swipe: {
    loop: 1.2,
    pose: (t) => ({
      face: t < 0.42 ? 'awake' : t < 0.8 ? 'roar' : 'awake',
      lean: keyed([[0, 5], [0.42, -8], [0.55, 16], [0.8, 14], [1.2, 5]], t), tilt: keyed([[0, 0], [0.42, -4], [0.55, 4], [1.2, 0]], t),
      sway: keyed([[0, 0], [0.42, -4], [0.6, 8], [0.85, -3], [1.2, 0]], t), breath: 0,
      arms: {
        back: [22, 40],
        // The wind-up held (the warning), then the strike snapping through, then back.
        front: [keyed([[0, 28], [0.3, -75], [0.42, -78], [0.55, 115], [0.8, 125], [1.2, 28]], t), keyed([[0, 45], [0.42, 70], [0.55, 5], [0.8, 10], [1.2, 45]], t)],
      },
      legs: { back: [-16, 12], front: [keyed([[0, 16], [0.5, 26], [1.2, 16]], t), 12] },
    }),
  },
  slam: {
    loop: 1.8,
    pose: (t) => ({
      face: t < 0.5 ? 'roar' : t < 0.75 ? 'roar' : 'awake', fist: true,
      lean: keyed([[0, 5], [0.45, -10], [0.55, -10], [0.68, 30], [1.8, 30]], t), tilt: keyed([[0, 0], [0.45, -6], [0.7, 8], [1.8, 8]], t),
      sway: keyed([[0, 0], [0.5, -4], [0.7, 9], [0.9, -3], [1.1, 0]], t), breath: 0,
      arms: {
        back: [keyed([[0, 22], [0.45, 165], [0.55, 168], [0.68, 55], [1.8, 55]], t), keyed([[0, 40], [0.45, 10], [0.68, 40], [1.8, 40]], t)],
        front: [keyed([[0, 28], [0.45, 170], [0.55, 172], [0.68, 60], [1.8, 60]], t), keyed([[0, 45], [0.45, 10], [0.68, 40], [1.8, 40]], t)],
      },
      legs: { back: [-20, 30], front: [22, 30] },
    }),
  },
  stuck: {
    loop: 1.4,
    pose: (t) => ({
      face: wave(t, 1.4) > 0.3 ? 'hurt' : 'awake', fist: true,
      lean: 30 + wave(t, 0.35) * 2, tilt: 8, sway: wave(t, 0.35) * 3, breath: wave(t, 0.7) * 0.02,
      arms: { back: [55 + wave(t, 0.35) * 4, 40], front: [60 + wave(t, 0.35, 0.5) * 4, 40] },
      legs: { back: [-20, 30], front: [22, 30] },
    }),
  },
  dizzy: {
    loop: 1.8,
    pose: (t) => ({
      face: 'dizzy', lean: wave(t, 1.8) * 7, tilt: wave(t, 0.9) * 9, sway: wave(t, 1.8, 0.3) * 6, breath: 0,
      arms: { back: [8 + wave(t, 1.8) * 10, 15], front: [10 - wave(t, 1.8) * 10, 15] }, legs: { back: [-10, 8], front: [10, 8] },
    }),
  },
  hurt: {
    loop: 0.6,
    pose: (t) => ({
      face: 'hurt', flash: keyed([[0, 1], [0.15, 0.6], [0.3, 0]], t),
      lean: keyed([[0, 5], [0.12, -14], [0.6, 5]], t), tilt: keyed([[0, 0], [0.12, -8], [0.6, 0]], t), sway: keyed([[0, 0], [0.12, -8], [0.35, 5], [0.6, 0]], t), breath: 0,
      arms: { back: [keyed([[0, 22], [0.12, -10], [0.6, 22]], t), 40], front: [keyed([[0, 28], [0.12, -15], [0.6, 28]], t), 45] }, legs: { back: [-14, 10], front: [16, 10] },
    }),
  },
};

// Where every part goes for a pose: a list, back to front, of { part, x, y, rotation, scaleX, scaleY,
// shade, flash, pivot } (px and radians, its pivot on (x, y): draw the part's picture turned by
// rotation about its pivot). Origin: the ground under its hips. parts: the parts' sizes and pivots
// (parts.json). rig: OAK_RIG, or its sliders' values.
export function oakPose(parts, pose, rig = OAK_RIG) {
  const P = (name) => parts[name];
  // A limb part placed at its joint, pointing `deg` from straight down (forwards positive), stretched
  // along its length: where it goes, and where its far joint is.
  const limb = (name, joint, deg, stretch) => {
    const { start, end } = P(name).pivots;
    const along = Math.atan2(end.y - start.y, end.x - start.x);
    const rotation = rad(90 - deg) - along;
    const lengthwise = Math.abs(Math.cos(along)) > Math.abs(Math.sin(along)); // drawn lying (an arm's)
    const scaleX = lengthwise ? stretch : 1, scaleY = lengthwise ? 1 : stretch;
    const far = turn((end.x - start.x) * scaleX, (end.y - start.y) * scaleY, rotation);
    return { place: { part: name, x: joint.x, y: joint.y, rotation, scaleX, scaleY, pivot: start }, end: { x: joint.x + far.x, y: joint.y + far.y } };
  };
  // Its legs from its hips (at 0, 0 for now), then its hips lifted so its lower foot is on the ground.
  const legsOf = (side, hipX) => {
    const [swing, bend] = pose.legs[side];
    const thigh = limb('thigh', { x: hipX, y: 0 }, swing, rig.legs);
    const lower = limb('lower-leg', thigh.end, swing - bend, rig.legs);
    return { parts: [thigh.place, lower.place], foot: lower.end.y };
  };
  const back = legsOf('back', -rig.legGap / 2), front = legsOf('front', rig.legGap / 2);
  const lift = -Math.max(back.foot, front.foot) + (pose.bob ?? 0);
  for (const p of [...back.parts, ...front.parts]) p.y += lift;
  const hips = { x: 0, y: lift };
  // Its trunk on its hips, leaning, breathing (a little taller); its shoulders and neck with it.
  const trunk = P('trunk');
  const lean = rad(pose.lean);
  const breath = 1 + (pose.breath ?? 0);
  const onTrunk = (pv) => {
    const v = turn(pv.x - trunk.pivots.hips.x, (pv.y - trunk.pivots.hips.y) * breath, lean);
    return { x: hips.x + v.x, y: hips.y + v.y };
  };
  const trunkPlace = { part: 'trunk', x: hips.x, y: hips.y, rotation: lean, scaleX: 1, scaleY: breath, pivot: trunk.pivots.hips };
  // Its head on its neck, its crown on its head.
  const face = `head-${pose.face}`;
  const head = P(face);
  const neck = onTrunk(trunk.pivots.neck);
  const headTurn = lean + rad(pose.tilt ?? 0);
  const headPlace = { part: face, x: neck.x, y: neck.y, rotation: headTurn, scaleX: rig.head, scaleY: rig.head, pivot: head.pivots.bottom };
  const top = turn((head.pivots.top.x - head.pivots.bottom.x) * rig.head, (head.pivots.top.y - head.pivots.bottom.y) * rig.head, headTurn);
  const crownPlace = { part: 'crown', x: neck.x + top.x, y: neck.y + top.y, rotation: headTurn + rad(pose.sway ?? 0), scaleX: rig.crown, scaleY: rig.crown, pivot: P('crown').pivots.bottom };
  // Its arms from its shoulders, turning with its lean.
  const armOf = (side, shoulderPivot) => {
    const [swing, bend] = pose.arms[side];
    const upper = limb('upper-arm', onTrunk(shoulderPivot), swing + pose.lean, rig.arms);
    const fore = limb(pose.fist ? 'forearm-fist' : 'forearm-open', upper.end, swing + pose.lean + bend, rig.arms);
    return [upper.place, fore.place];
  };
  const placed = {
    backArm: armOf('back', trunk.pivots.shoulderBack).map((p) => ({ ...p, shade: rig.shade.arm })),
    backLeg: back.parts.map((p) => ({ ...p, shade: rig.shade.leg })),
    frontLeg: front.parts,
    trunk: [trunkPlace], crown: [crownPlace], head: [headPlace],
    frontArm: armOf('front', trunk.pivots.shoulderFront),
  };
  const flash = pose.flash ?? 0;
  return ORDER.flatMap((group) => placed[group]).map((p) => ({ shade: 1, ...p, flash }));
}

// How tall it stands (px, in its parts' drawn size), from the ground to its crown's top: to scale it
// to its size in the game.
export function oakHeight(parts, rig = OAK_RIG) {
  const pose = OAK_MOVES.idle.pose(0);
  const crown = oakPose(parts, pose, rig).find((p) => p.part === 'crown');
  const c = parts.crown;
  return -(crown.y - (c.pivots.bottom.y - c.pivots.top.y) * rig.crown);
}
