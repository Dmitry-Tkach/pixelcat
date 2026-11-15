// Cuts the owner's traps sheet (images/levels/forest/obstacles.png, from
// prompts/forest-level/09-obstacles.md) into the forest's trap pictures (data/adventure/traps.js),
// each at the size it's shown in the game, so the game never scales them down (which would make them
// shimmer). The mace's chain is cut at the ball's scale, and each pair (calm and angry, standing and
// squashed) at one scale, so they swap without a jump. It measures where the chain hangs from the
// gallows and prints it, to copy into traps.js.
// Run: node tools/adventure-traps-art.mjs [folder for a review picture] (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRAPS } from '../src/data/adventure/traps.js';
import { alphaOf, readSheet, savePiece } from './sheetPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const SHEET = join(ROOT, 'images', 'levels', 'forest', 'obstacles.png');
const REVIEW = process.argv[2];
const NAMES = [
  ['trap-gallows', 'trap-chain', 'trap-mace'],
  ['trap-crusher', 'trap-crusher-angry'],
  ['trap-idol', 'trap-idol-angry', 'trap-dart'],
  ['trap-mushroom', 'trap-mushroom-squashed'],
];

// Where the chain hangs from the gallows: the bottom of the ring under the beam's far end, the
// lowest solid pixel in the picture's right quarter, above its middle.
function hook(alpha, w, h) {
  let bottom = 0, xs = [];
  for (let y = 0; y < h * 0.5; y++) {
    const row = [];
    for (let x = Math.round(w * 0.75); x < w; x++) if (alpha[y * w + x] >= 128) row.push(x);
    if (row.length) { bottom = y; xs = row; }
  }
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
  return { x: Math.round((middle / w) * 1000) / 1000, y: Math.round((bottom / h) * 1000) / 1000 };
}

if (!existsSync(SHEET)) {
  console.log('No traps sheet (images/levels/forest/obstacles.png): the traps have no pictures yet');
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });
const piece = await readSheet(SHEET, NAMES);
const { mace, crusher, idol, mushroom } = TRAPS.wood;
const save = (name, scale) => savePiece(piece[name], join(OUT, `${name}.png`), piece[name].w * scale, piece[name].h * scale);
const heightScale = (name, height) => height / piece[name].h;

await save('trap-gallows', heightScale('trap-gallows', mace.gallowsHeight));
const ballScale = heightScale('trap-mace', mace.ballHeight);
await save('trap-mace', ballScale);
await save('trap-chain', ballScale);
for (const [name, other, height] of [['trap-crusher', 'trap-crusher-angry', crusher.height], ['trap-idol', 'trap-idol-angry', idol.height], ['trap-mushroom', 'trap-mushroom-squashed', mushroom.height]]) {
  const scale = heightScale(name, height);
  await save(name, scale);
  await save(other, scale);
}
await save('trap-dart', idol.dartWidth / piece['trap-dart'].w);
// The stone guardian's chain and ball: the mace's, cut bigger, at his ball's height.
const guardian = TRAPS.wood.guardian;
const guardianScale = heightScale('trap-mace', guardian.ballHeight);
await savePiece(piece['trap-mace'], join(OUT, `${guardian.ball}.png`), piece['trap-mace'].w * guardianScale, guardian.ballHeight);
await savePiece(piece['trap-chain'], join(OUT, `${guardian.link}.png`), piece['trap-chain'].w * guardianScale, piece['trap-chain'].h * guardianScale);
const g = piece['trap-gallows'];
console.log(`The forest's ${NAMES.flat().length} trap pictures, cut into public/assets/adventure/wood. For traps.js, the gallows' hook and shape:`);
console.log(JSON.stringify({ hook: hook(alphaOf(g), g.w, g.h), gallowsAspect: Math.round((g.w / g.h) * 1000) / 1000 }));

if (REVIEW) {
  mkdirSync(REVIEW, { recursive: true });
  let x = 20;
  const pieces = [];
  for (const name of NAMES.flat()) {
    const { width, height } = await sharp(join(OUT, `${name}.png`)).metadata();
    pieces.push({ input: join(OUT, `${name}.png`), left: x, top: 280 - height });
    x += width + 24;
  }
  await sharp({ create: { width: x, height: 300, channels: 3, background: '#4f7f4c' } }).composite(pieces).png().toFile(join(REVIEW, 'traps.png'));
}
