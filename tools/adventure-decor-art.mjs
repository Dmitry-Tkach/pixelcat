// Stand-ins for the forest's automatic decoration (data/adventure/decor.js), drawn as SVG, into the
// wood world's art: grass tufts, flower clumps and hanging vines in the art's cartoon style, with a
// thick dark outline. When the owner's props sheet comes (prompts/forest-level/06-props-plants.md),
// its cut pieces take these names instead.
// Run: node tools/adventure-decor-art.mjs [folder for a review picture] (part of npm run assets).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const REVIEW = process.argv[2];
const OUTLINE = '#1f3a1c';
const GREENS = ['#9ad83a', '#6cbf2e', '#4a9a2a'];

// A blade of grass from (x, bottom), leaning, of a height.
const blade = (x, bottom, h, lean, fill) =>
  `<path d="M${x - 3} ${bottom} Q${x + lean * 0.4} ${bottom - h * 0.6} ${x + lean} ${bottom - h} Q${x + lean * 0.5 + 2} ${bottom - h * 0.5} ${x + 4} ${bottom} Z" fill="${fill}" stroke="${OUTLINE}" stroke-width="2.2" stroke-linejoin="round"/>`;

// A little flower: petals round a middle.
const flower = (x, y, petal, middle) => [0, 72, 144, 216, 288].map((a) =>
  `<ellipse cx="${x}" cy="${y - 5}" rx="3" ry="5" fill="${petal}" stroke="${OUTLINE}" stroke-width="1.2" transform="rotate(${a} ${x} ${y})"/>`).join('')
  + `<circle cx="${x}" cy="${y}" r="2.6" fill="${middle}" stroke="${OUTLINE}" stroke-width="1"/>`;

// A hanging vine from (x, 0): a wavy stem with leaves on alternate sides, ending in a curl.
function vine(w, length, leaves, extra = '') {
  const x = w / 2;
  let d = `M${x} 0`;
  for (let y = 0; y < length; y += 24) d += ` Q${x + (y / 24 % 2 ? -8 : 8)} ${y + 12} ${x} ${y + 24}`;
  const leaf = (i) => {
    const y = 14 + i * (length - 20) / leaves;
    const side = i % 2 ? -1 : 1;
    return `<path d="M${x} ${y} Q${x + side * 14} ${y - 6} ${x + side * 18} ${y + 4} Q${x + side * 8} ${y + 8} ${x} ${y} Z" fill="${GREENS[i % 3]}" stroke="${OUTLINE}" stroke-width="2"/>`;
  };
  return `<path d="${d}" stroke="${OUTLINE}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="${d}" stroke="#5c8a2a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${Array.from({ length: leaves }, (_, i) => leaf(i)).join('')}${extra}`;
}

const PICTURES = {
  'decor-tuft-1': { w: 56, h: 30, svg: [[14, 20, -6], [22, 26, -2], [30, 28, 3], [38, 22, 7], [45, 16, 9]].map(([x, h, lean], i) => blade(x, 30, h, lean, GREENS[i % 3])).join('') },
  'decor-tuft-2': { w: 74, h: 34, svg: [[10, 16, -7], [18, 26, -4], [27, 32, -1], [35, 24, 2], [44, 30, 4], [52, 22, 7], [61, 16, 9]].map(([x, h, lean], i) => blade(x, 34, h, lean, GREENS[(i + 1) % 3])).join('') },
  'decor-flowers-1': { w: 60, h: 36, svg: [[12, 18, -4], [24, 22, 0], [36, 20, 2], [48, 16, 5]].map(([x, h, lean], i) => blade(x, 36, h, lean, GREENS[i % 3])).join('') + flower(18, 12, '#b98cff', '#ffe066') + flower(36, 9, '#9a6cf0', '#ffe066') + flower(48, 17, '#c8a4ff', '#ffe066') },
  'decor-flowers-2': { w: 60, h: 36, svg: [[14, 18, -3], [26, 24, 1], [38, 20, 3], [48, 15, 6]].map(([x, h, lean], i) => blade(x, 36, h, lean, GREENS[(i + 2) % 3])).join('') + flower(20, 11, '#ffffff', '#ffc531') + flower(38, 8, '#fff6c8', '#ff9a2a') },
  'decor-vine-1': { w: 44, h: 150, svg: vine(44, 140, 7) },
  'decor-vine-2': { w: 44, h: 110, svg: vine(44, 92, 5, flower(22, 96, '#ff8fb0', '#ffe066')) },
  'decor-vine-3': { w: 44, h: 64, svg: vine(44, 56, 3) },
};

mkdirSync(OUT, { recursive: true });
for (const [name, { w, h, svg }] of Object.entries(PICTURES)) {
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`)).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
}
console.log(`The forest's ${Object.keys(PICTURES).length} decoration stand-ins, in public/assets/adventure/wood`);

if (REVIEW) {
  mkdirSync(REVIEW, { recursive: true });
  let x = 20;
  const pieces = [];
  for (const [name, { w, h }] of Object.entries(PICTURES)) {
    pieces.push({ input: await sharp(join(OUT, `${name}.png`)).resize(w * 2, h * 2).png().toBuffer(), left: x, top: 20 });
    x += w * 2 + 30;
  }
  await sharp({ create: { width: x, height: 340, channels: 3, background: '#4f7f4c' } }).composite(pieces).png().toFile(join(REVIEW, 'decor.png'));
}
