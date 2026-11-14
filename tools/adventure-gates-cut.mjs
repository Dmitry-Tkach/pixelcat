// Cuts the owner's gates sheet (images/levels/forest/gates.png, from
// prompts/forest-level/08-gates.md) into the forest's 8 gate pictures (data/adventure/gates.js), each
// at the size it's shown in the game, so the game never scales them down (which would make them
// shimmer). tools/adventure-gates-art.mjs runs it when the sheet is there.
//
// It also measures what gates.js needs to know: where each ring's empty middle is, and where the
// flag ties to the pole. It prints those, to copy into gates.js.
import { GATES } from '../src/data/adventure/gates.js';
import { alphaOf, blobs, readSheet, savePiece } from './sheetPieces.mjs';

const NAMES = [
  ['gate-ring', 'gate-swirl'],
  ['flag-pole', 'flag-down', 'flag-up'],
  ['portal-arch', 'portal-swirl', 'portal-post'],
];
const SWIRL_OVER = 1.08; // a swirl is a little bigger than its ring's hole, so its edge hides under the stones
const FLAG_SCALE = 0.7; // the flags are shown smaller than drawn, beside the pole, so a lowered one hangs well down it
const FLAG_KNOT = 6; // px (shown) the flag's knot sits left of the pole's middle, so it's tied round it

// The empty middle of a ring piece (alpha, w, h): the biggest see-through patch not open to the
// piece's edge. Returns its middle and size across, in px.
function hole(alpha, w, h) {
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (outside[p] || alpha[p] >= 128) continue;
    outside[p] = 1;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < w * (h - 1)) stack.push(p + w);
  }
  const inside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) inside[i] = alpha[i] < 128 && !outside[i] ? 255 : 0;
  const [middle] = blobs(inside, w, h);
  if (!middle) throw new Error('a ring has no empty middle: is it closed all round?');
  return { x: (middle.x0 + middle.x1 + 1) / 2, y: (middle.y0 + middle.y1 + 1) / 2, across: Math.max(middle.x1 - middle.x0, middle.y1 - middle.y0) + 1 };
}

// The flag pole (alpha, w, h): the middle of its shaft, where the ball on top ends, and where the
// base starts, in px.
function pole(alpha, w, h) {
  const span = (y) => {
    let a = -1, b = -1;
    for (let x = 0; x < w; x++) if (alpha[y * w + x] >= 128) { if (a < 0) a = x; b = x; }
    return a < 0 ? { width: 0, middle: 0 } : { width: b - a + 1, middle: (a + b) / 2 };
  };
  const shaft = span(Math.round(h * 0.5));
  let ballEnd = 0;
  for (let y = Math.round(h * 0.3); y > 0; y--) if (span(y).width > shaft.width * 1.4) { ballEnd = y + 1; break; }
  let baseTop = h;
  for (let y = Math.round(h * 0.5); y < h; y++) if (span(y).width > shaft.width * 1.6) { baseTop = y; break; }
  return { middle: shaft.middle, ballEnd, baseTop };
}

const round = (n) => Math.round(n * 1000) / 1000;

export async function cutGates(sheetFile, outDir) {
  const piece = await readSheet(sheetFile, NAMES, { glowing: (name) => name.endsWith('swirl') });

  const { start, checkpoint, portal } = GATES.wood;
  const save = (p, name, outW, outH) => savePiece(p, `${outDir}/${name}.png`, outW, outH);
  const measured = {};

  // A ring and its swirl: the ring at its height, the swirl sized to its hole.
  const ring = async (ringName, swirlName, { height }) => {
    const p = piece[ringName];
    const f = height / p.h;
    const { x, y, across } = hole(alphaOf(p), p.w, p.h);
    await save(p, ringName, p.w * f, height);
    const swirlAcross = across * SWIRL_OVER * f;
    await save(piece[swirlName], swirlName, swirlAcross, swirlAcross);
    return { x: round(x / p.w), y: round(y / p.h), size: round((across * SWIRL_OVER) / p.w) };
  };
  measured.startHole = await ring('gate-ring', 'gate-swirl', start);
  measured.portalHole = await ring('portal-arch', 'portal-swirl', portal);

  // The pole at its height, the flags beside it, smaller.
  const p = piece['flag-pole'];
  const f = checkpoint.height / p.h;
  const { middle, ballEnd, baseTop } = pole(alphaOf(p), p.w, p.h);
  await save(p, 'flag-pole', p.w * f, checkpoint.height);
  const flagF = f * FLAG_SCALE;
  for (const name of ['flag-down', 'flag-up']) await save(piece[name], name, piece[name].w * flagF, piece[name].h * flagF);
  const downH = piece['flag-down'].h * flagF;
  measured.flag = {
    x: round((middle * f - FLAG_KNOT) / (p.w * f)),
    downY: round((baseTop * f - downH - 6) / checkpoint.height),
    upY: round(ballEnd / p.h),
  };

  const post = piece['portal-post'];
  await save(post, 'portal-post', (post.w * portal.postHeight) / post.h, portal.postHeight);
  measured.postWidth = Math.round((post.w * portal.postHeight) / post.h);
  measured.archWidth = Math.round((piece['portal-arch'].w * portal.height) / piece['portal-arch'].h);
  return measured;
}
