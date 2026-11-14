// Draws the adventure's shots and their effects as SVG, through sharp, into
// public/assets/adventure/fx/shots: one glowing picture for each kind of round, a soft glow for
// flashes, a brass shell case and a puff of smoke. systems/adventure/shotLook.js says how they're used.
// Every picture points right; the game flips it for shots to the left.
// Run: node tools/adventure-shot-art.mjs (part of npm run assets). With a folder, it also draws
// them side by side on the forest's green there, as shots.png, to look at.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHOT_ART } from '../src/systems/adventure/shotLook.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'fx', 'shots');
const REVIEW = process.argv[2];
const REVIEW_BACKGROUND = '#4f7f4c'; // the forest's green, behind the review picture

// Each picture: its size and its SVG drawing.
const PICTURES = {
  // A golden tracer: a long tail fading in behind a white-hot head.
  standard: {
    w: 110, h: 28,
    svg: `
      <defs>
        <linearGradient id="tail" x1="0" x2="1">
          <stop offset="0" stop-color="#ffb000" stop-opacity="0"/>
          <stop offset="0.6" stop-color="#ffc531" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#fff1a0" stop-opacity="1"/>
        </linearGradient>
        <radialGradient id="glow"><stop offset="0" stop-color="#ffe066" stop-opacity="0.9"/><stop offset="1" stop-color="#ff9a00" stop-opacity="0"/></radialGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="1.6"/></filter>
      </defs>
      <ellipse cx="88" cy="14" rx="22" ry="13" fill="url(#glow)"/>
      <path d="M4 14 L92 8 Q102 14 92 20 Z" fill="url(#tail)" filter="url(#soft)"/>
      <path d="M40 14 L94 10.5 Q100 14 94 17.5 Z" fill="#fff6c8"/>
      <ellipse cx="94" cy="14" rx="7" ry="4" fill="#ffffff"/>`,
  },
  // A fireball: a white-hot middle in an orange glow, flames streaming back.
  explosive: {
    w: 72, h: 44,
    svg: `
      <defs>
        <radialGradient id="ball" cx="0.62" cy="0.5" r="0.55">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="0.25" stop-color="#fff0a0"/>
          <stop offset="0.55" stop-color="#ffa53c"/>
          <stop offset="0.85" stop-color="#ff5a1f" stop-opacity="0.7"/>
          <stop offset="1" stop-color="#ff3d00" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="flame" x1="0" x2="1">
          <stop offset="0" stop-color="#ff5a1f" stop-opacity="0"/>
          <stop offset="1" stop-color="#ffb347" stop-opacity="0.85"/>
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <path d="M4 22 Q26 8 48 12 L48 32 Q26 36 4 22 Z" fill="url(#flame)" filter="url(#soft)"/>
      <circle cx="48" cy="22" r="20" fill="url(#ball)"/>
      <circle cx="52" cy="21" r="6" fill="#ffffff"/>`,
  },
  // A laser bolt: a long green beam with a white core, fading out behind.
  laser: {
    w: 160, h: 26,
    svg: `
      <defs>
        <linearGradient id="beam" x1="0" x2="1">
          <stop offset="0" stop-color="#3dff6a" stop-opacity="0"/>
          <stop offset="0.35" stop-color="#3dff6a" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#7dff6a" stop-opacity="0.95"/>
        </linearGradient>
        <linearGradient id="core" x1="0" x2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="0.5" stop-color="#eaffea" stop-opacity="0.9"/>
          <stop offset="1" stop-color="#ffffff"/>
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
      </defs>
      <rect x="4" y="5" width="150" height="16" rx="8" fill="url(#beam)" filter="url(#soft)"/>
      <rect x="20" y="10.5" width="134" height="5" rx="2.5" fill="url(#core)"/>
      <circle cx="152" cy="13" r="5" fill="#ffffff"/>`,
  },
  // A soft round glow, white, tinted by the game: for the muzzle, hits and blasts.
  glow: {
    w: 64, h: 64,
    svg: `
      <defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="32" cy="32" r="32" fill="url(#g)"/>`,
  },
  // A brass shell case, thrown out of the minigun.
  casing: {
    w: 14, h: 7,
    svg: `
      <rect x="0.5" y="0.5" width="13" height="6" rx="1.5" fill="#c98a1b" stroke="#6b4508" stroke-width="1"/>
      <rect x="2" y="1.5" width="9" height="1.6" rx="0.8" fill="#ffe08a"/>
      <rect x="10.5" y="0.5" width="3" height="6" rx="1" fill="#a86d10"/>`,
  },
  // A soft puff of smoke, white, tinted grey by the game.
  smoke: {
    w: 48, h: 48,
    svg: `
      <defs><radialGradient id="s"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
      <circle cx="20" cy="26" r="16" fill="url(#s)"/><circle cx="30" cy="20" r="15" fill="url(#s)"/><circle cx="27" cy="31" r="13" fill="url(#s)"/>`,
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, { w, h, svg }] of Object.entries(PICTURES)) {
  const file = SHOT_ART[name];
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`))
    .png({ compressionLevel: 9 }).toFile(join(OUT, `${file}.png`));
}
console.log(`The shots' ${Object.keys(PICTURES).length} pictures, in public/assets/adventure/fx/shots`);

// The review picture: each one twice its size, on the forest's green.
if (REVIEW) {
  mkdirSync(REVIEW, { recursive: true });
  const pieces = await Promise.all(Object.keys(PICTURES).map(async (name) => {
    const input = await sharp(join(OUT, `${SHOT_ART[name]}.png`)).resize({ width: PICTURES[name].w * 2, kernel: 'nearest' }).png().toBuffer();
    return { input, w: PICTURES[name].w * 2, h: PICTURES[name].h * 2 };
  }));
  let x = 20;
  const composite = pieces.map(({ input, w, h }) => { const piece = { input, left: x, top: Math.round(70 - h / 2) }; x += w + 30; return piece; });
  await sharp({ create: { width: x, height: 140, channels: 3, background: REVIEW_BACKGROUND } })
    .composite(composite).png().toFile(join(REVIEW, 'shots.png'));
}
