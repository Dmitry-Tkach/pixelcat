// Cuts the grey battle cat, a possible new look for the player's cat, from its concept atlas.
// See tools/cut-sheet.mjs. The starter pack's own frames were cut automatically and have merged and
// misplaced frames, so this cuts from the pack's original atlas instead.
// Run: node tools/cut-battle-cat.mjs [folder for a review image]
// Output: images/sprites/battle-cat/Idle (n).png and so on. The pack is left alone.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutSheet } from './cut-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'images', 'sprites', 'battle-cat');

await cutSheet({
  sheet: join(ROOT, 'images', 'sprites', 'grey_battle_cat_phaser3_starter_pack', 'reference', 'original_concept_atlas.png'),
  out: OUT,
  rows: { a: [36, 186], b: [188, 352], c: [356, 510], d: [512, 676], e: [680, 840], f: [842, 1020] },
  labels: [
    [12, 9, 155, 35], [691, 9, 832, 35],
    [12, 192, 155, 219], [778, 192, 917, 219],
    [12, 363, 166, 390], [802, 363, 960, 390],
    [12, 516, 223, 542], [994, 516, 1190, 542],
    [12, 684, 153, 709], [488, 684, 631, 709], [951, 684, 1097, 709],
    [12, 844, 207, 871], [403, 844, 571, 871], [995, 844, 1079, 871],
  ],
  anims: [
    { name: 'Idle', row: 'a', cuts: [16, 122, 228, 345, 456, 566, 680] },
    { name: 'Run', row: 'a', cuts: [682, 806, 921, 1029, 1139, 1242, 1341, 1434, 1530] },
    { name: 'Jump', row: 'b', cuts: [12, 113, 215, 314, 412, 513, 618, 730] },
    { name: 'Slide', row: 'b', cuts: [770, 901, 1040, 1178, 1300, 1414, 1530] },
    { name: 'Lunge', row: 'c', cuts: [8, 116, 220, 322, 426, 531, 641, 770] },
    { name: 'Punch', row: 'c', cuts: [790, 929, 1045, 1147, 1280, 1392, 1500] },
    { name: 'Power', row: 'd', cuts: [8, 103, 200, 298, 394, 481, 582, 714, 875, 965] },
    { name: 'Throw', row: 'd', cuts: [975, 1079, 1170, 1254, 1359, 1440, 1530] },
    { name: 'Laugh', row: 'e', cuts: [8, 95, 181, 262, 355, 450] },
    { name: 'Happy', row: 'e', cuts: [485, 574, 654, 737, 828, 915] },
    { name: 'Victory', row: 'e', cuts: [950, 1037, 1115, 1194, 1279, 1351, 1430, 1520] },
    { name: 'Hit', row: 'f', cuts: [8, 105, 200, 291, 395] },
    { name: 'Defeated', row: 'f', cuts: [400, 498, 591, 684, 780, 878, 992] },
  ],
  // His grey fur, which is how he's found in each frame (not the blue glow or the sparks).
  isFur: (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 30 && Math.max(r, g, b) > 50,
  clearBelow: 40, // the soft dark glow the atlas draws around him
  reviewDir: process.argv[2],
  reviewName: 'battle-cat-cut',
});

// The player's cat is placed by one hitbox for every animation, so every frame gets the same size,
// with him in the middle and his feet on the same line.
const files = readdirSync(OUT).filter((f) => f.endsWith('.png'));
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
console.log(`Every frame padded to ${W}x${H}`);
