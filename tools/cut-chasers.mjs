// Cuts the boy and hug art into separate transparent frames. Grandma has tools/cut-grandma.mjs.
// Run: node tools/cut-chasers.mjs
// Output: images/sprites/boy-frames, and a review image.
import sharp from 'sharp';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(ROOT, 'images', 'sprites');
const PADDING = 6;
const HEAD_PORTION = 0.3; // upright frames line up on the top part of the body, so they don't wobble

// Finds connected groups of non-background pixels. `isBackground` takes (r, g, b).
function findFrames({ data, width, height }, isBackground, { minArea, holeMinArea }) {
  const outside = new Uint8Array(width * height);
  const looksLikeBackground = (p) => isBackground(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);

  const fill = (seeds, mark, test) => {
    const stack = [...seeds];
    const found = [];
    while (stack.length) {
      const p = stack.pop();
      if (mark[p] || !test(p)) continue;
      mark[p] = 1;
      found.push(p);
      const x = p % width;
      if (x > 0) stack.push(p - 1);
      if (x < width - 1) stack.push(p + 1);
      if (p >= width) stack.push(p - width);
      if (p < width * (height - 1)) stack.push(p + width);
    }
    return found;
  };

  // The background reaches the image's edges. Pale colors inside a character stay.
  const edges = [];
  for (let x = 0; x < width; x++) edges.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) edges.push(y * width, y * width + width - 1);
  fill(edges, outside, looksLikeBackground);

  // Larger enclosed areas are gaps between limbs, not eye whites.
  const seen = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    if (outside[p] || seen[p] || !looksLikeBackground(p)) continue;
    const region = fill([p], seen, (q) => !outside[q] && looksLikeBackground(q));
    if (region.length >= holeMinArea) region.forEach((q) => { outside[q] = 1; });
  }

  const label = new Uint8Array(width * height);
  const blobs = [];
  for (let p = 0; p < width * height; p++) {
    if (outside[p] || label[p]) continue;
    const pts = fill([p], label, (q) => !outside[q]);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (const q of pts) {
      const x = q % width, y = (q - x) / width;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    blobs.push({ pts, x0, y0, x1, y1, area: pts.length });
  }

  // Keep the characters. Small detached bits (like sweat drops) join a nearby character.
  const frames = blobs.filter((b) => b.area >= minArea);
  const reach = 22;
  for (const s of blobs.filter((b) => b.area < minArea && b.area >= 6)) {
    const owner = frames.find((b) => s.x0 <= b.x1 + reach && s.x1 >= b.x0 - reach && s.y0 <= b.y1 + reach && s.y1 >= b.y0 - reach);
    if (!owner) continue;
    owner.pts.push(...s.pts);
    owner.x0 = Math.min(owner.x0, s.x0); owner.x1 = Math.max(owner.x1, s.x1);
    owner.y0 = Math.min(owner.y0, s.y0); owner.y1 = Math.max(owner.y1, s.y1);
  }
  return { frames, outside };
}

function readingOrder(frames, rowTolerance) {
  const sorted = [...frames].sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const rows = [];
  for (const b of sorted) {
    const mid = (b.y0 + b.y1) / 2;
    const row = rows.find((r) => Math.abs(r.mid - mid) < rowTolerance);
    if (row) row.items.push(b); else rows.push({ mid, items: [b] });
  }
  rows.forEach((r) => r.items.sort((a, b) => a.x0 - b.x0));
  return { rows, ordered: rows.flatMap((r) => r.items) };
}

// Saves frames on one shared canvas, with feet on one line and upright poses aligned on the head.
async function saveFrames(image, ordered, names, keepUpright, outDir, { flip = false, softenEdges } = {}) {
  const { data, width } = image;
  const pose = names.flatMap(([name, count]) => Array.from({ length: count }, (_, i) => ({ name, n: i + 1 })));
  ordered.forEach((b, i) => {
    const limit = b.y0 + (b.y1 - b.y0) * HEAD_PORTION;
    const xs = [];
    for (const q of b.pts) {
      const x = q % width, y = (q - x) / width;
      if (y <= limit) xs.push(x);
    }
    b.anchorX = keepUpright(pose[i].name) ? xs.reduce((sum, x) => sum + x, 0) / xs.length : (b.x0 + b.x1) / 2;
  });
  const halfW = Math.ceil(Math.max(...ordered.map((b) => Math.max(b.anchorX - b.x0, b.x1 - b.anchorX))));
  const cw = halfW * 2 + 1 + PADDING * 2;
  const ch = Math.max(...ordered.map((b) => b.y1 - b.y0 + 1)) + PADDING * 2;

  // Only replaces earlier frames: anything else in the folder, such as source art, is left alone.
  mkdirSync(outDir, { recursive: true });
  for (const name of readdirSync(outDir)) {
    if (/ \(\d+\)\.png$/.test(name)) rmSync(join(outDir, name));
  }
  const tiles = [];
  for (let i = 0; i < ordered.length; i++) {
    const b = ordered[i];
    const buf = Buffer.alloc(cw * ch * 4);
    const ox = Math.round(PADDING + halfW - (b.anchorX - b.x0));
    const oy = ch - PADDING - (b.y1 - b.y0 + 1);
    for (const q of b.pts) {
      const x = q % width, y = (q - x) / width;
      const si = q * 4, di = ((y - b.y0 + oy) * cw + (x - b.x0 + ox)) * 4;
      data.copy(buf, di, si, si + 4);
      if (softenEdges) softenEdges(buf, di, q);
    }
    let png = sharp(buf, { raw: { width: cw, height: ch, channels: 4 } });
    if (flip) png = png.flop();
    const output = await png.png().toBuffer();
    await sharp(output).toFile(join(outDir, `${pose[i].name} (${pose[i].n}).png`));
    tiles.push(output);
  }
  return { tiles, cw, ch };
}

async function reviewSheet(path, { tiles, cw, ch }, cols) {
  const gap = 10;
  await sharp({
    create: {
      width: gap + cols * (cw + gap),
      height: gap + Math.ceil(tiles.length / cols) * (ch + gap),
      channels: 4,
      background: '#5AA9E6',
    },
  }).composite(tiles.map((input, i) => ({
    input,
    left: gap + (i % cols) * (cw + gap),
    top: gap + Math.floor(i / cols) * (ch + gap),
  }))).png().toFile(path);
}

async function loadRegion(file, region) {
  const { data, info } = await sharp(file)
    .flatten({ background: '#FFFFFF' })
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

// The boy: small frames on the right of a white sheet, in the same pose order as the girl's.
async function cutBoy(reviewDir) {
  const image = await loadRegion(join(SPRITES, 'boy', 'boy.png'), { left: 690, top: 80, width: 510, height: 860 });
  const isBackground = (r, g, b) => r > 232 && g > 232 && b > 232;
  const { frames, outside } = findFrames(image, isBackground, { minArea: 900, holeMinArea: 20 });
  for (let p = 0; p < outside.length; p++) if (outside[p]) image.data[p * 4 + 3] = 0;

  const { rows, ordered } = readingOrder(frames, 60);
  console.log(`boy rows: ${rows.map((r) => r.items.length).join(', ')}`);
  const names = [['Idle', 4], ['Run', 6], ['Jump', 3], ['Lunge', 1], ['Hurt', 1], ['Down', 1]];
  if (ordered.length !== 16) throw new Error(`Expected 16 boy frames, found ${ordered.length}`);
  const result = await saveFrames(image, ordered, names, (n) => !['Lunge', 'Down'].includes(n), join(SPRITES, 'boy-frames'));
  await reviewSheet(join(reviewDir, 'boy-check.png'), result, 6);
  console.log(`boy: 16 frames at ${result.cw}x${result.ch}`);
}

// Cuts an animated GIF into frames that keep their shared positions, cropped to the area any uses.
async function cutGif({ file, outDir, name, scale, review }) {
  const { pages } = await sharp(file, { animated: true }).metadata();
  const box = { x0: Infinity, y0: Infinity, x1: 0, y1: 0 };
  for (let page = 0; page < pages; page++) {
    const { data, info } = await sharp(file, { page }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] < 128) continue;
        box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
      }
    }
  }
  const region = { left: box.x0, top: box.y0, width: box.x1 - box.x0 + 1, height: box.y1 - box.y0 + 1 };
  const outW = Math.round(region.width * scale);
  const outH = Math.round(region.height * scale);
  mkdirSync(outDir, { recursive: true });
  for (const old of readdirSync(outDir)) {
    if (old.startsWith(`${name} (`) && old.endsWith('.png')) rmSync(join(outDir, old));
  }
  const tiles = [];
  for (let page = 0; page < pages; page++) {
    const png = await sharp(file, { page })
      .ensureAlpha()
      .extract(region)
      .resize({ width: outW, height: outH })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await sharp(png).toFile(join(outDir, `${name} (${page + 1}).png`));
    tiles.push(png);
  }
  await reviewSheet(review, { tiles, cw: outW, ch: outH }, 4);
  console.log(`${name} from ${file.split('/').pop()}: ${tiles.length} frames at ${outW}x${outH}`);
}

// The boy's hug catches the cat, hugs it, then shows hearts.
async function cutBoyHug(reviewDir) {
  const dir = join(SPRITES, 'boy-frames', 'boy-hug-a-cat');
  await cutGif({
    file: join(dir, readdirSync(dir).find((f) => f.endsWith('.gif'))),
    outDir: join(SPRITES, 'boy-frames'),
    name: 'Hug',
    scale: 0.6,
    review: join(reviewDir, 'boy-hug-check.png'),
  });
}

// The girl's hug: 12 frames on a 4 by 3 grid. The sheet already has transparency, so frames are
// separated by their alpha. Faint glow is removed, and hearts stay as part of each frame.
async function cutGirlHug(reviewDir) {
  const COLS = 4;
  const ROW_TOPS = [0, 340, 667, 1024];
  const OUTPUT_SCALE = 0.8;
  const SOLID_ALPHA = 150;
  const GLOW_ALPHA = 70;
  const MIN_PIECE_AREA = 150; // smaller than the smallest heart
  const dir = join(SPRITES, 'owner-action-girl', 'hug');
  const file = join(dir, readdirSync(dir).find((f) => f.endsWith('.png')));
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width } = info;
  const cellW = Math.floor(width / COLS);

  for (let i = 3; i < data.length; i += 4) if (data[i] < GLOW_ALPHA) data[i] = 0;

  // Erase tiny disconnected marks, which would otherwise look like dirt and throw off the feet line.
  const visited = new Uint8Array(width * info.height);
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] === 0) continue;
    const stack = [start];
    const piece = [];
    visited[start] = 1;
    while (stack.length) {
      const p = stack.pop();
      piece.push(p);
      const x = p % width;
      const around = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, p - width, p + width];
      for (const q of around) {
        if (q >= 0 && q < visited.length && !visited[q] && data[q * 4 + 3] > 0) {
          visited[q] = 1;
          stack.push(q);
        }
      }
    }
    if (piece.length < MIN_PIECE_AREA) piece.forEach((p) => { data[p * 4 + 3] = 0; });
  }

  // Measure every frame, keeping each row's feet level so jumping frames stay in the air.
  const cells = [];
  for (let row = 0; row < ROW_TOPS.length - 1; row++) {
    const rowCells = [];
    for (let col = 0; col < COLS; col++) {
      const x0 = col * cellW, x1 = x0 + cellW, y0 = ROW_TOPS[row], y1 = ROW_TOPS[row + 1];
      const box = { x0: x1, x1: x0, y0: y1, y1: y0, headXs: [] };
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (data[(y * width + x) * 4 + 3] < SOLID_ALPHA) continue;
          box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x);
          box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
        }
      }
      // Line frames up on the hair, which is the steadiest part of the character.
      for (let y = box.y0; y < box.y0 + 110; y++) {
        for (let x = box.x0; x < box.x1; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] >= SOLID_ALPHA && data[i + 2] > data[i] + 20 && data[i + 2] < 140) box.headXs.push(x);
        }
      }
      box.anchorX = box.headXs.reduce((sum, x) => sum + x, 0) / Math.max(1, box.headXs.length);
      box.cell = { x0, x1, y0, y1 };
      rowCells.push(box);
    }
    const rowBottom = Math.max(...rowCells.map((b) => b.y1));
    rowCells.forEach((b) => { b.rowBottom = rowBottom; });
    cells.push(...rowCells);
  }

  const left = Math.ceil(Math.max(...cells.map((b) => b.anchorX - b.cell.x0)));
  const right = Math.ceil(Math.max(...cells.map((b) => b.cell.x1 - b.anchorX)));
  const above = Math.max(...cells.map((b) => b.rowBottom - b.cell.y0));
  const cw = left + right, ch = above + PADDING;

  const tiles = [];
  for (let i = 0; i < cells.length; i++) {
    const b = cells[i];
    const buf = Buffer.alloc(cw * ch * 4);
    const ox = Math.round(left - (b.anchorX - b.cell.x0));
    const oy = above - (b.rowBottom - b.cell.y0);
    for (let y = b.cell.y0; y < b.cell.y1; y++) {
      for (let x = b.cell.x0; x < b.cell.x1; x++) {
        const dx = x - b.cell.x0 + ox, dy = y - b.cell.y0 + oy;
        if (dx < 0 || dy < 0 || dx >= cw || dy >= ch) continue;
        const si = (y * width + x) * 4;
        data.copy(buf, (dy * cw + dx) * 4, si, si + 4);
      }
    }
    const png = await sharp(buf, { raw: { width: cw, height: ch, channels: 4 } })
      .resize({ width: Math.round(cw * OUTPUT_SCALE) })
      .png({ compressionLevel: 9 })
      .toBuffer();
    await sharp(png).toFile(join(SPRITES, 'owner-action-girl', `Hug (${i + 1}).png`));
    tiles.push(png);
  }
  const outW = Math.round(cw * OUTPUT_SCALE);
  const outH = Math.round(ch * OUTPUT_SCALE);
  await reviewSheet(join(reviewDir, 'hug-check.png'), { tiles, cw: outW, ch: outH }, 4);
  console.log(`girl hug: ${tiles.length} frames at ${outW}x${outH}`);
}

const reviewDir = process.argv[2] ?? join(ROOT, 'tools');
await cutBoy(reviewDir);
await cutBoyHug(reviewDir);
await cutGirlHug(reviewDir);
