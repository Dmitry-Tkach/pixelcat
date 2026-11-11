// Cuts the grey battle cat, the hero of the adventure, from the user's two sheets in
// images/sprites/cat-version-2: grey_cat_development_assets/source_redrawn_sheet.png, him with bare
// paws, as he starts a level, and cat-v-2-sprite.png, him with the minigun he can find. Running, jumping, sliding, his rage, his beam,
// and with the minigun, shooting. See tools/cut-sheet.mjs. His climbing, seen from behind, comes from a
// third sheet, back_view_ladder_cat_assets, and is the same for both: he puts the minigun away to climb.
// Run: node tools/cut-battle-cat.mjs [folder for review images]
// Output: images/sprites/battle-cat (with the minigun) and images/sprites/battle-cat-paws (without),
// as Idle (n).png and so on, every frame the same size in both, so he can swap mid-run. The sheets
// are left alone.
import sharp from 'sharp';
import { readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearPaintedBackground, cutSheet, findCuts } from './cut-sheet.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRITES = join(ROOT, 'images', 'sprites');
const REVIEW = process.argv[2];

// His grey fur, which places him in each frame (not the gun's flash, the glows or the dust).
const isFur = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) < 30 && Math.max(r, g, b) > 50 && Math.max(r, g, b) < 200;

// Each sheet: its name tags (cleared before cutting), and its rows top to bottom, each with its
// animations left to right and how many frames each has. band: the row's top and bottom. cuts: the
// frame edges, left to right, when they're given rather than found. fix: frame
// edges moved by hand, by their place in the row; drop: cuts that aren't between two frames, by their
// place in the row. airborne: the jump frames off the ground, whose dust is left behind. close: the
// cats stand so close that slivers of the next one are cleared. run: his run's own strip (RUN_STRIP).
const SHEETS = {
  minigun: {
    file: join(SPRITES, 'cat-version-2', 'cat-v-2-sprite.png'),
    out: join(SPRITES, 'battle-cat'),
    labels: [
      [19, 10, 91, 38], [609, 10, 672, 38], [18, 171, 106, 201], [994, 173, 1206, 203], [19, 336, 79, 366],
      [452, 336, 572, 366], [984, 337, 1102, 368], [19, 503, 95, 531], [595, 504, 667, 531], [1031, 504, 1103, 531],
      [580, 665, 690, 695], [1069, 665, 1214, 695], [17, 667, 90, 696], [18, 849, 191, 877], [995, 852, 1122, 880],
    ],
    rows: [
      { band: [10, 166], anims: [['Idle', 4], ['Run', 6]] },
      { band: [168, 333], anims: [['Shoot', 6], ['Burst', 4]] },
      { band: [334, 499], anims: [['Hit', 3], ['Rage', 4], ['Defeated', 5]] },
      { band: [500, 662], anims: [['Jump', 4], ['Slide', 4], ['Dash', 4]] },
      { band: [663, 846], anims: [['Climb', 4], ['ClimbUp', 4], ['ClimbDown', 4]] },
      // The beam of the fourth special frame reaches well past the gap between him and the next frame.
      { band: [847, 1023], anims: [['Special', 4], ['SpecialEnd', 3]], fix: { 4: 990 } },
    ],
    airborne: [2, 3, 4],
    run: { file: join(SPRITES, 'cat-version-2', 'grey_cat_minigun_run', 'run_strip.png'), scale: 0.596 },
  },
  // The bare-pawed sheet, redrawn clean: real transparency, with no name tags, ladders or haze. (A
  // sheet with a checkerboard painted in instead of transparency takes `painted: true`, which clears it.)
  paws: {
    file: join(SPRITES, 'cat-version-2', 'grey_cat_development_assets', 'source_redrawn_sheet.png'),
    out: join(SPRITES, 'battle-cat-paws'),
    labels: [],
    // The redrawn cats stand only a few pixels apart, so each row's cuts are given, in the gaps
    // measured between them (the hit stars, glows and dust stay with their own frame).
    rows: [
      { band: [10, 205], anims: [['Idle', 4], ['Run', 7]], cuts: [11, 145, 280, 410, 570, 739, 880, 1013, 1140, 1269, 1395, 1536] },
      { band: [210, 388], anims: [['Jump', 4], ['Slide', 4]], cuts: [0, 168, 323, 480, 700, 952, 1122, 1300, 1536] },
      { band: [390, 588], anims: [['Hit', 3], ['Rage', 4], ['Defeated', 3]], cuts: [0, 170, 325, 485, 637, 775, 912, 1048, 1206, 1352, 1536] },
      { band: [590, 795], anims: [['Dash', 4], ['Climb', 4], ['ClimbUp', 3]], cuts: [0, 165, 313, 452, 620, 745, 852, 949, 1070, 1260, 1390, 1536] },
      // The beam of the third special frame reaches almost to the special end.
      { band: [796, 1023], anims: [['ClimbDown', 4], ['Special', 3], ['SpecialEnd', 3]], cuts: [0, 126, 245, 359, 480, 624, 746, 1148, 1273, 1397, 1536] },
    ],
    airborne: [2, 3, 4],
    run: { file: join(SPRITES, 'cat-version-2', 'grey_cat_run_cycle', 'run_strip.png'), scale: 0.486 },
    close: true, // its cats stand close, so slivers of the next one are cleared (see dropSlivers)
  },
};

const LABEL_HEIGHT = 36;

// Every frame he plays as the cat (but his special attack) is this size, with his feet on the same
// line: his hitboxes in src/data/characters.js are measured in it.
const FRAME = { w: 236, h: 171 };

// The back-view climbing sheet: a grid of square cells, one animation per row, left to right.
// middleY: where his body's middle goes in the climbing frames, the middle of his hitbox, so he
// doesn't bob as the frames loop. The pull-up ends standing, and that last frame places all of its
// frames, so the rise it draws is kept, with his feet on the line where he stands.
const BACK_VIEW = {
  file: join(SPRITES, 'cat-version-2', 'back_view_ladder_cat_assets', 'sprite_sheet_transparent.png'),
  cell: 256,
  rows: [['Climb', 6], ['ClimbDown', 6], ['Hang', 1], ['ClimbUp', 4]],
  middleY: 102,
};
const CLIMBING = ['Climb', 'ClimbDown', 'ClimbUp', 'Hang'];

// His run, redrawn as a proper 8-frame cycle, one strip per version (`run` in SHEETS): a row of square
// cells with him centred at `middle`, his feet on one line. Its scale, per version, makes him his
// running size beside his other moves (measured against the sheets' own runs, which it replaces), and
// his feet are put where that version's feet are standing.
const RUN_STRIP = { cell: 256, frames: 8, middle: 128 };
const SOLID = 200; // alpha at which a pixel is him, not a soft edge
const LEGS = 0.18; // his legs: the bottom share of his figure, whose middle places him standing

async function cutCat(name, { file, painted, out, labels, rows }) {
  const sheet = painted ? await clearPaintedBackground(file) : file;
  let first = true;
  for (const { band, anims, fix = {}, drop = [], cuts: given } of rows) {
    // Frames are found below the name tags, whose grey edges would look like fur, unless they're given.
    const cuts = given ? [...given] : (await findCuts(sheet, [band[0] + LABEL_HEIGHT, band[1]], isFur)).filter((_, i) => !drop.includes(i));
    for (const [index, x] of Object.entries(fix)) cuts[index] = x;
    const total = anims.reduce((sum, [, n]) => sum + n, 0);
    if (cuts.length - 1 !== total) throw new Error(`${name} ${anims.map(([n]) => n)}: found ${cuts.length - 1} frames, not ${total} (cuts ${cuts})`);
    let at = 0;
    const rowAnims = anims.map(([anim, frames]) => {
      const cut = { name: anim, row: 'row', cuts: cuts.slice(at, at + frames + 1) };
      at += frames;
      return cut;
    });
    await cutSheet({
      sheet,
      out,
      keepFrames: !first,
      rows: { row: band },
      labels,
      anims: rowAnims,
      isFur,
      clearBelow: 40, // the faint haze over the sheet's background
      reviewDir: REVIEW,
      reviewName: `battle-cat-${name}-${anims.map(([n]) => n.toLowerCase()).join('-')}`,
    });
    first = false;
  }
}

// Frames are changed in place: `edit` gets the frame's pixels to change.
async function editFrame(path, edit) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  edit(data, info.width, info.height);
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(path);
}

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

// Where cats stand close on a sheet, a sliver of the next cat's dark outline can reach over the cut.
// Small loose pieces that are mostly that dark go, and thin upright strips left along the cut, such
// as an edge of the next cat's dust. His own dust, stars and flames are wider, and light or coloured.
// seen: the alpha at which a pixel joins a piece, so near-invisible haze doesn't join a sliver to him.
const SLIVER = { size: 400, dark: 70, share: 0.6, thin: 10, seen: 40 }; // pixels; how dark; share; width; alpha
function dropSlivers(px, w, h) {
  const seen = new Uint8Array(w * h);
  const isDark = (p) => Math.max(px[p * 4], px[p * 4 + 1], px[p * 4 + 2]) < SLIVER.dark;
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || px[start * 4 + 3] < SLIVER.seen) continue;
    const piece = [start];
    seen[start] = 1;
    for (let k = 0; k < piece.length; k++) {
      const p = piece[k], x = p % w;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || Math.abs((q % w) - x) > 1 || seen[q] || px[q * 4 + 3] < SLIVER.seen) continue;
        seen[q] = 1;
        piece.push(q);
      }
    }
    const xs = piece.map((p) => p % w);
    const thin = Math.max(...xs) - Math.min(...xs) < SLIVER.thin;
    if (piece.length < SLIVER.size && (thin || piece.filter(isDark).length >= piece.length * SLIVER.share)) {
      for (const p of piece) px[p * 4 + 3] = 0;
    }
  }
}

for (const [name, sheet] of Object.entries(SHEETS)) {
  await cutCat(name, sheet);
  const { out } = sheet;
  const framesOf = (anim) => readdirSync(out).filter((f) => f.startsWith(`${anim} (`));
  const edit = (file, change) => editFrame(join(out, file), change);
  // His climbing comes from the back-view sheet instead (below), so the sheet's own climbing goes.
  for (const anim of CLIMBING) for (const file of framesOf(anim)) unlinkSync(join(out, file));
  // His run comes from its own strip instead (below).
  if (sheet.run) for (const file of framesOf('Run')) unlinkSync(join(out, file));
  if (sheet.close) for (const file of readdirSync(out).filter((f) => f.endsWith('.png'))) await edit(file, dropSlivers);
  // The dust drawn under him as he leaves the ground stays behind, so in the air it goes.
  for (const n of sheet.airborne) await edit(`Jump (${n}).png`, (px, w, h) => keepHim(px, w, h, 1));
}

// The two sheets may draw him at slightly different sizes, so the bare-pawed frames are scaled to his
// standing height with the minigun: picking it up mustn't make him grow or shrink.
const standingHeight = async (out) => {
  const heights = await Promise.all(readdirSync(out).filter((f) => f.startsWith('Idle (')).map(async (f) => {
    const { data, info } = await sharp(join(out, f)).raw().toBuffer({ resolveWithObject: true });
    let top = info.height, bottom = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 200) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
    return bottom - top;
  }));
  return heights.reduce((a, b) => a + b, 0) / heights.length;
};
const factor = (await standingHeight(SHEETS.minigun.out)) / (await standingHeight(SHEETS.paws.out));
if (Math.abs(factor - 1) > 0.01) {
  for (const file of readdirSync(SHEETS.paws.out).filter((f) => f.endsWith('.png'))) {
    const path = join(SHEETS.paws.out, file);
    const { width } = await sharp(path).metadata();
    const png = await sharp(path).resize({ width: Math.round(width * factor), kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();
    await sharp(png).toFile(path);
  }
}
console.log(`His bare-pawed frames are scaled by ${factor.toFixed(3)} to his size with the minigun`);

// The player's cat is placed by one hitbox for every animation, so every frame of the animations he
// plays, with or without the minigun, gets the same size, with him in the middle and his feet on the
// same line. His special attack, with its long beam, keeps its own size.
const OWN_SIZE = ['Special'];
const files = Object.values(SHEETS).flatMap(({ out }) => readdirSync(out)
  .filter((f) => f.endsWith('.png') && !OWN_SIZE.some((name) => f.startsWith(`${name} (`))).map((f) => join(out, f)));
const sizes = await Promise.all(files.map((f) => sharp(f).metadata()));
const W = FRAME.w, H = FRAME.h;
const tooBig = files.filter((_, i) => sizes[i].width > W || sizes[i].height > H);
if (tooBig.length) throw new Error(`frames bigger than ${W}x${H}: ${tooBig.join(', ')}`);
for (let i = 0; i < files.length; i++) {
  const { width, height } = sizes[i];
  const left = Math.floor((W - width) / 2);
  const png = await sharp(files[i])
    .extend({ left, right: W - width - left, top: H - height, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 }).toBuffer();
  await sharp(png).toFile(files[i]);
}
console.log(`The frames he plays as the cat are padded to ${W}x${H}`);

// Where he is in a picture: the box round his solid pixels, his middle, and the middle of his legs.
function placeOf(px, w, h) {
  let top = h, bottom = -1, left = w, right = -1, sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (px[(y * w + x) * 4 + 3] <= SOLID) continue;
    top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
    sx += x; sy += y; n += 1;
  }
  let lx = 0, ln = 0;
  for (let y = Math.round(bottom - (bottom - top) * LEGS); y <= bottom; y++) {
    for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > SOLID) { lx += x; ln += 1; }
  }
  return { top, bottom, left, right, x: sx / n, y: sy / n, legsX: lx / ln };
}
const placeIn = async (file) => {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  return placeOf(data, info.width, info.height);
};

// The back-view climbing, cut for both versions. It's scaled so his standing frame at the end of the
// pull-up is his standing height with the minigun, and placed where he stands in his other frames.
const standing = await placeIn(join(SHEETS.minigun.out, 'Idle (1).png'));
const { cell } = BACK_VIEW;
const cells = await Promise.all(BACK_VIEW.rows.map(([anim, frames], row) => Promise.all(Array.from({ length: frames }, async (_, i) => {
  const png = await sharp(BACK_VIEW.file).ensureAlpha().extract({ left: i * cell, top: row * cell, width: cell, height: cell }).png().toBuffer();
  const { data } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  return { anim, n: i + 1, png, place: placeOf(data, cell, cell) };
}))));
const standingUp = cells.at(-1).at(-1).place;
const scale = (standing.bottom - standing.top) / (standingUp.bottom - standingUp.top);
const size = Math.round(cell * scale);
for (const frame of cells.flat()) {
  const { place } = frame;
  // Climbing and hanging: his body's middle on one spot. The pull-up: all placed by its last frame.
  const left = frame.anim === 'ClimbUp' ? standing.legsX - standingUp.legsX * scale : standing.legsX - place.x * scale;
  const top = frame.anim === 'ClimbUp' ? standing.bottom - standingUp.bottom * scale : BACK_VIEW.middleY - place.y * scale;
  const x = Math.round(left), y = Math.round(top);
  const scaled = await sharp(frame.png).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
  // sharp needs every piece inside the canvas, so what reaches past the frame is cut off.
  const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + size), y1 = Math.min(H, y + size);
  const piece = await sharp(scaled).extract({ left: x0 - x, top: y0 - y, width: x1 - x0, height: y1 - y0 }).toBuffer();
  const out = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: piece, left: x0, top: y0 }]).png({ compressionLevel: 9 }).toBuffer();
  for (const { out: dir } of Object.values(SHEETS)) await sharp(out).toFile(join(dir, `${frame.anim} (${frame.n}).png`));
}
console.log(`His back-view climbing is scaled by ${scale.toFixed(3)}: ${BACK_VIEW.rows.map(([a, n]) => `${a} ${n}`).join(', ')}`);

// The runs, from their strips, placed where he stands in his other frames.
for (const { out, run } of Object.values(SHEETS)) {
  if (!run) continue;
  const { cell, frames, middle } = RUN_STRIP;
  const size = Math.round(cell * run.scale);
  const feet = (await placeIn(run.file)).bottom;
  const own = await placeIn(join(out, 'Idle (1).png'));
  const x = Math.round(standing.legsX - middle * run.scale), y = Math.round(own.bottom + 0.5 - (feet + 0.5) * run.scale);
  if (x < 0 || y < 0 || x + size > W || y + size > H) throw new Error(`the run's cells don't fit in ${W}x${H}: lower its scale`);
  for (let i = 0; i < frames; i++) {
    const piece = await sharp(run.file).extract({ left: i * cell, top: 0, width: cell, height: cell }).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
    await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: piece, left: x, top: y }]).png({ compressionLevel: 9 }).toFile(join(out, `Run (${i + 1}).png`));
  }
  console.log(`${out.split('/').pop()}: his run is ${frames} frames, scaled by ${run.scale}`);
}
