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
  // A fire round: a tongue of flame lying on its side, pointed at the front, red outside, then
  // orange and a yellow-white heart, its flames curling back and up behind it.
  fire: {
    w: 100, h: 36,
    svg: `
      <defs>
        <linearGradient id="fade" x1="0" x2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="1"/>
        </linearGradient>
        <mask id="tail"><rect width="100" height="36" fill="url(#fade)"/></mask>
        <filter id="soft"><feGaussianBlur stdDeviation="0.8"/></filter>
      </defs>
      <g mask="url(#tail)" filter="url(#soft)">
        <path d="M96 20 Q86 30 66 30 Q46 31 30 26 Q40 25 44 22 Q28 22 8 14 Q30 14 44 13 Q36 8 30 3 Q48 6 62 9 Q84 9 96 20 Z" fill="#e0321a"/>
        <path d="M94 20 Q84 27 68 27 Q54 27 44 24 Q52 22 54 20 Q40 18 28 14 Q46 14 56 13 Q52 10 48 7 Q60 9 68 11 Q84 12 94 20 Z" fill="#ff7a2a"/>
        <path d="M92 20 Q84 25 72 24 Q62 24 56 21 Q64 19 66 17 Q76 15 92 20 Z" fill="#ffc531"/>
        <path d="M90 20 Q84 22.5 76 22 Q71 21 70 19.5 Q78 17.5 90 20 Z" fill="#fff6c8"/>
      </g>`,
  },
  // A freeze round: a pale blue ice crystal, pointed, with a frosty glow and a misty tail.
  freeze: {
    w: 96, h: 32,
    svg: `
      <defs>
        <linearGradient id="mist" x1="0" x2="1">
          <stop offset="0" stop-color="#bfefff" stop-opacity="0"/>
          <stop offset="1" stop-color="#bfefff" stop-opacity="0.7"/>
        </linearGradient>
        <radialGradient id="frost"><stop offset="0" stop-color="#e8fbff" stop-opacity="0.9"/><stop offset="1" stop-color="#6fd0ff" stop-opacity="0"/></radialGradient>
        <linearGradient id="crystal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#bdeeff"/><stop offset="1" stop-color="#4fb6ec"/>
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <path d="M4 16 Q30 8 60 10 L60 22 Q30 24 4 16 Z" fill="url(#mist)" filter="url(#soft)"/>
      <ellipse cx="74" cy="16" rx="20" ry="14" fill="url(#frost)"/>
      <path d="M56 16 L66 7 L90 16 L66 25 Z" fill="url(#crystal)" stroke="#1d5a86" stroke-width="2" stroke-linejoin="round"/>
      <path d="M66 7 L70 16 L66 25 M70 16 L90 16" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.8" fill="none"/>`,
  },
  // A block of ice, see-through, with frosty edges and shine: stretched by the game over a frozen
  // enemy.
  ice: {
    w: 100, h: 100,
    svg: `
      <defs>
        <linearGradient id="ice" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e9fbff" stop-opacity="0.75"/>
          <stop offset="0.5" stop-color="#9fdcff" stop-opacity="0.45"/>
          <stop offset="1" stop-color="#5ab7ec" stop-opacity="0.65"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="94" height="94" rx="10" fill="url(#ice)" stroke="#1d5a86" stroke-width="4"/>
      <rect x="9" y="9" width="82" height="82" rx="7" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="3"/>
      <path d="M18 30 L34 14 M18 46 L50 14" stroke="#ffffff" stroke-opacity="0.85" stroke-width="5" stroke-linecap="round"/>
      <path d="M70 88 L88 70" stroke="#ffffff" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round"/>
      <path d="M3 22 Q12 26 20 20 Q30 28 40 22 Q52 30 62 22 Q74 28 84 20 Q92 26 97 22 L97 13 Q97 3 87 3 L13 3 Q3 3 3 13 Z" fill="#ffffff" fill-opacity="0.55"/>`,
  },
  // A shard of ice, for when a block shatters.
  shard: {
    w: 18, h: 18,
    svg: `<path d="M3 15 L8 2 L16 8 Z" fill="#d9f5ff" stroke="#1d5a86" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M8 4 L10 9" stroke="#ffffff" stroke-width="1.2"/>`,
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
  const height = Math.max(...pieces.map((p) => p.h)) + 40;
  const composite = pieces.map(({ input, w, h }) => { const piece = { input, left: x, top: Math.round((height - h) / 2) }; x += w + 30; return piece; });
  await sharp({ create: { width: x, height, channels: 3, background: REVIEW_BACKGROUND } })
    .composite(composite).png().toFile(join(REVIEW, 'shots.png'));
}
