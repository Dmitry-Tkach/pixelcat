// Cuts the adventure's bosses (data/adventure/bosses.js) from their packs into multi-page Phaser
// atlases in public/assets/adventure/bosses: every frame of every animation, at one scale, each
// placed by the boss himself (the middle of his legs, and the bottom of his feet) at the same spot in
// every cell, so he stays the same size and doesn't jump about from one animation to the next.
// Pages are WebP, to keep the download small. The packs are left alone.
// Run: node tools/adventure-boss-art.mjs [folder for review pictures]  (npm run assets runs it)
import sharp from 'sharp';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOSSES, BOSS_PAGE, bossLayout } from '../src/data/adventure/bosses.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'images', 'assets', 'worlds', 'characters', 'troll-bosses', 'PNG', 'Animation');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'bosses');
const REVIEW = process.argv[2];
const SOLID = 60; // alpha at which a pixel is him, not a soft edge
const LEGS = 0.18; // his legs: the bottom share of his figure, whose middle places him
const SPARE = 2; // how far a frame may reach past its cell, in game pixels, before it's a mistake

// Where he is in one of the pack's frames: the bottom of his feet, and the middle of his legs.
async function placeOf(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let top = h, feet = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > SOLID) { top = Math.min(top, y); feet = Math.max(feet, y); }
  let sum = 0, count = 0;
  for (let y = Math.round(feet - (feet - top) * LEGS); y <= feet; y++) {
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > SOLID) { sum += x; count += 1; }
  }
  return { w, h, feet, legsX: sum / count };
}

mkdirSync(OUT, { recursive: true });
if (REVIEW) mkdirSync(REVIEW, { recursive: true });
for (const [kind, boss] of Object.entries(BOSSES)) {
  const { frameW, frameH, feetX, feetY } = bossLayout(kind);
  const perPage = BOSS_PAGE.cols * BOSS_PAGE.rows;
  const cells = [];
  for (const [anim, { folder, frames }] of Object.entries(boss.anims)) {
    const files = readdirSync(join(PACK, boss.source)).filter((f) => f.startsWith(`${folder}_`) && f.endsWith('.png')).sort();
    if (files.length !== frames) throw new Error(`${boss.source} ${folder}: expected ${frames} frames, found ${files.length}`);
    for (const [i, file] of files.entries()) {
      const path = join(PACK, boss.source, file);
      const { w, h, feet, legsX } = await placeOf(path);
      const width = Math.round(w * boss.scale), height = Math.round(h * boss.scale);
      const left = Math.round(feetX - legsX * boss.scale), top = Math.round(feetY - feet * boss.scale);
      // The cell must hold all of him: check against what he draws, not his frame's empty edges.
      const scaled = await sharp(path).resize(width, height).png().toBuffer();
      const trimmed = await sharp(scaled).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
      const drawn = { left: left + trimmed.info.trimOffsetLeft * -1, top: top + trimmed.info.trimOffsetTop * -1, w: trimmed.info.width, h: trimmed.info.height };
      if (drawn.left < -SPARE || drawn.top < -SPARE || drawn.left + drawn.w > frameW + SPARE || drawn.top + drawn.h > frameH + SPARE) {
        throw new Error(`${kind} ${file} reaches past its cell: widen \`cell\` in data/adventure/bosses.js`);
      }
      cells.push({ name: `${anim}-${i}`, input: trimmed.data, left: drawn.left, top: drawn.top });
    }
  }
  // Pages of cells, and one JSON listing every frame and the page it's on.
  const textures = [];
  for (let p = 0; p * perPage < cells.length; p++) {
    const onPage = cells.slice(p * perPage, (p + 1) * perPage);
    const cols = Math.min(BOSS_PAGE.cols, onPage.length), rows = Math.ceil(onPage.length / BOSS_PAGE.cols);
    const image = `${kind}-${p}.webp`;
    const frames = [];
    const composite = [];
    onPage.forEach((cell, i) => {
      const x = (i % BOSS_PAGE.cols) * frameW, y = Math.floor(i / BOSS_PAGE.cols) * frameH;
      composite.push({ input: cell.input, left: x + cell.left, top: y + cell.top });
      frames.push({
        filename: cell.name, rotated: false, trimmed: false,
        frame: { x, y, w: frameW, h: frameH }, spriteSourceSize: { x: 0, y: 0, w: frameW, h: frameH }, sourceSize: { w: frameW, h: frameH },
      });
    });
    const page = await sharp({ create: { width: cols * frameW, height: rows * frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(await Promise.all(composite.map(async ({ input, left, top }) => {
        // Clip to the page, in case a frame reaches a pixel or two past its cell at the page's edge.
        const meta = await sharp(input).metadata();
        const x0 = Math.max(0, left), y0 = Math.max(0, top);
        const x1 = Math.min(cols * frameW, left + meta.width), y1 = Math.min(rows * frameH, top + meta.height);
        const piece = await sharp(input).extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 }).toBuffer();
        return { input: piece, left: x0, top: y0 };
      })))
      .png().toBuffer();
    await sharp(page).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(join(OUT, image));
    textures.push({ image, format: 'RGBA8888', size: { w: cols * frameW, h: rows * frameH }, scale: 1, frames });
  }
  writeFileSync(join(OUT, `${kind}.json`), JSON.stringify({ textures }));
  console.log(`${kind}: ${cells.length} frames of ${frameW}x${frameH}, on ${textures.length} pages`);

  // For the owner: every frame on a card with a line at his feet, and a GIF of each animation.
  if (REVIEW) {
    const card = (cell) => sharp({ create: { width: frameW, height: frameH, channels: 4, background: '#8fd18f' } })
      .composite([{ input: cell.input, left: Math.max(0, cell.left), top: Math.max(0, cell.top) },
        { input: { create: { width: frameW, height: 2, channels: 4, background: '#d0405a' } }, left: 0, top: feetY }])
      .png().toBuffer();
    const cards = await Promise.all(cells.map(card));
    const sheetCols = 10;
    // Composited first, then scaled down: in one sharp chain, the resize would come first.
    const sheet = await sharp({ create: { width: sheetCols * frameW, height: Math.ceil(cards.length / sheetCols) * frameH, channels: 4, background: '#333' } })
      .composite(cards.map((input, i) => ({ input, left: (i % sheetCols) * frameW, top: Math.floor(i / sheetCols) * frameH })))
      .png().toBuffer();
    await sharp(sheet).resize({ width: 2400 }).png().toFile(join(REVIEW, `${kind}-contact.png`));
    for (const [anim, { fps }] of Object.entries(boss.anims)) {
      const mine = cards.filter((_, i) => cells[i].name.startsWith(`${anim}-`));
      await sharp(mine, { join: { animated: true } }).gif({ delay: Array(mine.length).fill(Math.round(1000 / fps)), loop: 0 })
        .toFile(join(REVIEW, `${kind}-${anim}.gif`));
    }
  }
}
