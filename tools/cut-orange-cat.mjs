// Cuts the orange cat boss's sprite sheet into game frames.
// The sheet has real transparency, but some frames touch their neighbors (muzzle flashes, glows),
// so every frame is cut at a hand-picked line rather than found automatically.
// Run: node tools/cut-orange-cat.mjs [folder for a review image]
// Output: images/sprites/orange-cat/Idle (n).png and so on. The sheet is left alone.
import sharp from 'sharp';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(ROOT, 'images', 'sprites', 'bos-cat', 'new-boss', 'orange-cat.png');
const OUT = join(ROOT, 'images', 'sprites', 'orange-cat');

// The rows of the sheet, top to bottom: [top, bottom] in sheet pixels.
const ROWS = { a: [10, 182], b: [205, 372], c: [398, 597], d: [622, 799], e: [815, 999] };

// The name tags on the sheet (IDLE, RUN, ...), which are cleared before cutting.
const LABELS = [
  [20, 13, 115, 47], [656, 13, 740, 47], [20, 210, 120, 244], [1034, 210, 1272, 244],
  [20, 400, 92, 434], [633, 400, 758, 434], [20, 630, 148, 664], [970, 630, 1048, 664],
  [20, 823, 106, 857], [517, 823, 604, 857], [946, 823, 1128, 857],
];

// Each animation is a row and the lines between its frames.
const ANIMS = [
  { name: 'Idle', row: 'a', cuts: [14, 146, 275, 402, 538] },
  { name: 'Run', row: 'a', cuts: [638, 808, 938, 1078, 1201, 1345, 1512] },
  { name: 'Shoot', row: 'b', cuts: [20, 172, 318, 479, 610, 754, 895, 1032] },
  { name: 'Spray', row: 'b', cuts: [1045, 1182, 1299, 1427, 1532] },
  { name: 'Hit', row: 'c', cuts: [22, 155, 307, 452] },
  { name: 'Rage', row: 'c', cuts: [634, 812, 991, 1231, 1470] },
  { name: 'Defeated', row: 'd', cuts: [20, 150, 290, 425, 566, 714, 874] },
  // In the two mid-air frames, the dust he kicks up stays on the ground, so it's left out.
  { name: 'Jump', row: 'd', cuts: [968, 1097, 1226, 1370, 1512], airborne: [2, 3] },
  { name: 'Slide', row: 'e', cuts: [12, 138, 256, 368, 502] },
  { name: 'Dash', row: 'e', cuts: [510, 674, 806, 932] },
  { name: 'Charge', row: 'e', cuts: [936, 1059, 1160, 1256, 1372] },
  // The blue beam, on its own after the charge-up frames.
  { name: 'Beam', row: 'e', cuts: [1372, 1530] },
];

const PADDING = 4;
const BELOW_FEET = 12; // room under his feet. Match it in src/entities/Boss.js
const SOLID = 200; // alpha at which a pixel is part of him, not glow or shadow
const FEATHER = 10; // glows cut at a frame's edge fade out over this many pixels
const SCRAP = 1500; // pieces at a frame's edge smaller than this, with no fur, belong to its neighbor
const isFur = (r, g, b) => r > 170 && g > 70 && g < 185 && b < 110;
const isOutline = (r, g, b) => Math.max(r, g, b) < 90;

// Clears what a frame's neighbors left inside its edges, and fades glows cut by its edges.
function tidy(px, w, h, airborne) {
  const at = (x, y) => (y * w + x) * 4;
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || px[start * 4 + 3] <= 8) continue;
    const stack = [start];
    const piece = [];
    let fur = 0, edge = false;
    seen[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      piece.push(p);
      const x = p % w, y = (p - x) / w;
      if (x === 0 || x === w - 1) edge = true;
      if (isFur(px[p * 4], px[p * 4 + 1], px[p * 4 + 2])) fur += 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (!seen[q] && px[q * 4 + 3] > 8) { seen[q] = 1; stack.push(q); }
        }
      }
    }
    if (edge && fur === 0 && piece.length < SCRAP) piece.forEach((p) => { px[p * 4 + 3] = 0; });
  }
  if (airborne) {
    let feet = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = at(x, y);
      if (px[i + 3] >= SOLID && isFur(px[i], px[i + 1], px[i + 2])) feet = Math.max(feet, y);
    }
    for (let y = feet + 8; y < h; y++) for (let x = 0; x < w; x++) px[at(x, y) + 3] = 0;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      if (isFur(px[i], px[i + 1], px[i + 2]) || isOutline(px[i], px[i + 1], px[i + 2])) continue;
      const fromEdge = Math.min(x, w - 1 - x);
      if (fromEdge < FEATHER) px[i + 3] = Math.round(px[i + 3] * (fromEdge / FEATHER));
    }
  }
}

async function main() {
  const reviewDir = process.argv[2];
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  for (const [x0, y0, x1, y1] of LABELS) {
    for (let y = y0 - 2; y <= y1 + 2; y++) for (let x = x0 - 2; x <= x1 + 2; x++) data[(y * W + x) * 4 + 3] = 0;
  }

  mkdirSync(OUT, { recursive: true });
  for (const old of readdirSync(OUT)) if (old.endsWith('.png')) rmSync(join(OUT, old));

  const tiles = [];
  for (const { name, row, cuts, airborne = [] } of ANIMS) {
    const [top, bottom] = ROWS[row];
    const frames = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const left = cuts[i];
      const right = cuts[i + 1] - 1;
      // He's placed by the middle of his fur, so a muzzle flash or a glow doesn't shift him.
      let furX = 0, fur = 0, solidX = 0, solid = 0, x0 = right, x1 = left, y0 = bottom, feet = top;
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          const i4 = (y * W + x) * 4;
          const a = data[i4 + 3];
          if (a > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); }
          if (a < SOLID) continue;
          solidX += x; solid += 1;
          feet = Math.max(feet, y);
          if (isFur(data[i4], data[i4 + 1], data[i4 + 2])) { furX += x; fur += 1; }
        }
      }
      const anchor = Math.round(fur > 400 ? furX / fur : solidX / solid);
      // Its own copy of the sheet's pixels, tidied before it's measured for the frame size.
      const w = right - left + 1, h = bottom - top + 1;
      const own = Buffer.alloc(w * h * 4);
      for (let y = top; y <= bottom; y++) data.copy(own, (y - top) * w * 4, (y * W + left) * 4, (y * W + right + 1) * 4);
      tidy(own, w, h, airborne.includes(i + 1));
      x0 = right; x1 = left; y0 = bottom;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (own[(y * w + x) * 4 + 3] <= 8) continue;
        x0 = Math.min(x0, x + left); x1 = Math.max(x1, x + left); y0 = Math.min(y0, y + top);
      }
      frames.push({ left, right, anchor, x0, x1, y0, feet, own, w });
    }
    // One floor for the whole animation, so his feet stay on the same line as it plays.
    const floor = Math.max(...frames.map((f) => f.feet));
    const half = Math.max(...frames.map((f) => Math.max(f.anchor - f.x0, f.x1 - f.anchor))) + PADDING;
    const ceiling = Math.min(...frames.map((f) => f.y0)) - PADDING;
    const outW = half * 2;
    const outH = floor + BELOW_FEET + 1 - ceiling;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const pixels = Buffer.alloc(outW * outH * 4);
      for (let y = ceiling; y < ceiling + outH; y++) {
        if (y < top || y > bottom) continue;
        for (let x = f.left; x <= f.right; x++) {
          const ox = x - (f.anchor - half);
          const from = ((y - top) * f.w + (x - f.left)) * 4;
          if (ox < 0 || ox >= outW || f.own[from + 3] === 0) continue;
          f.own.copy(pixels, ((y - ceiling) * outW + ox) * 4, from, from + 4);
        }
      }
      const frame = sharp(pixels, { raw: { width: outW, height: outH, channels: 4 } });
      await frame.clone().png({ compressionLevel: 9 }).toFile(join(OUT, `${name} (${i + 1}).png`));
      if (reviewDir) tiles.push({ input: await frame.clone().png().toBuffer(), w: outW, h: outH });
    }
    console.log(`${name}: ${frames.length} frames at ${outW}x${outH}`);
  }

  if (reviewDir) {
    // Every frame on a grey card with a line at his feet, so jumps in his position show up.
    const cellW = 250, cellH = 200, perRow = 6;
    const placed = [];
    tiles.forEach((t, i) => {
      const left = (i % perRow) * cellW + Math.round((cellW - t.w) / 2);
      const topY = Math.floor(i / perRow) * cellH + (cellH - 10 - t.h);
      placed.push({ input: t.input, left: Math.max(0, left), top: Math.max(0, topY) });
      const line = Buffer.alloc(cellW * 2 * 4, 0);
      for (let p = 0; p < cellW * 2; p++) line.writeUInt32BE(0xd0405aff, p * 4);
      placed.push({ input: line, raw: { width: cellW, height: 2, channels: 4 }, left: (i % perRow) * cellW, top: Math.floor(i / perRow) * cellH + cellH - 10 - BELOW_FEET });
    });
    await sharp({ create: { width: perRow * cellW, height: Math.ceil(tiles.length / perRow) * cellH, channels: 4, background: '#8fa3b8' } })
      .composite(placed).png().toFile(join(reviewDir, 'orange-cut.png'));
  }
}

main();
