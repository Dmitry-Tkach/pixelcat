// Cuts the Bomber Rat boss into game frames, from the user's second, fuller sheet
// (images/sprites/boss-rat/rat_character_dev_pack). See tools/cut-sheet.mjs.
// Run: node tools/cut-boss-rat.mjs [folder for review images]
// Output: images/sprites/bomber-rat/Idle (n).png and so on. The sheets are left alone.
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutSheet } from './cut-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(ROOT, 'images', 'sprites', 'boss-rat', 'rat_character_dev_pack', 'rat_sprite_atlas_source.png');
const OUT = join(ROOT, 'images', 'sprites', 'bomber-rat');
const REVIEW = process.argv[2];

// His blue-grey fur, which places him in each frame (not his pink tail, his bombs or the glows).
const isFur = (r, g, b) => b > r + 15 && b > 90 && b < 200 && r > 50 && r < 150;
const common = { out: OUT, labels: [], isFur, clearBelow: 40, reviewDir: REVIEW };

// Clears the pixels `clear` picks, leaving the frame its size, so he stays in place as it plays.
async function clearWhere(file, clear) {
  const path = join(OUT, file);
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (clear(x, y, data[i], data[i + 1], data[i + 2], info.width)) data[i + 3] = 0;
    }
  }
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(path);
}

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
  const png = await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: Math.min(width - left, x1 - x0 + pad * 2 + 1), height: Math.min(height - top, y1 - y0 + pad * 2 + 1) })
    .png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(path);
}

// The cheering row's feet touch the heads of the knocked-out row below it, so the bottom of the sheet
// is split into two copies: one with only the cheering rats, one with only the knocked-out ones.
// Each separate shape goes to the row it sits in. Where two rats touch, each grows out from his own
// head or feet until they meet, so the pixels between them go to the nearer one.
const BOTTOM = 835; // the cheering row starts here
const SPLIT = 945; // above this, a shape belongs to the cheering row
const CHEER_RIGHT = 900; // the cheering row ends here, so a shape further right is knocked out
async function splitBottomRows() {
  const { data, info } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // Faint glow joins each cheering rat to the one below, so only solid pixels count. Fainter ones
  // are cleared by the cutter anyway (clearBelow).
  const solid = (p) => data[p * 4 + 3] > common.clearBelow;
  const owner = new Int8Array(W * H); // 1 cheering, 2 knocked out, 0 neither
  const seen = new Uint8Array(W * H);
  for (let start = BOTTOM * W; start < W * H; start++) {
    if (seen[start] || !solid(start)) continue;
    const piece = [start];
    seen[start] = 1;
    let y0 = H, y1 = 0, x0 = W;
    for (let k = 0; k < piece.length; k++) {
      const p = piece[k], x = p % W, y = (p - x) / W;
      y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= W || ny < BOTTOM || ny >= H) continue;
        const q = ny * W + nx;
        if (!seen[q] && solid(q)) { seen[q] = 1; piece.push(q); }
      }
    }
    const tallEnoughForBoth = y0 < SPLIT - 60 && y1 > SPLIT + 40; // a cheering rat touching a knocked-out one
    if (!tallEnoughForBoth) {
      const row = y0 < SPLIT && x0 < CHEER_RIGHT ? 1 : 2;
      for (const p of piece) owner[p] = row;
      continue;
    }
    // Two rats touching: above the band where they meet is the cheering rat, below it the knocked-out
    // one, and inside it each grows toward the other at the same pace.
    let front = [];
    for (const p of piece) {
      const y = Math.floor(p / W);
      if (y < SPLIT - 5) { owner[p] = 1; front.push(p); } else if (y > SPLIT + 30) { owner[p] = 2; front.push(p); }
    }
    const inPiece = new Uint8Array(W * H);
    for (const p of piece) inPiece[p] = 1;
    while (front.length) {
      const next = [];
      for (const p of front) {
        const x = p % W;
        for (const q of [p - 1, p + 1, p - W, p + W]) {
          if (q < 0 || q >= W * H || !inPiece[q] || owner[q]) continue;
          if (Math.abs((q % W) - x) > 1) continue; // no wrapping round the sheet's sides
          owner[q] = owner[p];
          next.push(q);
        }
      }
      front = next;
    }
  }
  const only = async (row) => {
    const copy = Buffer.from(data);
    for (let p = BOTTOM * W; p < W * H; p++) if (owner[p] !== row) copy[p * 4 + 3] = 0;
    return sharp(copy, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  };
  return { cheering: await only(1), knockedOut: await only(2) };
}

await cutSheet({
  ...common,
  sheet: SHEET,
  reviewName: 'rat-cut',
  rows: { idle: [0, 140], run: [141, 268], jump: [270, 440], throw: [442, 580], lunge: [582, 705], power: [706, 834] },
  anims: [
    { name: 'Idle', row: 'idle', cuts: [20, 176, 338, 504, 670, 842, 1013, 1180, 1340] },
    { name: 'Run', row: 'run', cuts: [15, 185, 335, 496, 666, 833, 1020, 1184, 1337, 1500] },
    { name: 'Jump', row: 'jump', cuts: [8, 162, 342, 502, 657, 823, 967, 1148, 1310] },
    { name: 'Throw', row: 'throw', cuts: [10, 197, 358, 511, 630, 802, 931, 1096] },
    // The bomb on its own, flying, and the bomb going off.
    { name: 'Bomb', row: 'throw', cuts: [1096, 1220] },
    { name: 'Blast', row: 'throw', cuts: [1340, 1530] },
    // His dash ends in claw slashes, which reach into the next frame, so they're cut at the gap.
    { name: 'Lunge', row: 'lunge', cuts: [15, 192, 398, 600, 858, 1082, 1290] },
    { name: 'Power', row: 'power', cuts: [10, 175, 360, 550, 740, 960, 1150, 1290, 1525] },
  ],
});
const { cheering, knockedOut } = await splitBottomRows();
await cutSheet({
  ...common,
  sheet: cheering,
  keepFrames: true,
  reviewName: 'rat-cut-won',
  rows: { won: [835, 1023] },
  anims: [{ name: 'Won', row: 'won', cuts: [20, 190, 355, 530, 710, 900] }],
});
await cutSheet({
  ...common,
  sheet: knockedOut,
  keepFrames: true,
  reviewName: 'rat-cut-defeated',
  rows: { defeated: [835, 1023] },
  anims: [{ name: 'Defeated', row: 'defeated', cuts: [20, 184, 343, 523, 700, 871, 1041, 1200, 1355, 1525] }],
});
// The bomb without the streaks behind it, which would point the wrong way when he throws to the left.
// The streaks are mid-grey and the bomb nearly black, so the bomb is the circle around its darkest
// pixels, with its shine, its fuse cap and its burning fuse.
async function bombCircle(file) {
  const { data, info } = await sharp(join(OUT, file)).raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] < 200 || Math.max(data[i], data[i + 1], data[i + 2]) >= 45) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const r = (y1 - y0) / 2; // its height: the darkest pixels reach further left, into the streaks
  return { cx: x1 - r, cy: (y0 + y1) / 2, r: r + 2 };
}
const bomb = await bombCircle('Bomb (1).png');
const fuse = (r, b) => r > 180 && r > b + 60;
await keepOnly('Bomb (1).png', (x, y, r, g, b) => (
  (x - bomb.cx) ** 2 + (y - bomb.cy) ** 2 <= bomb.r ** 2
  || fuse(r, b)
  || (y < bomb.cy - bomb.r + 4 && Math.abs(x - bomb.cx) < bomb.r * 0.5 && Math.max(r, g, b) < 110) // the fuse cap
));
// The end of the previous frame's claw slash, at the left edge of the fifth lunge frame. It's pale
// blue, unlike his pink tail.
await clearWhere('Lunge (5).png', (x, _y, r, g, b) => x < 90 && b > 170 && g > 150 && b >= r);
console.log('Bomb and lunge tidied');
