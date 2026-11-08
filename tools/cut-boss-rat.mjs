// Cuts the bomber rat boss's sprite sheet into game frames. See tools/cut-sheet.mjs.
// Run: node tools/cut-boss-rat.mjs [folder for a review image]
// Output: images/sprites/bomber-rat/Idle (n).png and so on. The sheet is left alone.
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutSheet } from './cut-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'images', 'sprites', 'bomber-rat');

// Keeps only the pixels `keep` picks, trimmed to them, with a little room around.
async function keepOnly(file, keep) {
  const path = join(OUT, file);
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] === 0) continue;
      if (!keep(x, y, data[i], data[i + 1], data[i + 2], width, height)) { data[i + 3] = 0; continue; }
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  const pad = 3;
  const left = Math.max(0, x0 - pad);
  const top = Math.max(0, y0 - pad);
  await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: Math.min(width - left, x1 - x0 + pad * 2 + 1), height: Math.min(height - top, y1 - y0 + pad * 2 + 1) })
    .png({ compressionLevel: 9 }).toBuffer().then((png) => sharp(png).toFile(path));
}

await cutSheet({
  sheet: join(ROOT, 'images', 'sprites', 'boss-rat', 'boss-rat.png'),
  out: join(ROOT, 'images', 'sprites', 'bomber-rat'),
  rows: { a: [14, 226], b: [252, 482], c: [507, 724], d: [751, 994] },
  labels: [
    [26, 18, 139, 65], [664, 19, 772, 66], [26, 256, 147, 302], [684, 257, 904, 303],
    [26, 511, 158, 557], [717, 512, 996, 558], [26, 757, 135, 804], [736, 762, 906, 808],
  ],
  anims: [
    { name: 'Idle', row: 'a', cuts: [22, 168, 322, 470, 620] },
    { name: 'Run', row: 'a', cuts: [650, 791, 941, 1082, 1231, 1370, 1516] },
    // In the two mid-air frames, his shadow stays on the ground, so it's left out.
    { name: 'Jump', row: 'b', cuts: [20, 175, 345, 500, 640], airborne: [2, 3] },
    { name: 'Throw', row: 'b', cuts: [680, 855, 1042, 1195] },
    // The bomb on its own, flying, and the bomb going off.
    { name: 'Bomb', row: 'b', cuts: [1195, 1335] },
    { name: 'Blast', row: 'b', cuts: [1335, 1515] },
    { name: 'Lunge', row: 'c', cuts: [18, 174, 338, 528, 700] },
    { name: 'Power', row: 'c', cuts: [714, 868, 1036, 1206, 1512] },
    { name: 'Won', row: 'd', cuts: [22, 196, 343, 514, 690] },
    { name: 'Defeated', row: 'd', cuts: [718, 897, 1050, 1208, 1370, 1516] },
  ],
  isFur: (r, g, b) => r > 70 && r < 150 && g > 70 && g < 150 && b > 110 && b < 190 && b > r + 15,
  clearBelow: 60,
  clearGreyHaze: true,
  reviewDir: process.argv[2],
  reviewName: 'rat-cut',
});
// The bomb without the shadow under it, and the explosion without the bomb going into it.
await keepOnly('Bomb (1).png', (_x, y, _r, _g, _b, _w, h) => y < h * 0.8);
await keepOnly('Blast (1).png', (x, _y, r, g, b, w) => x > w * 0.42 && r > 180 && g > 120);
console.log('Bomb and Blast trimmed');
