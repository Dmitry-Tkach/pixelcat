// The adventure's backdrops (data/adventure/backdrop.js):
// 1. The light rays and the fog, drawn as SVG, into public/assets/adventure/fx/backdrop.
// 2. The owner's layer pictures for a world, from images/levels/<world>/<layer>.png (made with the
//    prompts in prompts/forest-level), when they're there: shrunk to LAYER_HEIGHT, and their two
//    sides blended so the picture repeats sideways without a seam, into that world's art. The
//    owner's pictures are left alone.
// Run: node tools/adventure-backdrop-art.mjs (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BACKDROP_FX } from '../src/data/adventure/backdrop.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FX_OUT = join(ROOT, 'public', 'assets', 'adventure', 'fx', 'backdrop');
const LEVEL_ART = join(ROOT, 'images', 'levels');
const ART_OUT = join(ROOT, 'public', 'assets', 'adventure');

// The owner's layers by world: the file in images/levels/<world>, the name it's given in the world's
// art (data/adventure/index.js lists them once they're in), and cropTop: the share of the picture
// cut off its top first (the sky's big close-up leaves, which looked wrong on the slowest layer).
const OWNER_LAYERS = {
  wood: {
    sky: { name: 'layer-sky', cropTop: 0.22 }, far: { name: 'layer-far' }, middle: { name: 'layer-middle' },
    near: { name: 'layer-near' }, foreground: { name: 'layer-front' },
  },
};
const SOURCE_FOLDER = { wood: 'forest' };
const LAYER_HEIGHT = 820; // the screen's height and a little room to move up and down
const FRONT_HEIGHT = 300; // the leaves in front, cut to the bottom of the picture, this tall
const SEAM = 0.12; // the share of a picture's width blended across its join

// ----- 1. Light rays and fog -----

// Light rays: soft beams slanting down from the top, brightest at the top, fading out lower down.
const RAYS = { w: 1280, h: 720 };
const beams = [[180, 90, 0.5], [420, 140, 0.8], [640, 70, 0.45], [820, 170, 0.9], [1080, 110, 0.6]];
const raysSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RAYS.w}" height="${RAYS.h}">
  <defs>
    <linearGradient id="down" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <g filter="url(#soft)">
    ${beams.map(([x, w, o]) => `<path d="M${x} -40 L${x + w} -40 L${x + w - 260} ${RAYS.h} L${x - 260 - w * 0.6} ${RAYS.h} Z" fill="url(#down)" opacity="${o}"/>`).join('')}
  </g>
</svg>`;

// Fog: soft drifting puffs of mist, drawn three times across so the picture repeats. It fades out
// at its top and its bottom: Phaser repeats a picture up and down too, blending its top and bottom
// rows, and a bright bottom row made a light line along the fog's top.
const FOG = { w: 1024, h: 256 };
const puffs = [[60, 160, 140, 55], [250, 145, 180, 65], [470, 165, 150, 50], [660, 140, 200, 70], [880, 160, 160, 55]];
const fogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FOG.w}" height="${FOG.h}">
  <defs>
    <radialGradient id="puff"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.75" stop-color="#fff" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect x="0" y="0" width="${FOG.w}" height="${FOG.h}" fill="url(#floor)"/>
  ${[-FOG.w, 0, FOG.w].map((shift) => puffs.map(([x, y, rx, ry]) => `<ellipse cx="${x + shift}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#puff)"/>`).join('')).join('')}
</svg>`;

mkdirSync(FX_OUT, { recursive: true });
await sharp(Buffer.from(raysSvg)).png({ compressionLevel: 9 }).toFile(join(FX_OUT, `${BACKDROP_FX.rays}.png`));
await sharp(Buffer.from(fogSvg)).png({ compressionLevel: 9 }).toFile(join(FX_OUT, `${BACKDROP_FX.fog}.png`));

// ----- 2. The owner's layers -----

// Makes a picture repeat sideways without a seam: its first `band` columns fade from the picture's
// last columns into its own, and those last columns are dropped. Tiled, the end flows on into the
// start.
async function seamless(input, band) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const outW = width - band;
  const out = Buffer.alloc(outW * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < outW; x++) {
      const o = (y * outW + x) * 4;
      const own = (y * width + x) * 4;
      if (x >= band) {
        data.copy(out, o, own, own + 4);
        continue;
      }
      const t = x / band; // 0: all the end's, 1: all its own
      const end = (y * width + outW + x) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(data[end + c] * (1 - t) + data[own + c] * t);
    }
  }
  return sharp(out, { raw: { width: outW, height, channels: 4 } }).png().toBuffer();
}

let made = 0;
for (const [world, layers] of Object.entries(OWNER_LAYERS)) {
  for (const [file, { name, cropTop = 0 }] of Object.entries(layers)) {
    const source = join(LEVEL_ART, SOURCE_FOLDER[world], `${file}.png`);
    if (!existsSync(source)) continue;
    const front = file === 'foreground';
    const whole = await sharp(source).metadata();
    const top = Math.round(whole.height * cropTop);
    const cropped = await sharp(source).extract({ left: 0, top, width: whole.width, height: whole.height - top }).png().toBuffer();
    let picture = await sharp(cropped).resize({ height: front ? undefined : LAYER_HEIGHT }).png().toBuffer();
    if (front) {
      // The leaves: only the bottom of the picture, where they are.
      const { width, height } = await sharp(picture).metadata();
      const keep = Math.round(height * 0.4);
      picture = await sharp(picture).extract({ left: 0, top: height - keep, width, height: keep }).resize({ height: FRONT_HEIGHT }).png().toBuffer();
    }
    const { width } = await sharp(picture).metadata();
    await sharp(await seamless(picture, Math.round(width * SEAM))).png({ compressionLevel: 9 }).toFile(join(ART_OUT, world, `${name}.png`));
    made += 1;
  }
}
console.log(`The backdrops' light rays and fog${made ? `, and ${made} of the owner's layers` : ''}, prepared`);
