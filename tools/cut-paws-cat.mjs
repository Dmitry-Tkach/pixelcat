// Cuts the new Adventure Paws cat (the home screen's grey tabby with the red scarf) from the strips
// the owner draws with ChatGPT, in images/sprites/paws-cat. Each strip is one row of frames.
// Every frame comes out the size and layout of the battle cat's frames (236x171, his feet on one
// line, at the battle cat's height), so the game's hitboxes fit him, and the new cat's moves and the
// battle cat's, standing in for the ones not drawn yet, swap without a jump. The owner's strips are
// left alone.
// Run: node tools/cut-paws-cat.mjs [folder for review images], then npm run assets.
// Output: images/sprites/paws-cat/frames, as Idle (n).png, Run (n).png and so on. With a review
// folder: a GIF of each animation on sky blue, and a row of its frames beside the first idle one,
// with the feet line drawn.
import sharp from 'sharp';
import { mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FOLDER = join(ROOT, 'images', 'sprites', 'paws-cat');
const OUT = join(FOLDER, 'frames');
const REVIEW = process.argv[2];

// The battle cat's frame (data/adventure/heroes.js), so the new cat plays in his place.
const FRAME = { w: 236, h: 171 };
const FEET = 160; // the row his feet stand on
const MIDDLE = 117; // the column his middle is on
// How much the idle strip is shrunk to stand as tall as the battle cat (121px against 190px).
const HERO = 0.64;
const FAINT = 40; // pixels fainter than this (out of 255) are cleared: the haze some strips have
const SPECK = 30; // loose dots smaller than this many pixels, not touching the cat, are cleared
const SKY = '#9fd3f0'; // the review pictures' background

// Each strip: its file, its frame count, and how to fit it to the idle cat. scale: how much to
// shrink it so he's the same size as in the idle strip. ground: the row of the strip his feet
// stand on when he's on the ground. Frames off the ground keep their height above it. ms: how long
// each frame shows in the review GIF.
const STRIPS = [
  { name: 'Idle', file: 'cat_idle_spriteshe.png', frames: 6, scale: 1, ground: 243, ms: 160 },
  { name: 'Run', file: 'run.png', frames: 8, scale: 0.68, ground: 505, ms: 80 },
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
// feet line, its middle on the frame's middle.
async function cutStrip({ file, frames, scale, ground }) {
  const { data, info } = await sharp(join(FOLDER, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  for (let i = 3; i < data.length; i += 4) if (data[i] < FAINT) data[i - 3] = data[i - 2] = data[i - 1] = data[i] = 0;
  const shrink = scale * HERO;
  const step = W / frames;
  const cells = [];
  for (let c = 0; c < frames; c++) {
    const left = Math.round(c * step);
    const width = Math.round((c + 1) * step) - left;
    const piece = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left, top: 0, width, height: H }).png().toBuffer();
    const small = await sharp(piece).resize(Math.round(width * shrink), Math.round(H * shrink)).png().toBuffer();
    const meta = await sharp(small).metadata();
    const x = Math.round(MIDDLE - meta.width / 2);
    const y = Math.round(FEET - ground * shrink);
    cells.push(await clearSpecks(await placeInFrame(small, meta.width, meta.height, x, y)));
  }
  return cells;
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
    .composite([...row.map((input, i) => ({ input, left: i * W, top: 0 })), { input: line }])
    .png().toFile(join(REVIEW, `${name.toLowerCase()}-row.png`));
}
