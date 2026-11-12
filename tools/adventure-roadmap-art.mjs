// Prepares the adventure's road map (Level Select) from the owner's designs, into
// public/assets/ui/adventure-roadmap, from the owner's atlas of separate pieces in
// images/Adventure_Wide_Worlds_Separate_Titles (never changed): the eight worlds' islands (with no
// words on them), their title plates, the world badges, the level buttons and their states, the cat
// and two clouds. Its own crops are rough, so each piece is cut here from the atlas, which has real
// transparency: the drawings whose middle is inside the piece's box, so nothing of a neighbour
// comes along. ui/adventureRoadmap.js puts them together (the layout is in data/adventure/roadmap.js);
// the sky behind them is CSS.
//
// Run: node tools/adventure-roadmap-art.mjs [--sheet out.png]
import sharp from 'sharp';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ATLAS = 'images/Adventure_Wide_Worlds_Separate_Titles/00_atlas_reference/full_asset_atlas_reference.png';
const OUT = 'public/assets/ui/adventure-roadmap';

// Each piece's box on the atlas: left, top, right, bottom. Worlds are numbered from the bottom of
// the map, the first, as the road climbs.
const PIECES = {
  'island-1': [13, 41, 393, 259], 'island-2': [404, 27, 773, 259], 'island-3': [786, 12, 1153, 256],
  'island-4': [1165, 25, 1527, 251], 'island-5': [12, 267, 380, 448], 'island-6': [396, 257, 758, 458],
  'island-7': [770, 267, 1144, 453], 'island-8': [1147, 254, 1527, 457],
  'title-1': [23, 491, 217, 540], 'title-2': [222, 491, 407, 540], 'title-3': [411, 491, 590, 540],
  'title-4': [595, 491, 784, 541], 'title-5': [789, 491, 969, 540], 'title-6': [974, 491, 1156, 541],
  'title-7': [1160, 491, 1341, 541], 'title-8': [1345, 491, 1528, 541],
  'badge-1': [38, 589, 100, 657], 'badge-2': [113, 589, 174, 657], 'badge-3': [187, 589, 249, 657],
  'badge-4': [262, 589, 324, 657], 'badge-5': [336, 589, 399, 657], 'badge-6': [412, 589, 472, 657],
  'badge-7': [485, 589, 547, 657], 'badge-8': [560, 589, 623, 657],
  'level-1': [733, 592, 795, 658], 'level-2': [818, 591, 880, 658], 'level-3': [904, 592, 966, 658],
  'level-done': [1214, 590, 1278, 658], 'level-locked': [1310, 590, 1374, 658],
  cat: [22, 817, 195, 1011],
  'cloud-1': [1385, 939, 1515, 996], 'cloud-2': [1254, 943, 1373, 992],
};
const PAD = 4; // room kept round each piece, for its soft edge
const SOLID = 40; // more opaque than this, a pixel belongs to a drawing
const QUALITY = 88;

// Each drawing in the atlas: a number for every solid pixel, and each drawing's middle.
function drawings(data, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  const middles = [];
  for (let start = 0; start < W * H; start++) {
    if (label[start] >= 0 || data[start * 4 + 3] <= SOLID) continue;
    const id = middles.length;
    const stack = [start];
    label[start] = id;
    let sx = 0, sy = 0, n = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p - x) / W;
      sx += x; sy += y; n += 1;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
        if (q >= 0 && q < W * H && label[q] < 0 && data[q * 4 + 3] > SOLID) { label[q] = id; stack.push(q); }
      }
    }
    middles.push({ x: sx / n, y: sy / n });
  }
  return { label, middles };
}

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) rmSync(join(OUT, file));

const { data, info } = await sharp(ATLAS).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const { label, middles } = drawings(data, W, H);
for (const [name, [x0, y0, x1, y1]] of Object.entries(PIECES)) {
  const left = Math.max(0, x0 - PAD), top = Math.max(0, y0 - PAD);
  const w = Math.min(W, x1 + PAD + 1) - left, h = Math.min(H, y1 + PAD + 1) - top;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (top + y) * W + left + x;
      // A drawing whose middle is in the box, or the soft edge round it (not a neighbour's).
      const m = middles[label[p]];
      if (m && (m.x < x0 || m.x > x1 || m.y < y0 || m.y > y1)) continue;
      data.copy(out, (y * w + x) * 4, p * 4, p * 4 + 4);
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 0 })
    .webp({ quality: QUALITY, alphaQuality: 95 }).toFile(join(OUT, `${name}.webp`));
}

console.log(`The road map's ${Object.keys(PIECES).length} pieces, in ${OUT}`);

// The contact sheet: every piece on white and on dark, to check the cut.
const sheetAt = process.argv.indexOf('--sheet');
if (sheetAt > 0) {
  const parts = [];
  let x = 0, y = 0, rowH = 0;
  const MAX_W = 1400;
  for (const name of Object.keys(PIECES)) {
    const file = join(OUT, `${name}.webp`);
    const { width, height } = await sharp(file).metadata();
    for (const bg of ['#ffffff', '#1b2b40']) {
      if (x + width > MAX_W) { x = 0; y += rowH + 8; rowH = 0; }
      parts.push({ input: await sharp({ create: { width, height, channels: 4, background: bg } }).composite([{ input: file }]).png().toBuffer(), left: x, top: y });
      x += width + 4;
      rowH = Math.max(rowH, height);
    }
    x += 12;
  }
  await sharp({ create: { width: MAX_W, height: y + rowH, channels: 4, background: '#888' } }).composite(parts).png().toFile(process.argv[sheetAt + 1]);
}
