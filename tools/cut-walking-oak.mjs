// Cuts the Walking Oak's animation strips (the owner's ChatGPT pictures, prompts in
// prompts/autumn-level/hollow-oak) into frames for the game, in public/assets/adventure/autumn/walking-oak:
// - each strip is a grid of cells (4 x 2: one frame in each, left to right, top row first);
// - in each cell ChatGPT's faint haze is cleared (as tools/sheetPieces.mjs does), and only the oak is
//   kept: the pixels joined to its biggest piece, and their soft edge, not loose letters (a "Zzz")
//   or falling leaves (the game adds its own);
// - each strip is scaled so the oak stands OAK.height px tall (about 7 tiles in the game): its cells
//   are drawn OAK.fill of their height tall (as the prompts ask), so strips of one cell size share one
//   scale; never bigger than drawn unless the drawing was small (it says so);
// - every frame keeps its place in its cell (so a leap rises, a lunge reaches), the strip lined up on
//   one shared canvas by its ground line (its lowest feet) and its legs' middle (their average over
//   its frames), so the oak doesn't jitter, and its moves stay as drawn.
// Writes walking-oak.json: the frames of each animation, the canvas size and where its feet are.
// Run: node tools/cut-walking-oak.mjs
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blobs } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'autumn', 'walking-oak');
// The strips: where each is (the owner's drafts first, in boss-design), and its grid.
const STRIPS = ['asleep', 'waking', 'run', 'leap', 'lunge', 'stop-run', 'throw', 'smash'].map((name) => ({
  name, files: [`images/sprites/walking-oak/${name}.png`, `images/levels/autumn/boss-design/${name}.png`], cols: 4, rows: 2,
}));
// height: px the oak stands in its first frame (7 tiles of 64 is 448). foot: px of canvas under its
// feet. HAZE, SOLID: alpha below HAZE is haze, above SOLID the oak, between a soft edge. EDGE: px of
// soft edge kept round the oak's own shape. LEGS: the share of its height, from its feet, whose
// middle is where it's centred.
const OAK = { height: 448, foot: 6, fill: 0.94 };
const HAZE = 64, SOLID = 192, EDGE = 3, LEGS = 0.25, PAD = 8;

mkdirSync(OUT, { recursive: true });
const cut = [];
for (const strip of STRIPS) {
  const file = strip.files.map((f) => join(ROOT, f)).find(existsSync);
  if (!file) { console.log(`${strip.name}: not drawn yet`); continue; }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, cw = Math.floor(W / strip.cols), ch = Math.floor(H / strip.rows);
  const frames = [];
  for (let r = 0; r < strip.rows; r++) for (let c = 0; c < strip.cols; c++) {
    // The cell, its haze cleared.
    const px = Buffer.alloc(cw * ch * 4);
    const alpha = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const from = ((r * ch + y) * W + c * cw + x) * 4, to = (y * cw + x) * 4;
      data.copy(px, to, from, from + 4);
      const a = Math.max(0, Math.min(255, Math.round(((data[from + 3] - HAZE) * 255) / (SOLID - HAZE))));
      px[to + 3] = a;
      alpha[y * cw + x] = a;
    }
    // Only the oak: the solid pixels joined to its biggest piece (a flood fill from it), and the soft
    // edge round them; everything else goes (a "Zzz", a stray leaf, a mark), even inside its outline.
    const main = blobs(alpha, cw, ch)[0];
    const oak = new Uint8Array(cw * ch);
    let seed = -1;
    for (let i = main.y0 * cw + main.x0; i < cw * ch && seed < 0; i++) if (alpha[i] >= 128 && i % cw >= main.x0 && i % cw <= main.x1) seed = i;
    const stack = [seed];
    oak[seed] = 1;
    while (stack.length) {
      const p = stack.pop(), x = p % cw, y = (p / cw) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < cw - 1 ? p + 1 : -1, y > 0 ? p - cw : -1, y < ch - 1 ? p + cw : -1]) {
        if (q >= 0 && !oak[q] && alpha[q] >= 128) { oak[q] = 1; stack.push(q); }
      }
    }
    // Its soft edge: EDGE px round it.
    const kept = oak.slice();
    for (let pass = 0; pass < EDGE; pass++) {
      const grown = kept.slice();
      for (let i = 0; i < cw * ch; i++) {
        if (kept[i]) continue;
        const x = i % cw;
        if ((x > 0 && kept[i - 1]) || (x < cw - 1 && kept[i + 1]) || (i >= cw && kept[i - cw]) || (i + cw < cw * ch && kept[i + cw])) grown[i] = 1;
      }
      kept.set(grown);
    }
    let x0 = cw, x1 = 0, y0 = ch, y1 = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      if (!kept[i]) { px[i * 4 + 3] = 0; continue; }
      if (oak[i]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    }
    // Its legs' middle: the solid pixels in its lowest quarter.
    const legsTop = y1 - Math.round((y1 - y0) * LEGS);
    let sum = 0, n = 0;
    for (let y = legsTop; y <= y1; y++) for (let x = x0; x <= x1; x++) if (px[(y * cw + x) * 4 + 3] >= 128) { sum += x; n++; }
    frames.push({ px, cw, ch, x0, x1, y0, y1, legs: n ? sum / n : (x0 + x1) / 2 });
  }
  const scale = OAK.height / (ch * OAK.fill);
  // The strip's ground line (its lowest feet) and its legs' middle, in its cells.
  const ground = Math.max(...frames.map((f) => f.y1));
  const middle = frames.reduce((sum, f) => sum + f.legs, 0) / frames.length;
  console.log(`${strip.name}: ${frames.length} frames, cells ${cw} x ${ch}, scaled ${scale.toFixed(2)}${scale > 1.02 ? ' (BIGGER than drawn: ask for it drawn bigger)' : ''}`);
  cut.push({ ...strip, frames, scale, ground, middle });
}

// One canvas for every frame of every strip: wide and tall enough for the widest and tallest, its
// feet OAK.foot px over its bottom, its legs in its middle.
let left = 0, right = 0, up = 0;
for (const { frames, scale, ground, middle } of cut) for (const f of frames) {
  left = Math.max(left, (middle - f.x0) * scale);
  right = Math.max(right, (f.x1 - middle) * scale);
  up = Math.max(up, (ground - f.y0) * scale);
}
const half = Math.ceil(Math.max(left, right)) + PAD;
const canvasW = half * 2, canvasH = Math.ceil(up) + OAK.foot + PAD;
const manifest = { frameW: canvasW, frameH: canvasH, footY: canvasH - OAK.foot, anims: {} };
for (const { name, frames, scale, ground, middle } of cut) {
  manifest.anims[name] = { frames: frames.length };
  for (const [i, f] of frames.entries()) {
    const w = Math.round(f.cw * scale), h = Math.round(f.ch * scale);
    const scaled = await sharp(f.px, { raw: { width: f.cw, height: f.ch, channels: 4 } }).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
    // Where the cell goes: the strip's legs' middle at the canvas's middle, its ground on the feet line.
    let left0 = Math.round(half - middle * scale), top0 = Math.round(canvasH - OAK.foot - (ground + 1) * scale);
    // Clip it to the canvas (sharp needs every piece inside).
    const cx0 = Math.max(0, -left0), cy0 = Math.max(0, -top0);
    const cwid = Math.min(w - cx0, canvasW - Math.max(0, left0)), chei = Math.min(h - cy0, canvasH - Math.max(0, top0));
    const piece = await sharp(scaled).extract({ left: cx0, top: cy0, width: cwid, height: chei }).png().toBuffer();
    await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: piece, left: Math.max(0, left0), top: Math.max(0, top0) }])
      .png({ compressionLevel: 9 }).toFile(join(OUT, `${name}-${i}.png`));
  }
}
writeFileSync(join(OUT, 'walking-oak.json'), JSON.stringify(manifest, null, 2));
console.log(`Walking Oak: ${canvasW} x ${canvasH} frames, feet at ${manifest.footY}, in ${OUT}`);
