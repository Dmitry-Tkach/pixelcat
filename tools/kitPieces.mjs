// Helpers for cutting the owner's kits of pieces (the rock kit, tools/adventure-rock-kit.mjs; the
// earth pillar kit, tools/adventure-pillar-kit.mjs): scaling, moving, measuring, fading, looping
// a strip and matching colours. A piece is { pixels, w, h }, raw RGBA.
import sharp from 'sharp';

const SURFACE = 0.6; // a row is the rock's surface once this share of it is solid
const LOOP_WINDOW = 12; // px of columns compared to find where a strip's ends match
const LOOP_SEARCH = 0.3; // share of the strip, at each end, searched for the best match
const LOOP_KEEP = 0.7; // ...keeping at least this share of it, so it doesn't repeat too often
const LOOP_GOOD = 16; // a match this close (mean difference of a colour, 0 to 255) needs no blend
const LOOP_BLEND = 48; // px blended when no place matches

// ---- Pieces: { pixels, w, h } raw RGBA. ----
const at = (p, x, y) => (y * p.w + x) * 4;
export const solid = (p, x, y) => p.pixels[at(p, x, y) + 3] >= 128;

export async function scaled(p, k) {
  const w = Math.max(1, Math.round(p.w * k)), h = Math.max(1, Math.round(p.h * k));
  const { data } = await sharp(p.pixels, { raw: { width: p.w, height: p.h, channels: 4 } })
    .resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  return { pixels: data, w, h };
}
export const flipped = (p) => {
  const out = Buffer.alloc(p.pixels.length);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) p.pixels.copy(out, at(p, p.w - 1 - x, y), at(p, x, y), at(p, x, y) + 4);
  return { ...p, pixels: out };
};
// A piece moved inside a bigger (or smaller) canvas: `left`, `top` px of space added (or cut).
export function placed(p, w, h, left, top) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x - left, sy = y - top;
    if (sx >= 0 && sy >= 0 && sx < p.w && sy < p.h) p.pixels.copy(out, (y * w + x) * 4, at(p, sx, sy), at(p, sx, sy) + 4);
  }
  return { pixels: out, w, h };
}
export const crop = (p, x0, y0, w, h) => placed(p, w, h, -x0, -y0);

// The first row from the top, within columns x0..x1, where the rock's surface is.
export function surfaceRow(p, x0 = 0, x1 = p.w - 1) {
  for (let y = 0; y < p.h; y++) {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (solid(p, x, y)) n++;
    if (n >= SURFACE * (x1 - x0 + 1)) return y;
  }
  return 0;
}
// Where its side line is, within rows y0..y1: the x that the first solid pixel from the left is
// left of in nearly every row (INNER of them), so the rock covers the fill's straight edge there and
// its boulders bulge out past it.
const INNER = 0.97;
export function leftOutline(p, y0 = 0, y1 = p.h - 1) {
  const firsts = [];
  for (let y = y0; y <= y1; y++) for (let x = 0; x < p.w; x++) if (solid(p, x, y)) { firsts.push(x); break; }
  firsts.sort((a, b) => a - b);
  return firsts.length ? firsts[Math.min(firsts.length - 1, Math.floor(firsts.length * INNER))] : 0;
}

// Fades a piece's alpha to nothing over `px` along each of `sides` (left, right, top, bottom).
export function fade(p, sides, px) {
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    let keep = 1;
    if (sides.includes('left')) keep = Math.min(keep, x / px);
    if (sides.includes('right')) keep = Math.min(keep, (p.w - 1 - x) / px);
    if (sides.includes('top')) keep = Math.min(keep, y / px);
    if (sides.includes('bottom')) keep = Math.min(keep, (p.h - 1 - y) / px);
    if (keep < 1) p.pixels[at(p, x, y) + 3] = Math.round(p.pixels[at(p, x, y) + 3] * Math.max(0, keep));
  }
}
// Makes a strip loop along its length (horizontal: left to right; else top to bottom): finds the
// two places, one near each end, where it matches itself best, and keeps what's between them. If
// even the best match shows, it blends its far end into its start instead.
export function looped(p, horizontal) {
  const len = horizontal ? p.w : p.h, across = horizontal ? p.h : p.w;
  const px = (i, j) => (horizontal ? at(p, i, j) : at(p, j, i));
  const differ = (a, b) => {
    let d = 0, n = 0;
    for (let k = 0; k < LOOP_WINDOW; k++) for (let j = 0; j < across; j += 2) {
      const ia = px(a + k, j), ib = px(b + k, j);
      if (p.pixels[ia + 3] < 128 && p.pixels[ib + 3] < 128) continue;
      for (let c = 0; c < 4; c++) d += Math.abs(p.pixels[ia + c] - p.pixels[ib + c]);
      n += 4;
    }
    return n ? d / n : 0;
  };
  const reach = Math.round(len * LOOP_SEARCH);
  let best = { d: Infinity };
  for (let a = 2; a < reach; a += 2) for (let b = len - reach; b < len - LOOP_WINDOW - 2; b += 2) {
    if (b - a < len * LOOP_KEEP) continue;
    const d = differ(a, b);
    if (d < best.d) best = { d, a, b };
  }
  const { a, b } = best;
  let out = horizontal ? crop(p, a, 0, b - a, p.h) : crop(p, 0, a, p.w, b - a);
  let how = `cut at ${a} and ${b} (difference ${best.d.toFixed(1)})`;
  if (best.d > LOOP_GOOD) {
    // Blend: the first rows (or columns) fade from what lies past the end into their own.
    const n = (horizontal ? out.w : out.h) - LOOP_BLEND;
    const blended = horizontal ? crop(out, 0, 0, n, out.h) : crop(out, 0, 0, out.w, n);
    for (let i = 0; i < LOOP_BLEND; i++) for (let j = 0; j < across; j++) {
      const t = i / LOOP_BLEND;
      const to = horizontal ? at(blended, i, j) : at(blended, j, i);
      const own = horizontal ? at(out, i, j) : at(out, j, i), under = horizontal ? at(out, n + i, j) : at(out, j, n + i);
      for (let c = 0; c < 4; c++) blended.pixels[to + c] = Math.round(out.pixels[under + c] * (1 - t) + out.pixels[own + c] * t);
    }
    out = blended;
    how += `, ends blended over ${LOOP_BLEND} px`;
  }
  return { piece: out, how };
}

// The mean and spread of each colour over the rock (not moss or leaves) in pieces.
export function rockColour(pieces) {
  const sum = [0, 0, 0], sq = [0, 0, 0];
  let n = 0;
  for (const p of pieces) for (let i = 0; i < p.w * p.h; i++) {
    const [r, g, b, a] = p.pixels.subarray(i * 4, i * 4 + 4);
    if (a < 250 || g > r) continue; // moss and leaves are greener than red
    for (let c = 0; c < 3; c++) { const v = p.pixels[i * 4 + c]; sum[c] += v; sq[c] += v * v; }
    n++;
  }
  const mean = sum.map((s) => s / n);
  return { mean, spread: sq.map((s, c) => Math.sqrt(Math.max(1, s / n - mean[c] ** 2))) };
}
// Moves a piece's colours to have `to`'s mean and spread, from `from`'s.
export function matched(p, from, to) {
  for (let i = 0; i < p.w * p.h; i++) for (let c = 0; c < 3; c++) {
    const v = (p.pixels[i * 4 + c] - from.mean[c]) / from.spread[c] * to.spread[c] + to.mean[c];
    p.pixels[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
  }
  return p;
}

export const save = (p, file) => sharp(p.pixels, { raw: { width: p.w, height: p.h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);

