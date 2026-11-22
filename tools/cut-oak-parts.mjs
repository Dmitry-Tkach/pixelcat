// Cuts the Walking Oak's puppet parts (the owner's sheet, prompt
// prompts/autumn-level/hollow-oak/03-oak-parts.md) into public/assets/adventure/autumn/walking-oak/parts,
// for systems/adventure/oakRig.js, and measures where each part joins the others (its pivots), so the
// game can put the puppet together with no gaps:
// - a limb part (an arm's or a leg's) joins at its two ends, along its length: each end's pivot is the
//   middle of its solid pixels within END of that end (the shoulder and the elbow, the hip and the knee);
// - the trunk joins its legs at its bottom middle (the hips), its head at its top middle (the neck),
//   and its arms at its sides near the top (the shoulders: its outermost solid pixels in its top half);
// - a head joins the trunk at its bottom middle and the crown at its top middle; the crown joins the
//   head where its branches meet, measured in its middle third (its thin hanging vines would pull a
//   plain average aside).
// Writes parts.json: each part's size and pivots (px, in its own picture).
// Run: node tools/cut-oak-parts.mjs
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSheet } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEETS = ['images/sprites/walking-oak/oak-parts.png', 'images/levels/autumn/boss-design/oak-parts.png'];
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'autumn', 'walking-oak', 'parts');
// The parts, in rows as on the sheet. Limb parts are drawn lying along their length (the arm's) or
// standing (the leg's): `along` says which way, and which end comes first (the joint nearer the body).
const ROWS = [['trunk', 'crown'], ['head-asleep', 'head-awake', 'head-roar', 'head-dizzy', 'head-hurt'], ['upper-arm', 'forearm-open', 'forearm-fist'], ['thigh', 'lower-leg']];
const LIMBS = { 'upper-arm': 'x', 'forearm-open': 'x', 'forearm-fist': 'x', thigh: 'y', 'lower-leg': 'y' };
const END = 0.1; // the share of a part's length, at each end, whose solid pixels' middle is the joint
const TOP_HALF = 0.5; // the shoulders are in the trunk's top half
// The crown's stub: the lowest row of its middle third at least STUB_SHARE solid is its bottom, and
// the wood in the STUB px over it gives its middle.
const STUB_SHARE = 0.2, STUB = 30;

const sheet = SHEETS.map((f) => join(ROOT, f)).find(existsSync);
if (!sheet) { console.log('No oak-parts.png yet'); process.exit(0); }
mkdirSync(OUT, { recursive: true });
const parts = await readSheet(sheet, ROWS);
const solid = (p, x, y) => p.pixels[(y * p.w + x) * 4 + 3] >= 128;
// The middle of the solid pixels in a box of a part, or null.
const middleOf = (p, x0, y0, x1, y1) => {
  let sx = 0, sy = 0, n = 0;
  for (let y = Math.max(0, y0); y <= Math.min(p.h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(p.w - 1, x1); x++) if (solid(p, x, y)) { sx += x; sy += y; n++; }
  return n ? { x: Math.round(sx / n), y: Math.round(sy / n) } : null;
};
const manifest = {};
for (const [name, p] of Object.entries(parts)) {
  await sharp(p.pixels, { raw: { width: p.w, height: p.h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
  const pivots = {};
  if (LIMBS[name] === 'x') {
    const e = Math.round(p.w * END);
    pivots.start = middleOf(p, 0, 0, e, p.h - 1);
    pivots.end = middleOf(p, p.w - 1 - e, 0, p.w - 1, p.h - 1);
  } else if (LIMBS[name] === 'y') {
    const e = Math.round(p.h * END);
    pivots.start = middleOf(p, 0, 0, p.w - 1, e);
    pivots.end = middleOf(p, 0, p.h - 1 - e, p.w - 1, p.h - 1);
  } else if (name === 'trunk') {
    const e = Math.round(p.h * END);
    pivots.neck = middleOf(p, 0, 0, p.w - 1, e);
    pivots.hips = middleOf(p, 0, p.h - 1 - e, p.w - 1, p.h - 1);
    // Its shoulders: its outermost solid columns in its top half, at their middle height.
    const top = Math.round(p.h * TOP_HALF);
    let left = p.w, right = 0;
    for (let y = 0; y < top; y++) for (let x = 0; x < p.w; x++) if (solid(p, x, y)) { left = Math.min(left, x); right = Math.max(right, x); }
    pivots.shoulderBack = middleOf(p, left, 0, left + Math.round(p.w * END), top);
    pivots.shoulderFront = middleOf(p, right - Math.round(p.w * END), 0, right, top);
  } else if (name === 'crown') {
    // Where its branches meet: in its middle third, the lowest row that's mostly solid wood (its
    // stub's bottom), and the middle of the wood in the STUB px over it (both branches of the stub).
    const x0 = Math.round(p.w / 3), x1 = Math.round((p.w * 2) / 3);
    let bottom = p.h - 1;
    for (; bottom > 0; bottom--) {
      let n = 0;
      for (let x = x0; x <= x1; x++) if (solid(p, x, bottom)) n++;
      if (n >= (x1 - x0) * STUB_SHARE) break;
    }
    const stub = middleOf(p, x0, bottom - STUB, x1, bottom);
    pivots.bottom = { x: stub.x, y: bottom };
    pivots.top = middleOf(p, 0, 0, p.w - 1, Math.round(p.h * END));
  } else {
    // A head: its bottom middle (where it sits on the trunk) and its top middle (where the crown sits).
    const e = Math.round(p.h * END);
    pivots.bottom = middleOf(p, 0, p.h - 1 - e, p.w - 1, p.h - 1);
    pivots.top = middleOf(p, 0, 0, p.w - 1, e);
  }
  manifest[name] = { w: p.w, h: p.h, pivots };
  console.log(`${name}: ${p.w} x ${p.h}, ${Object.entries(pivots).map(([k, v]) => `${k} ${v.x},${v.y}`).join(', ')}`);
}
writeFileSync(join(OUT, 'parts.json'), JSON.stringify(manifest, null, 2));
