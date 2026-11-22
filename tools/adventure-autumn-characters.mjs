// Cuts the owner's Autumn Forest character sheets (images/levels/autumn, drawn from
// prompts/autumn-level) into the game's frames:
//   boar.png and pumpkin.png: walking enemies (data/adventure/enemies.js, sheet), as atlases in
//     public/assets/adventure/enemies;
//   squirrel.png: a gunner that throws acorns (data/adventure/gunners.js, sheet), as an atlas in
//     public/assets/adventure/gunners, and its acorn, the Autumn world's 'acorn';
//   owl.png: the owl, a look of the flying enemy (data/adventure/birds.js, PTERO_FRAMES), as the
//     Autumn world's owl-<frame> pictures.
// Each sheet is a grid of square cells with a real transparent background. In each cell, stray bits
// touching its edge (the next frame's dust, an acorn over the line) and tiny specks are cleared, and
// the character is moved so its main shape is in the middle across: ChatGPT drifts the drawing
// from frame to frame, which would make it shake in the game.
// A sheet that isn't there yet is skipped: the game keeps its stand-in.
// Run: node tools/adventure-autumn-characters.mjs [folder for centred sheets, to measure]
// (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENEMIES, enemyLayout } from '../src/data/adventure/enemies.js';
import { GUNNERS, gunnerLayout } from '../src/data/adventure/gunners.js';
import { OWL_SHEET, PTERO_ART, PTERO_FRAMES } from '../src/data/adventure/birds.js';
import { ACORN } from '../src/data/adventure/autumnArt.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADVENTURE = join(ROOT, 'public', 'assets', 'adventure');
const AUTUMN = join(ADVENTURE, 'autumn');
const REVIEW = process.argv[2];
const SOLID = 40; // alpha: a pixel at least this opaque is part of the drawing
const SPECK = 0.02; // a bit smaller than this share of the main shape is a speck, and cleared
const ATLAS_COLUMNS = 10;
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

// A sheet's cells, cleaned and centred: { pixels (RGBA), size } for each (row, col).
async function cells(file, cols, rows) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const size = Math.round(info.width / cols);
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const left = Math.round((c * info.width) / cols), top = Math.round((r * info.height) / rows);
      const w = Math.min(size, info.width - left), h = Math.min(size, info.height - top);
      const pixels = Buffer.alloc(size * size * 4);
      for (let y = 0; y < h; y++) data.copy(pixels, y * size * 4, ((top + y) * info.width + left) * 4, ((top + y) * info.width + left + w) * 4);
      out.push({ row: r, col: c, size, pixels: centre(clean(pixels, size), size) });
    }
  }
  return out;
}

// The drawing's pieces in a cell: groups of touching solid pixels.
function pieces(pixels, size) {
  const seen = new Int32Array(size * size).fill(-1);
  const groups = [];
  for (let i = 0; i < size * size; i++) {
    if (pixels[i * 4 + 3] < SOLID || seen[i] >= 0) continue;
    const members = [i], todo = [i];
    seen[i] = groups.length;
    let edge = false;
    while (todo.length) {
      const q = todo.pop(), x = q % size, y = (q / size) | 0;
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) edge = true;
      for (const n of [x > 0 ? q - 1 : -1, x < size - 1 ? q + 1 : -1, y > 0 ? q - size : -1, y < size - 1 ? q + size : -1]) {
        if (n >= 0 && pixels[n * 4 + 3] >= SOLID && seen[n] < 0) { seen[n] = groups.length; todo.push(n); members.push(n); }
      }
    }
    groups.push({ members, edge });
  }
  return { groups, seen };
}

// Clears what isn't this frame's: pieces touching the cell's edge (unless it's the main one) and
// specks, with the faint pixels round them.
function clean(pixels, size) {
  const { groups, seen } = pieces(pixels, size);
  if (!groups.length) return pixels;
  const main = groups.reduce((a, b) => (b.members.length > a.members.length ? b : a));
  const drop = new Set(groups.filter((g) => g !== main && (g.edge || g.members.length < main.members.length * SPECK)).map((g) => groups.indexOf(g)));
  for (let i = 0; i < size * size; i++) {
    if (seen[i] >= 0 ? drop.has(seen[i]) : pixels[i * 4 + 3] > 0 && nearDropped(i)) pixels[i * 4 + 3] = 0;
  }
  return pixels;
  // A faint pixel (under SOLID) next to a cleared piece goes with it.
  function nearDropped(i) {
    const x = i % size, y = (i / size) | 0;
    for (const n of [x > 0 ? i - 1 : -1, x < size - 1 ? i + 1 : -1, y > 0 ? i - size : -1, y < size - 1 ? i + size : -1]) {
      if (n >= 0 && seen[n] >= 0 && drop.has(seen[n])) return true;
    }
    return false;
  }
}

// Moves the drawing across so its main shape's middle is the cell's middle.
function centre(pixels, size) {
  const { groups } = pieces(pixels, size);
  if (!groups.length) return pixels;
  const main = groups.reduce((a, b) => (b.members.length > a.members.length ? b : a));
  let x0 = size, x1 = 0;
  for (const i of main.members) { const x = i % size; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const dx = Math.round(size / 2 - (x0 + x1) / 2);
  if (!dx) return pixels;
  const moved = Buffer.alloc(pixels.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const from = x - dx;
      if (from >= 0 && from < size) pixels.copy(moved, (y * size + x) * 4, (y * size + from) * 4, (y * size + from) * 4 + 4);
    }
  }
  return moved;
}

const png = (cell) => sharp(cell.pixels, { raw: { width: cell.size, height: cell.size, channels: 4 } });

// A character's animations as a Phaser atlas: each anim's frames from its row of the sheet (from
// column `from`, `count` of them), cropped and shrunk to the character's frame size.
async function sheetAtlas(outDir, kind, info, layout) {
  const { sheet, crop, anims } = info;
  const all = await cells(join(ROOT, sheet.file), sheet.cols, sheet.rows);
  const frames = Object.entries(anims).flatMap(([anim, { row, from = 0, count }]) =>
    Array.from({ length: count }, (_, i) => ({ name: `${anim}-${i}`, cell: all.find((c) => c.row === row && c.col === from + i) })));
  const { frameW: w, frameH: h } = layout;
  const rows = Math.ceil(frames.length / ATLAS_COLUMNS);
  const atlas = { frames: {}, meta: { image: `${kind}.png`, size: { w: w * Math.min(ATLAS_COLUMNS, frames.length), h: h * rows }, scale: '1' } };
  const placed = await Promise.all(frames.map(async ({ name, cell }, i) => {
    const x = (i % ATLAS_COLUMNS) * w, y = Math.floor(i / ATLAS_COLUMNS) * h;
    atlas.frames[name] = { frame: { x, y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } };
    const cropped = await png(cell).extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h }).png().toBuffer();
    return { input: await sharp(cropped).resize(w, h).png().toBuffer(), left: x, top: y };
  }));
  await sharp({ create: { width: atlas.meta.size.w, height: atlas.meta.size.h, channels: 4, background: CLEAR } })
    .composite(placed).png({ compressionLevel: 9 }).toFile(join(outDir, `${kind}.png`));
  writeFileSync(join(outDir, `${kind}.json`), JSON.stringify(atlas));
  if (REVIEW) await reviewSheet(kind, all, sheet.cols, sheet.rows);
}

// The centred cells laid out as the sheet was, for measuring (tools: the body, feet and muzzle).
async function reviewSheet(name, all, cols, rows) {
  mkdirSync(REVIEW, { recursive: true });
  const size = all[0].size;
  const placed = await Promise.all(all.map(async (cell) => ({ input: await png(cell).png().toBuffer(), left: cell.col * size, top: cell.row * size })));
  await sharp({ create: { width: cols * size, height: rows * size, channels: 4, background: CLEAR } }).composite(placed).png().toFile(join(REVIEW, `${name}.png`));
}

let made = 0;
for (const [group, table, layoutOf] of [['enemies', ENEMIES, enemyLayout], ['gunners', GUNNERS, gunnerLayout]]) {
  for (const [kind, info] of Object.entries(table)) {
    if (!info.sheet) continue;
    if (!existsSync(join(ROOT, info.sheet.file))) { console.log(`No ${info.sheet.file}: skipped`); continue; }
    mkdirSync(join(ADVENTURE, group), { recursive: true });
    await sheetAtlas(join(ADVENTURE, group), kind, info, layoutOf(kind));
    made += 1;
  }
}

mkdirSync(AUTUMN, { recursive: true });
// The squirrel's acorn: on its own in its cell, trimmed and shrunk.
if (existsSync(join(ROOT, ACORN.sheet))) {
  const acorn = (await cells(join(ROOT, ACORN.sheet), 6, 4)).find((c) => c.row === ACORN.row && c.col === ACORN.col);
  const trimmed = await png(acorn).png().toBuffer();
  await sharp(await sharp(trimmed).trim().png().toBuffer()).resize({ width: ACORN.width }).png({ compressionLevel: 9 }).toFile(join(AUTUMN, 'acorn.png'));
  made += 1;
}

// The owl: each frame a square picture, as the pterodactyl's are (tools/adventure-ptero-art.mjs).
if (existsSync(join(ROOT, OWL_SHEET.file))) {
  const all = await cells(join(ROOT, OWL_SHEET.file), 6, 3);
  for (const [name, { row, col }] of Object.entries(PTERO_FRAMES)) {
    const cell = all.find((c) => c.row === row && c.col === col);
    await png(cell).resize(PTERO_ART.cell, PTERO_ART.cell, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(join(AUTUMN, `${OWL_SHEET.prefix}-${name}.png`));
  }
  if (REVIEW) await reviewSheet('owl', all, 6, 3);
  made += 1;
}
console.log(`Autumn characters: ${made} sheets cut`);
