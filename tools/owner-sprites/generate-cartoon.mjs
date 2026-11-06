// Generates the owner character's animation frames as transparent PNGs.
// Run: node generate-cartoon.mjs
// Output: images/sprites/owner-cartoon/<Anim> (<n>).png, plus sheet-cartoon.png for review.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(ROOT, 'images', 'sprites', 'owner-cartoon');

const W = 760;
const H = 760;
const GROUND = 735;
const CENTER_X = 370;

const C = {
  ink: '#111111',
  skin: '#F9CFAE', skinS: '#E8A985',
  hair: '#B5522B', hairS: '#8A3A1C', hairL: '#DB7C4A',
  dress: '#E8467C', dressS: '#BC2C60',
  apron: '#FFF8EE', apronS: '#E6D5C2',
  shoe: '#FFC531', shoeS: '#DE9A12',
  box: '#2F9EDF', boxS: '#1C74B2', boxD: '#123E5E',
  rim: '#0E7C7B',
};
const OL = 7; // outline width, matched to the cat sprites

const THIGH = 90, SHIN = 90, UPPER_ARM = 68, FOREARM = 68;
const rad = (d) => (d * Math.PI) / 180;
const f = (n) => Number(n.toFixed(2));
let uid = 0;

const shape = (d, fill, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${C.ink}" stroke-width="${OL}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
const line = (d, stroke, width) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;

// A tube limb: black outline, darker base, lighter offset core.
function limb(pts, r, color, shade) {
  const d = 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L');
  return (
    line(d, C.ink, 2 * r + 2 * OL) +
    line(d, shade, 2 * r) +
    `<g transform="translate(-2.5 -2.5)">${line(d, color, 2 * r - 8)}</g>`
  );
}

// Angles: 0 points straight down, positive swings forward (toward +x).
function fk(start, a, len) {
  return [start[0] + Math.sin(rad(a)) * len, start[1] + Math.cos(rad(a)) * len];
}
function legPoints(hip, { a, bend }) {
  const knee = fk(hip, a, THIGH);
  const shinA = a - bend;
  const ankle = fk(knee, shinA, SHIN);
  return { knee, ankle, shinA };
}

function shoe(ankle, rot) {
  return `<g transform="translate(${f(ankle[0])} ${f(ankle[1])}) rotate(${f(rot)})">
    ${shape('M-22 -12 L18 -12 C42 -10 58 4 56 22 L-24 22 C-28 8 -28 -4 -22 -12 Z', C.shoe)}
    ${line('M-20 14 L50 14', C.shoeS, 7)}
  </g>`;
}

function hand(p, type, a) {
  const [x, y] = [f(p[0]), f(p[1])];
  if (type === 'open') {
    // Fingers spread along the arm's direction.
    return `<g transform="translate(${x} ${y}) rotate(${f(90 - a)})">
      ${limb([[6, -12], [34, -24]], 6, C.skin, C.skinS)}
      ${limb([[8, -4], [42, -9]], 6, C.skin, C.skinS)}
      ${limb([[8, 5], [42, 7]], 6, C.skin, C.skinS)}
      ${limb([[6, 12], [34, 22]], 6, C.skin, C.skinS)}
      <circle r="20" fill="${C.skin}" stroke="${C.ink}" stroke-width="${OL}"/>
      <path d="M-10 12 A16 16 0 0 0 12 10" fill="none" stroke="${C.skinS}" stroke-width="6" stroke-linecap="round"/>
    </g>`;
  }
  return `<g transform="translate(${x} ${y})">
    <circle r="20" fill="${C.skin}" stroke="${C.ink}" stroke-width="${OL}"/>
    <path d="M-11 9 A15 15 0 0 0 11 9" fill="none" stroke="${C.skinS}" stroke-width="6" stroke-linecap="round"/>
  </g>`;
}

function arm(shoulder, { a, el, hand: handType = 'fist' }) {
  const elbow = fk(shoulder, a, UPPER_ARM);
  const foreA = a + el;
  const wrist = fk(elbow, foreA, FOREARM);
  const sleeveEnd = fk(shoulder, a, 34);
  return {
    wrist,
    svg:
      limb([shoulder, elbow, wrist], 15, C.skin, C.skinS) +
      hand(wrist, handType, foreA) +
      limb([shoulder, sleeveEnd], 20, C.dress, C.dressS),
  };
}

function carrier(p, rot) {
  const id = `c${uid++}`;
  return `<g transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(rot)})">
    ${line('M-30 26 C-30 -8 30 -8 30 26', C.ink, 18)}
    ${line('M-30 26 C-30 -8 30 -8 30 26', C.boxS, 6)}
    <clipPath id="${id}"><rect x="-76" y="22" width="152" height="106" rx="20"/></clipPath>
    <rect x="-76" y="22" width="152" height="106" rx="20" fill="${C.box}" stroke="${C.ink}" stroke-width="${OL}"/>
    <g clip-path="url(#${id})"><rect x="-76" y="108" width="152" height="24" fill="${C.boxS}"/></g>
    <rect x="-8" y="40" width="68" height="62" rx="9" fill="${C.boxD}" stroke="${C.ink}" stroke-width="5"/>
    ${line('M12 42 L12 100 M30 42 L30 100 M47 42 L47 100', '#E8F4FB', 5)}
    <g transform="translate(-41 68)" fill="#E8F4FB">
      <ellipse cx="0" cy="7" rx="13" ry="11"/>
      <circle cx="-13" cy="-7" r="5"/><circle cx="-4" cy="-13" r="5"/>
      <circle cx="5" cy="-13" r="5"/><circle cx="14" cy="-7" r="5"/>
    </g>
  </g>`;
}

function eye(cx, cy, style) {
  if (style === 'closed') return line(`M${cx - 15} ${cy + 2} Q${cx} ${cy + 11} ${cx + 15} ${cy + 2}`, C.ink, 6);
  if (style === 'happy') return line(`M${cx - 15} ${cy + 6} Q${cx} ${cy - 13} ${cx + 15} ${cy + 6}`, C.ink, 6);
  if (style === 'wince') return line(`M${cx - 14} ${cy - 8} L${cx + 13} ${cy + 1} L${cx - 14} ${cy + 10}`, C.ink, 6);
  return `<ellipse cx="${cx}" cy="${cy}" rx="15" ry="17" fill="#FFFFFF" stroke="${C.ink}" stroke-width="4"/>
    <circle cx="${cx + 4}" cy="${cy + 1}" r="10" fill="#3F7D4E"/>
    <circle cx="${cx + 5}" cy="${cy + 2}" r="6" fill="${C.ink}"/>
    <circle cx="${cx + 8}" cy="${cy - 3}" r="3.5" fill="#FFFFFF"/>`;
}

function brows(style) {
  const paths = {
    calm: ['M-20 -28 Q2 -39 24 -28', 'M54 -29 Q74 -39 94 -28'],
    angry: ['M-22 -38 L26 -18', 'M50 -18 L96 -38'],
    happy: ['M-20 -35 Q2 -48 24 -36', 'M54 -37 Q74 -48 94 -36'],
    worried: ['M-20 -22 L24 -38', 'M52 -38 L94 -22'],
  };
  return paths[style].map((d) => line(d, C.hairS, 8)).join('');
}

function mouth(style) {
  const open = (d, inner) => {
    const id = `m${uid++}`;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath>
      <path d="${d}" fill="#7A1F33" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/>
      <g clip-path="url(#${id})">${inner}</g>`;
  };
  switch (style) {
    case 'smile':
      return line('M26 58 Q46 76 68 56', C.ink, 6);
    case 'shout':
      return open('M20 54 Q46 46 72 53 Q74 86 46 90 Q20 86 20 54 Z',
        '<rect x="14" y="44" width="64" height="14" fill="#FFFFFF"/><ellipse cx="47" cy="90" rx="19" ry="13" fill="#F0577F"/>');
    case 'grin':
      return open('M12 50 Q46 60 82 48 Q78 92 46 92 Q16 90 12 50 Z',
        '<rect x="6" y="42" width="84" height="20" fill="#FFFFFF"/><ellipse cx="47" cy="94" rx="22" ry="13" fill="#F0577F"/>');
    case 'frown':
      return line('M22 74 Q32 60 44 68 Q56 76 70 62', C.ink, 6);
    default:
      return '';
  }
}

function head({ tilt = 0, eyes = 'open', brow = 'calm', mouthStyle = 'smile', sway = 0, sweat = 0 }) {
  const faceClip = `f${uid++}`;
  const hairClip = `h${uid++}`;
  const bunClip = `b${uid++}`;
  const frontHair = 'M-116 22 C-126 -58 -72 -120 8 -118 C74 -116 120 -70 118 -6 C96 -26 76 -48 62 -76 C34 -42 -28 -36 -68 -32 C-84 -18 -96 2 -98 34 Z';
  return `<g transform="rotate(${f(tilt)})">
    <g transform="rotate(${f(sway)} -30 -100)">
      ${line('M-74 -142 Q-96 -166 -116 -158', C.ink, 13)}${line('M-74 -142 Q-96 -166 -116 -158', C.hair, 5)}
      ${line('M-8 -170 Q0 -200 24 -202', C.ink, 13)}${line('M-8 -170 Q0 -200 24 -202', C.hair, 5)}
      <clipPath id="${bunClip}"><circle cx="-34" cy="-124" r="56"/></clipPath>
      <circle cx="-34" cy="-124" r="56" fill="${C.hair}" stroke="${C.ink}" stroke-width="${OL}"/>
      <g clip-path="url(#${bunClip})"><circle cx="-14" cy="-104" r="62" fill="none" stroke="${C.hairS}" stroke-width="20"/></g>
      ${line('M-58 -128 Q-34 -160 -10 -132', C.hairL, 7)}
      ${line('M-46 -112 Q-30 -130 -14 -112', C.hairS, 6)}
    </g>
    ${shape('M-118 -10 C-122 -86 -60 -122 8 -120 C60 -118 118 -84 120 -8 C120 36 96 58 60 62 L-60 74 C-100 68 -118 34 -118 -10 Z', C.hair)}
    <ellipse cx="-96" cy="22" rx="22" ry="26" fill="${C.skin}" stroke="${C.ink}" stroke-width="${OL}"/>
    <circle cx="-98" cy="56" r="9" fill="${C.shoe}" stroke="${C.ink}" stroke-width="5"/>
    <clipPath id="${faceClip}"><ellipse cx="10" cy="12" rx="108" ry="102"/></clipPath>
    <ellipse cx="10" cy="12" rx="108" ry="102" fill="${C.skin}" stroke="${C.ink}" stroke-width="${OL}"/>
    <g clip-path="url(#${faceClip})">
      <path d="M-104 16 C-90 92 40 118 118 62 L118 130 L-104 130 Z" fill="${C.skinS}"/>
    </g>
    <ellipse cx="-20" cy="48" rx="20" ry="12" fill="#F58C9A" opacity="0.65"/>
    <ellipse cx="98" cy="44" rx="13" ry="11" fill="#F58C9A" opacity="0.65"/>
    ${eye(2, 8, eyes)}${eye(74, 6, eyes)}
    <circle cx="2" cy="8" r="30" fill="#FFFFFF" fill-opacity="0.14" stroke="${C.ink}" stroke-width="9"/>
    <circle cx="2" cy="8" r="30" fill="none" stroke="${C.rim}" stroke-width="4"/>
    <circle cx="74" cy="6" r="28" fill="#FFFFFF" fill-opacity="0.14" stroke="${C.ink}" stroke-width="9"/>
    <circle cx="74" cy="6" r="28" fill="none" stroke="${C.rim}" stroke-width="4"/>
    ${line('M32 6 L46 6', C.ink, 7)}
    ${line('M-28 6 L-82 12', C.ink, 7)}
    ${line('M36 38 Q46 44 52 36', C.skinS, 6)}
    ${mouth(mouthStyle)}
    ${brows(brow)}
    <clipPath id="${hairClip}"><path d="${frontHair}"/></clipPath>
    ${shape(frontHair, C.hair)}
    <g clip-path="url(#${hairClip})">
      <path d="M-120 34 C-110 -24 -70 -28 -40 -40 C-90 -60 -110 -40 -130 -10 Z" fill="${C.hairS}"/>
      ${line('M-74 -66 C-48 -96 6 -106 44 -92', C.hairL, 10)}
      ${line('M64 -84 C80 -70 92 -56 104 -34', C.hairL, 7)}
    </g>
    ${sweat ? `<path d="M116 -44 C130 -22 134 -12 124 -4 C112 2 102 -8 106 -20 Z" fill="#8FDBFF" stroke="${C.ink}" stroke-width="5" transform="translate(4 ${f(sweat)})"/>` : ''}
  </g>`;
}

function torso(pose) {
  const s = pose.hemSway ?? 0;
  const hem = 64;
  const dress = `M-54 -142 C-64 -100 -52 -60 -48 -28 C-64 8 ${-82 + s} 40 ${-88 + s} ${hem} Q${s} ${hem + 26} ${88 + s} ${hem} C${78 + s} 40 62 8 50 -28 C56 -60 66 -100 54 -142 Q0 -168 -54 -142 Z`;
  const apronSkirt = `M-14 -26 L58 -26 C66 6 ${74 + s} 36 ${78 + s} ${hem - 6} Q${28 + s} ${hem + 12} ${-22 + s} ${hem + 2} C-24 34 -22 4 -14 -26 Z`;
  return `
    ${shape(dress, C.dress)}
    <path d="M-48 -20 C-62 12 ${-78 + s} 40 ${-82 + s} ${hem - 2} Q${-40 + s} ${hem + 12} ${-20 + s} ${hem + 8} C-28 30 -34 0 -38 -22 Z" fill="${C.dressS}"/>
    ${shape('M-6 -128 L52 -128 L56 -30 L-14 -30 Z', C.apron)}
    ${shape(apronSkirt, C.apron)}
    <path d="M-10 ${hem - 12} Q${30 + s} ${hem + 2} ${72 + s} ${hem - 14} L${74 + s} ${hem - 4} Q${28 + s} ${hem + 10} ${-18 + s} ${hem + 2} Z" fill="${C.apronS}"/>
    ${shape('M-20 -36 L60 -36 L60 -20 L-20 -20 Z', C.dressS)}
    ${shape('M-2 -142 L8 -142 L10 -122 L-2 -122 Z', C.apron)}
    ${shape('M40 -142 L50 -142 L50 -122 L40 -122 Z', C.apron)}
    ${shape('M4 -106 L44 -106 L44 -76 Q24 -66 4 -76 Z', C.apronS)}
    ${shape('M-22 -150 C-8 -130 26 -130 44 -150 L44 -138 C26 -118 -8 -118 -22 -138 Z', C.apron)}`;
}

function renderCharacter(pose) {
  const lean = pose.lean ?? 0;
  const front = legPoints([18, 0], pose.legs[0]);
  const back = legPoints([-16, 0], pose.legs[1]);
  const lowest = Math.max(front.ankle[1], back.ankle[1]);
  const hipY = GROUND - 22 - lowest - (pose.lift ?? 0);
  const hipX = CENTER_X + (pose.shiftX ?? 0);

  const shoulderF = [32, -124];
  const shoulderB = [-34, -124];
  const armB = arm(shoulderB, pose.armB);
  const armF = arm(shoulderF, pose.armF);
  const carrierRot = (pose.carrierRot ?? 0) - lean;
  // The foot on the ground stays nearly flat; the airborne foot trails toe-down.
  const frontDown = front.ankle[1] >= back.ankle[1];
  const footRot = (leg, onGround) => {
    const rot = -leg.shinA * 0.6;
    return onGround ? Math.max(-6, Math.min(6, rot)) : rot;
  };

  return `<g transform="translate(${f(hipX)} ${f(hipY)})">
    <g transform="rotate(${f(lean)})">
      ${carrier([armB.wrist[0], armB.wrist[1] - 4], carrierRot)}
      ${armB.svg}
    </g>
    ${limb([[-16, 0], back.knee, back.ankle], 17, C.skinS, C.skinS)}
    ${shoe(back.ankle, footRot(back, !frontDown))}
    ${limb([[18, 0], front.knee, front.ankle], 17, C.skin, C.skinS)}
    ${shoe(front.ankle, footRot(front, frontDown))}
    <g transform="rotate(${f(lean)})">
      ${torso(pose)}
      <g transform="translate(14 ${f(-256 + (pose.headDy ?? 0))})">
        ${head({ ...pose.face, tilt: (pose.face.tilt ?? 0) - lean * 0.55 })}
      </g>
      ${armF.svg}
    </g>
  </g>`;
}

const STEP = (n) => Array.from({ length: n }, (_, i) => i);
const TAU = Math.PI * 2;

const ANIMS = {
  Idle: STEP(10).map((i) => {
    const p = (i / 10) * TAU;
    const breathe = Math.sin(p);
    return {
      lean: 1,
      legs: [{ a: 7, bend: 7 + breathe * 2 }, { a: -8, bend: 7 + breathe * 2 }],
      armF: { a: 16 + breathe * 2, el: 26, hand: 'fist' },
      armB: { a: -14 + breathe, el: 4 },
      carrierRot: breathe * 1.5,
      headDy: breathe * 2,
      face: {
        tilt: breathe * 1.2,
        eyes: i === 7 ? 'closed' : 'open',
        brow: 'calm',
        mouthStyle: 'smile',
        sway: breathe * 1.5,
      },
    };
  }),

  Run: STEP(8).map((i) => {
    const p = (i / 8) * TAU;
    const leg = (ph) => ({
      a: 10 + 42 * Math.sin(ph),
      bend: 22 + 62 * Math.max(0, Math.cos(ph)),
    });
    return {
      lean: 13,
      legs: [leg(p), leg(p + Math.PI)],
      lift: 7 * Math.abs(Math.cos(p)),
      armF: { a: 74 + 12 * Math.sin(p + Math.PI), el: 8, hand: 'open' },
      armB: { a: -44 + 9 * Math.sin(p), el: 6 },
      carrierRot: 10 * Math.sin(p),
      hemSway: 8 * Math.sin(p),
      headDy: 4 * Math.cos(2 * p),
      face: {
        tilt: 2 * Math.sin(2 * p),
        eyes: 'open',
        brow: 'angry',
        mouthStyle: 'shout',
        sway: -5 * Math.sin(2 * p + 0.8),
      },
    };
  }),

  Catch: [
    { lean: -4, l: [12, 42, -8, 42], fa: 60, fe: 25, b: -30, sx: -14, brow: 'angry', m: 'shout', e: 'open' },
    { lean: 8, l: [22, 44, -18, 24], fa: 74, fe: 10, b: -40, sx: -6, brow: 'angry', m: 'shout', e: 'open' },
    { lean: 18, l: [36, 48, -30, 14], fa: 84, fe: 4, b: -50, sx: 6, brow: 'angry', m: 'shout', e: 'open' },
    { lean: 28, l: [50, 56, -44, 8], fa: 92, fe: 0, b: -58, sx: 20, brow: 'angry', m: 'shout', e: 'open' },
    { lean: 33, l: [56, 62, -50, 6], fa: 96, fe: 0, b: -62, sx: 28, brow: 'happy', m: 'grin', e: 'open' },
    { lean: 33, l: [56, 62, -50, 6], fa: 94, fe: 10, b: -60, sx: 30, brow: 'happy', m: 'grin', e: 'open' },
    { lean: 30, l: [54, 60, -46, 8], fa: 90, fe: 28, b: -56, sx: 30, brow: 'happy', m: 'grin', e: 'happy' },
    { lean: 26, l: [50, 58, -42, 10], fa: 84, fe: 44, b: -50, sx: 28, brow: 'happy', m: 'grin', e: 'happy' },
  ].map((k, i) => ({
    lean: k.lean,
    shiftX: k.sx,
    legs: [{ a: k.l[0], bend: k.l[1] }, { a: k.l[2], bend: k.l[3] }],
    armF: { a: k.fa, el: k.fe, hand: i < 6 ? 'open' : 'fist' },
    armB: { a: k.b, el: 6 },
    carrierRot: 6 - i * 2,
    hemSway: Math.min(14, i * 3),
    face: { eyes: k.e, brow: k.brow, mouthStyle: k.m, sway: -i },
  })),

  Frustrated: STEP(10).map((i) => {
    const p = (i / 10) * TAU;
    const stomp = Math.max(0, Math.sin(2 * p));
    return {
      lean: -2 + Math.sin(p),
      legs: [{ a: 12 + 16 * stomp, bend: 8 + 46 * stomp }, { a: -8, bend: 6 }],
      armF: { a: 100 + 8 * Math.sin(3 * p), el: 45, hand: 'fist' },
      armB: { a: -8, el: 2 },
      carrierRot: 3 * Math.sin(2 * p),
      headDy: stomp * 3,
      face: {
        tilt: 2 * Math.sin(p),
        eyes: i % 5 === 4 ? 'wince' : 'open',
        brow: 'worried',
        mouthStyle: 'frown',
        sway: 3 * Math.sin(2 * p),
        sweat: 1 + ((i * 3) % 14),
      },
    };
  }),
};

const svgDoc = (inner, w = W, h = H) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

mkdirSync(OUT, { recursive: true });
for (const [name, frames] of Object.entries(ANIMS)) {
  frames.forEach((pose, i) => {
    const png = new Resvg(svgDoc(renderCharacter(pose))).render().asPng();
    writeFileSync(join(OUT, `${name} (${i + 1}).png`), png);
  });
}

// Review sheet: every frame, plus the cat at the size it would appear beside her.
const CELL = 190;
const scale = CELL / W;
const rows = Object.entries(ANIMS);
const catUri = (file) =>
  `data:image/png;base64,${readFileSync(join(ROOT, 'images', 'sprites', 'cat', file)).toString('base64')}`;
let sheet = '<rect width="100%" height="100%" fill="#CFE9F7"/>';
rows.forEach(([, frames], r) => {
  frames.forEach((pose, c) => {
    sheet += `<g transform="translate(${c * CELL} ${r * CELL}) scale(${scale})">${renderCharacter(pose)}</g>`;
  });
});
const compareY = rows.length * CELL;
sheet += `<g transform="translate(0 ${compareY}) scale(0.72)">${renderCharacter(ANIMS.Run[1])}</g>`;
sheet += `<image href="${catUri('Run (4).png')}" x="560" y="${compareY + 250}" width="325" height="284"/>`;
const sheetPng = new Resvg(svgDoc(sheet, CELL * 10, compareY + 550)).render().asPng();
writeFileSync(join(HERE, 'sheet-cartoon.png'), sheetPng);
console.log('Frames:', rows.map(([n, fr]) => `${n} ${fr.length}`).join(', '));
