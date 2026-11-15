// Cuts the owner's stone guardian sheet (images/levels/forest/guardian.png, from
// prompts/forest-level/10-guardian.md) into his pictures (data/adventure/traps.js, guardian): his body
// asleep and awake, and his two arms, all at one scale, so the body is shown `height` px tall. His
// chain and ball are the mace's, cut bigger by tools/adventure-traps-art.mjs.
// It prints what traps.js needs: the pictures' sizes as shown, and where each arm's chain ends (the
// middle of its lowest row). The shoulders and sockets are set by eye in traps.js; with a review
// folder, it draws them as dots over the pieces, to check.
// Run: node tools/adventure-guardian-art.mjs [folder for a review picture] (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRAPS } from '../src/data/adventure/traps.js';
import { alphaOf, readSheet, savePiece } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const SHEET = join(ROOT, 'images', 'levels', 'forest', 'guardian.png');
const REVIEW = process.argv[2];
const g = TRAPS.wood.guardian;
const NAMES = [[g.body, g.awake], g.arms];

// The middle of a piece's lowest solid row, as a fraction of its width.
function chainEnd(piece) {
  const alpha = alphaOf(piece);
  for (let y = piece.h - 1; y >= 0; y--) {
    const xs = [];
    for (let x = 0; x < piece.w; x++) if (alpha[y * piece.w + x] >= 128) xs.push(x);
    if (xs.length) return Math.round(((Math.min(...xs) + Math.max(...xs)) / 2 / piece.w) * 1000) / 1000;
  }
  return 0.5;
}

if (!existsSync(SHEET)) {
  console.log('No guardian sheet (images/levels/forest/guardian.png): the guardian has no pictures yet');
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const piece = await readSheet(SHEET, NAMES);
const scale = g.height / piece[g.body].h;
const size = (name) => ({ w: Math.round(piece[name].w * scale), h: Math.round(piece[name].h * scale) });
for (const name of NAMES.flat()) await savePiece(piece[name], join(OUT, `${name}.png`), size(name).w, size(name).h);
console.log(`The stone guardian's ${NAMES.flat().length} pictures, cut into public/assets/adventure/wood. For traps.js:`);
console.log(JSON.stringify({ bodySize: size(g.body), armSize: size(g.arms[0]), chainEnds: g.arms.map((name) => chainEnd(piece[name])) }));

if (REVIEW) {
  // The body with its sockets, and each arm with its shoulder and chain end, as red dots.
  mkdirSync(REVIEW, { recursive: true });
  const dot = (x, y) => ({ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="red"/></svg>'), left: Math.round(x - 6), top: Math.round(y - 6) });
  const pieces = [];
  let x = 20;
  const add = (name, points) => {
    const { w, h } = size(name);
    pieces.push({ input: join(OUT, `${name}.png`), left: x, top: 20 }, ...points.map((p) => dot(x + p.x * w, 20 + p.y * h)));
    x += w + 40;
  };
  add(g.body, g.sockets);
  g.arms.forEach((name, i) => add(name, [g.armJoints[i].shoulder, g.armJoints[i].chainEnd]));
  await sharp({ create: { width: x, height: g.height + 40, channels: 3, background: '#4f7f4c' } }).composite(pieces).png().toFile(join(REVIEW, 'guardian.png'));
}
