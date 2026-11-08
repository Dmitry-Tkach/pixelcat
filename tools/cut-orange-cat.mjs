// Cuts the orange cat boss's sprite sheet into game frames.
// The sheet has real transparency, but some frames touch their neighbors (muzzle flashes, glows),
// so every frame is cut at a hand-picked line rather than found automatically.
// Run: node tools/cut-orange-cat.mjs [folder for a review image]
// Output: images/sprites/orange-cat/Idle (n).png and so on. The sheet is left alone.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutSheet } from './cut-sheet.mjs';

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

cutSheet({
  sheet: SHEET,
  out: OUT,
  rows: ROWS,
  labels: LABELS,
  anims: ANIMS,
  isFur: (r, g, b) => r > 170 && g > 70 && g < 185 && b < 110,
  reviewDir: process.argv[2],
  reviewName: 'orange-cut',
});
