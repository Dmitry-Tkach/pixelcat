// Cuts the grey battle cat, the hero of the adventure, from the user's sheet
// (images/sprites/cat-version-2/cat-v-2-sprite.png): him with his minigun, running, jumping, sliding,
// climbing, shooting and more. See tools/cut-sheet.mjs.
// Run: node tools/cut-battle-cat.mjs [folder for review images]
// Output: images/sprites/battle-cat/Idle (n).png and so on. The sheet is left alone.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cutSheet, findCuts } from './cut-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(ROOT, 'images', 'sprites');
const SHEET = join(SPRITES, 'cat-version-2', 'cat-v-2-sprite.png');
const OUT = join(SPRITES, 'battle-cat');
const REVIEW = process.argv[2];

// His grey fur, which places him in each frame (not the gun's flash, the glows or the dust).
const isFur = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 30 && Math.max(r, g, b) > 50 && Math.max(r, g, b) < 200;

// The name tags printed on the sheet, cleared before cutting.
const LABELS = [
  [19, 10, 91, 38], [609, 10, 672, 38], [18, 171, 106, 201], [994, 173, 1206, 203], [19, 336, 79, 366],
  [452, 336, 572, 366], [984, 337, 1102, 368], [19, 503, 95, 531], [595, 504, 667, 531], [1031, 504, 1103, 531],
  [580, 665, 690, 695], [1069, 665, 1214, 695], [17, 667, 90, 696], [18, 849, 191, 877], [995, 852, 1122, 880],
];

const LABEL_HEIGHT = 32;

// The sheet's rows, top to bottom, each with its animations left to right and how many frames each has.
// band: the rows' top and bottom. fix: frame edges moved by hand, by their place in the row.
const ROWS = [
  { band: [10, 166], anims: [['Idle', 4], ['Run', 6]] },
  { band: [168, 333], anims: [['Shoot', 6], ['Burst', 4]] },
  { band: [334, 499], anims: [['Hit', 3], ['Rage', 4], ['Defeated', 5]] },
  { band: [500, 662], anims: [['Jump', 4], ['Slide', 4], ['Dash', 4]] },
  { band: [663, 846], anims: [['Climb', 4], ['ClimbUp', 4], ['ClimbDown', 4]] },
  // The beam of the fourth special frame reaches well past the gap between him and the next frame.
  { band: [847, 1023], anims: [['Special', 4], ['SpecialEnd', 3]], fix: { 4: 990 } },
];

let first = true;
for (const { band, anims, fix = {} } of ROWS) {
  // Frames are found below the name tags, whose grey edges would look like fur.
  const cuts = await findCuts(SHEET, [band[0] + LABEL_HEIGHT, band[1]], isFur);
  for (const [index, x] of Object.entries(fix)) cuts[index] = x;
  const total = anims.reduce((sum, [, n]) => sum + n, 0);
  if (cuts.length - 1 !== total) throw new Error(`${anims.map(([n]) => n)}: found ${cuts.length - 1} frames, not ${total} (cuts ${cuts})`);
  let at = 0;
  const rowAnims = anims.map(([name, frames]) => {
    const anim = { name, row: 'row', cuts: cuts.slice(at, at + frames + 1) };
    at += frames;
    return anim;
  });
  await cutSheet({
    sheet: SHEET,
    out: OUT,
    keepFrames: !first,
    rows: { row: band },
    labels: LABELS,
    anims: rowAnims,
    isFur,
    clearBelow: 40, // the faint haze over the sheet's background
    reviewDir: REVIEW,
    reviewName: `battle-cat-${anims.map(([n]) => n.toLowerCase()).join('-')}`,
  });
  first = false;
}

// The sheet draws a ladder behind him as he climbs, and a block he climbs onto. The game has its own
// ladders and islands, so they're taken out, leaving only him.
const framesOf = (name) => readdirSync(OUT).filter((f) => f.startsWith(`${name} (`));
async function editFrame(file, edit) {
  const path = join(OUT, file);
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  edit(data, info.width, info.height);
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(path);
}
// The ladder's wood is a warm grey, a little redder than blue, and dull; his fur is a cool grey, and
// his tongue and nose are strongly coloured.
const isWood = (r, g, b) => r - b > 8 && r - b < 45 && Math.max(r, g, b) - Math.min(r, g, b) < 45 && Math.max(r, g, b) > 60;

// Keeps only him: the biggest piece of the frame once it's thinned by `thin` pixels, so thin lines
// joined to him, like a ladder's outlines, come apart from him and go, along with loose dust. What's
// left is grown back by a little more than it was thinned, to give him back his own outline.
function keepHim(px, w, h, thin) {
  const solid = new Uint8Array(w * h);
  // Faint haze doesn't count, so it doesn't join loose dust to him.
  for (let p = 0; p < w * h; p++) solid[p] = px[p * 4 + 3] > 100 ? 1 : 0;
  const within = (mask, x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[ny * w + nx]) return true;
    }
    return false;
  };
  // Thinned: only pixels with nothing empty within `thin` of them.
  const core = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solid[y * w + x]) continue;
    let full = true;
    for (let dy = -thin; dy <= thin && full; dy++) for (let dx = -thin; dx <= thin; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !solid[ny * w + nx]) { full = false; break; }
    }
    core[y * w + x] = full ? 1 : 0;
  }
  // Its biggest piece.
  const piece = new Int32Array(w * h).fill(-1);
  let biggest = -1, biggestSize = 0;
  for (let start = 0, id = 0; start < w * h; start++) {
    if (!core[start] || piece[start] >= 0) continue;
    const stack = [start];
    piece[start] = id;
    let size = 0;
    while (stack.length) {
      const p = stack.pop();
      size += 1;
      const x = p % w;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || Math.abs((q % w) - x) > 1 || !core[q] || piece[q] >= 0) continue;
        piece[q] = id;
        stack.push(q);
      }
    }
    if (size > biggestSize) { biggest = id; biggestSize = size; }
    id += 1;
  }
  const him = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) him[p] = piece[p] === biggest ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] > 0 && !within(him, x, y, thin + 1)) px[(y * w + x) * 4 + 3] = 0;
  }
}

// His nose and mouth are shaded in pinkish greys like the wood, so nothing close to their bright red
// is taken for wood.
const isRed = (r, g, b) => r > 170 && r - g > 80;
const FACE_GUARD = 7;
function removeLadder(px, w, h) {
  const red = [];
  for (let p = 0; p < w * h; p++) if (px[p * 4 + 3] > 100 && isRed(px[p * 4], px[p * 4 + 1], px[p * 4 + 2])) red.push(p);
  const guarded = new Uint8Array(w * h);
  for (const p of red) {
    const x = p % w, y = (p - x) / w;
    for (let dy = -FACE_GUARD; dy <= FACE_GUARD; dy++) for (let dx = -FACE_GUARD; dx <= FACE_GUARD; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) guarded[ny * w + nx] = 1;
    }
  }
  for (let p = 0; p < w * h; p++) if (!guarded[p] && isWood(px[p * 4], px[p * 4 + 1], px[p * 4 + 2])) px[p * 4 + 3] = 0;
  keepHim(px, w, h, 3);
}

// The block is the wide, solid part at the bottom of the frame: everything from its top edge down
// goes, and the game's island stands in its place. He's never as wide as this.
const BLOCK_WIDE = 0.76;
function removeBlock(px, w, h) {
  const solidIn = (y) => { let n = 0; for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 200) n += 1; return n; };
  const wide = (y) => solidIn(y) > w * BLOCK_WIDE;
  let top = h;
  while (top > 0 && !wide(top - 1)) top -= 1; // the room under his feet, and the block's soft bottom edge
  if (top === 0) throw new Error('no block found in a ClimbUp frame');
  while (top > 0 && wide(top - 1)) top -= 1;
  for (let y = top; y < h; y++) for (let x = 0; x < w; x++) px[(y * w + x) * 4 + 3] = 0;
}

for (const name of ['Climb', 'ClimbDown']) for (const file of framesOf(name)) await editFrame(file, removeLadder);
for (const file of framesOf('ClimbUp')) await editFrame(file, removeBlock);
// The dust drawn under him as he leaves the ground stays behind, so in the air it goes.
for (const n of [2, 3, 4]) await editFrame(`Jump (${n}).png`, (px, w, h) => keepHim(px, w, h, 1));

// The player's cat is placed by one hitbox for every animation, so every frame of the animations he
// plays as the cat gets the same size, with him in the middle and his feet on the same line. His
// special attack, with its long beam, keeps its own size.
const OWN_SIZE = ['Special'];
const files = readdirSync(OUT).filter((f) => f.endsWith('.png') && !OWN_SIZE.some((name) => f.startsWith(`${name} (`)));
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
