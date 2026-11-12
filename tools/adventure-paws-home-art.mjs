// Prepares the art for the adventure's home screen, "Adventure Paws", from the owner's ChatGPT
// pictures in images/assets/adventure-paws-home-page (never changed), into
// public/assets/ui/adventure-home: the landscape, the characters who stand in it, the logo, and the
// menu's buttons and icons. The screen puts the characters back where the owner's example has them
// (ui/adventureHome.js), as separate layers.
//
// The logo and the asset sheet come with a checkerboard painted in where they should be transparent,
// so it's cleared first (clearPaintedBackground in cut-sheet.mjs). Then each piece is cut from the
// sheet by its box, keeping only the drawings that belong in it. The painted ground shadows under the
// characters are cleared too, as they show the checkerboard through them: the screen draws its own.
// Everything is saved as webp, which keeps transparency at a fraction of a png's size. With
// --sheet <out.png>, it also draws every piece on one contact sheet, to check them.
//
// Run: node tools/adventure-paws-home-art.mjs [--sheet out.png]
import sharp from 'sharp';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { clearPaintedBackground } from './cut-sheet.mjs';

const SOURCE = 'images/assets/adventure-paws-home-page';
const OUT = 'public/assets/ui/adventure-home';
const FILES = {
  landscape: 'a_vibrant_cartoon_game_background_landscape_witho.png', // the landscape, no characters
  logo: 'a_clean_transparent_background_game_logo_illustrat.png',
  characters: 'a_high_quality_vibrant_cartoon_game_ui_assets_she.png', // each character on its own
  menu: 'a_high_quality_vector_cartoony_game_asset_set_on_a.png', // the buttons and icons, drawn big
};

// Each piece: the sheet it's on (a key of FILES), and its box there: left, top, right, bottom, in
// its pixels. `solid`: nothing inside its outline is see-through (a button), so anything the
// checkerboard clearing took from inside it, such as the light silver of the settings gear, is put
// back from the sheet. `shadow`: it stands on a painted shadow, to clear. `pockets`: points, on the
// sheet, inside checkerboard boxed in by the drawing (between the troll's legs, beside the wizard's
// robe), to clear from.
const CHARACTERS = {
  cat: { box: [460, 385, 845, 735] },
  troll: { box: [845, 93, 1209, 442], shadow: true, pockets: [[996, 390]] },
  gunCat: { box: [1231, 372, 1396, 504], shadow: true },
  goblin: { box: [863, 527, 1096, 740], shadow: true },
  knight: { box: [1117, 508, 1343, 744], shadow: true },
  wizard: { box: [1395, 469, 1652, 743], shadow: true, pockets: [[1539, 657]] },
};
const MENU = {
  'button-play': { box: [297, 460, 787, 585], solid: true },
  'button-levels': { box: [296, 592, 786, 696], solid: true },
  'button-settings': { box: [301, 704, 790, 803], solid: true },
  'button-achievements': { box: [869, 471, 1366, 579], solid: true },
  'button-credits': { box: [871, 589, 1367, 693], solid: true },
  'button-exit': { box: [867, 697, 1368, 805], solid: true },
  'icon-play': { box: [201, 828, 285, 923] },
  'icon-map': { box: [320, 829, 452, 925] },
  'icon-gear': { box: [483, 826, 588, 927] },
  'icon-trophy': { box: [612, 827, 740, 926] },
  'icon-book': { box: [762, 827, 898, 923] },
  'icon-exit': { box: [929, 830, 1025, 921] },
  'icon-gem': { box: [1061, 831, 1142, 920] },
  'icon-paw': { box: [1169, 829, 1272, 919] },
  'icon-leaf': { box: [1302, 821, 1473, 923] },
};
const PIECES = [['characters', CHARACTERS], ['menu', MENU]];
const PAD = 3; // room kept round each piece
// A painted shadow: greys this light or lighter, and this close to grey, spreading up from the
// bottom rows of its piece (past the padding). A figure's dark outline stops it, so his feet stay.
const SHADOW = { light: 140, grey: 16, fromRows: 12 };
// Drawings smaller than this (in pixels) are specks left by the checkerboard, not part of a piece.
const SPECK = 60;
// Every picture is webp, at this quality; its transparency at the second.
const QUALITY = 86;
const ALPHA_QUALITY = 90;
// The logo is drawn about 500px wide on the screen: this keeps it sharp on big screens, and small.
const LOGO_WIDTH = 900;

// Each separate drawing in a picture (pixels joined by solid neighbours): a number for every pixel,
// and each drawing's middle and size.
function drawings(data, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  const found = [];
  for (let start = 0; start < W * H; start++) {
    if (label[start] >= 0 || data[start * 4 + 3] === 0) continue;
    const id = found.length;
    const stack = [start];
    label[start] = id;
    let sx = 0, sy = 0, n = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % W, y = (p - x) / W;
      sx += x; sy += y; n += 1;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
        if (q >= 0 && q < W * H && label[q] < 0 && data[q * 4 + 3] > 0) { label[q] = id; stack.push(q); }
      }
    }
    found.push({ x: sx / n, y: sy / n, n });
  }
  return { label, found };
}

// Cuts a piece from the cleared sheet: only the drawings whose middle is inside its box.
function cutPiece(sheet, W, { label, found }, [x0, y0, x1, y1]) {
  const left = Math.max(0, x0 - PAD), top = Math.max(0, y0 - PAD);
  const w = Math.min(W, x1 + PAD + 1) - left, h = Math.min(sheet.length / 4 / W, y1 + PAD + 1) - top;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (top + y) * W + left + x;
      const d = found[label[p]];
      if (!d || d.n < SPECK || d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1) continue;
      sheet.copy(out, (y * w + x) * 4, p * 4, p * 4 + 4);
    }
  }
  return { data: out, w, h };
}

// Puts back what was cleared inside a solid piece: every see-through pixel that can't be reached
// from its edges without crossing the drawing gets its colour from the sheet as it was drawn.
function fillInside({ data, w, h }, original, W, [left, top]) {
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (outside[p] || data[p * 4 + 3] > 0) continue;
    outside[p] = 1;
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) if (q >= 0 && q < w * h) stack.push(q);
  }
  for (let p = 0; p < w * h; p++) {
    if (outside[p] || data[p * 4 + 3] > 0) continue;
    const s = ((top + Math.floor(p / w)) * W + left + (p % w)) * 3;
    data[p * 4] = original[s];
    data[p * 4 + 1] = original[s + 1];
    data[p * 4 + 2] = original[s + 2];
    data[p * 4 + 3] = 255;
  }
}

// Clears a painted shadow: the light greys reached from the bottom rows of the piece, and from any
// pocket points given (in the piece's own pixels).
function clearShadow({ data, w, h }, pockets = []) {
  const isShadow = (p) => {
    const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
    return data[p * 4 + 3] > 0 && Math.min(r, g, b) >= SHADOW.light && Math.max(r, g, b) - Math.min(r, g, b) < SHADOW.grey;
  };
  const stack = pockets.map(([x, y]) => y * w + x);
  for (let y = Math.max(0, h - SHADOW.fromRows); y < h; y++) for (let x = 0; x < w; x++) stack.push(y * w + x);
  while (stack.length) {
    const p = stack.pop();
    if (!isShadow(p)) continue;
    data[p * 4 + 3] = 0;
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) if (q >= 0 && q < w * h) stack.push(q);
  }
}

// Trims empty rows and columns round a piece.
async function trimmed({ data, w, h }) {
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 0 }).png().toBuffer();
}
const webp = (image) => image.webp({ quality: QUALITY, alphaQuality: ALPHA_QUALITY });

// The folder holds only what this makes, so it starts empty: a piece taken off the list goes.
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) rmSync(join(OUT, file));

// The landscape.
await webp(sharp(join(SOURCE, FILES.landscape))).toFile(join(OUT, 'landscape.webp'));

// The logo: only its biggest drawing, the sign, so the specks round it go.
{
  const cleared = await clearPaintedBackground(join(SOURCE, FILES.logo));
  const { data, info } = await sharp(cleared).raw().toBuffer({ resolveWithObject: true });
  const found = drawings(data, info.width, info.height);
  const biggest = found.found.reduce((best, d, i) => (d.n > found.found[best].n ? i : best), 0);
  for (let p = 0; p < info.width * info.height; p++) if (found.label[p] !== biggest) data[p * 4 + 3] = 0;
  const logo = await trimmed({ data, w: info.width, h: info.height });
  await webp(sharp(logo).resize({ width: LOGO_WIDTH, kernel: 'lanczos3' })).toFile(join(OUT, 'logo.webp'));
}

// The pieces of each sheet.
const made = [];
for (const [file, pieces] of PIECES) {
  const cleared = await clearPaintedBackground(join(SOURCE, FILES[file]));
  const { data: sheet, info } = await sharp(cleared).raw().toBuffer({ resolveWithObject: true });
  const found = drawings(sheet, info.width, info.height);
  const { data: original } = await sharp(join(SOURCE, FILES[file])).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [name, { box, solid, shadow, pockets = [] }] of Object.entries(pieces)) {
    const piece = cutPiece(sheet, info.width, found, box);
    const corner = [Math.max(0, box[0] - PAD), Math.max(0, box[1] - PAD)];
    if (solid) fillInside(piece, original, info.width, corner);
    if (shadow) clearShadow(piece, pockets.map(([x, y]) => [x - corner[0], y - corner[1]]));
    await webp(sharp(await trimmed(piece))).toFile(join(OUT, `${name}.webp`));
    made.push(name);
  }
}
console.log(`Adventure home art in ${OUT}: the landscape, the logo, and ${made.length} pieces`);

// The contact sheet: every piece on a bright pink, so any leftover background shows.
const sheetAt = process.argv.indexOf('--sheet');
if (sheetAt > 0) {
  const names = ['logo', ...made];
  const CELL = 300;
  const cols = 6;
  const parts = [];
  for (const [i, name] of names.entries()) {
    const file = join(OUT, `${name}.webp`);
    const { width, height } = await sharp(file).metadata();
    const s = Math.min(1, (CELL - 40) / Math.max(width, height));
    const img = await sharp(file).resize(Math.max(1, Math.round(width * s))).png().toBuffer();
    const { width: iw, height: ih } = await sharp(img).metadata();
    const left = (i % cols) * CELL, top = Math.floor(i / cols) * CELL;
    parts.push({ input: img, left: left + Math.round((CELL - iw) / 2), top: top + 30 + Math.round((CELL - 40 - ih) / 2) });
    parts.push({ input: Buffer.from(`<svg width="${CELL}" height="28"><text x="8" y="20" font-family="Arial" font-size="18" fill="#fff">${name} ${width}x${height}</text></svg>`), left, top });
  }
  const rows = Math.ceil(names.length / cols);
  await sharp({ create: { width: cols * CELL, height: rows * CELL, channels: 4, background: '#c2337c' } }).composite(parts).png().toFile(process.argv[sheetAt + 1]);
}
