// Cuts a boss's sprite sheet into game frames. Sheets have real transparency, but some frames touch
// their neighbours (muzzle flashes, glows, flying bombs), so every frame is cut at a hand-picked line
// rather than found automatically. Each boss has a small tool that says where its frames are.
import sharp from 'sharp';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PADDING = 4;
const HAZE_SOLID = 235;
const greyish = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 46 && Math.max(r, g, b) < 215;
const BELOW_FEET = 12; // room under his feet. Each boss's `belowFeet` in data/characters.js is this, enlarged
const SOLID = 200; // alpha at which a pixel is part of him, not glow or shadow
const FEATHER = 10; // glows cut at a frame's edge fade out over this many pixels
const SCRAP = 1500; // pieces at a frame's edge smaller than this, with no fur, belong to its neighbor
const isOutline = (r, g, b) => Math.max(r, g, b) < 90;

// Clears what a frame's neighbors left inside its edges, and fades glows cut by its edges.
function tidy(px, w, h, airborne, isFur) {
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

// Cuts a boss's sprite sheet into frames named like `Idle (1).png`, ready for prepare-assets.
//   sheet, out:  the sheet, and the folder for the frames
//   rows:        { name: [top, bottom] } in sheet pixels
//   labels:      [x0, y0, x1, y1] boxes of the name tags printed on the sheet, cleared first
//   anims:       { name, row, cuts, airborne } where `cuts` are the lines between frames, and
//                `airborne` lists frames whose ground shadow or dust is left behind
//   isFur:       (r, g, b) => true for the colour of his body, which places him in each frame
//   clearBelow:  optional, pixels fainter than this alpha are cleared: a haze some sheets leave
//                around each figure. Glows need it left at 0
//   clearGreyHaze: optional, also clears grey pixels that aren't fully solid, for pixel art
//   reviewDir:   optional, a folder for a sheet of every frame on a grey card
//   keepFrames:  optional, leaves frames already in `out`, for a sheet cut in several passes
// `sheet` is a file, or a PNG in memory.
export async function cutSheet({ sheet, out, rows, labels, anims, isFur, clearBelow = 0, clearGreyHaze = false, reviewDir, reviewName = 'cut', keepFrames = false }) {
  const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < clearBelow) data[i] = 0;
    // Pixel art has hard, solid edges, so a grey pixel that isn't solid is haze, not him. Coloured
    // glows, like fire and sparkles, are kept.
    else if (clearGreyHaze && data[i] < HAZE_SOLID && greyish(data[i - 3], data[i - 2], data[i - 1])) data[i] = 0;
  }
  const W = info.width;
  for (const [x0, y0, x1, y1] of labels) {
    for (let y = y0 - 2; y <= y1 + 2; y++) for (let x = x0 - 2; x <= x1 + 2; x++) data[(y * W + x) * 4 + 3] = 0;
  }

  mkdirSync(out, { recursive: true });
  if (!keepFrames) for (const old of readdirSync(out)) if (old.endsWith('.png')) rmSync(join(out, old));

  const tiles = [];
  for (const { name, row, cuts, airborne = [] } of anims) {
    const [top, bottom] = rows[row];
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
      tidy(own, w, h, airborne.includes(i + 1), isFur);
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
      await frame.clone().png({ compressionLevel: 9 }).toFile(join(out, `${name} (${i + 1}).png`));
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
      .composite(placed).png().toFile(join(reviewDir, `${reviewName}.png`));
  }
}


// Separates the rows of a sheet whose rows touch, into one copy of the sheet per row, each holding only
// that row's figures, ready for cutSheet. `lines` are the heights between rows, from the top. A shape
// inside one row goes to it. A shape crossing a line is split: each row's part grows from the pixels
// well inside that row until they meet. Small pieces, like sparkles, go to the row their middle is in.
// Returns a PNG in memory for each row, top to bottom.
export async function separateRows(sheet, lines, { solidAbove = 40, core = 14 } = {}) {
  const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const bounds = [0, ...lines, H];
  const rowAt = (y) => bounds.findIndex((b, i) => i > 0 && y < b) - 1;
  const owner = new Int16Array(W * H).fill(-1);
  const seen = new Uint8Array(W * H);
  const solid = (p) => data[p * 4 + 3] > solidAbove;
  for (let start = 0; start < W * H; start++) {
    if (seen[start] || !solid(start)) continue;
    const piece = [start];
    seen[start] = 1;
    let sumY = 0;
    for (let k = 0; k < piece.length; k++) {
      const p = piece[k], x = p % W, y = (p - x) / W;
      sumY += y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const q = ny * W + nx;
        if (!seen[q] && solid(q)) { seen[q] = 1; piece.push(q); }
      }
    }
    const rows = new Set(piece.map((p) => rowAt(Math.floor(p / W))));
    if (rows.size === 1 || piece.length < 400) {
      const row = rowAt(Math.round(sumY / piece.length));
      for (const p of piece) owner[p] = row;
      continue;
    }
    // Grows each row's part from its core, breadth first, so the pixels between go to the nearer one.
    const inPiece = new Set(piece);
    let front = [];
    for (const p of piece) {
      const y = Math.floor(p / W), row = rowAt(y);
      if (y - bounds[row] >= core && bounds[row + 1] - y > core) { owner[p] = row; front.push(p); }
    }
    while (front.length) {
      const next = [];
      for (const p of front) {
        const x = p % W;
        for (const q of [p - 1, p + 1, p - W, p + W]) {
          if (!inPiece.has(q) || owner[q] >= 0 || Math.abs((q % W) - x) > 1) continue;
          owner[q] = owner[p];
          next.push(q);
        }
      }
      front = next;
    }
  }
  const copies = [];
  for (let row = 0; row < bounds.length - 1; row++) {
    const copy = Buffer.from(data);
    for (let p = 0; p < W * H; p++) if (owner[p] !== row) copy[p * 4 + 3] = 0;
    copies.push(await sharp(copy, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
  }
  return copies;
}

// Where to cut a row into frames: the gaps between the figures' fur, as cutSheet `cuts`.
// `minGap` is the narrowest gap that separates two figures.
export async function findCuts(sheet, [top, bottom], isFur, { minGap = 10, pad = 12 } = {}) {
  const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const runs = [];
  let start = -1, lastOn = -1e9;
  for (let x = 0; x < W; x++) {
    let fur = 0;
    for (let y = top; y <= bottom; y++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] > 200 && isFur(data[i], data[i + 1], data[i + 2])) fur += 1;
    }
    if (fur > 2) {
      if (x - lastOn > minGap) { if (start >= 0) runs.push([start, lastOn]); start = x; }
      lastOn = x;
    }
  }
  if (start >= 0) runs.push([start, lastOn]);
  const cuts = [Math.max(0, runs[0][0] - pad)];
  for (let i = 1; i < runs.length; i++) cuts.push(Math.round((runs[i - 1][1] + runs[i][0]) / 2));
  cuts.push(Math.min(W, runs[runs.length - 1][1] + pad));
  return cuts;
}


// Some sheets come with no transparency: a checkerboard of light greys painted where it should be,
// the way image editors show "transparent". This makes it transparent: everything checkered reached
// from the sheet's edges without crossing a figure's dark outline, then the checkered pockets
// enclosed by a figure (between legs, or inside a glow), then the pale fringe left on the outline.
// A smooth white patch, like a cat's chest or a beam's core, is kept. Returns a PNG in memory.
const PAINTED = { light: 205, grey: 14, dark: 238, checkered: 0.3, smooth: 0.12, bigPocket: 120, glowShare: 0.5, fringe: 190 };
export async function clearPaintedBackground(sheet) {
  const { data, info } = await sharp(sheet).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const rgb = (p) => [data[p * 3], data[p * 3 + 1], data[p * 3 + 2]];
  const pale = (p) => { const [r, g, b] = rgb(p); return Math.min(r, g, b) > PAINTED.light && Math.max(r, g, b) - Math.min(r, g, b) < PAINTED.grey; };
  const around = (p) => { const x = p % W; return [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W].filter((q) => q >= 0 && q < N); };
  const clear = new Uint8Array(N);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (clear[p] || !pale(p)) continue;
    clear[p] = 1;
    stack.push(...around(p));
  }
  const seen = new Uint8Array(N);
  for (let start = 0; start < N; start++) {
    if (clear[start] || seen[start] || !pale(start)) continue;
    const piece = [start];
    seen[start] = 1;
    let glow = 0, edge = 0;
    for (let k = 0; k < piece.length; k++) {
      for (const q of around(piece[k])) {
        if (seen[q] || clear[q]) continue;
        if (pale(q)) { seen[q] = 1; piece.push(q); continue; }
        const [r, g, b] = rgb(q);
        edge += 1;
        if (Math.max(r, g, b) - Math.min(r, g, b) > 40) glow += 1;
      }
    }
    const darker = piece.filter((p) => data[p * 3] < PAINTED.dark).length / piece.length;
    if (darker < PAINTED.smooth) continue;
    const inGlow = edge > 0 && glow / edge > PAINTED.glowShare;
    if (inGlow || (darker > PAINTED.checkered && piece.length > PAINTED.bigPocket)) piece.forEach((p) => { clear[p] = 1; });
  }
  for (let pass = 0; pass < 2; pass++) {
    const fringe = [];
    for (let p = 0; p < N; p++) {
      if (clear[p]) continue;
      const [r, g, b] = rgb(p);
      if (Math.min(r, g, b) < PAINTED.fringe || Math.max(r, g, b) - Math.min(r, g, b) > 20) continue;
      if (around(p).some((q) => clear[q])) fringe.push(p);
    }
    fringe.forEach((p) => { clear[p] = 1; });
  }
  const out = Buffer.alloc(N * 4);
  for (let p = 0; p < N; p++) {
    out[p * 4] = data[p * 3]; out[p * 4 + 1] = data[p * 3 + 1]; out[p * 4 + 2] = data[p * 3 + 2]; out[p * 4 + 3] = clear[p] ? 0 : 255;
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

