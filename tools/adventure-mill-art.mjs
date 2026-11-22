// Cuts the owner's three Mill Falls sheets (data/adventure/millArt.js) into the level's pictures,
// each at the size it's shown in the game. It measures where the wheel's rim is and where a seat's
// planks start, and prints them, to copy into millArt.js.
// Run: node tools/adventure-mill-art.mjs [folder for a review picture] (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MILL_PROPS, MILL_SEAT, MILL_SHEETS, MILL_STAND, MILL_WHEEL, WATERFALL } from '../src/data/adventure/millArt.js';
import { alphaOf, readSheet, savePiece } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const SHEETS = join(ROOT, 'images', 'levels', 'forest');
const REVIEW = process.argv[2];

const missing = Object.keys(MILL_SHEETS).filter((name) => !existsSync(join(SHEETS, `${name}.png`)));
if (missing.length) {
  console.log(`No Mill Falls sheets yet (${missing.join(', ')}): the level draws its stand-in wheel`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const piece = {};
for (const [sheet, names] of Object.entries(MILL_SHEETS)) Object.assign(piece, await readSheet(join(SHEETS, `${sheet}.png`), names));
// Clears stray bits of a neighbouring piece that touched this one on the sheet (the wheel's paddle
// reaches the stand's box): small blobs that touch the picture's edge.
function clearStrays(p) {
  const { pixels, w, h } = p;
  const seen = new Int32Array(w * h).fill(-1);
  const groups = [];
  for (let i = 0; i < w * h; i++) {
    if (pixels[i * 4 + 3] === 0 || seen[i] >= 0) continue;
    const members = [i], stack = [i];
    seen[i] = groups.length;
    let edge = false;
    while (stack.length) {
      const q = stack.pop(), x = q % w, y = (q / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (const n of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (n >= 0 && pixels[n * 4 + 3] > 0 && seen[n] < 0) { seen[n] = groups.length; stack.push(n); members.push(n); }
      }
    }
    groups.push({ members, edge });
  }
  const biggest = Math.max(...groups.map((g) => g.members.length));
  for (const g of groups) if (g.edge && g.members.length < biggest * 0.05) for (const q of g.members) pixels[q * 4 + 3] = 0;
}
for (const p of Object.values(piece)) clearStrays(p);

// The waterfall's middle and veil repeat down the fall, so they must join end to end: their soft,
// fading top and bottom rows (a gap at every join) are cut off, and the bottom BLEND share is faded
// into the top, then dropped, so the last row runs on into the first.
const BLEND = 0.15;
function loopDown(p) {
  const { pixels, w, h } = p;
  const solid = (y) => {
    let sum = 0;
    for (let x = Math.round(w * 0.2); x < w * 0.8; x++) sum += pixels[(y * w + x) * 4 + 3];
    return sum / (w * 0.6) >= 250;
  };
  let y0 = 0, y1 = h - 1;
  while (y0 < h && !solid(y0)) y0++;
  while (y1 > y0 && !solid(y1)) y1--;
  const rows = y1 - y0 + 1, blend = Math.round(rows * BLEND), out = rows - blend;
  const result = Buffer.alloc(w * out * 4);
  for (let y = 0; y < out; y++) {
    for (let x = 0; x < w; x++) {
      const to = (y * w + x) * 4, from = ((y0 + y) * w + x) * 4;
      // The first rows fade from the rows past the end into their own, so the loop has no seam.
      const t = y < blend ? y / blend : 1;
      const under = ((y0 + out + y) * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        result[to + c] = y < blend ? Math.round(pixels[under + c] * (1 - t) + pixels[from + c] * t) : pixels[from + c];
      }
    }
  }
  Object.assign(p, { pixels: result, h: out });
}
loopDown(piece['fall-middle']);
loopDown(piece['fall-veil']);
const saved = [];
const save = async (name, outW) => {
  const p = piece[name];
  const outH = (p.h * outW) / p.w;
  await savePiece(p, join(OUT, `${name}.png`), outW, outH);
  saved.push(name);
  return outW / p.w;
};

// The wheel's rim: along a line between two spokes and two paddles, from the hub outward, the
// solid stretch past the first gap. Its middle is where the seats sit.
function rimShare(p) {
  const alpha = alphaOf(p);
  const cx = p.w / 2, cy = p.h / 2, half = p.w / 2;
  const angle = (33.75 * Math.PI) / 180;
  const solidAt = (r) => alpha[Math.round(cy - Math.sin(angle) * r) * p.w + Math.round(cx + Math.cos(angle) * r)] >= 128;
  let r = half * 0.3;
  while (r < half && solidAt(r)) r++; // past the hub
  while (r < half && !solidAt(r)) r++; // across the gap
  const inner = r;
  while (r < half && solidAt(r)) r++; // through the rim
  return (inner + r) / 2 / half;
}

// Where a seat's planks start: the first row with most of its middle third solid.
function seatTop(p, scale) {
  const alpha = alphaOf(p);
  for (let y = 0; y < p.h; y++) {
    let solid = 0;
    const from = Math.round(p.w / 3), to = Math.round((2 * p.w) / 3);
    for (let x = from; x < to; x++) if (alpha[y * p.w + x] >= 128) solid++;
    if (solid > (to - from) * 0.8) return Math.round(y * scale);
  }
  return 0;
}

const share = rimShare(piece['mill-wheel']);
await save('mill-wheel', (MILL_WHEEL.rimRadius / share) * 2);
const seatScale = await save('mill-seat', MILL_SEAT.width);
const stand = piece['mill-stand'];
await save('mill-stand', (stand.w * MILL_STAND.height) / stand.h);
await save('fall-middle', WATERFALL.width);
await save('fall-veil', WATERFALL.width * 1.4);
await save('fall-top', WATERFALL.width / WATERFALL.waterShare);
await save('fall-splash', WATERFALL.width * WATERFALL.splashShare);
for (const [name, width] of Object.entries(MILL_PROPS)) await save(name, width);
console.log(`Mill Falls art: ${saved.length} pictures. Measured: MILL_WHEEL.rimShare ${share.toFixed(3)}, MILL_SEAT.top ${seatTop(piece['mill-seat'], seatScale)}`);

// A review picture: every piece on a mid-green background, labelled.
if (REVIEW) {
  mkdirSync(REVIEW, { recursive: true });
  const tiles = await Promise.all(saved.map(async (name) => {
    const image = await sharp(join(OUT, `${name}.png`)).resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true }).toBuffer();
    const label = Buffer.from(`<svg width="320" height="30"><text x="160" y="22" font-size="18" font-family="sans-serif" text-anchor="middle" fill="#fff">${name}</text></svg>`);
    return { image, label };
  }));
  const cols = 4, cw = 320, ch = 340;
  const rows = Math.ceil(tiles.length / cols);
  const comps = tiles.flatMap(({ image, label }, i) => [
    { input: image, left: (i % cols) * cw + 10, top: Math.floor(i / cols) * ch + 30 },
    { input: label, left: (i % cols) * cw, top: Math.floor(i / cols) * ch },
  ]);
  await sharp({ create: { width: cols * cw, height: rows * ch, channels: 4, background: '#4f7a5a' } }).composite(comps).png().toFile(join(REVIEW, 'mill-art.png'));
  console.log(`Review picture: ${join(REVIEW, 'mill-art.png')}`);
}
