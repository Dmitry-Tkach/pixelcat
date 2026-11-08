// Draws the home screen's scenery: the bathroom on bath day, with a door open onto a sunny park.
// The family and the cat are the game's own sprites, placed by src/ui/HomeScreen.js.
// Run: npm run assets
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'home');
mkdirSync(OUT, { recursive: true });

const W = 1280;
const H = 720;
const FLOOR = 520; // where the wall meets the floor

function save(name, inner, w, h) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  writeFileSync(join(OUT, `${name}.png`), new Resvg(svg).render().asPng());
}

// The bathroom: pastel tiles, a window, a towel rail and a door, open onto the park.
function bathroom() {
  let tiles = '';
  for (let y = 250; y < FLOOR; y += 34) {
    for (let x = (y / 34) % 2 ? -17 : 0; x < W; x += 34) {
      tiles += `<rect x="${x + 1}" y="${y + 1}" width="32" height="32" rx="3" fill="${(x + y) % 68 ? '#CDEBF2' : '#D9F1F6'}"/>`;
    }
  }
  let floor = '';
  for (let y = FLOOR; y < H; y += 40) {
    for (let x = (y / 40) % 2 ? -40 : 0; x < W; x += 80) {
      floor += `<rect x="${x}" y="${y}" width="40" height="40" fill="#F3E6CF"/><rect x="${x + 40}" y="${y}" width="40" height="40" fill="#E2CFAE"/>`;
    }
  }
  const door = { x: 600, w: 190 }; // left of the middle: the menu stands on the right
  const inner = `
    <rect width="${W}" height="${H}" fill="#F7D9DE"/>
    <rect y="0" width="${W}" height="250" fill="#F9E3E6"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${80 + i * 190}" cy="120" r="22" fill="#FFFFFF" opacity="0.35"/>`).join('')}
    ${tiles}
    <rect y="242" width="${W}" height="10" fill="#9FD6E3"/><rect y="242" width="${W}" height="3" fill="#FFFFFF" opacity="0.6"/>
    ${floor}
    <rect y="${FLOOR}" width="${W}" height="8" fill="#000000" opacity="0.1"/>

    <!-- The window, with sky and a bird on a branch outside. -->
    <rect x="56" y="56" width="210" height="160" rx="10" fill="#FFFFFF"/>
    <rect x="68" y="68" width="186" height="136" rx="6" fill="#9FD8F5"/>
    <circle cx="210" cy="100" r="22" fill="#FFF7D6"/>
    <path d="M68 170 Q120 150 170 166 T254 160 V204 H68 Z" fill="#7FD27F"/>
    <rect x="158" y="68" width="6" height="136" fill="#FFFFFF"/><rect x="68" y="134" width="186" height="6" fill="#FFFFFF"/>
    <path d="M60 56 Q110 96 80 216 L60 216 Z" fill="#F58FAB"/><path d="M262 56 Q212 96 242 216 L262 216 Z" fill="#F58FAB"/>
    <rect x="50" y="48" width="222" height="10" rx="5" fill="#B4513A"/>

    <!-- A shelf of bottles and a mirror. -->
    <rect x="330" y="70" width="130" height="112" rx="56" fill="#E9F6FA" stroke="#FFFFFF" stroke-width="8"/>
    <path d="M356 108 Q392 90 420 116" stroke="#FFFFFF" stroke-width="6" fill="none" opacity="0.8"/>
    <rect x="312" y="206" width="170" height="10" rx="4" fill="#B88A58"/>
    <rect x="326" y="172" width="22" height="34" rx="6" fill="#F0455F"/><rect x="332" y="164" width="10" height="10" fill="#FFFFFF"/>
    <rect x="358" y="178" width="26" height="28" rx="6" fill="#37C871"/><rect x="364" y="170" width="14" height="10" fill="#FFFFFF"/>
    <rect x="394" y="168" width="20" height="38" rx="5" fill="#B79CEB"/><rect x="398" y="160" width="12" height="10" fill="#FFFFFF"/>
    <rect x="424" y="182" width="34" height="24" rx="8" fill="#FFC531"/>

    <!-- The towel rail, with a towel waiting. -->
    <rect x="470" y="270" width="100" height="8" rx="4" fill="#C9CED8"/><circle cx="470" cy="274" r="8" fill="#C9CED8"/><circle cx="570" cy="274" r="8" fill="#C9CED8"/>
    <path d="M482 274 h76 v110 q-38 12 -76 0 Z" fill="#2FA4F2"/><path d="M482 352 h76" stroke="#FFFFFF" stroke-width="6"/><path d="M482 368 h76" stroke="#FFFFFF" stroke-width="3"/>

    <!-- The door, open onto the park. -->
    <rect x="${door.x - 14}" y="60" width="${door.w + 28}" height="${FLOOR - 60 + 6}" rx="6" fill="#FFFFFF"/>
    <rect x="${door.x}" y="74" width="${door.w}" height="${FLOOR - 74}" fill="#BFE7F7"/>
    <circle cx="${door.x + 160}" cy="120" r="26" fill="#FFF7D6"/>
    <path d="M${door.x} 300 Q${door.x + 100} 270 ${door.x + door.w} 296 V${FLOOR} H${door.x} Z" fill="#7BE39A"/>
    <path d="M${door.x + 80} ${FLOOR} Q${door.x + 100} 380 ${door.x + 112} 300 Q${door.x + 124} 380 ${door.x + 150} ${FLOOR} Z" fill="#E9D7B0"/>
    <rect x="${door.x + 30}" y="200" width="12" height="100" fill="#7A5232"/>
    <circle cx="${door.x + 36}" cy="180" r="44" fill="#3E9A4A"/><circle cx="${door.x + 20}" cy="196" r="28" fill="#57CF62"/><circle cx="${door.x + 52}" cy="160" r="16" fill="#7AD98A"/>
    <rect x="${door.x + 150}" y="250" width="54" height="8" rx="3" fill="#B88A58"/><rect x="${door.x + 156}" y="258" width="5" height="22" fill="#7A5232"/><rect x="${door.x + 192}" y="258" width="5" height="22" fill="#7A5232"/>
    <circle cx="${door.x + 66}" cy="306" r="5" fill="#F58FAB"/><circle cx="${door.x + 180}" cy="320" r="5" fill="#FFD568"/>
    <!-- The door itself, swung wide open into the room. -->
    <path d="M${door.x + door.w} 74 L${door.x + door.w + 90} 50 L${door.x + door.w + 90} ${FLOOR + 30} L${door.x + door.w} ${FLOOR}" fill="#C26442"/>
    <path d="M${door.x + door.w + 14} 110 L${door.x + door.w + 76} 92 V250 L${door.x + door.w + 14} 262 Z" fill="#A54F33"/>
    <circle cx="${door.x + door.w + 70}" cy="320" r="7" fill="#FFC531"/>`;
  save('bathroom', inner, W, H);
}

// A clawfoot bath, full of foam.
function bath() {
  let foam = '';
  [[40, 40, 34], [90, 26, 40], [150, 30, 38], [210, 22, 42], [270, 30, 36], [320, 40, 30], [120, 8, 24], [240, 6, 26], [180, 0, 22]].forEach(([x, y, r]) => {
    foam += `<circle cx="${x}" cy="${y + 50}" r="${r}" fill="#FFFFFF"/><circle cx="${x - r * 0.3}" cy="${y + 50 - r * 0.35}" r="${r * 0.3}" fill="#E6F6FF"/>`;
  });
  save('bath', `
    ${foam}
    <path d="M0 90 H360 Q360 220 260 232 H100 Q0 220 0 90 Z" fill="#FFFFFF"/>
    <path d="M330 100 Q336 210 250 222" stroke="#DDE6F0" stroke-width="18" fill="none"/>
    <rect x="-6" y="82" width="372" height="18" rx="9" fill="#F3F6FA"/>
    <rect x="-6" y="82" width="372" height="5" rx="2" fill="#FFFFFF"/>
    <path d="M60 228 l-14 36 h22 l8 -30 Z M300 228 l14 36 h-22 l-8 -30 Z" fill="#E7C66B"/>
    <path d="M330 82 V36 q0 -16 -16 -16 h-24" stroke="#C9CED8" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="286" cy="22" r="8" fill="#C9CED8"/>`, 360, 266);
}

function duck() {
  save('duck', `
    <ellipse cx="34" cy="44" rx="30" ry="18" fill="#FFC531"/>
    <circle cx="44" cy="22" r="16" fill="#FFC531"/>
    <path d="M58 22 l14 4 l-14 6 Z" fill="#FF8A1E"/>
    <circle cx="48" cy="18" r="3" fill="#1E2A4A"/><circle cx="49" cy="17" r="1" fill="#FFFFFF"/>
    <path d="M14 40 q12 -14 26 0" stroke="#E0A22B" stroke-width="3" fill="none"/>`, 76, 64);
}

// A soap bubble: clear, with a rim and a shine.
function bubble() {
  save('bubble', `
    <circle cx="32" cy="32" r="28" fill="#DDF3FF" fill-opacity="0.35" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="3"/>
    <path d="M18 20 a18 18 0 0 1 14 -8" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="44" cy="44" r="3" fill="#FFFFFF" opacity="0.7"/>`, 64, 64);
}

bathroom();
bath();
duck();
bubble();
console.log('Home art drawn in public/assets/home');
