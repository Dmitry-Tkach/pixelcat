// Reads a sheet of pieces the owner made in ChatGPT (the gates, the traps): a picture with a real
// transparent background, its pieces laid out in rows, each apart from the others. Used by
// tools/adventure-gates-cut.mjs and tools/adventure-traps-art.mjs.
//
// ChatGPT paints a faint coloured haze round the pieces. The pieces are almost solid and the haze
// is faint, so the haze is cleared by its see-through-ness. The pieces are then found as separate
// blobs, in rows, as the prompt laid them out.
import sharp from 'sharp';

// Alpha below HAZE is haze, cleared; above SOLID it's the piece; between, a soft edge.
const HAZE = 64;
const SOLID = 192;
const PAD = 3; // clear px kept round each piece
const MIN_PIXELS = 2000; // smaller blobs are specks, not pieces
const SAME_ROW = 150; // px: pieces whose middles are closer than this up and down are in one row

// The blobs of solid pixels in an alpha channel: { x0, y0, x1, y1, n }, biggest first.
export function blobs(alpha, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  const found = [];
  for (let i = 0; i < w * h; i++) {
    if (alpha[i] < 128 || label[i] >= 0) continue;
    const box = { x0: w, y0: h, x1: 0, y1: 0, n: 0 };
    const stack = [i];
    label[i] = found.length;
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      box.n++;
      box.x0 = Math.min(box.x0, x); box.x1 = Math.max(box.x1, x); box.y0 = Math.min(box.y0, y); box.y1 = Math.max(box.y1, y);
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && alpha[q] >= 128 && label[q] < 0) { label[q] = found.length; stack.push(q); }
      }
    }
    found.push(box);
  }
  return found.sort((a, b) => b.n - a.n);
}

// The pieces, in rows from the top, each row left to right.
function inRows(pieces) {
  const byY = [...pieces].sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const rows = [];
  for (const piece of byY) {
    const last = rows.at(-1);
    const cy = (piece.y0 + piece.y1) / 2;
    if (last && Math.abs(cy - last.cy) < SAME_ROW) last.pieces.push(piece);
    else rows.push({ cy, pieces: [piece] });
  }
  return rows.map((row) => row.pieces.sort((a, b) => a.x0 - b.x0));
}

// The sheet's pieces by name: names is a list of rows, each a list of the names in it, left to
// right. Each piece is { pixels, w, h } (raw RGBA), with the haze cleared. A piece named in
// `glowing` (a swirl) keeps its soft glow, inside the circle it fills.
export async function readSheet(file, names, { glowing = () => false } = {}) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const alpha = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = data[i * 4 + 3];
  const rows = inRows(blobs(alpha, W, H).filter((b) => b.n > MIN_PIXELS));
  const found = rows.map((r) => r.length).join(', '), wanted = names.map((r) => r.length).join(', ');
  if (found !== wanted) throw new Error(`${file}: expected rows of ${wanted} pieces, found ${found}`);
  const cut = (box, name) => {
    const x0 = Math.max(0, box.x0 - PAD), y0 = Math.max(0, box.y0 - PAD);
    const w = Math.min(W, box.x1 + PAD + 1) - x0, h = Math.min(H, box.y1 + PAD + 1) - y0;
    const pixels = Buffer.alloc(w * h * 4);
    const glow = glowing(name);
    const r = Math.min(w, h) / 2 - PAD;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const from = ((y0 + y) * W + x0 + x) * 4, to = (y * w + x) * 4;
      data.copy(pixels, to, from, from + 4);
      const a = data[from + 3];
      pixels[to + 3] = glow
        ? (Math.hypot(x - w / 2, y - h / 2) <= r ? a : 0)
        : Math.max(0, Math.min(255, Math.round(((a - HAZE) * 255) / (SOLID - HAZE))));
    }
    return { pixels, w, h };
  };
  const pieces = {};
  rows.forEach((row, r) => row.forEach((box, i) => { pieces[names[r][i]] = cut(box, names[r][i]); }));
  return pieces;
}

export const alphaOf = ({ pixels, w, h }) => Uint8Array.from({ length: w * h }, (_, i) => pixels[i * 4 + 3]);

// Saves a piece resized to outW x outH px; hue (degrees) turns its colours round the colour wheel.
export const savePiece = ({ pixels, w, h }, file, outW, outH, { hue = 0 } = {}) => {
  let picture = sharp(pixels, { raw: { width: w, height: h, channels: 4 } })
    .resize(Math.max(1, Math.round(outW)), Math.max(1, Math.round(outH)));
  if (hue) picture = picture.modulate({ hue });
  return picture.png({ compressionLevel: 9 }).toFile(file);
};
