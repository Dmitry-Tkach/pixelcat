// Turns the grandma GIFs into small transparent game frames.
// Their "transparency" is a checkerboard painted into every frame, so it's removed here.
// Run: node tools/cut-grandma.mjs [folder for a review image]
// Output: images/sprites/grandma-frames/Run (n).png, Lunge (n).png and Hug (n).png. The GIFs are left alone.
import sharp from 'sharp';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'images', 'sprites', 'grandma-frames');

// `pages` is one full stride of each GIF: the page after the last nearly matches the first, so it
// loops. Every second page is enough, and a lunge is too short to need more than 4 frames.
// Run comes first, because it sets the scale for the others.
// ANALYSE=Lunge prints the best loops and a review image for choosing pages, and saves nothing.
const ANIMS = [
  { name: 'Run', file: 'new-running grandma.gif', pages: [16, 18, 20, 22, 24, 26] },
  { name: 'Lunge', file: 'grandma-lunge.gif', pages: [5, 7, 9, 11] },
  // She lifts the cat and cuddles it, standing still, so her feet stay planted. These pages have no
  // real gaps, and the cat's white fur looks like background to the gap search, so it's skipped.
  { name: 'Hug', file: 'hug/grandma-hug.gif', pages: [0, 5, 10, 13, 18, 23], planted: true, keepGaps: true },
];
const ANALYSE = process.env.ANALYSE;
const FIGURE_HEIGHT = 256; // the height of the previous art, so she stays the same size in the game
const PADDING = 4;

const isChecker = (r, g, b) => Math.min(r, g, b) >= 150 && Math.max(r, g, b) - Math.min(r, g, b) <= 28;

function fill(seeds, seen, test, width, height) {
  const stack = [...seeds];
  const found = [];
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !test(p)) continue;
    seen[p] = 1;
    found.push(p);
    const x = p % width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (p >= width) stack.push(p - width);
    if (p < width * (height - 1)) stack.push(p + width);
  }
  return found;
}

// Returns the page with the background cleared, and the box around the figure.
async function cutPage(source, page, { keepGaps = false } = {}) {
  const { data, info: { width, height } } = await sharp(source, { page }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const light = (p) => isChecker(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);

  const outside = new Uint8Array(width * height);
  const edges = [];
  for (let x = 0; x < width; x++) edges.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) edges.push(y * width, y * width + width - 1);
  fill(edges, outside, light, width, height);

  // The figure is the largest piece. Specks left by the GIF's compression are dropped.
  const seen = new Uint8Array(width * height);
  let figure = [];
  for (let p = 0; p < width * height; p++) {
    if (outside[p] || seen[p]) continue;
    const piece = fill([p], seen, (q) => !outside[q], width, height);
    if (piece.length > figure.length) figure = piece;
  }
  const keep = new Uint8Array(width * height);
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (const q of figure) {
    keep[q] = 1;
    const x = q % width, y = (q - x) / width;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }

  // Gaps between the legs and under the arm are closed in. Only the lower body is searched,
  // so the white of her hair and glasses stays.
  const holeSeen = new Uint8Array(width * height);
  const lowerBody = y0 + (y1 - y0) * 0.3;
  for (let p = 0; p < width * height; p++) {
    if (!keep[p] || holeSeen[p] || !light(p) || p / width < lowerBody) continue;
    const hole = fill([p], holeSeen, (q) => keep[q] && light(q), width, height);
    if (hole.length >= 40 && !keepGaps) hole.forEach((q) => { keep[q] = 0; });
  }

  for (let p = 0; p < width * height; p++) data[p * 4 + 3] = keep[p] ? 255 : 0;
  return { data, width, height, x0, y0, x1, y1, keep };
}

// The middle of her head, which stays steady, so frames can be lined up on it.
function headCenter({ keep, width, x0, x1, y0, y1 }) {
  const limit = y0 + (y1 - y0) * 0.25;
  let sum = 0, count = 0;
  for (let y = y0; y <= limit; y++) {
    for (let x = x0; x <= x1; x++) {
      if (keep[y * width + x]) { sum += x; count += 1; }
    }
  }
  return sum / count;
}

async function placed(cut, canvasW, canvasH, anchorX, bottom = cut.y1) {
  const buf = Buffer.alloc(canvasW * canvasH * 4);
  const ox = Math.round(canvasW / 2 - anchorX);
  const oy = canvasH - PADDING - 1 - bottom;
  for (let y = cut.y0; y <= cut.y1; y++) {
    for (let x = cut.x0; x <= cut.x1; x++) {
      const si = (y * cut.width + x) * 4;
      const di = ((y + oy) * canvasW + (x + ox)) * 4;
      if (cut.data[si + 3] && di >= 0 && di < buf.length) cut.data.copy(buf, di, si, si + 4);
    }
  }
  return buf;
}

async function review(reviewDir, name, buffers, canvasW, canvasH) {
  const w = 170;
  const h = Math.round((w * canvasH) / canvasW);
  const tiles = await Promise.all(buffers.map(async (b, i) => ({
    input: await sharp(b, { raw: { width: canvasW, height: canvasH, channels: 4 } }).resize({ width: w }).png().toBuffer(),
    left: (i % 10) * w,
    top: Math.floor(i / 10) * h,
  })));
  await sharp({ create: { width: 10 * w, height: Math.ceil(buffers.length / 10) * h, channels: 4, background: '#ff00ff' } })
    .composite(tiles).png().toFile(join(reviewDir, `grandma-${name.toLowerCase()}-cut.png`));
}

// Lists the page ranges whose next page looks most like their first, so they loop best.
async function printBestLoops(buffers, canvasW, canvasH) {
  const small = await Promise.all(buffers.map((b) => sharp(b, { raw: { width: canvasW, height: canvasH, channels: 4 } })
    .resize({ width: 40, height: 60, fit: 'fill' }).extractChannel(3).raw().toBuffer()));
  const diff = (a, b) => a.reduce((sum, v, k) => sum + Math.abs(v - b[k]), 0) / a.length;
  const loops = [];
  for (let length = 8; length <= 14; length++) {
    for (let start = 0; start + length < small.length; start++) {
      loops.push({ start, length, diff: diff(small[start], small[start + length]) });
    }
  }
  loops.sort((a, b) => a.diff - b.diff);
  console.log(loops.slice(0, 8).map((l) => `from ${l.start}, ${l.length} pages: ${l.diff.toFixed(1)}`).join('\n'));
}

async function main() {
  const reviewDir = process.argv[2];
  let scale;
  for (const { name, file, pages, planted, keepGaps } of ANIMS) {
    const source = join(DIR, file);
    const analysing = ANALYSE === name;
    if (ANALYSE && !analysing) continue;
    const { pages: total } = await sharp(source, { animated: true }).metadata();
    const chosen = analysing ? Array.from({ length: total }, (_, i) => i) : pages;
    const cuts = [];
    for (const page of chosen) cuts.push(await cutPage(source, page, { keepGaps }));

    const heads = cuts.map(headCenter);
    const steadyX = heads.reduce((sum, x) => sum + x, 0) / heads.length;
    const anchors = planted ? heads.map(() => steadyX) : heads;
    const floor = planted ? Math.max(...cuts.map((c) => c.y1)) : undefined;
    const halfW = Math.ceil(Math.max(...cuts.map((c, i) => Math.max(anchors[i] - c.x0, c.x1 - anchors[i])))) + PADDING + 1;
    const canvasW = halfW * 2;
    const figureH = planted
      ? floor - Math.min(...cuts.map((c) => c.y0)) + 1
      : Math.max(...cuts.map((c) => c.y1 - c.y0 + 1));
    const canvasH = figureH + PADDING * 2;
    const buffers = await Promise.all(cuts.map((c, i) => placed(c, canvasW, canvasH, anchors[i], floor)));
    console.log(`${name}: figure heights ${cuts.map((c) => c.y1 - c.y0 + 1).join(' ')}`);
    if (reviewDir) await review(reviewDir, name, buffers, canvasW, canvasH);

    if (analysing) {
      await printBestLoops(buffers, canvasW, canvasH);
      continue;
    }
    scale ??= FIGURE_HEIGHT / figureH;
    const outW = Math.round(canvasW * scale);
    const outH = Math.round(canvasH * scale);
    for (const old of readdirSync(DIR)) {
      if (old.startsWith(`${name} (`) && old.endsWith(').png')) rmSync(join(DIR, old));
    }
    for (let i = 0; i < buffers.length; i++) {
      await sharp(buffers[i], { raw: { width: canvasW, height: canvasH, channels: 4 } })
        .resize({ width: outW, height: outH })
        .png({ compressionLevel: 9 })
        .toFile(join(DIR, `${name} (${i + 1}).png`));
    }
    console.log(`${name}: ${buffers.length} frames at ${outW}x${outH}`);
  }
}

main();
