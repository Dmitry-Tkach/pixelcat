// Draws a thin outline into the art of everything the cat plays with: the characters, the bosses,
// obstacles and power-ups. It's part of the prepared art, so the game draws it for free, unlike an
// outline effect, which costs a drawing pass for every object, every frame.
// Run after the other art tools (npm run assets runs it last). Running it twice would outline twice,
// so it only touches art the other tools have just redrawn.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS } from '../src/data/characters.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { PICKUPS } from '../src/data/pickups.js';
import { IMAGE_ASSETS } from '../src/data/themes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const COLOR = [46, 58, 94];
const OPACITY = 0.6; // faint: it separates the art from the scenery without looking like a shadow
// Art that lies on the road, or is the road, has no outline.
const SKIP = /-sky$|-far$|-near$|-street$|-fore$|-clouds$|-sunbeams$|crossing$|water$|^warn-|^ditch$|^manhole$|^mud-pool$|^mud$|splat|-pile$|pot-broken|stripes/;
const EXTRA = ['paw-block', 'paw-block-used', 'box-stack', 'catnip-box', 'acorn', 'box-piece'];

// Puts a ring of `radius` pixels around the art's solid parts, under the art.
async function outlineFile(file, radius) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3];
  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (alpha[i] >= 250) continue;
      let near = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width || dx * dx + dy * dy > radius * radius + radius) continue;
          near = Math.max(near, alpha[yy * width + xx]);
        }
      }
      if (near === 0) continue;
      // The outline under the art's own pixel, then the art over it.
      const ringAlpha = (near / 255) * OPACITY;
      const artAlpha = alpha[i] / 255;
      const a = artAlpha + ringAlpha * (1 - artAlpha);
      for (let c = 0; c < 3; c++) {
        out[i * 4 + c] = Math.round((data[i * 4 + c] * artAlpha + COLOR[c] * ringAlpha * (1 - artAlpha)) / a);
      }
      out[i * 4 + 3] = Math.round(a * 255);
    }
  }
  await sharp(out, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(`${file}.tmp`);
  const { renameSync } = await import('node:fs');
  renameSync(`${file}.tmp`, file);
}

// Texture keys an obstacle uses, found anywhere in its definition.
function texturesOf(value, keys = new Set()) {
  if (typeof value === 'string' && IMAGE_ASSETS[value]) keys.add(value);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) texturesOf(v, keys);
  return keys;
}

const keys = new Set(EXTRA);
for (const type of Object.values(OBSTACLES)) texturesOf(type, keys);
for (const pickup of Object.values(PICKUPS)) texturesOf(pickup, keys);
let count = 0;
for (const key of keys) {
  if (SKIP.test(key) || !IMAGE_ASSETS[key]) continue;
  await outlineFile(join(PUBLIC, IMAGE_ASSETS[key]), 1);
  count += 1;
}
// Characters shrunk in the game get a wider ring, so it ends up about a pixel on screen.
for (const character of Object.values(CHARACTERS)) {
  const folder = join(PUBLIC, 'assets', 'sprites', character.folder);
  const radius = (character.scale ?? 1) < 0.95 ? 2 : 1;
  for (const file of readdirSync(folder)) {
    if (!file.endsWith('.png')) continue;
    await outlineFile(join(folder, file), radius);
    count += 1;
  }
}
console.log(`Outlined ${count} images`);
