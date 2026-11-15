// Cuts the owner's pterodactyl sheet (images/levels/forest/pterodactyl.png, from
// prompts/forest-level/14-pterodactyl.md) into its frames for the game (entities/AdventureBird.js).
// The sheet is a grid of 6 columns and 3 rows on a plain white background: the white is cleared
// from the sheet's edges inwards (so the bird's own pale belly, inside its outline, stays), and each
// cell is saved at the size the bird is shown in the game. Frames: fly 0-5; screech 0-2 and dive 0-2;
// hit 0-1, fall 0-1 and glide 0-1 (data/adventure/birds.js, PTERO_FRAMES).
// Run: node tools/adventure-ptero-art.mjs [folder for a review picture] (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PTERO_ART, PTERO_FRAMES } from '../src/data/adventure/birds.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(ROOT, 'images', 'levels', 'forest', 'pterodactyl.png');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const REVIEW = process.argv[2];
const COLS = 6, ROWS = 3;
// White background: light (every channel above WHITE) and grey (channels within GREY of each other).
const WHITE = 222, GREY = 30;
const EDGE_SOFT = 2; // px of soft edge kept round the bird

if (!existsSync(SHEET)) {
  console.log('No pterodactyl sheet (images/levels/forest/pterodactyl.png): the game draws its stand-in');
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const isWhite = (i) => {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  return Math.min(r, g, b) > WHITE && Math.max(r, g, b) - Math.min(r, g, b) < GREY;
};
// Flood the white in from the edges.
const clear = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
while (stack.length) {
  const p = stack.pop();
  if (clear[p] || !isWhite(p)) continue;
  clear[p] = 1;
  const x = p % W, y = (p / W) | 0;
  if (x > 0) stack.push(p - 1);
  if (x < W - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - W);
  if (y < H - 1) stack.push(p + W);
}
// Cleared: transparent. Next to the cleared, a pale pixel fades by how white it is (a soft edge).
for (let p = 0; p < W * H; p++) {
  if (clear[p]) { data[p * 4 + 3] = 0; continue; }
  const x = p % W, y = (p / W) | 0;
  let near = false;
  for (let d = 1; d <= EDGE_SOFT && !near; d++) {
    near = (x >= d && clear[p - d]) || (x + d < W && clear[p + d]) || (y >= d && clear[p - d * W]) || (y + d < H && clear[p + d * W]);
  }
  if (near) {
    const light = Math.min(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
    if (light > 180) data[p * 4 + 3] = Math.round(255 * Math.min(1, (255 - light) / 75));
  }
}
// In one cell, bits of a neighbouring frame (a wingtip over the line) are small blobs apart from
// the bird: cleared, keeping only blobs at least SPECK of the biggest.
const SPECK = 0.03;
function clearSpecks(pixels, w, h) {
  const seen = new Int32Array(w * h).fill(-1);
  const groups = [];
  for (let i = 0; i < w * h; i++) {
    if (pixels[i * 4 + 3] === 0 || seen[i] >= 0) continue;
    const members = [i], todo = [i];
    seen[i] = groups.length;
    while (todo.length) {
      const q = todo.pop(), x = q % w, y = (q / w) | 0;
      for (const n of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (n >= 0 && pixels[n * 4 + 3] > 0 && seen[n] < 0) { seen[n] = groups.length; todo.push(n); members.push(n); }
      }
    }
    groups.push(members);
  }
  const biggest = Math.max(0, ...groups.map((g) => g.length));
  for (const g of groups) if (g.length < biggest * SPECK) for (const q of g) pixels[q * 4 + 3] = 0;
}
const cw = W / COLS, ch = H / ROWS;
const cell = PTERO_ART.cell;
const saved = [];
for (const [name, { row, col }] of Object.entries(PTERO_FRAMES)) {
  const left = Math.round(col * cw), top = Math.round(row * ch);
  const w = Math.round((col + 1) * cw) - left, h = Math.round((row + 1) * ch) - top;
  const piece = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) data.copy(piece, y * w * 4, ((top + y) * W + left) * 4, ((top + y) * W + left + w) * 4);
  clearSpecks(piece, w, h);
  await sharp(piece, { raw: { width: w, height: h, channels: 4 } }).resize(cell, cell, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(join(OUT, `ptero-${name}.png`));
  saved.push(name);
}
console.log(`Pterodactyl: ${saved.length} frames, ${cell} px square`);

if (REVIEW) {
  mkdirSync(REVIEW, { recursive: true });
  const comps = await Promise.all(saved.map(async (name, i) => ({ input: await sharp(join(OUT, `ptero-${name}.png`)).toBuffer(), left: (i % COLS) * (cell + 10) + 10, top: Math.floor(i / COLS) * (cell + 10) + 10 })));
  await sharp({ create: { width: COLS * (cell + 10) + 10, height: ROWS * (cell + 10) + 10, channels: 4, background: '#3f8f9a' } }).composite(comps).png().toFile(join(REVIEW, 'ptero.png'));
  console.log(`Review picture: ${join(REVIEW, 'ptero.png')}`);
}
