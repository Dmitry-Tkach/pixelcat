// Cuts a world's rock kit (data/adventure/rocks.js, ROCK_KITS) from the owner's four sheets into
// public/assets/adventure/<world>, ready for systems/adventure/AdventureRocks.js:
// - every piece at its sheet's scale, smaller than drawn, with ChatGPT's haze cleared;
// - the fill colour-matched to the rock of the edges and sides (it was drawn apart from them), and
//   the loose boulders and pebbles too, so the kit is one rock;
// - the strips made to loop: cut where their two ends match best, or, if no place matches, their
//   ends blended into each other;
// - each piece measured (where its surface is, where its side is) and padded so it lines up as
//   ROCK says (lip, out, an inner corner's wall at its middle, the foam's sink);
// - the edges where a piece ends in the middle of rock faded, so it melts into the fill.
// Run: node tools/adventure-rock-kit.mjs (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROCK, ROCK_KITS } from '../src/data/adventure/rocks.js';
import { readSheet } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SURFACE = 0.6; // a row is the rock's surface once this share of it is solid
const LOOP_WINDOW = 12; // px of columns compared to find where a strip's ends match
const LOOP_SEARCH = 0.3; // share of the strip, at each end, searched for the best match
const LOOP_KEEP = 0.7; // ...keeping at least this share of it, so it doesn't repeat too often
const LOOP_GOOD = 16; // a match this close (mean difference of a colour, 0 to 255) needs no blend
const LOOP_BLEND = 48; // px blended when no place matches

// ---- Pieces: { pixels, w, h } raw RGBA. ----
const at = (p, x, y) => (y * p.w + x) * 4;
const solid = (p, x, y) => p.pixels[at(p, x, y) + 3] >= 128;

async function scaled(p, k) {
  const w = Math.max(1, Math.round(p.w * k)), h = Math.max(1, Math.round(p.h * k));
  const { data } = await sharp(p.pixels, { raw: { width: p.w, height: p.h, channels: 4 } })
    .resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  return { pixels: data, w, h };
}
const flipped = (p) => {
  const out = Buffer.alloc(p.pixels.length);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) p.pixels.copy(out, at(p, p.w - 1 - x, y), at(p, x, y), at(p, x, y) + 4);
  return { ...p, pixels: out };
};
// A piece moved inside a bigger (or smaller) canvas: `left`, `top` px of space added (or cut).
function placed(p, w, h, left, top) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x - left, sy = y - top;
    if (sx >= 0 && sy >= 0 && sx < p.w && sy < p.h) p.pixels.copy(out, (y * w + x) * 4, at(p, sx, sy), at(p, sx, sy) + 4);
  }
  return { pixels: out, w, h };
}
const crop = (p, x0, y0, w, h) => placed(p, w, h, -x0, -y0);

// The first row from the top, within columns x0..x1, where the rock's surface is.
function surfaceRow(p, x0 = 0, x1 = p.w - 1) {
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
function leftOutline(p, y0 = 0, y1 = p.h - 1) {
  const firsts = [];
  for (let y = y0; y <= y1; y++) for (let x = 0; x < p.w; x++) if (solid(p, x, y)) { firsts.push(x); break; }
  firsts.sort((a, b) => a - b);
  return firsts.length ? firsts[Math.min(firsts.length - 1, Math.floor(firsts.length * INNER))] : 0;
}

// Fades a piece's alpha to nothing over `px` along each of `sides` (left, right, top, bottom).
function fade(p, sides, px = ROCK.fade) {
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
function looped(p, horizontal) {
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
function rockColour(pieces) {
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
function matched(p, from, to) {
  for (let i = 0; i < p.w * p.h; i++) for (let c = 0; c < 3; c++) {
    const v = (p.pixels[i * 4 + c] - from.mean[c]) / from.spread[c] * to.spread[c] + to.mean[c];
    p.pixels[i * 4 + c] = Math.max(0, Math.min(255, Math.round(v)));
  }
  return p;
}

const save = (p, file) => sharp(p.pixels, { raw: { width: p.w, height: p.h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);

for (const [world, kit] of Object.entries(ROCK_KITS)) {
  const sheets = join(ROOT, 'images', 'levels', world);
  const OUT = join(ROOT, 'public', 'assets', 'adventure', world);
  const file = (sheet) => join(sheets, `${sheet}.png`);
  if (![kit.fill, kit.edges, kit.sides, kit.decoration].every(({ sheet }) => existsSync(file(sheet)))) {
    console.log(`${world}: its rock kit isn't all drawn yet`);
    continue;
  }
  mkdirSync(OUT, { recursive: true });
  const sheet = async ({ sheet: name, pieces, scale }) => {
    const found = await readSheet(file(name), pieces);
    for (const key of Object.keys(found)) found[key] = await scaled(found[key], scale);
    return found;
  };
  const edges = await sheet(kit.edges), sides = await sheet(kit.sides), decor = await sheet(kit.decoration);
  const rock = rockColour([edges['rock-water'], sides['rock-side']]);

  // The fill: the whole square, scaled, colour-matched. It repeats as it was drawn.
  const { data, info } = await sharp(file(kit.fill.sheet)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const fill = await scaled({ pixels: data, w: info.width, h: info.height }, kit.fill.scale);
  await save(matched(fill, rockColour([fill]), rock), join(OUT, 'rock-fill.png'));

  // The top: looped side to side, its surface at `lip`, its cut bottom faded.
  {
    const { piece, how } = looped(edges['rock-top'], true);
    const top = placed(piece, piece.w, piece.h - surfaceRow(piece) + ROCK.lip, 0, ROCK.lip - surfaceRow(piece));
    fade(top, ['bottom']);
    await save(top, join(OUT, 'rock-top.png'));
    console.log(`${world} rock top: ${top.w} x ${top.h}, ${how}`);
  }
  // The waterline: looped, cut off at the foot of its foam (its last mostly-solid row) plus the
  // sink, its cut top faded.
  {
    const { piece, how } = looped(edges['rock-water'], true);
    let foot = piece.h - 1;
    while (foot > 0) { let n = 0; for (let x = 0; x < piece.w; x++) if (solid(piece, x, foot)) n++; if (n >= 0.3 * piece.w) break; foot--; }
    const water = crop(piece, 0, 0, piece.w, foot + 1);
    fade(water, ['top']);
    await save(water, join(OUT, 'rock-water.png'));
    console.log(`${world} rock waterline: ${water.w} x ${water.h}, ${how}`);
  }
  // The side: looped top to bottom, its side line at `out`, its cut inner edge faded.
  {
    const { piece, how } = looped(sides['rock-side'], false);
    const side = placed(piece, piece.w - Math.round(leftOutline(piece)) + ROCK.out, piece.h, ROCK.out - Math.round(leftOutline(piece)), 0);
    fade(side, ['right']);
    await save(side, join(OUT, 'rock-side.png'));
    // Its cap: its start, faded in from the top, so a side grows out from under its corner.
    const cap = crop(side, 0, 0, side.w, ROCK.cap);
    fade(cap, ['top'], ROCK.cap / 2);
    await save(cap, join(OUT, 'rock-side-cap.png'));
    console.log(`${world} rock side: ${side.w} x ${side.h}, ${how}`);
  }
  // The outer corners: surface at `lip` (measured over the ledge, away from the side), side line at
  // `out` from their outer edge (the right one measured mirrored), cut edges faded.
  for (const [name, right] of [['rock-corner-left', false], ['rock-corner-right', true]]) {
    let p = right ? flipped(sides[name]) : sides[name];
    const surface = surfaceRow(p, Math.round(p.w * 0.45), p.w - 1);
    const outline = leftOutline(p, surface + Math.round((p.h - surface) / 3), p.h - 1);
    fade(p, ['right', 'bottom']); // where it goes on into the top strip and the fill
    p = placed(p, p.w - Math.round(outline) + ROCK.out, p.h - surface + ROCK.lip, ROCK.out - Math.round(outline), ROCK.lip - surface);
    await save(right ? flipped(p) : p, join(OUT, `${name}.png`));
  }
  // The inner corners: the ledge's surface at `lip`, the wall's face at the middle, cut edges faded.
  // The right one (wall on its right) is measured as drawn; the left one mirrored to match.
  for (const [name, wallLeft] of [['rock-inner-right', false], ['rock-inner-left', true]]) {
    let p = wallLeft ? flipped(sides[name]) : sides[name];
    const surface = surfaceRow(p, 0, Math.round(p.w * 0.35));
    // The wall's face: where the rock begins, from the left, in the rows over the ledge.
    let face = p.w, y0 = Math.round(surface * 0.3), y1 = Math.max(y0, surface - 12);
    for (let y = y0; y <= y1; y++) for (let x = 0; x < p.w; x++) if (solid(p, x, y)) { face = Math.min(face, x); break; }
    const half = Math.max(face, p.w - face);
    fade(p, ['left', 'right', 'top', 'bottom']); // the ledge, the wall and the rock under go on past it
    p = placed(p, half * 2, p.h - surface + ROCK.lip, half - face, ROCK.lip - surface);
    await save(wallLeft ? flipped(p) : p, join(OUT, `${name}.png`));
  }
  // The decoration: as cut; the boulders and pebbles colour-matched to the rock.
  for (const [name, p] of Object.entries(decor)) {
    await save(/boulder|pebbles/.test(name) ? matched(p, rockColour([p]), rock) : p, join(OUT, `${name}.png`));
  }
  console.log(`${world}: rock kit cut, ${7 + Object.keys(decor).length} pieces`);
}
