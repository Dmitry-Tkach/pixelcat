// Turns the boss cat's GIFs into small transparent game frames.
// Their "transparency" is a dark checkerboard painted into every frame, so it's removed here.
// Run: node tools/cut-boss.mjs [folder for a review image]
// Output: images/sprites/bos-cat/Idle (n).png and so on. The GIFs are left alone.
import sharp from 'sharp';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'images', 'sprites', 'bos-cat');
const RUN = 'bos_cat_run.gif';
const LUNGE = 'bos_cat_lunge.gif';
const CLAW = 'bos_cat_swing_and _hit.gif';
const HIT = 'hitted.gif';

// Every animation keeps its feet on the same floor, so one moves smoothly into the next.
const ANIMS = [
  { name: 'Idle', file: LUNGE, pages: [0, 2, 4, 5] },
  { name: 'Run', file: RUN, pages: [0, 1, 2, 3, 4, 5, 6, 7] },
  { name: 'Crouch', file: LUNGE, pages: [7, 9, 11, 13] },
  { name: 'Leap', file: LUNGE, pages: [14, 15, 16, 18, 20] },
  { name: 'Land', file: LUNGE, pages: [21, 23, 25, 27] },
  { name: 'ClawReady', file: CLAW, pages: [7, 9, 11, 13] },
  { name: 'Claw', file: CLAW, pages: [14, 15, 16, 17, 18, 19, 21] },
  { name: 'Hit', file: HIT, pages: [5, 6, 7, 8, 10, 12, 14, 16, 18] },
  { name: 'Dizzy', file: HIT, pages: [19, 20, 21, 22, 23] },
];
const PADDING = 4;
const BELOW_FEET = 12; // room under his feet for dust. Match it in src/entities/Boss.js
const BACKGROUND_BRIGHTEST = 44; // his fur is brighter than this, or bluer
const BACKGROUND_TINT = 13;
const OUTLINE_DARKEST = 19; // darker than the checkerboard, so it's his outline or his shadow
const OUTLINE_REACH = 2; // the shadow under him is far wider than this, so little of it survives
const MIN_PIECE = 150; // smaller pieces are specks left by the GIF's compression
const FRINGE_NEIGHBORS = 3;
const FRINGE_PASSES = 2;
const PALETTE_COLORS = 96;

const isBackground = (r, g, b) => {
  const high = Math.max(r, g, b);
  return high <= BACKGROUND_BRIGHTEST && high - Math.min(r, g, b) <= BACKGROUND_TINT;
};

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

// Returns the page with the background cleared, and the box around what's left.
async function cutPage(source, page) {
  const { data, info: { width, height } } = await sharp(source, { page }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const colorAt = (p) => [data[p * 4], data[p * 4 + 1], data[p * 4 + 2]];

  const outside = new Uint8Array(width * height);
  const edges = [];
  for (let x = 0; x < width; x++) edges.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) edges.push(y * width, y * width + width - 1);
  fill(edges, outside, (p) => isBackground(...colorAt(p)), width, height);

  // Keeps every real piece, not only the biggest: his claw's swoosh and his dust are separate.
  const seen = new Uint8Array(width * height);
  const keep = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    if (outside[p] || seen[p]) continue;
    const piece = fill([p], seen, (q) => !outside[q], width, height);
    if (piece.length >= MIN_PIECE) piece.forEach((q) => { keep[q] = 1; });
  }

  // Puts his dark outline back, which the fill removed along with the background.
  for (let round = 0; round < OUTLINE_REACH; round++) {
    const add = [];
    for (let p = 0; p < width * height; p++) {
      if (keep[p] || Math.max(...colorAt(p)) > OUTLINE_DARKEST) continue;
      const x = p % width;
      if ((x > 0 && keep[p - 1]) || (x < width - 1 && keep[p + 1]) || (p >= width && keep[p - width]) || (p < width * (height - 1) && keep[p + width])) add.push(p);
    }
    add.forEach((p) => { keep[p] = 1; });
  }

  // Clears the dotted fringe the GIF's compression leaves around his fur: pixels with too few
  // neighbors are dust, not fur.
  for (let round = 0; round < FRINGE_PASSES; round++) {
    const drop = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        if (!keep[p]) continue;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) neighbors += keep[p + dy * width + dx];
        }
        if (neighbors - 1 < FRINGE_NEIGHBORS) drop.push(p);
      }
    }
    drop.forEach((p) => { keep[p] = 0; });
  }

  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let p = 0; p < width * height; p++) {
    data[p * 4 + 3] = keep[p] ? 255 : 0;
    if (!keep[p]) continue;
    const x = p % width, y = (p - x) / width;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { data, width, height, x0, y0, x1, y1 };
}

async function main() {
  const reviewDir = process.argv[2];
  const tiles = [];
  for (const { name, file, pages } of ANIMS) {
    const cuts = [];
    for (const page of pages) cuts.push(await cutPage(join(DIR, file), page));
    // Each GIF's first page has him standing, which shows where its floor is.
    const floor = (await cutPage(join(DIR, file), 0)).y1;
    // The GIFs keep him roughly in place, so each frame stays where it was drawn, around the
    // middle of the page.
    const x0 = Math.min(...cuts.map((c) => c.x0));
    const x1 = Math.max(...cuts.map((c) => c.x1));
    const y0 = Math.min(...cuts.map((c) => c.y0));
    const center = Math.round(cuts[0].width / 2);
    const half = Math.max(center - x0, x1 - center) + PADDING;
    const left = Math.max(0, center - half);
    const top = Math.max(0, y0 - PADDING);
    const outW = Math.min(half * 2, cuts[0].width - left);
    const outH = Math.min(floor + BELOW_FEET + 1 - top, cuts[0].height - top);
    for (const old of readdirSync(DIR)) {
      if (old.startsWith(`${name} (`) && old.endsWith(').png')) rmSync(join(DIR, old));
    }
    for (let i = 0; i < cuts.length; i++) {
      const { data, width, height } = cuts[i];
      const frame = sharp(data, { raw: { width, height, channels: 4 } }).extract({ left, top, width: outW, height: outH });
      await frame.clone().png({ palette: true, colors: PALETTE_COLORS, compressionLevel: 9 }).toFile(join(DIR, `${name} (${i + 1}).png`));
      if (reviewDir) tiles.push({ input: await frame.clone().resize({ height: 180 }).png().toBuffer(), name });
    }
    console.log(`${name}: ${cuts.length} frames at ${outW}x${outH}`);
  }
  if (reviewDir) {
    const cell = 300;
    const placed = tiles.map(({ input }, i) => ({ input, left: (i % 7) * cell, top: Math.floor(i / 7) * 190 }));
    await sharp({ create: { width: 7 * cell, height: Math.ceil(tiles.length / 7) * 190, channels: 4, background: '#7fd0a0' } })
      .composite(placed).png().toFile(join(reviewDir, 'boss-cut.png'));
  }
}

main();
