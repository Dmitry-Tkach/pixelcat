// Cuts the grey battle cat, the test character for new levels and worlds, from the user's fuller sheet
// (images/sprites/cat-version-2/Designer.png). It has no slide, so his slide comes from the first
// pack's atlas, which draws him the same way and at the same size. See tools/cut-sheet.mjs.
// Run: node tools/cut-battle-cat.mjs [folder for review images]
// Output: images/sprites/battle-cat/Idle (n).png and so on. The sheets are left alone.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutSheet, findCuts, separateRows } from './cut-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(ROOT, 'images', 'sprites');
const SHEET = join(SPRITES, 'cat-version-2', 'Designer.png');
const FIRST_PACK = join(SPRITES, 'grey_battle_cat_phaser3_starter_pack', 'reference', 'original_concept_atlas.png');
const OUT = join(SPRITES, 'battle-cat');
const REVIEW = process.argv[2];

// His grey fur, which places him in each frame (not the blue glow, the sparks or the sparkles).
const isFur = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 30 && Math.max(r, g, b) > 50 && Math.max(r, g, b) < 200;

// The sheet's rows, top to bottom, with how many frames each has. Some rows touch, so they're
// separated by shape first, at these lines.
const LINES = [117, 240, 377, 496, 608, 720, 846, 942];
const ROWS = [
  { name: 'Idle', frames: 6 },
  { name: 'Run', frames: 8 },
  { name: 'Jump', frames: 9 },
  { name: 'Cheer', frames: 7 },
  { name: 'Attack', frames: 7 },
  { name: 'Hit', frames: 6 },
  // The energy ball in front of the sixth frame isn't fur, so its frame ends past the ball, at 938.
  { name: 'Power', frames: 10, fix: { 6: 938 } },
  { name: 'Victory', frames: 6 },
  { name: 'Defeated', frames: 8 },
];

const copies = await separateRows(SHEET, LINES);
const bounds = [0, ...LINES, 1024];
for (let i = 0; i < ROWS.length; i++) {
  const { name, frames, fix = {} } = ROWS[i];
  const band = [Math.max(0, bounds[i] - 30), Math.min(1023, bounds[i + 1] + 30)];
  const cuts = await findCuts(copies[i], band, isFur);
  for (const [index, x] of Object.entries(fix)) cuts[index] = x;
  if (cuts.length - 1 !== frames) throw new Error(`${name}: found ${cuts.length - 1} frames, not ${frames} (cuts ${cuts})`);
  await cutSheet({
    sheet: copies[i],
    out: OUT,
    keepFrames: i > 0,
    rows: { row: band },
    labels: [],
    anims: [{ name, row: 'row', cuts }],
    isFur,
    clearBelow: 40, // the soft dark glow drawn around him
    reviewDir: REVIEW,
    reviewName: `battle-cat-${name.toLowerCase()}`,
  });
}

// His slide, from the first pack.
await cutSheet({
  sheet: FIRST_PACK,
  out: OUT,
  keepFrames: true,
  rows: { b: [188, 352] },
  labels: [[778, 192, 917, 219]],
  anims: [{ name: 'Slide', row: 'b', cuts: [770, 901, 1040, 1178, 1300, 1414, 1530] }],
  isFur,
  clearBelow: 40,
  reviewDir: REVIEW,
  reviewName: 'battle-cat-slide',
});

// The player's cat is placed by one hitbox for every animation, so every frame of the animations he
// plays as the cat gets the same size, with him in the middle and his feet on the same line. His
// superpower, with its long energy ball, keeps its own size.
const PLAYED = ['Idle', 'Run', 'Jump', 'Slide', 'Hit', 'Defeated'];
const files = readdirSync(OUT).filter((f) => PLAYED.some((name) => f.startsWith(`${name} (`)));
const sizes = await Promise.all(files.map((f) => sharp(join(OUT, f)).metadata()));
const W = Math.max(...sizes.map((s) => s.width));
const H = Math.max(...sizes.map((s) => s.height));
for (let i = 0; i < files.length; i++) {
  const { width, height } = sizes[i];
  const left = Math.floor((W - width) / 2);
  const png = await sharp(join(OUT, files[i]))
    .extend({ left, right: W - width - left, top: H - height, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(join(OUT, files[i]));
}
console.log(`The frames he plays as the cat are padded to ${W}x${H}`);
