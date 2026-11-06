// Builds images/sprites/cat-eating/cat-eating-grass.gif from the cat's own art.
// The cat has no eating pose, so the head of a sitting frame is cut along its
// outline and animated over the body, with a chewing mouth painted on.
// Run: node tools/cat-eating-gif.mjs [folder for a preview contact sheet]
import { mkdir, readFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const SOURCE = 'images/sprites/cat/Slide (4).png';
const OUT_DIR = 'images/sprites/cat-eating';
const OUT_FILE = `${OUT_DIR}/cat-eating-grass.gif`;

const VIEW = { x: -50, y: 80, width: 540, height: 420 };
const OUTPUT_WIDTH = 480;
const FRAMES = 48;
const FRAME_MS = 60;
const OUTLINE = '#141414';

// The lower edge of the head in the source frame, tracing its black outline.
const HEAD_EDGE = '303,306 291,340 268,362 240,378 200,390 160,393 110,389 70,373 20,349';
const HEAD_CLIP = `0,0 542,0 542,306 ${HEAD_EDGE} 0,349`;
// Sits below the head's outline, so no scrap of it stays behind when the head tilts.
const BODY_CLIP = '0,474 542,474 542,356 300,356 274,370 246,386 205,396 160,400 0,400';
const NECK = { x: 205, y: 395 };
const MOUTH = { x: 208, y: 368 };

const BITE_FRAME = 8;
const CHEW_START = 12;
const CHEW_END = 36;
const CHEW_CYCLE = [
  { open: false, drop: 0, tilt: 0 },
  { open: false, drop: 2, tilt: 1 },
  { open: true, drop: 4, tilt: 2 },
  { open: true, drop: 2, tilt: 1 },
];

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const sway = (i, cycles, phase) => Math.sin((2 * Math.PI * i * cycles) / FRAMES + phase);

// What the cat is doing on frame i. Every value returns to its start, so it loops.
function pose(i) {
  if (i < BITE_FRAME) {
    const dip = ease(i / (BITE_FRAME - 1));
    return { tilt: 9 * dip, dx: 6 * dip, dy: 12 * dip, mouth: 'happy', blade: 0 };
  }
  if (i < CHEW_START) {
    const dip = ease(1 - (i - BITE_FRAME + 1) / (CHEW_START - BITE_FRAME));
    return { tilt: 9 * dip, dx: 6 * dip, dy: 12 * dip, mouth: 'closed', blade: 1 };
  }
  if (i < CHEW_END) {
    const step = CHEW_CYCLE[(i - CHEW_START) % CHEW_CYCLE.length];
    const eaten = (i - CHEW_START) / (CHEW_END - CHEW_START - 1);
    return {
      tilt: step.tilt,
      dx: 0,
      dy: step.drop,
      mouth: step.open ? 'chew' : 'closed',
      blade: 1 - eaten,
    };
  }
  const t = (i - CHEW_END) / (FRAMES - CHEW_END);
  return { tilt: -3 * Math.sin(2 * Math.PI * t), dx: 0, dy: 0, mouth: 'happy', blade: 0 };
}

function grassBlade(baseX, baseY, tipX, tipY, width, fill) {
  const midX = (baseX + tipX) / 2 + (tipX > baseX ? -14 : 14);
  const midY = (baseY + tipY) / 2;
  const half = width / 2;
  return `<path d="M${baseX - half} ${baseY} Q${midX - half} ${midY} ${tipX} ${tipY} Q${midX + half} ${midY} ${baseX + half} ${baseY} Z" fill="${fill}" stroke="${OUTLINE}" stroke-width="5" stroke-linejoin="round"/>`;
}

// Painted over the source's open mouth, for the frames where it is shut.
function closedMuzzle() {
  return `
    <ellipse cx="206" cy="366" rx="34" ry="24" fill="#e6e6e6"/>
    <path d="M160 392 Q205 396 246 376" fill="none" stroke="${OUTLINE}" stroke-width="7" stroke-linecap="round"/>
    <path d="M208 340 V352" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round"/>`;
}

function mouthShape(kind) {
  if (kind === 'closed') {
    return `<path d="M190 354 Q199 366 208 354 Q217 366 226 354" fill="none" stroke="${OUTLINE}" stroke-width="5" stroke-linecap="round"/>`;
  }
  return `<ellipse cx="208" cy="361" rx="14" ry="10" fill="${OUTLINE}"/>
    <ellipse cx="208" cy="366" rx="8" ry="4" fill="#f4779f"/>`;
}

// The blade being eaten, hanging out of the mouth and shortening as it goes in.
function eatenBlade(i, amount) {
  if (amount <= 0) return '';
  const length = 74 * amount;
  const wiggle = 7 * Math.sin(i * 1.6);
  const tipX = MOUTH.x + 28 * amount + wiggle;
  const tipY = MOUTH.y + length;
  return `<path d="M${MOUTH.x - 5} ${MOUTH.y - 6} Q${MOUTH.x + 2 + wiggle} ${MOUTH.y + length * 0.55} ${tipX} ${tipY} Q${MOUTH.x + 14 + wiggle} ${MOUTH.y + length * 0.5} ${MOUTH.x + 7} ${MOUTH.y - 6} Z" fill="#6ccb3f" stroke="${OUTLINE}" stroke-width="5" stroke-linejoin="round"/>`;
}

// The blade the cat bites: full height, snapped short, then growing back.
function targetBlade(i) {
  let height = 1;
  if (i >= BITE_FRAME) height = 0.3 + 0.7 * ease(clamp01((i - 30) / (FRAMES - 31)));
  const base = { x: 292, y: 462 };
  const tip = { x: 219 + 3 * sway(i, 2, 0), y: 382 };
  return grassBlade(
    base.x, base.y,
    base.x + (tip.x - base.x) * height, base.y + (tip.y - base.y) * height,
    20, '#6ccb3f',
  );
}

function heart(x, y, size, opacity) {
  return `<path transform="translate(${x} ${y}) scale(${size})" opacity="${opacity}" d="M0 7 C-14 -4 -7 -14 0 -6 C7 -14 14 -4 0 7 Z" fill="#ff5f8f" stroke="${OUTLINE}" stroke-width="2"/>`;
}

function hearts(i) {
  if (i < CHEW_END - 2) return '';
  const t = (i - (CHEW_END - 2)) / (FRAMES - CHEW_END + 2);
  const rise = (delay) => clamp01((t - delay) / (1 - delay));
  const fade = (p) => (p <= 0 ? 0 : Math.min(1, 4 * (1 - p)));
  const a = rise(0);
  const b = rise(0.25);
  return (
    heart(318 + 8 * Math.sin(a * 6), 270 - 85 * a, 1.5, fade(a)) +
    heart(352 + 8 * Math.sin(b * 6 + 2), 310 - 85 * b, 1.1, fade(b))
  );
}

function scenery() {
  return `
    <rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.width}" height="${VIEW.height}" fill="#8fd8f7"/>
    <g fill="#ffffff" stroke="${OUTLINE}" stroke-width="4">
      <path d="M372 150 a22 22 0 0 1 40 -14 a26 26 0 0 1 48 8 a18 18 0 0 1 2 34 h-86 a16 16 0 0 1 -4 -28 Z"/>
    </g>
    <path d="M${VIEW.x} 330 Q120 280 ${VIEW.x + VIEW.width} 345 V500 H${VIEW.x} Z" fill="#a5e27a" stroke="${OUTLINE}" stroke-width="4"/>
    <rect x="${VIEW.x}" y="442" width="${VIEW.width}" height="60" fill="#79cf4c"/>
    <path d="M${VIEW.x} 442 H${VIEW.x + VIEW.width}" stroke="${OUTLINE}" stroke-width="4"/>`;
}

function daisy(x, y) {
  const petals = [0, 60, 120, 180, 240, 300]
    .map((a) => `<ellipse cx="0" cy="-8" rx="4.5" ry="7" transform="rotate(${a})" fill="#ffffff" stroke="${OUTLINE}" stroke-width="2"/>`)
    .join('');
  return `<g transform="translate(${x} ${y})">${petals}<circle r="4.5" fill="#ffc531" stroke="${OUTLINE}" stroke-width="2"/></g>`;
}

function foregroundGrass(i) {
  const blades = [];
  const heights = [34, 52, 28, 60, 40, 24, 56, 36];
  for (let n = 0; n < 24; n += 1) {
    const x = VIEW.x + 8 + n * 23;
    const lean = n % 2 ? 10 : -10;
    blades.push([x, 492 - heights[n % heights.length], lean, n * 0.8, n % 2 ? '#6ccb3f' : '#5fbd38']);
  }
  return blades
    .map(([x, tipY, lean, phase, fill]) =>
      grassBlade(x, 512, x + lean + 3 * sway(i, 2, phase), tipY, 22, fill))
    .join('');
}

function frameSvg(i, catHref) {
  const p = pose(i);
  const mouth = p.mouth === 'happy' ? '' : closedMuzzle() + mouthShape(p.mouth);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    viewBox="${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}" width="${VIEW.width}" height="${VIEW.height}">
    <defs>
      <clipPath id="head"><polygon points="${HEAD_CLIP}"/></clipPath>
      <clipPath id="body"><polygon points="${BODY_CLIP}"/></clipPath>
    </defs>
    ${scenery()}
    <ellipse cx="${NECK.x}" cy="${NECK.y}" rx="42" ry="12" fill="#e6e6e6"/>
    <ellipse cx="264" cy="380" rx="24" ry="14" fill="#8a8a8a"/>
    <image href="${catHref}" width="542" height="474" clip-path="url(#body)"/>
    ${targetBlade(i)}
    <g transform="translate(${p.dx} ${p.dy}) rotate(${p.tilt} ${NECK.x} ${NECK.y})">
      <g clip-path="url(#head)">
        <image href="${catHref}" width="542" height="474"/>
        ${mouth}
      </g>
      ${eatenBlade(i, p.blade)}
    </g>
    ${foregroundGrass(i)}
    ${daisy(30, 452)}${daisy(424, 458)}
    ${hearts(i)}
  </svg>`;
}

async function main() {
  const png = await readFile(SOURCE);
  const catHref = `data:image/png;base64,${png.toString('base64')}`;

  const frames = [];
  for (let i = 0; i < FRAMES; i += 1) {
    const rendered = new Resvg(frameSvg(i, catHref), {
      fitTo: { mode: 'width', value: OUTPUT_WIDTH },
    }).render();
    frames.push(await sharp(rendered.asPng()).ensureAlpha().png().toBuffer());
  }

  await mkdir(OUT_DIR, { recursive: true });
  await sharp(frames, { join: { animated: true } })
    .gif({ delay: FRAME_MS, loop: 0, colours: 128, effort: 7 })
    .toFile(OUT_FILE);

  const info = await sharp(OUT_FILE, { animated: true }).metadata();
  console.log(`${OUT_FILE}: ${info.pages} frames, ${info.width}x${info.pageHeight}`);

  const previewDir = process.argv[2];
  if (previewDir) {
    const shown = [0, 4, 7, 8, 10, 12, 14, 18, 22, 28, 34, 38, 41, 44, 47];
    const cols = 5;
    const w = OUTPUT_WIDTH / 2;
    const h = Math.round((w * VIEW.height) / VIEW.width);
    const tiles = await Promise.all(shown.map(async (frame, n) => ({
      input: await sharp(frames[frame]).resize({ width: w }).toBuffer(),
      left: (n % cols) * w,
      top: Math.floor(n / cols) * h,
    })));
    await sharp({
      create: { width: cols * w, height: Math.ceil(shown.length / cols) * h, channels: 4, background: '#fff' },
    }).composite(tiles).png().toFile(`${previewDir}/eating-preview.png`);
  }
}

main();
