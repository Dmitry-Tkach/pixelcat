// The minigun's ammunition crates, drawn as SVG: a sturdy wooden crate with metal corners, and on
// its front a metal badge of the round's colour with an icon: golden bullets for standard rounds,
// a bomb with a lit fuse for explosive ones, a lightning bolt for the laser, a snowflake for freeze, a flame for fire. tools/adventure-art.mjs
// draws them into each world's art; with a folder, this file draws them side by side to look at.
// Run on its own: node tools/ammo-crate-art.mjs <folder>
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The crate's size in the game, in px, and the size it's drawn at (a grid of 104, scaled down).
export const CRATE_SIZE = 52;
const GRID = 104;
const OUTLINE = '#2b1a10'; // the thick dark outline the pack's art has
const BADGE_SCALE = 0.8; // the badge's size on the crate's front: smaller shows more of the wood

// Each round's badge colours (matching its shot in systems/adventure/shotLook.js) and its icon.
const BADGES = {
  standard: { light: '#ffe48a', dark: '#c98a1b', icon: bullets },
  explosive: { light: '#ffb36b', dark: '#d2541c', icon: bomb },
  laser: { light: '#a8ff9c', dark: '#2fa84a', icon: bolt },
  freeze: { light: '#e4f8ff', dark: '#3a9fd8', icon: snowflake },
  fire: { light: '#ffcf6b', dark: '#d8341a', icon: flame },
};

// Three golden bullets standing side by side.
function bullets() {
  return [34, 52, 70].map((x) => `
    <path d="M${x - 6} 66 L${x - 6} 46 Q${x} 32 ${x + 6} 46 L${x + 6} 66 Z" fill="#ffd34d" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${x - 7.5}" y="62" width="15" height="9" rx="2" fill="#c98a1b" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M${x - 2.5} 47 Q${x} 40 ${x + 1} 46" stroke="#fff6c8" stroke-width="2.5" fill="none" stroke-linecap="round"/>`).join('');
}

// A round black bomb with a lit fuse.
function bomb() {
  return `
    <path d="M60 36 Q66 26 74 28" stroke="${OUTLINE}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M74 28 l3 -7 l2 6 l6 -3 l-4 6 l6 3 l-7 1 l1 6 l-5 -5 z" fill="#ffe066" stroke="#ff7a1a" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="53" y="33" width="12" height="9" rx="2" fill="#5a5f6b" stroke="${OUTLINE}" stroke-width="3" transform="rotate(25 59 37)"/>
    <circle cx="50" cy="56" r="17" fill="#3b3f4a" stroke="${OUTLINE}" stroke-width="3.5"/>
    <path d="M40 50 Q43 43 50 42" stroke="#9aa3b5" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
}

// A lightning bolt.
function bolt() {
  return `
    <path d="M58 30 L38 58 L51 58 L44 78 L68 48 L55 48 L62 30 Z" fill="#eaffea" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M57 35 L44 54" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>`;
}

// A snowflake: six arms, each with a little V near its tip.
function snowflake() {
  const arm = (angle) => `<g transform="rotate(${angle} 52 54)">
    <path d="M52 54 V30 M52 37 L45 31 M52 37 L59 31" stroke="${OUTLINE}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M52 54 V30 M52 37 L45 31 M52 37 L59 31" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" fill="none"/></g>`;
  return [0, 60, 120, 180, 240, 300].map(arm).join('') + `<circle cx="52" cy="54" r="5" fill="#ffffff" stroke="${OUTLINE}" stroke-width="2.5"/>`;
}

// A flame: red outside, orange, then a yellow heart.
function flame() {
  return `
    <path d="M52 78 Q32 76 34 58 Q36 46 46 40 Q44 50 50 52 Q48 38 58 28 Q58 42 66 50 Q72 58 68 68 Q64 78 52 78 Z" fill="#e8401c" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M52 74 Q41 72 42 62 Q43 55 49 51 Q49 58 54 59 Q53 50 59 44 Q60 54 64 59 Q66 66 62 70 Q58 75 52 74 Z" fill="#ff9a2a"/>
    <path d="M52 72 Q46 70 47 64 Q48 60 52 58 Q53 63 56 63 Q59 67 57 70 Q55 72 52 72 Z" fill="#ffe066"/>`;
}

// The whole crate, as an SVG of CRATE_SIZE.
export function crateSvg(kind) {
  const { light, dark, icon } = BADGES[kind];
  const plank = (y) => `<rect x="10" y="${y}" width="84" height="26" fill="url(#wood)"/><path d="M10 ${y + 25.5} H94" stroke="#5b3416" stroke-width="2"/>`;
  const corner = (x, y, rx, ry) => `<path d="M${x} ${y + ry * 16} L${x} ${y} L${x + rx * 16} ${y}" stroke="#8e98a6" stroke-width="5" fill="none" stroke-linejoin="round"/><circle cx="${x + rx * 7}" cy="${y + ry * 7}" r="2.4" fill="#dfe6ef"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CRATE_SIZE}" height="${CRATE_SIZE}" viewBox="0 0 ${GRID} ${GRID}">
    <defs>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b4703a"/><stop offset="1" stop-color="#8a5226"/></linearGradient>
      <radialGradient id="badge" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
    </defs>
    <rect x="8" y="12" width="88" height="84" rx="8" fill="#6e3f1c" stroke="${OUTLINE}" stroke-width="5"/>
    ${plank(15)}${plank(41)}${plank(67)}
    <rect x="8" y="12" width="88" height="84" rx="8" fill="none" stroke="${OUTLINE}" stroke-width="5"/>
    ${corner(12, 16, 1, 1)}${corner(92, 16, -1, 1)}${corner(12, 92, 1, -1)}${corner(92, 92, -1, -1)}
    <g transform="translate(52 54) scale(${BADGE_SCALE}) translate(-52 -54)">
      <circle cx="52" cy="54" r="31" fill="url(#badge)" stroke="${OUTLINE}" stroke-width="4.5"/>
      <circle cx="52" cy="54" r="25" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2.5"/>
      ${icon()}
    </g>
  </svg>`;
}

export const CRATE_KINDS = Object.keys(BADGES);

// On its own, with a folder: the three crates at twice their size, and at their size, side by side.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const folder = process.argv[2];
  mkdirSync(folder, { recursive: true });
  const pieces = [];
  for (const kind of CRATE_KINDS) {
    const png = await sharp(Buffer.from(crateSvg(kind))).png().toBuffer();
    pieces.push({ input: await sharp(png).resize(CRATE_SIZE * 2, CRATE_SIZE * 2).png().toBuffer(), size: CRATE_SIZE * 2 });
  }
  for (const kind of CRATE_KINDS) pieces.push({ input: await sharp(Buffer.from(crateSvg(kind))).png().toBuffer(), size: CRATE_SIZE });
  let x = 20;
  const composite = pieces.map(({ input, size }) => { const piece = { input, left: x, top: Math.round(75 - size / 2) }; x += size + 24; return piece; });
  await sharp({ create: { width: x, height: 150, channels: 3, background: '#4f7f4c' } }).composite(composite).png().toFile(join(folder, 'crates.png'));
}
