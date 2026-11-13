// Cuts the new Adventure Paws cat (the home screen's grey tabby with the red scarf) from the strips
// the owner draws with ChatGPT, in images/sprites/paws-cat. Each strip is one row of frames.
// Every frame comes out in his frame (PAWS_FRAME in src/data/adventure/heroes.js: the battle cat's,
// taller), his feet on one line, at the battle cat's height, so the game's hitboxes fit him, and his
// moves and the battle cat's, standing in for the ones not drawn yet, swap without a jump. The
// owner's strips are left alone.
// Run: node tools/cut-paws-cat.mjs [folder for review images], then npm run assets.
// Output: images/sprites/paws-cat/frames, as Idle (n).png, Run (n).png and so on. With a review
// folder: a GIF of each animation on sky blue, and a row of its frames beside the first idle one,
// with the feet line drawn.
import sharp from 'sharp';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAWS_FRAME } from '../src/data/adventure/heroes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDER = join(ROOT, 'images', 'sprites', 'paws-cat');
const OUT = join(FOLDER, 'frames');
const REVIEW = process.argv[2];

const FRAME = { w: PAWS_FRAME.w, h: PAWS_FRAME.h };
const FEET = PAWS_FRAME.feet; // the row his feet stand on
const MIDDLE = PAWS_FRAME.middle; // the column his middle is on
// How much the idle strip is shrunk to stand as tall as the battle cat (121px against 190px).
const HERO = 0.64;
const FAINT = 40; // pixels fainter than this (out of 255) are cleared: the haze some strips have
const SPECK = 30; // loose dots smaller than this many pixels, not touching the cat, are cleared
const FOOT_ROWS = 10;
const GAP = 12; // empty columns narrower than this are inside a drawing, for `byGaps`
const HEAD_ROWS = 40; // how far down from the top of his head it's measured, for `steadyHead` (his ears and brow) // how far up from his lowest row his feet are measured, for `planted`
const SKY = '#9fd3f0'; // the review pictures' background

// Each strip: its file, its frame count, and how to fit it to the idle cat. scale: how much to
// shrink it so he's the same size as in the idle strip. ground: the row of the strip his feet
// stand on when he's on the ground. Frames off the ground keep their height above it, unless
// `air` lists them (counting from 1): the jump, whose height the game makes. Those are lined up by the
// top of his head, so it stays steady while his legs tuck and reach, as high as fits the tallest of
// them standing on the feet line. planted: his feet stay put (the claw swipe), each frame placed
// left to right by the middle of his feet, where they are in his first idle frame, not by its cell.
// steadyHead: each frame placed left to right by the middle of his head, where it is in his first
// idle frame (the dash, where ChatGPT draws him further forward in some cells than others).
// byGaps: cut at the empty columns between the drawings, not into equal cells (when ChatGPT draws
// one over the edge of its cell). ms: how long each frame shows in the review GIF.
const STRIPS = [
  { name: 'Idle', file: 'cat_idle_spriteshe.png', frames: 6, scale: 1, ground: 243, ms: 160 },
  { name: 'Run', file: 'run.png', frames: 8, scale: 0.68, ground: 505, ms: 80 },
  { name: 'Jump', file: 'jump.png', frames: 4, scale: 0.41, ground: 685, air: [2, 3, 4], ms: 160 },
  { name: 'Slide', file: 'slide.png', frames: 4, scale: 0.41, ground: 587, ms: 90 },
  { name: 'Swipe', file: 'swipe.png', frames: 4, scale: 0.362, ground: 637, planted: true, ms: 70 },
  { name: 'Dash', file: 'dash.png', frames: 4, scale: 0.41, ground: 580, steadyHead: true, byGaps: true, ms: 70 },
  { name: 'Hit', file: 'hit.png', frames: 3, scale: 0.366, ground: 647, steadyHead: true, byGaps: true, ms: 100 },
  { name: 'Defeated', file: 'defeted.png', frames: 5, scale: 0.55, ground: 545, byGaps: true, ms: 140 },
  { name: 'Rage', file: 'rage.png', frames: 4, scale: 0.45, ground: 582, planted: true, byGaps: true, ms: 100 },
  { name: 'Special', file: 'magic.png', frames: 4, scale: 0.45, ground: 589, planted: true, byGaps: true, ms: 125 },
  { name: 'SpecialEnd', file: 'magic-end.png', frames: 3, scale: 0.356, ground: 633, planted: true, byGaps: true, ms: 125 },
];

mkdirSync(OUT, { recursive: true });
if (REVIEW) mkdirSync(REVIEW, { recursive: true });

for (const strip of STRIPS) {
  for (const f of readdirSync(OUT)) if (f.startsWith(`${strip.name} (`)) unlinkSync(join(OUT, f));
  const cells = await cutStrip(strip);
  for (const [i, cell] of cells.entries()) await sharp(cell).png().toFile(join(OUT, `${strip.name} (${i + 1}).png`));
  if (REVIEW) await review(strip, cells);
  console.log(`${strip.name}: ${cells.length} frames`);
}

// Splits a strip into equal cells, clears the faint haze, shrinks each one and stands it on the
// feet line (or lines it up with the other frames in the air), its middle on the frame's middle.
async function cutStrip({ file, frames, scale, ground, air = [], planted, steadyHead, byGaps }) {
  const { data, info } = await sharp(join(FOLDER, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  for (let i = 3; i < data.length; i += 4) if (data[i] < FAINT) data[i - 3] = data[i - 2] = data[i - 1] = data[i] = 0;
  const shrink = scale * HERO;
  const columns = byGaps ? drawingColumns(data, W, H, frames) : null;
  const step = W / frames;
  const pieces = [];
  for (let c = 0; c < frames; c++) {
    const left = byGaps ? columns[c][0] : Math.round(c * step);
    const width = byGaps ? columns[c][1] - left + 1 : Math.round((c + 1) * step) - left;
    const piece = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left, top: 0, width, height: H }).png().toBuffer();
    const small = await sharp(piece).resize(Math.round(width * shrink), Math.round(H * shrink)).png().toBuffer();
    pieces.push({ small, ...(await sharp(small).metadata()), ...(await headAndFeet(small)) });
  }
  // In the air, his head's top goes on one row: as high as the tallest of those frames needs.
  const inAir = pieces.filter((_, c) => air.includes(c + 1));
  const headRow = Math.min(...inAir.map((p) => FEET - (p.feet + 1 - p.head)));
  // His first idle frame, which the others line up with (cut first, as Idle is the first strip).
  const idle = planted || steadyHead ? await sharp(join(OUT, 'Idle (1).png')).raw().toBuffer({ resolveWithObject: true }) : null;
  const cells = [];
  for (const [c, { small, width, height, head, feet }] of pieces.entries()) {
    const pixels = await sharp(small).raw().toBuffer({ resolveWithObject: true });
    let x = Math.round(MIDDLE - width / 2);
    if (planted) x = Math.round(feetMiddle(idle, FEET) - feetMiddle(pixels, feet));
    if (steadyHead) x = Math.round(headMiddle(idle) - headMiddle(pixels));
    const y = air.includes(c + 1) ? headRow - head : Math.round(FEET - ground * shrink);
    cells.push(await clearSpecks(await placeInFrame(small, width, height, x, y)));
  }
  return cells;
}

// The middle, left to right, of his feet: the solid pixels in the FOOT_ROWS rows up from `bottom`.
function feetMiddle({ data, info }, bottom) {
  let sum = 0, count = 0;
  for (let y = Math.max(0, bottom - FOOT_ROWS); y <= bottom; y++) {
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) { sum += x; count += 1; }
  }
  return count ? sum / count : info.width / 2;
}

// The middle, left to right, of his head: the solid pixels that aren't his red scarf, in the
// HEAD_ROWS rows down from the top of his head.
function headMiddle({ data, info }) {
  let top = -1, sum = 0, count = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const [r, g, b, a] = data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
      if (a <= 128 || (r > 180 && g < 90 && b < 90)) continue;
      if (top < 0) top = y;
      if (y - top > HEAD_ROWS) return sum / count;
      sum += x;
      count += 1;
    }
  }
  return count ? sum / count : info.width / 2;
}

// The top of his head (the highest solid row that isn't his red scarf, which can fly above it) and
// his lowest solid row.
async function headAndFeet(input) {
  const { data, info } = await sharp(input).raw().toBuffer({ resolveWithObject: true });
  let head = -1, feet = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const [r, g, b, a] = data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
      if (a <= 128) continue;
      if (head < 0 && !(r > 180 && g < 90 && b < 90)) head = y;
      feet = y;
    }
  }
  return { head, feet };
}

// The left and right columns of each drawing in a strip, found by the empty columns between them:
// gaps narrower than GAP are inside a drawing. There must be `frames` of them.
function drawingColumns(data, W, H, frames) {
  const solid = (x) => { for (let y = 0; y < H; y++) if (data[(y * W + x) * 4 + 3] > 0) return true; return false; };
  const runs = [];
  for (let x = 0; x < W; x++) {
    if (!solid(x)) continue;
    const last = runs[runs.length - 1];
    if (last && x - last[1] <= GAP) last[1] = x;
    else runs.push([x, x]);
  }
  const drawings = runs.filter(([a, b]) => b - a > 40);
  if (drawings.length !== frames) throw new Error(`Found ${drawings.length} drawings, not ${frames}`);
  return drawings.map(([a, b]) => [Math.max(0, a - 2), Math.min(W - 1, b + 2)]);
}

// Puts a picture into an empty frame at (x, y), clipping whatever falls outside it (sharp needs every
// piece inside the canvas).
async function placeInFrame(input, w, h, x, y) {
  const left = Math.max(0, -x), top = Math.max(0, -y);
  const width = Math.min(w - left, FRAME.w - Math.max(0, x)), height = Math.min(h - top, FRAME.h - Math.max(0, y));
  const clipped = await sharp(input).extract({ left, top, width, height }).png().toBuffer();
  return sharp({ create: { width: FRAME.w, height: FRAME.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: clipped, left: Math.max(0, x), top: Math.max(0, y) }]).png().toBuffer();
}

// Clears the little loose dots ChatGPT leaves round the cat: any patch not touching him that's
// smaller than SPECK pixels.
async function clearSpecks(frame) {
  const { data } = await sharp(frame).raw().toBuffer({ resolveWithObject: true });
  const { w: W, h: H } = FRAME;
  const seen = new Uint8Array(W * H);
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] === 0) continue;
    const patch = [start];
    seen[start] = 1;
    for (let k = 0; k < patch.length; k++) {
      const p = patch[k], x = p % W, y = (p / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || data[n * 4 + 3] === 0) continue;
        seen[n] = 1;
        patch.push(n);
      }
    }
    if (patch.length < SPECK) for (const p of patch) data.fill(0, p * 4, p * 4 + 4);
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

// A GIF of the animation on sky blue, and a row of its frames beside the first idle frame and the
// battle cat's, with the feet line drawn, to check the size and the ground.
async function review({ name, ms }, frames) {
  const { w: W, h: H } = FRAME;
  const onSky = (input) => sharp({ create: { width: W, height: H, channels: 4, background: SKY } }).composite([{ input }]);
  const raw = await Promise.all(frames.map((frame) => onSky(frame).raw().toBuffer()));
  await sharp(Buffer.concat(raw), { raw: { width: W, height: H * frames.length, channels: 4, pageHeight: H } })
    .gif({ delay: frames.map(() => ms), loop: 0 }).toFile(join(REVIEW, `${name.toLowerCase()}.gif`));

  const old = join(ROOT, 'images', 'sprites', 'battle-cat-paws', 'Idle (1).png');
  const row = [old, join(OUT, 'Idle (1).png'), ...frames];
  const line = Buffer.from(`<svg width="${W * row.length}" height="${H}"><line x1="0" x2="${W * row.length}" y1="${FEET + 0.5}" y2="${FEET + 0.5}" stroke="#d33" stroke-width="1"/></svg>`);
  await sharp({ create: { width: W * row.length, height: H, channels: 4, background: SKY } })
    .composite([...row.map((input, i) => ({ input, left: i * W, top: i === 0 ? PAWS_FRAME.pad : 0 })), { input: line }])
    .png().toFile(join(REVIEW, `${name.toLowerCase()}-row.png`));
}
