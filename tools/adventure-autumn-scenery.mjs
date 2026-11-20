// Cuts the owner's Autumn Forest scenery sheets (data/adventure/autumnArt.js, AUTUMN_SHEETS) into
// the Autumn world's pictures, each at the size it's shown in the game (AUTUMN_PIECES). A piece
// named like a stand-in drawn by tools/adventure-autumn-art.mjs (the vine, the switch...) replaces
// it. It measures the places the gates need inside the pictures (the Guardian Gate's opening, where
// the banner hangs) and prints them, to copy into data/adventure/gates.js.
// Run: node tools/adventure-autumn-scenery.mjs (part of npm run assets, after adventure-autumn-art).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTUMN_PIECES, AUTUMN_SHEETS, PIER_TILE } from '../src/data/adventure/autumnArt.js';
import { TILES } from '../src/systems/adventureMap.js';
import { readSheet, savePiece } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEETS = join(ROOT, 'images', 'levels', 'autumn');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'autumn');
const STRAY = 0.05; // a blob touching a piece's edge, smaller than this share of the piece, is a neighbour's

mkdirSync(OUT, { recursive: true });
const piece = {};
for (const [sheet, names] of Object.entries(AUTUMN_SHEETS)) {
  const file = join(SHEETS, `${sheet}.png`);
  if (!existsSync(file)) { console.log(`No ${sheet}.png yet: its stand-ins stay`); continue; }
  Object.assign(piece, await readSheet(file, names));
}

// Clears bits of a neighbouring piece that touched this one on the sheet: small blobs at its edge.
function clearStrays({ pixels, w, h }) {
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
  for (const g of groups) if (g.edge && g.members.length < biggest * STRAY) for (const q of g.members) pixels[q * 4 + 3] = 0;
}

// The size a piece is saved at: AUTUMN_PIECES gives its width, its height or both; a banner takes
// the pole's scale.
const poleScale = piece['banner-pole'] ? AUTUMN_PIECES['banner-pole'].height / piece['banner-pole'].h : 1;
function sizeOf(name, p) {
  const want = AUTUMN_PIECES[name] ?? {};
  if (want.withPole) return { w: p.w * poleScale, h: p.h * poleScale };
  if (want.width && want.height) return { w: want.width, h: want.height };
  if (want.width) return { w: want.width, h: (p.h * want.width) / p.w };
  if (want.height) return { w: (p.w * want.height) / p.h, h: want.height };
  return { w: p.w, h: p.h };
}

for (const [name, p] of Object.entries(piece)) {
  clearStrays(p);
  const { w, h } = sizeOf(name, p);
  await savePiece(p, join(OUT, `${name}.png`), w, h);
}

// The pier deck as the bridge tile in the tile strip (tools/adventure-autumn-art.mjs built it with
// the pack's bridge): the deck's middle slice, at the top of the tile.
if (piece['pier-deck']) {
  const TILE = 64;
  const strip = join(OUT, 'tiles.png');
  const deck = join(OUT, 'pier-deck.png');
  const { width, height } = await sharp(deck).metadata();
  const slice = await sharp(deck).extract({ left: Math.round((width - PIER_TILE.slice) / 2), top: 0, width: PIER_TILE.slice, height: Math.min(height, TILE) }).png().toBuffer();
  const tile = await sharp({ create: { width: TILE, height: TILE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: slice, left: 0, top: 0 }]).png().toBuffer();
  const { width: stripW } = await sharp(strip).metadata();
  const at = TILES.bridge * TILE;
  const left = await sharp(strip).extract({ left: 0, top: 0, width: at, height: TILE }).png().toBuffer();
  const right = await sharp(strip).extract({ left: at + TILE, top: 0, width: stripW - at - TILE, height: TILE }).png().toBuffer();
  const rebuilt = await sharp({ create: { width: stripW, height: TILE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: left, left: 0, top: 0 }, { input: tile, left: at, top: 0 }, { input: right, left: at + TILE, top: 0 }]).png({ compressionLevel: 9 }).toBuffer();
  await sharp(rebuilt).toFile(strip);
}

// The Guardian Gate's opening: the see-through space inside its arch, found from the middle of the
// picture at OPENING_FROM of its height. Its middle and width as shares of the picture, for the
// portal's swirl, and its box, for the door.
const OPENING_FROM = 0.6;
const gate = piece['guardian-gate'];
if (gate) {
  const { pixels, w, h } = gate;
  const open = (i) => pixels[i * 4 + 3] < 128;
  const start = Math.round(h * OPENING_FROM) * w + Math.round(w / 2);
  const seen = new Uint8Array(w * h);
  const stack = [start];
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  while (stack.length) {
    const q = stack.pop();
    if (seen[q] || !open(q)) continue;
    seen[q] = 1;
    const x = q % w, y = (q / w) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (x > 0) stack.push(q - 1);
    if (x < w - 1) stack.push(q + 1);
    if (y > 0) stack.push(q - w);
    if (y < h - 1) stack.push(q + w);
  }
  const f = (v, of) => +(v / of).toFixed(3);
  console.log(`Guardian Gate: hole ${JSON.stringify({ x: f((x0 + x1) / 2, w), y: f((y0 + y1) / 2, h), size: f(x1 - x0, w) })}, door box ${JSON.stringify({ x0: f(x0, w), y0: f(y0, h), x1: f(x1, w), y1: f(y1, h) })}`);
}
// The banner: hung centred under the pole's crossbar.
if (piece['banner-pole'] && piece['banner-open']) {
  const pole = piece['banner-pole'].w, open = piece['banner-open'].w;
  console.log(`Banner: flag.x ${((pole - open) / 2 / pole).toFixed(3)}`);
}
console.log(`Autumn scenery: ${Object.keys(piece).length} pieces cut`);
