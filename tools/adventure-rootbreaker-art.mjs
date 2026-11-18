// Cuts the owner's Rootbreaker sheet (images/levels/forest/boss/root-breacker.png, from
// prompts/forest-level/16-rootbreaker.md) into his parts (data/adventure/rootbreaker.js), at the
// size they're drawn on the sheet: the game scales them (ROOTBREAKER.scale). His arms come from a
// second sheet (images/levels/forest/guardian-parts.png); from each fist it also makes its target
// unlit (stone) and cracked. It measures where his
// face and his core sit on his body, and prints them, to copy into rootbreaker.js:
//   the face: where the calm face matches the body's own face best;
//   the core: the middle of the hole in his chest.
// Run: node tools/adventure-rootbreaker-art.mjs [folder for a review picture] (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RB_ARM_PIECES, RB_ART, RB_FIST_JOINTS, RB_PIECES } from '../src/data/adventure/rootbreaker.js';
import { alphaOf, readSheet, savePiece } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(ROOT, 'images', 'levels', 'forest', 'boss', 'root-breacker.png');
const ARMS = join(ROOT, 'images', 'levels', 'forest', 'guardian-parts.png'); // his arms' pieces
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'bosses', 'rootbreaker');
const REVIEW = process.argv[2];
// A fist's target, the green cross and ring round its middle (px on the owner's fist): `arm` is how
// far each arm of the cross reaches and `bar` how wide it is; `ring` the ring's reach.
const TARGET = { arm: 66, bar: 16, ring: 38 };
const STONE = [128, 120, 106]; // an unlit target: carved into the stone, this colour at its lightest

// The fist with its target unlit: inside the cross and ring, the green turns to carved stone, as
// light as it was, but darker; the moss round it is left alone.
function unlit({ pixels, w, h }, middle) {
  const out = Buffer.from(pixels);
  const cx = middle.x * w, cy = middle.y * h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
    const inCross = (dx < TARGET.bar / 2 && dy < TARGET.arm) || (dy < TARGET.bar / 2 && dx < TARGET.arm);
    if (!inCross && Math.hypot(dx, dy) > TARGET.ring) continue;
    const i = (y * w + x) * 4;
    const [r, g, b] = [out[i], out[i + 1], out[i + 2]];
    if (Math.max(r, g, b) - Math.min(r, g, b) < 40) continue; // grey already: the stone
    const light = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(STONE[c] * (0.35 + 0.4 * light));
  }
  return { pixels: out, w, h };
}

// The unlit fist, cracked through its target: dark cracks from the middle, with a light edge.
async function cracked({ pixels, w, h }, middle, dir) {
  const cx = middle.x * w, cy = middle.y * h;
  const lines = [
    [[0, 0], [22, -18], [30, -44], [52, -60]],
    [[0, 0], [-16, 12], [-40, 16], [-58, 40]],
    [[0, 0], [10, 24], [4, 52]],
    [[22, -18], [46, -12]],
  ];
  const path = (pts, dx, dy) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(cx + x * dir + dx).toFixed(1)},${(cy + y + dy).toFixed(1)}`).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    ${lines.map((pts) => `<path d="${path(pts, 1.5, 1.5)}" stroke="#d8cdb4" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>`).join('')}
    ${lines.map((pts) => `<path d="${path(pts, 0, 0)}" stroke="#2a2418" stroke-width="5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
  </svg>`;
  const raw = { raw: { width: w, height: h, channels: 4 } };
  // Only over the fist itself: the cracks are cut to its own shape.
  const drawn = await sharp(pixels, raw).composite([{ input: Buffer.from(svg) }]).raw().toBuffer();
  for (let i = 3; i < drawn.length; i += 4) drawn[i] = pixels[i];
  return { pixels: drawn, w, h };
}

if (!existsSync(SHEET)) {
  console.log('No Rootbreaker sheet (images/levels/forest/boss/root-breacker.png): he has no pictures yet');
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const piece = await readSheet(SHEET, RB_PIECES);
Object.assign(piece, await readSheet(ARMS, RB_ARM_PIECES));
for (const side of ['r', 'l']) {
  const fist = piece[`rb-${side}-fist`];
  const middle = { x: side === 'r' ? RB_FIST_JOINTS.end.x : 1 - RB_FIST_JOINTS.end.x, y: RB_FIST_JOINTS.end.y };
  piece[`rb-${side}-fist-dim`] = unlit(fist, middle);
  piece[`rb-${side}-fist-cracked`] = await cracked(piece[`rb-${side}-fist-dim`], middle, side === 'r' ? 1 : -1);
}
for (const name of RB_ART) await savePiece(piece[name], join(OUT, `${name}.png`), piece[name].w, piece[name].h);
// Pieces no longer used (his old arms, fists and seals) are cleared away.
for (const file of readdirSync(OUT)) if (!RB_ART.includes(file.replace(/\.png$/, ''))) rmSync(join(OUT, file));

// The hole in his chest: transparent pixels inside his body that the outside can't reach.
const body = piece['rb-body'];
const alpha = alphaOf(body);
const outside = new Uint8Array(body.w * body.h);
const todo = [];
for (let x = 0; x < body.w; x++) todo.push(x, (body.h - 1) * body.w + x);
for (let y = 0; y < body.h; y++) todo.push(y * body.w, y * body.w + body.w - 1);
while (todo.length) {
  const p = todo.pop();
  if (outside[p] || alpha[p] >= 128) continue;
  outside[p] = 1;
  const x = p % body.w, y = (p / body.w) | 0;
  if (x > 0) todo.push(p - 1);
  if (x < body.w - 1) todo.push(p + 1);
  if (y > 0) todo.push(p - body.w);
  if (y < body.h - 1) todo.push(p + body.w);
}
let sx = 0, sy = 0, n = 0;
for (let p = 0; p < body.w * body.h; p++) if (alpha[p] < 128 && !outside[p]) { sx += p % body.w; sy += (p / body.w) | 0; n++; }
const core = { x: sx / n / body.w, y: sy / n / body.h };

// The face: slide the calm face over the body's upper half, and keep where the colours match best.
const face = piece['rb-face-calm'];
const at = (p, x, y) => p.pixels.subarray((y * p.w + x) * 4, (y * p.w + x) * 4 + 4);
let best = { err: Infinity };
for (let oy = -20; oy < body.h / 2; oy += 2) {
  for (let ox = -40; ox < body.w - face.w + 40; ox += 2) {
    let err = 0, count = 0;
    for (let y = 0; y < face.h; y += 6) {
      for (let x = 0; x < face.w; x += 6) {
        const bx = ox + x, by = oy + y;
        if (bx < 0 || by < 0 || bx >= body.w || by >= body.h) continue;
        const f = at(face, x, y), b = at(body, bx, by);
        if (f[3] < 200 || b[3] < 200) continue;
        err += Math.abs(f[0] - b[0]) + Math.abs(f[1] - b[1]) + Math.abs(f[2] - b[2]);
        count++;
      }
    }
    if (count > 200 && err / count < best.err) best = { err: err / count, ox, oy };
  }
}
const faceAt = { x: (best.ox + face.w / 2) / body.w, y: (best.oy + face.h / 2) / body.h };
console.log(`Rootbreaker: ${RB_ART.length} pieces. Measured: core ${JSON.stringify({ x: +core.x.toFixed(3), y: +core.y.toFixed(3) })}, face ${JSON.stringify({ x: +faceAt.x.toFixed(3), y: +faceAt.y.toFixed(3) })} (match ${best.err.toFixed(1)})`);

if (REVIEW) {
  mkdirSync(REVIEW, { recursive: true });
  const names = RB_ART;
  const comps = await Promise.all(names.map(async (name, i) => ({
    input: await sharp(join(OUT, `${name}.png`)).resize({ width: 280, height: 280, fit: 'inside' }).toBuffer(),
    left: (i % 4) * 300 + 10, top: Math.floor(i / 4) * 300 + 10,
  })));
  // And the body with the calm face and the open core placed where measured, to check the fit.
  const W = body.w, H = body.h;
  const coreImg = await sharp(join(OUT, 'rb-core-open.png')).toBuffer();
  const { width: cw, height: chh } = await sharp(coreImg).metadata();
  const fit = await sharp(join(OUT, 'rb-body.png')).composite([
    { input: await sharp(join(OUT, 'rb-face-blast.png')).toBuffer(), left: Math.round(faceAt.x * W - face.w / 2), top: Math.max(0, Math.round(faceAt.y * H - face.h / 2)) },
    { input: coreImg, left: Math.round(core.x * W - cw / 2), top: Math.round(core.y * H - chh / 2) },
  ]).png().toBuffer();
  comps.push({ input: await sharp(fit).resize({ width: 560 }).toBuffer(), left: 1220, top: 10 });
  await sharp({ create: { width: 1800, height: Math.ceil(names.length / 4) * 300 + 20, channels: 4, background: '#3f6f4a' } }).composite(comps).png().toFile(join(REVIEW, 'rootbreaker.png'));
  console.log(`Review picture: ${join(REVIEW, 'rootbreaker.png')}`);
}
