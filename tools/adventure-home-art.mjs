// The adventure's home screen picture, painted from the adventure's own art: the World Tree forest,
// the battle cat on the forest floor with his minigun, firing a magic bolt at the zombies coming at
// him, a gunner cat on an island above, and the portal glowing on another, with coins and crystals.
// The right side darkens, under the menu. Run after adventure-art.mjs (npm run assets does).
// Output: public/assets/ui/adventure-home.webp
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOLT_LAYERS } from '../src/data/adventure/beams.js';
import { enemyLayout } from '../src/data/adventure/enemies.js';
import { gunnerLayout } from '../src/data/adventure/gunners.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WOOD = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const ADV = join(ROOT, 'public', 'assets', 'adventure');
const OUT = join(ROOT, 'public', 'assets', 'ui', 'adventure-home.webp');
const W = 1920, H = 1080;
const TILE = 128; // the tiles, at twice their game size
const GROUND = H - 190; // the top of the forest floor
const comps = [];
const add = (input, left, top) => comps.push({ input, left: Math.round(left), top: Math.round(top) });
const scaled = async (file, scale) => {
  const { width } = await sharp(file).metadata();
  return sharp(file).resize({ width: Math.round(width * scale), kernel: 'lanczos3' }).png().toBuffer();
};
const sizeOf = async (buffer) => sharp(buffer).metadata();
// Places a picture by its feet: `x` is its middle, `y` where its feet are, `feet` how far down its
// own picture they are (in its pixels, before scaling).
const stand = async (buffer, x, y, feetFromTop) => {
  const { width } = await sizeOf(buffer);
  add(buffer, x - width / 2, y - feetFromTop);
};
const atlasFrame = async (folder, kind, frame, scale, flip = false) => {
  const atlas = JSON.parse(readFileSync(join(ADV, folder, `${kind}.json`), 'utf8'));
  const f = atlas.frames[frame].frame;
  let img = sharp(join(ADV, folder, `${kind}.png`)).extract({ left: f.x, top: f.y, width: f.w, height: f.h }).resize({ width: Math.round(f.w * scale) });
  if (flip) img = img.flop();
  return img.png().toBuffer();
};

// The forest: the far layer, then the near one, tiled across.
for (const [layer, opacity] of [['back-far', 1], ['back-near', 1]]) {
  const img = await sharp(join(WOOD, `${layer}.png`)).resize({ height: H }).png().toBuffer();
  const { width } = await sizeOf(img);
  for (let x = 0; x < W; x += width) add(opacity < 1 ? await sharp(img).ensureAlpha(opacity).toBuffer() : img, x, 0);
}

// The forest floor.
const strip = join(WOOD, 'tiles.png');
const tile = async (i) => sharp(strip).extract({ left: i * 64, top: 0, width: 64, height: 64 }).resize(TILE, TILE).png().toBuffer();
const [groundTop, soil, ledgeLeft, ledge, ledgeRight] = await Promise.all([1, 4, 6, 7, 8].map(tile));
for (let x = 0; x < W; x += TILE) {
  add(groundTop, x, GROUND);
  for (let y = GROUND + TILE; y < H; y += TILE) add(soil, x, y);
}
// An island, `count` tiles wide, its top at `y`.
const island = (left, y, count) => {
  for (let i = 0; i < count; i++) add(i === 0 ? ledgeLeft : i === count - 1 ? ledgeRight : ledge, left + i * TILE, y);
};

// The portal's island, high on the left, on an earth pillar, with a ladder up to it.
const portalIsland = { left: 150, y: 330, count: 4 };
const pillarCap = await scaled(join(WOOD, 'pillar-cap.png'), 2);
const pillarMiddle = await scaled(join(WOOD, 'pillar-middle.png'), 2);
const pillarBase = await scaled(join(WOOD, 'pillar-base.png'), 2);
const pillarX = portalIsland.left + TILE * 1.7 - (await sizeOf(pillarCap)).width / 2;
const capH = (await sizeOf(pillarCap)).height, midH = (await sizeOf(pillarMiddle)).height, baseH = (await sizeOf(pillarBase)).height;
let py = portalIsland.y + TILE - 12 + capH;
let flipped = false;
while (py + midH < GROUND + 12 - baseH + midH * 0.4) {
  add(flipped ? await sharp(pillarMiddle).flip().toBuffer() : pillarMiddle, pillarX, py);
  py += midH - 1;
  flipped = !flipped;
}
add(pillarBase, pillarX, GROUND + 12 - baseH);
add(pillarCap, pillarX, portalIsland.y + TILE - 12);
island(portalIsland.left, portalIsland.y, portalIsland.count);
const ladder = await sharp(join(WOOD, 'ladder.png')).resize(TILE, TILE).png().toBuffer();
for (let y = portalIsland.y; y < GROUND; y += TILE - 12) add(ladder, portalIsland.left, y); // overlapped: no gaps
const portal = await scaled(join(WOOD, 'portal.png'), 1.9);
await stand(portal, portalIsland.left + TILE * 1.5, portalIsland.y + 14, (await sizeOf(portal)).height);

// The gunner's island, high in the middle.
const gunnerIsland = { left: 820, y: 380, count: 4 };
island(gunnerIsland.left, gunnerIsland.y, gunnerIsland.count);
{
  const scale = 1.9;
  const gunner = await atlasFrame('gunners', 'raygun', 'idle-0', scale, true);
  await stand(gunner, gunnerIsland.left + TILE * 2, gunnerIsland.y + 12, gunnerLayout('raygun').feet * scale);
}

// Coins in an arc over the floor, and crystals by the portal and the gunner.
const coin = await scaled(join(WOOD, 'coin-1.png'), 1.6);
for (let i = 0; i < 6; i++) {
  const x = 600 + i * 70, y = 540 - Math.sin((i / 5) * Math.PI) * 90;
  add(coin, x, y);
}
const gem = await scaled(join(WOOD, 'gem.png'), 1.7);
add(gem, portalIsland.left + TILE * 3.1, portalIsland.y - 70);
add(gem, gunnerIsland.left + TILE * 3.2, gunnerIsland.y - 66);

// The zombies, coming at him from the right.
for (const [kind, x, frame] of [['goon', 990, 'walk-3'], ['cone', 1160, 'walk-8'], ['spiky', 1330, 'walk-12']]) {
  const scale = 2.1;
  await stand(await atlasFrame('enemies', kind, frame, scale), x, GROUND + 14, enemyLayout(kind).feet * scale);
}

// The battle cat, on the floor, with his minigun, and the magic bolt he's firing.
const catScale = 2.3;
const cat = await scaled(join(ROOT, 'images', 'sprites', 'battle-cat', 'Shoot (5).png'), catScale);
const catX = 470;
await stand(cat, catX, GROUND + 16, 158 * catScale);
{
  // His muzzle in the frame: this far right of its middle, and above his feet.
  const muzzleX = catX + 36 * catScale + 60, muzzleY = GROUND + 16 - 47 * catScale;
  const [w] = BOLT_LAYERS[0];
  const k = 2.2;
  const bolt = BOLT_LAYERS.map(([length, height, colour, alpha]) =>
    `<ellipse cx="${(muzzleX + 150 + (w / 2 - length / 2 - (w - length) * 0.15) * k).toFixed(1)}" cy="${muzzleY}" rx="${(length / 2) * k}" ry="${(height / 2) * k}" fill="#${colour.toString(16).padStart(6, '0')}" fill-opacity="${alpha}"/>`).join('');
  let seed = 5;
  const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const sparkles = Array.from({ length: 46 }, () => {
    const t = random();
    const x = muzzleX + t * 150, y = muzzleY + (random() - 0.5) * 2 * 34 * t;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + t * 4.5).toFixed(1)}" fill="${['#ffffff', '#a6e0ff', '#3d9bff'][Math.floor(random() * 3)]}" fill-opacity="${(0.35 + t * 0.65).toFixed(2)}"/>`;
  }).join('');
  add(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${sparkles}${bolt}</svg>`), 0, 0);
}

// Light through the trees, and the right side darkening under the menu.
add(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="menu" x1="0" x2="1"><stop offset="0.5" stop-color="#0e1222" stop-opacity="0"/><stop offset="1" stop-color="#0e1222" stop-opacity="0.6"/></linearGradient>
    <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0" stop-opacity="0.35"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></linearGradient>
    <radialGradient id="vignette" cx="0.4" cy="0.5" r="0.8"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></radialGradient>
  </defs>
  <path d="M560 0 L700 0 L980 ${H} L760 ${H} Z" fill="url(#ray)"/>
  <path d="M820 0 L880 0 L1180 ${H} L1080 ${H} Z" fill="url(#ray)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  <rect width="${W}" height="${H}" fill="url(#menu)"/></svg>`), 0, 0);

// Every piece cut to the picture, so one reaching past an edge still fits.
const clipped = [];
for (const { input, left, top } of comps) {
  const { width, height } = await sizeOf(input);
  const x0 = Math.max(0, left), y0 = Math.max(0, top);
  const x1 = Math.min(W, left + width), y1 = Math.min(H, top + height);
  if (x1 <= x0 || y1 <= y0) continue;
  const piece = (x0 === left && y0 === top && x1 - x0 === width && y1 - y0 === height) ? input
    : await sharp(input).extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 }).png().toBuffer();
  clipped.push({ input: piece, left: x0, top: y0 });
}
await sharp({ create: { width: W, height: H, channels: 4, background: '#8fd18f' } })
  .composite(clipped).webp({ quality: 84 }).toFile(OUT);
console.log(`The adventure's home picture, in ${OUT}`);
