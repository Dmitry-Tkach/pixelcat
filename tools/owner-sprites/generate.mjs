// Generates the owner character's animation frames as transparent PNGs.
// Run: node generate.mjs
// Output: images/sprites/owner/<Anim> (<n>).png, plus sheet.png for review.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(ROOT, 'images', 'sprites', 'owner');

const WITH_CARRIER = true; // set to false to draw her without the pet carrier

const SIZE = 900;
const GROUND = 862;
const HIP_X = 400;

const INK = '#3A2A28';
const SKIN = { base: '#EDB48F', core: '#FBD9BF' };
const SKIN_FAR = { base: '#D99C78', core: '#E6B08D' };
const SHORTS = { base: '#3BA88A', core: '#7FE0BD' };
const SHORTS_FAR = { base: '#2F8C72', core: '#55BD9D' };
const TEE = { base: '#CFD6DE', core: '#FFFFFF' };
const TEE_FAR = { base: '#AEB7C2', core: '#D9DFE6' };

const THIGH = 150, SHIN = 135, UPPER_ARM = 88, FOREARM = 85;
const rad = (d) => (d * Math.PI) / 180;
const n = (v) => Number(v.toFixed(2));
const lerp = (a, b, t) => a + (b - a) * t;
let uid = 0;

// Angles: 0 points straight down, positive swings forward (toward +x).
const fk = (p, a, len) => [p[0] + Math.sin(rad(a)) * len, p[1] + Math.cos(rad(a)) * len];

// A tapered shape: circles joined by quads, so widths can change along a limb.
function taper(joints, grow = 0, dx = 0, dy = 0, capStart = true, capEnd = true) {
  let out = '';
  joints.forEach(([x, y, r], i) => {
    const cap = (i > 0 && i < joints.length - 1) || (i === 0 && capStart) || (i === joints.length - 1 && capEnd);
    if (cap) out += `<circle cx="${n(x + dx)}" cy="${n(y + dy)}" r="${n(Math.max(1, r + grow))}"/>`;
    if (i === 0) return;
    const [px, py, pr] = joints[i - 1];
    const len = Math.hypot(x - px, y - py) || 1;
    const nx = -(y - py) / len, ny = (x - px) / len;
    const a = pr + grow, b = r + grow;
    out += `<polygon points="${n(px + nx * a + dx)},${n(py + ny * a + dy)} ${n(x + nx * b + dx)},${n(y + ny * b + dy)} ${n(x - nx * b + dx)},${n(y - ny * b + dy)} ${n(px - nx * a + dx)},${n(py - ny * a + dy)}"/>`;
  });
  return out;
}
function limb(joints, tone, capEnd = true) {
  const inner = joints.map(([x, y, r]) => [x, y, r * 0.68]);
  return `<g fill="${INK}">${taper(joints, 3, 0, 0, true, capEnd)}</g>
    <g fill="${tone.base}">${taper(joints, 0, 0, 0, true, capEnd)}</g>
    <g fill="${tone.core}">${taper(inner, 0, -2.5, -3, true, capEnd)}</g>`;
}

function sneaker(ankle, rot) {
  return `<g transform="translate(${n(ankle[0])} ${n(ankle[1])}) rotate(${n(rot)}) translate(0 26)" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
    <path d="M-22 -18 L18 -22 C30 -8 58 0 72 18 C76 28 72 36 66 38 L-30 38 C-34 20 -30 -2 -22 -18 Z" fill="url(#shoe)"/>
    <path d="M-31 26 L74 26 C76 32 72 40 66 40 L-30 40 C-32 36 -32 30 -31 26 Z" fill="#FFFFFF"/>
    <path d="M14 -10 L28 -2 M24 -4 L38 4 M34 2 L48 10" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M-24 -16 L12 -20 L14 -12 L-26 -8 Z" fill="#FFFFFF"/>
  </g>`;
}

function hand(wrist, foreA, type) {
  const c = fk(wrist, foreA, 16);
  const rot = 90 - foreA;
  if (type === 'open') {
    return `<g transform="translate(${n(c[0])} ${n(c[1])}) rotate(${n(rot)})" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
      <path d="M2 -12 C8 -24 18 -30 24 -26 C27 -22 20 -16 12 -9 Z" fill="url(#skin)"/>
      <path d="M-14 -12 C-2 -15 8 -14 14 -12 L40 -14 C45 -13 45 -7 40 -6 L18 -5 L42 -3 C47 -2 47 4 42 5 L18 4 L38 8 C43 9 42 15 37 14 L10 12 C0 16 -10 15 -15 10 Z" fill="url(#skin)"/>
    </g>`;
  }
  return `<g transform="translate(${n(c[0])} ${n(c[1])}) rotate(${n(rot)})" stroke="${INK}" stroke-width="3" stroke-linejoin="round">
    <path d="M-16 -13 C-4 -19 14 -18 19 -8 C23 2 19 14 8 17 C-4 19 -16 12 -18 2 Z" fill="url(#skin)"/>
    <path d="M6 -16 L8 -4 M14 -12 L14 -2 M-2 -17 L1 -6" fill="none" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M-10 4 C-2 0 8 2 12 8" fill="none" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}

function arm(shoulder, { a, el, hand: handType = 'fist' }, tone, sleeveTone) {
  const elbow = fk(shoulder, a, UPPER_ARM);
  const foreA = a + el;
  const wrist = fk(elbow, foreA, FOREARM);
  const sleeveEnd = fk(shoulder, a, 50);
  return {
    wrist,
    svg:
      limb([[...shoulder, 19], [...elbow, 15], [...wrist, 11]], tone) +
      hand(wrist, foreA, handType) +
      limb([[...shoulder, 23], [...sleeveEnd, 20]], sleeveTone, false),
  };
}

function leg(hip, { a, bend }, tone, shortsTone) {
  const knee = fk(hip, a, THIGH);
  const shinA = a - bend;
  const ankle = fk(knee, shinA, SHIN);
  const calf = fk(fk(knee, shinA, SHIN * 0.32), shinA - 90, 7);
  const hem = fk(hip, a, THIGH * 0.52);
  return {
    ankle,
    shinA,
    svg:
      limb([[...hip, 37], [...knee, 23], [...calf, 23], [...ankle, 13]], tone),
    shorts: limb([[...hip, 40], [...hem, 34]], shortsTone, false),
  };
}

function carrier(p, rot) {
  const id = `c${uid++}`;
  return `<g transform="translate(${n(p[0])} ${n(p[1])}) rotate(${n(rot)})" stroke="${INK}" stroke-linejoin="round">
    <path d="M-26 22 C-26 -8 26 -8 26 22" fill="none" stroke-width="12" stroke-linecap="round"/>
    <path d="M-26 22 C-26 -8 26 -8 26 22" fill="none" stroke="#1C74B2" stroke-width="5" stroke-linecap="round"/>
    <clipPath id="${id}"><rect x="-68" y="18" width="136" height="94" rx="16"/></clipPath>
    <rect x="-68" y="18" width="136" height="94" rx="16" fill="#2F9EDF" stroke-width="3.5"/>
    <g clip-path="url(#${id})" stroke="none"><rect x="-68" y="94" width="136" height="20" fill="#1C74B2"/></g>
    <rect x="-8" y="34" width="60" height="54" rx="8" fill="#123E5E" stroke-width="3"/>
    <path d="M8 36 L8 86 M23 36 L23 86 M38 36 L38 86" stroke="#E8F4FB" stroke-width="4" fill="none"/>
    <g transform="translate(-36 58)" fill="#E8F4FB" stroke="none">
      <ellipse cx="0" cy="6" rx="11" ry="9"/>
      <circle cx="-11" cy="-6" r="4.2"/><circle cx="-3" cy="-11" r="4.2"/>
      <circle cx="4" cy="-11" r="4.2"/><circle cx="12" cy="-6" r="4.2"/>
    </g>
  </g>`;
}

// Hair: two matching outlines, one streaming and one hanging, blended by `flow`.
const HAIR_START = [446, 132];
const HAIR_STREAM = [
  [442, 90], [396, 64], [350, 76],
  [300, 56], [240, 44], [160, 62],
  [200, 76], [222, 88], [238, 102],
  [196, 98], [146, 108], [100, 140],
  [160, 134], [208, 140], [240, 152],
  [204, 166], [172, 192], [154, 226],
  [204, 196], [250, 190], [286, 196],
  [302, 216], [326, 226], [352, 226],
  [346, 200], [352, 170], [374, 152],
  [402, 136], [426, 142], [446, 132],
];
const HAIR_HANG = [
  [442, 90], [396, 64], [350, 76],
  [306, 88], [288, 190], [276, 310],
  [286, 280], [296, 258], [304, 240],
  [296, 280], [290, 340], [296, 380],
  [312, 340], [322, 296], [328, 256],
  [326, 290], [330, 330], [344, 362],
  [350, 320], [354, 280], [354, 246],
  [354, 240], [354, 232], [352, 226],
  [346, 200], [352, 170], [374, 152],
  [402, 136], [426, 142], [446, 132],
];
const STREAKS_STREAM = [
  { w: 7, c: '#FBC58B', p: [[430, 110], [380, 84], [300, 80], [214, 72]] },
  { w: 5, c: '#FBC58B', p: [[390, 122], [330, 108], [260, 112], [150, 128]] },
  { w: 9, c: '#C94F1E', p: [[360, 170], [320, 150], [280, 150], [240, 168]] },
  { w: 9, c: '#C94F1E', p: [[352, 210], [320, 200], [280, 186], [214, 196]] },
  { w: 6, c: '#C94F1E', p: [[408, 136], [370, 130], [330, 128], [290, 134]] },
];
const STREAKS_HANG = [
  { w: 7, c: '#FBC58B', p: [[430, 104], [384, 80], [330, 92], [312, 170]] },
  { w: 5, c: '#FBC58B', p: [[396, 116], [350, 110], [322, 190], [306, 300]] },
  { w: 9, c: '#C94F1E', p: [[350, 180], [336, 220], [320, 270], [312, 340]] },
  { w: 9, c: '#C94F1E', p: [[350, 214], [342, 250], [338, 290], [338, 340]] },
  { w: 6, c: '#C94F1E', p: [[408, 134], [372, 128], [344, 136], [330, 170]] },
];

function hairBlock(flow, phase, amp) {
  // The wave grows with distance from the head, so tips move most.
  const wave = ([x, y], i) => {
    const dist = Math.max(0, 350 - x) / 240;
    return [x, y + amp * dist * Math.sin(phase + i * 0.55 + dist * 2.4)];
  };
  const pts = HAIR_STREAM.map((s, i) => {
    const h = HAIR_HANG[i];
    return wave([lerp(h[0], s[0], flow), lerp(h[1], s[1], flow)], i);
  });
  let d = `M${HAIR_START[0]} ${HAIR_START[1]}`;
  for (let i = 0; i < pts.length; i += 3) {
    d += ` C${n(pts[i][0])} ${n(pts[i][1])} ${n(pts[i + 1][0])} ${n(pts[i + 1][1])} ${n(pts[i + 2][0])} ${n(pts[i + 2][1])}`;
  }
  const id = `h${uid++}`;
  const streaks = STREAKS_STREAM.map((s, i) => {
    const h = STREAKS_HANG[i];
    const p = s.p.map((q, j) => wave([lerp(h.p[j][0], q[0], flow), lerp(h.p[j][1], q[1], flow)], j * 3));
    return `<path d="M${n(p[0][0])} ${n(p[0][1])} C${n(p[1][0])} ${n(p[1][1])} ${n(p[2][0])} ${n(p[2][1])} ${n(p[3][0])} ${n(p[3][1])}" stroke="${s.c}" stroke-width="${s.w}"/>`;
  }).join('');
  return `<clipPath id="${id}"><path d="${d}"/></clipPath>
    <path d="${d}" fill="url(#hair)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <g clip-path="url(#${id})" fill="none" stroke-linecap="round">${streaks}</g>`;
}

const BROWS = {
  calm: 'M404 136 Q420 128 439 138',
  angry: 'M404 128 Q422 134 440 148',
  happy: 'M404 132 Q420 120 439 132',
};
const EYES = {
  open: `<path d="M407 158 Q421 145 437 155 Q426 167 408 160 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="426" cy="156" r="7" fill="#2E9E7E"/><circle cx="427" cy="156" r="3.5" fill="#1B1412"/><circle cx="429" cy="153" r="1.8" fill="#FFFFFF"/>
    <path d="M405 158 Q420 142 439 154" fill="none" stroke="#1B1412" stroke-width="4.5" stroke-linecap="round"/>`,
  closed: '<path d="M406 158 Q421 166 438 156" fill="none" stroke="#1B1412" stroke-width="4.5" stroke-linecap="round"/>',
  happy: '<path d="M406 160 Q421 144 438 158" fill="none" stroke="#1B1412" stroke-width="5" stroke-linecap="round"/>',
  narrow: `<path d="M407 158 Q421 151 437 155 Q426 167 408 160 Z" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="426" cy="158" r="6" fill="#2E9E7E"/><circle cx="427" cy="158" r="3.2" fill="#1B1412"/>
    <path d="M405 158 Q420 149 439 154" fill="none" stroke="#1B1412" stroke-width="5" stroke-linecap="round"/>`,
};
const MOUTHS = {
  open: `<path d="M443 207 Q432 211 426 207 Q428 224 442 220 Z" fill="#7A2230" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
  shout: `<path d="M444 203 Q430 208 420 203 Q420 230 441 227 Z" fill="#7A2230" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M442 205 Q431 209 423 205 L424 210 Q432 213 442 210 Z" fill="#FFFFFF"/>`,
  grin: `<path d="M445 204 Q426 212 412 200 Q416 230 442 226 Z" fill="#7A2230" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M443 206 Q426 213 416 204 L418 211 Q430 219 443 212 Z" fill="#FFFFFF"/>`,
  smile: `<path d="M444 212 Q432 218 422 208" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
  frown: `<path d="M444 218 Q432 208 422 216" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
};

function headGroup(face, tilt, dy) {
  return `<g transform="translate(0 ${n(dy)}) rotate(${n(tilt)} 365 235)">
    <path d="M375 103 C410 100 440 125 444 152 C446 165 460 180 463 188 C460 196 449 195 445 197 C449 205 448 212 444 216 C447 224 443 232 438 238 C428 250 405 248 390 240 C370 232 350 215 342 190 C330 150 340 110 375 103 Z" fill="url(#skin)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M352 196 C366 224 392 240 424 240 C410 248 384 240 368 228 C358 220 354 208 352 196 Z" fill="#E3A581"/>
    <ellipse cx="412" cy="192" rx="17" ry="10" fill="#F58C8C" opacity="0.4"/>
    ${EYES[face.eye]}
    <path d="${BROWS[face.brow]}" fill="none" stroke="#A9441C" stroke-width="5.5" stroke-linecap="round"/>
    ${MOUTHS[face.mouth]}
    ${hairBlock(face.flow, face.phase ?? 0, face.amp ?? 0)}
    <path d="M446 132 C440 150 428 148 416 138 C424 146 420 150 412 146 C404 142 400 136 396 130" fill="url(#hair)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M368 170 C360 168 354 176 358 186 C362 196 372 198 378 192 C382 182 378 172 368 170 Z" fill="url(#skin)" stroke="${INK}" stroke-width="3"/>
    ${face.sweat != null ? `<path d="M452 112 C464 132 468 142 458 150 C446 156 436 146 440 134 Z" fill="#8FDBFF" stroke="${INK}" stroke-width="3" transform="translate(0 ${n(face.sweat)})"/>` : ''}
  </g>`;
}

function character(pose) {
  const lean = pose.lean ?? 0;
  const hipX = HIP_X + (pose.shiftX ?? 0);

  const near = leg([20, 10], pose.legs[0], SKIN, SHORTS);
  const far = leg([-16, 10], pose.legs[1], SKIN_FAR, SHORTS_FAR);
  const lowest = Math.max(near.ankle[1], far.ankle[1]);
  const nearDown = near.ankle[1] >= lowest - 14;
  const farDown = far.ankle[1] >= lowest - 14;
  const hipY = GROUND - 66 - lowest - (pose.lift ?? 0);

  const footRot = (l, onGround) => {
    const rot = -l.shinA * 0.95;
    return onGround ? Math.max(-8, Math.min(8, rot)) : rot;
  };

  const shoulderNear = [352, 280];
  const shoulderFar = [332, 278];
  const armFar = arm(shoulderFar, pose.armFar, SKIN_FAR, TEE_FAR);
  const armNear = arm(shoulderNear, pose.armNear, SKIN, TEE);
  const carrierArt = WITH_CARRIER
    ? carrier([armFar.wrist[0], armFar.wrist[1] + 8], (pose.carrierRot ?? 0) - lean)
    : '';

  const upper = (inner) => `<g transform="rotate(${n(lean)}) translate(-300 -430)">${inner}</g>`;

  return `<g transform="translate(${n(hipX)} ${n(hipY)})">
    ${upper(carrierArt + armFar.svg)}
    ${far.svg}${sneaker(far.ankle, footRot(far, farDown))}${far.shorts}
    ${near.svg}${sneaker(near.ankle, footRot(near, nearDown))}${near.shorts}
    ${upper(`
      <path d="M368 214 L392 238 L376 276 L332 262 Z" fill="#E6B08D" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M316 256 C338 240 356 244 372 256 C384 262 388 280 386 300 C380 340 362 376 350 407 L260 394 C268 350 284 292 316 256 Z" fill="url(#tee)" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M346 250 C352 268 366 272 378 264" fill="#F2C4A2" stroke="${INK}" stroke-width="3"/>
      <path d="M258 384 L352 398 L350 416 L254 402 Z" fill="#F0C33C" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      ${headGroup(pose.face, (pose.face.tilt ?? 0) - lean * 0.7, pose.headDy ?? 0)}
      ${armNear.svg}
    `)}
  </g>`;
}

const STEP = (count) => Array.from({ length: count }, (_, i) => i);
const TAU = Math.PI * 2;

const ANIMS = {
  Idle: STEP(10).map((i) => {
    const p = (i / 10) * TAU;
    const b = Math.sin(p);
    return {
      lean: -11,
      legs: [{ a: 7, bend: 8 + b * 2 }, { a: -7, bend: 6 + b * 2 }],
      armNear: { a: 6 + b * 2, el: 22 },
      armFar: { a: -22 + b, el: 6 },
      carrierRot: b * 1.5,
      headDy: b * 1.5,
      face: { eye: i === 7 ? 'closed' : 'open', brow: 'calm', mouth: 'smile', flow: 0, tilt: b, phase: p, amp: 3 },
    };
  }),

  Run: STEP(8).map((i) => {
    const p = (i / 8) * TAU;
    const stride = (ph) => ({
      a: 12 + 39 * Math.sin(ph),
      bend: 20 + 92 * Math.pow(Math.max(0, Math.cos(ph + 0.6)), 1.2),
    });
    return {
      lean: 2,
      legs: [stride(p), stride(p + Math.PI)],
      lift: 10 * Math.abs(Math.cos(p)),
      armNear: { a: 16 + 44 * Math.sin(p + Math.PI), el: 88 },
      armFar: WITH_CARRIER
        ? { a: -44 + 9 * Math.sin(p), el: 8 }
        : { a: 16 + 44 * Math.sin(p), el: 88 },
      carrierRot: 12 * Math.sin(p),
      headDy: 3 * Math.cos(2 * p),
      face: { eye: 'open', brow: 'angry', mouth: 'open', flow: 1, tilt: 2 * Math.sin(2 * p), phase: p * 2, amp: 16 },
    };
  }),

  Catch: [
    { lean: 0, l: [18, 44, -12, 40], na: 62, ne: 30, fa: -38, sx: -30, e: 'narrow', b: 'angry', m: 'open', h: 'fist', fl: 0.6 },
    { lean: 8, l: [30, 50, -24, 26], na: 78, ne: 14, fa: -46, sx: -10, e: 'narrow', b: 'angry', m: 'shout', h: 'open', fl: 0.75 },
    { lean: 16, l: [44, 56, -38, 16], na: 88, ne: 6, fa: -54, sx: 12, e: 'open', b: 'angry', m: 'shout', h: 'open', fl: 0.9 },
    { lean: 24, l: [56, 62, -50, 10], na: 96, ne: 0, fa: -60, sx: 36, e: 'open', b: 'angry', m: 'shout', h: 'open', fl: 1 },
    { lean: 28, l: [60, 66, -56, 8], na: 100, ne: 0, fa: -64, sx: 50, e: 'open', b: 'happy', m: 'grin', h: 'open', fl: 1 },
    { lean: 28, l: [60, 66, -56, 8], na: 98, ne: 14, fa: -62, sx: 54, e: 'open', b: 'happy', m: 'grin', h: 'open', fl: 0.85 },
    { lean: 25, l: [58, 64, -52, 10], na: 92, ne: 34, fa: -58, sx: 54, e: 'happy', b: 'happy', m: 'grin', h: 'fist', fl: 0.65 },
    { lean: 21, l: [54, 62, -48, 12], na: 84, ne: 52, fa: -52, sx: 52, e: 'happy', b: 'happy', m: 'grin', h: 'fist', fl: 0.45 },
  ].map((k, i) => ({
    lean: k.lean,
    shiftX: k.sx,
    legs: [{ a: k.l[0], bend: k.l[1] }, { a: k.l[2], bend: k.l[3] }],
    armNear: { a: k.na, el: k.ne, hand: k.h },
    armFar: { a: k.fa, el: 8 },
    carrierRot: 8 - i * 3,
    face: { eye: k.e, brow: k.b, mouth: k.m, flow: k.fl, phase: i * 0.9, amp: 10 },
  })),

  Frustrated: STEP(10).map((i) => {
    const p = (i / 10) * TAU;
    const stomp = Math.max(0, Math.sin(2 * p));
    return {
      lean: -8 + Math.sin(p),
      legs: [{ a: 12 + 26 * stomp, bend: 8 + 60 * stomp }, { a: -7, bend: 6 }],
      armNear: { a: 78 + 8 * Math.sin(3 * p), el: 35 },
      armFar: { a: -24, el: 4 },
      carrierRot: 3 * Math.sin(2 * p),
      headDy: stomp * 3,
      face: {
        eye: i % 5 === 4 ? 'closed' : 'narrow',
        brow: 'angry',
        mouth: i % 5 < 2 ? 'shout' : 'frown',
        flow: 0.06,
        tilt: 2 * Math.sin(p),
        phase: p * 2,
        amp: 5,
        sweat: (i * 3) % 14,
      },
    };
  }),
};

const DEFS = `<defs>
  <linearGradient id="skin" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FBD9BF"/><stop offset="1" stop-color="#EDB48F"/></linearGradient>
  <linearGradient id="hair" x1="1" y1="0" x2="0" y2="0.7"><stop offset="0" stop-color="#E2622B"/><stop offset="0.55" stop-color="#EF8240"/><stop offset="1" stop-color="#F5A55E"/></linearGradient>
  <linearGradient id="tee" x1="0.8" y1="0" x2="0.1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFD6DE"/></linearGradient>
  <linearGradient id="shorts" x1="0.9" y1="0" x2="0.1" y2="1"><stop offset="0" stop-color="#7FE0BD"/><stop offset="1" stop-color="#3BA88A"/></linearGradient>
  <linearGradient id="shoe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE06B"/><stop offset="1" stop-color="#E8A91F"/></linearGradient>
</defs>`;

const svgDoc = (inner, w = SIZE, h = SIZE) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${inner}</svg>`;

mkdirSync(OUT, { recursive: true });
for (const [name, frames] of Object.entries(ANIMS)) {
  frames.forEach((pose, i) => {
    const png = new Resvg(svgDoc(character(pose))).render().asPng();
    writeFileSync(join(OUT, `${name} (${i + 1}).png`), png);
  });
}

// Review sheet: every frame, plus the cat at the size it would appear beside her.
const CELL = 190;
const scale = CELL / SIZE;
const rows = Object.entries(ANIMS);
const catData = readFileSync(join(ROOT, 'images', 'sprites', 'cat', 'Run (4).png')).toString('base64');
let sheet = '<rect width="100%" height="100%" fill="#CFE9F7"/>';
rows.forEach(([, frames], r) => {
  frames.forEach((pose, c) => {
    sheet += `<g transform="translate(${c * CELL} ${r * CELL}) scale(${scale})">${character(pose)}</g>`;
  });
});
const compareY = rows.length * CELL;
sheet += `<g transform="translate(0 ${compareY}) scale(0.68)">${character(ANIMS.Run[1])}</g>`;
sheet += `<image href="data:image/png;base64,${catData}" x="660" y="${compareY + 390}" width="230" height="201"/>`;
writeFileSync(join(HERE, 'sheet.png'), new Resvg(svgDoc(sheet, CELL * 10, compareY + 620)).render().asPng());
console.log('Frames:', rows.map(([name, fr]) => `${name} ${fr.length}`).join(', '));
