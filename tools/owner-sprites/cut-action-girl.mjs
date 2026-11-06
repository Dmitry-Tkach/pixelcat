// Cuts the action-girl reference sheet into separate transparent frames.
// Run: node cut-action-girl.mjs
// Output: images/sprites/owner-action-girl/<Anim> (<n>).png, plus action-girl-check.png for review.
import sharp from 'sharp';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const GIRL_DIR = join(ROOT, 'images', 'sprites', 'girl');
const SOURCE = join(GIRL_DIR, readdirSync(GIRL_DIR).find((f) => f.startsWith('action-girl')));
const OUT = join(ROOT, 'images', 'sprites', 'owner-action-girl');

const WHITE = 232; // pixels with all channels above this count as background
const MIN_FRAME_AREA = 1500; // smaller blobs are watermark specks or stray marks
const MERGE_GAP = 26; // detached bits (like the sweat drops) join a frame within this distance
const HOLE_MIN_AREA = 45; // enclosed white gaps this big (between arm and body) become transparent
const PADDING = 6;

// Names follow the sheet's reading order: rows top to bottom, left to right.
const NAMES = [
  ['Idle', 4], ['Lunge', 1],
  ['Run', 6],
  ['Jump', 3], ['Hurt', 1], ['Down', 1],
];

const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const at = (x, y) => (y * W + x) * 4;
const isWhite = (i) => data[i] > WHITE && data[i + 1] > WHITE && data[i + 2] > WHITE;

// Flood-fill near-white from the borders, so whites inside the character (eyes, stripes) stay.
const outside = new Uint8Array(W * H);
const fill = (seeds, mark, test) => {
  const stack = [...seeds];
  const found = [];
  while (stack.length) {
    const p = stack.pop();
    if (mark[p] || !test(p)) continue;
    mark[p] = 1;
    found.push(p);
    const x = p % W, y = (p - x) / W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }
  return found;
};
const borders = [];
for (let x = 0; x < W; x++) borders.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) borders.push(y * W, y * W + W - 1);
fill(borders, outside, (p) => isWhite(p * 4));

// Enclosed white regions: larger ones are gaps in the pose, not eye whites.
const seen = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) {
  if (outside[p] || seen[p] || !isWhite(p * 4)) continue;
  const region = fill([p], seen, (q) => !outside[q] && isWhite(q * 4));
  if (region.length >= HOLE_MIN_AREA) region.forEach((q) => { outside[q] = 1; });
}

// Clear the background, softening the pale fringe next to it.
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  if (outside[p]) { data[i + 3] = 0; continue; }
  const x = p % W, y = (p - x) / W;
  const nearBg = (x > 0 && outside[p - 1]) || (x < W - 1 && outside[p + 1]) ||
    (y > 0 && outside[p - W]) || (y < H - 1 && outside[p + W]);
  if (nearBg) {
    const lightness = Math.min(data[i], data[i + 1], data[i + 2]);
    if (lightness > 170) data[i + 3] = Math.round(255 * (1 - (lightness - 170) / 85));
  }
}

// Connected blobs of remaining pixels.
const label = new Uint8Array(W * H);
let blobs = [];
for (let p = 0; p < W * H; p++) {
  if (outside[p] || label[p]) continue;
  const pts = fill([p], label, (q) => !outside[q]);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const q of pts) {
    const x = q % W, y = (q - x) / W;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  blobs.push({ pts, x0, y0, x1, y1, area: pts.length });
}
const frames = blobs.filter((b) => b.area >= MIN_FRAME_AREA);
const small = blobs.filter((b) => b.area < MIN_FRAME_AREA);

// Attach small pieces that belong to a frame; everything else is erased.
for (const s of small) {
  const owner = frames.find((b) =>
    s.x0 <= b.x1 + MERGE_GAP && s.x1 >= b.x0 - MERGE_GAP && s.y0 <= b.y1 + MERGE_GAP && s.y1 >= b.y0 - MERGE_GAP);
  if (owner && s.area >= 6) {
    owner.pts.push(...s.pts);
    owner.x0 = Math.min(owner.x0, s.x0); owner.x1 = Math.max(owner.x1, s.x1);
    owner.y0 = Math.min(owner.y0, s.y0); owner.y1 = Math.max(owner.y1, s.y1);
  } else {
    s.pts.forEach((q) => { data[q * 4 + 3] = 0; });
  }
}

// Reading order: group into rows by vertical centre.
frames.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
const rows = [];
for (const b of frames) {
  const mid = (b.y0 + b.y1) / 2;
  const row = rows.find((r) => Math.abs(r.mid - mid) < 70);
  if (row) row.items.push(b); else rows.push({ mid, items: [b] });
}
rows.forEach((r) => r.items.sort((a, b) => a.x0 - b.x0));
const ordered = rows.flatMap((r) => r.items);
const expected = NAMES.reduce((sum, [, c]) => sum + c, 0);
console.log(`Image ${W}x${H}; rows: ${rows.map((r) => r.items.length).join(', ')}; frames: ${ordered.length}, expected ${expected}`);
if (ordered.length !== expected) throw new Error('Frame count does not match the expected layout');

// Same canvas for every frame, feet on the same line. Upright poses line up on the head,
// so she doesn't wobble sideways as the hair and limbs change the frame's outer edges.
const frameNames = NAMES.flatMap(([name, count]) => Array(count).fill(name));
ordered.forEach((b, i) => {
  const limit = b.y0 + (b.y1 - b.y0) * 0.3;
  const xs = [];
  for (const q of b.pts) {
    const x = q % W, y = (q - x) / W;
    if (y <= limit) xs.push(x);
  }
  const upright = !['Lunge', 'Down'].includes(frameNames[i]);
  b.anchorX = upright ? xs.reduce((sum, x) => sum + x, 0) / xs.length : (b.x0 + b.x1) / 2;
});
const halfW = Math.ceil(Math.max(...ordered.map((b) => Math.max(b.anchorX - b.x0, b.x1 - b.anchorX))));
const cw = halfW * 2 + 1 + PADDING * 2;
const ch = Math.max(...ordered.map((b) => b.y1 - b.y0 + 1)) + PADDING * 2;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let k = 0;
const tiles = [];
for (const [name, count] of NAMES) {
  for (let c = 1; c <= count; c++, k++) {
    const b = ordered[k];
    const bh = b.y1 - b.y0 + 1;
    const buf = Buffer.alloc(cw * ch * 4);
    const ox = Math.round(PADDING + halfW - (b.anchorX - b.x0)), oy = ch - PADDING - bh;
    for (const q of b.pts) {
      const x = q % W, y = (q - x) / W;
      const si = q * 4, di = ((y - b.y0 + oy) * cw + (x - b.x0 + ox)) * 4;
      data.copy(buf, di, si, si + 4);
    }
    const png = await sharp(buf, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
    await sharp(png).toFile(join(OUT, `${name} (${c}).png`));
    tiles.push(png);
  }
}
console.log(`Saved ${k} frames at ${cw}x${ch}`);

// Review image on a colored background, which makes leftover white obvious.
const cols = 6, gap = 10;
const composite = tiles.map((input, i) => ({
  input,
  left: gap + (i % cols) * (cw + gap),
  top: gap + Math.floor(i / cols) * (ch + gap),
}));
await sharp({
  create: {
    width: gap + cols * (cw + gap),
    height: gap + Math.ceil(tiles.length / cols) * (ch + gap),
    channels: 4,
    background: '#5AA9E6',
  },
}).composite(composite).png().toFile(join(HERE, 'action-girl-check.png'));
