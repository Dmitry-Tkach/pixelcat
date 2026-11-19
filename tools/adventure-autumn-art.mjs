// Prepares the Autumn Forest world's art (world 2) into public/assets/adventure/autumn: the tiles,
// backdrop, pickups and scenery from the free Autumn Forest pack (images/assets/worlds/autumn-forest),
// a few things recoloured from the Wood world for autumn, and stand-ins drawn here for what the
// owner will draw (prompts/autumn-level): the climbing vine, the cracked floor, the switch and the
// Guardian Gate's door. Anything the Autumn world doesn't have of its own comes from the Wood
// world's art (data/adventure/index.js, ADVENTURE_ART_OWN).
// Runs after the Wood world's tools, as it reads some of their art: npm run assets.
import sharp from 'sharp';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTUMN_FROM_WOOD } from '../src/data/adventure/autumnArt.js';
import { TILE, backdropLayer, buildTileStrip, shrinkPieces, soilVariants } from './adventureTileArt.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'images', 'assets', 'worlds', 'autumn-forest', 'PNG');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'autumn');
const WOOD_OUT = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const HALF = 0.5;

// The pack's tile folder is spelled 'Platfromer', but its files say 'Platformer'.
const pack = (folder, name) => join(PACK, folder, `Autumn_Forest_2D_Platformer_Tileset_${folder.replace('Platfromer', 'Platformer')} - ${name}.png`);

// Each entry: game name, pack picture, scale. The same names as the Wood world's, so the game finds
// them the same way, and a few of the Autumn world's own scenery.
const AUTUMN = {
  'ground-top-left': [pack('Platfromer', 'Ground 04'), HALF],
  'ground-top': [pack('Platfromer', 'Ground 02'), HALF],
  'ground-top-right': [pack('Platfromer', 'Ground 08'), HALF],
  'soil-left': [pack('Platfromer', 'Ground 09'), HALF],
  soil: [pack('Platfromer', 'Ground 06'), HALF],
  'soil-right': [pack('Platfromer', 'Ground 13'), HALF],
  'ledge-left': [pack('Platfromer', 'Ground 10'), HALF],
  ledge: [pack('Platfromer', 'Ground 11'), HALF],
  'ledge-right': [pack('Platfromer', 'Ground 12'), HALF],
  bridge: [pack('Platfromer', 'Bridge Part 01'), 1],
  stone: [pack('Platfromer', 'Stone'), HALF],
  ladder: [pack('Platfromer', 'Ladder'), HALF],
  spike: [pack('Platfromer', 'Spike'), HALF],
  bonus: [pack('Platfromer', 'Bonus'), HALF],
  'bonus-used': [pack('Platfromer', 'Brick 02'), HALF],
  box: [pack('Platfromer', 'Wooden Box'), HALF],
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`coin-${n}`, [pack('Collectable Object', `Coin 0${n}`), 0.375]])),
  gem: [pack('Collectable Object', 'Crystal'), 0.4],
  key: [pack('Collectable Object', 'Golden Key'), 0.45],
  'silver-key': [pack('Collectable Object', 'Silver Key'), 0.45],
  // The pack has its chests' names swapped: its 'Silver' chest is the gold one, and the other way round.
  'chest-silver-locked': [pack('Collectable Object', 'Locked Golden Treasure Box'), HALF],
  'chest-silver-open': [pack('Collectable Object', 'Unlocked Golden Treasure Box'), HALF],
  'chest-locked': [pack('Collectable Object', 'Locked Silver Treasure Box'), HALF],
  'chest-open': [pack('Collectable Object', 'Unlocked Silver Treasure Box'), HALF],
  heart: [pack('Collectable Object', 'Life'), 0.4],
  mushroom: [pack('Collectable Object', 'Mushroom '), HALF],
  // Scenery: dry grass, a pile of leaves, a stump, signs, fences, a torch, the village house, trees,
  // rocks, a standing stone and a barrel.
  'bush-1': [pack('Environment', 'Bush 01'), HALF],
  'plant-1': [pack('Environment', 'Bush 02'), HALF],
  stump: [pack('Environment', 'Bush 03'), HALF],
  'sign-right': [pack('Environment', 'Signpost 01'), HALF],
  'sign-up': [pack('Environment', 'Signpost 02'), HALF],
  'sign-skull': [pack('Environment', 'Signpost 04'), HALF],
  'sign-warn': [pack('Environment', 'Signpost 05'), HALF],
  fence: [pack('Environment', 'Fence 01'), HALF],
  'fence-2': [pack('Environment', 'Fence 02'), HALF],
  torch: [pack('Environment', 'Fire'), HALF],
  house: [pack('Environment', 'House'), 0.6],
  'tree-1': [pack('Environment', 'Tree 01'), 0.8],
  'tree-2': [pack('Environment', 'Tree 02'), 0.8],
  rock: [pack('Environment', 'Rock 01'), HALF],
  'rock-2': [pack('Environment', 'Rock 02'), HALF],
  'standing-stone': [pack('Environment', 'Stone 01'), HALF],
  barrel: [pack('Platfromer', 'Wooden Barrel'), HALF],
};
// Things that stand on the ground: their empty rows below are cut off (see shrinkPieces).
const STANDS = new Set(['chest-locked', 'chest-open', 'chest-silver-locked', 'chest-silver-open', 'bush-1', 'plant-1', 'stump',
  'sign-right', 'sign-up', 'sign-skull', 'sign-warn', 'fence', 'fence-2', 'torch', 'house', 'tree-1', 'tree-2', 'rock', 'rock-2',
  'standing-stone', 'barrel', 'spike']);

// The soil's pebbles and roots, in the Autumn ground's red-brown.
const SOIL = { pebble: '#6b4330', shine: '#8a5a40', dark: '#2e1a12', root: '#3a2216', rootLight: '#6a4028' };

// How far the Wood world's green is turned round the colour wheel to make it autumn's orange and gold.
const TO_AUTUMN_HUE = -75;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
await shrinkPieces(AUTUMN, OUT, STANDS);

// No earth pillar (map letter R): the pack's cuts badly, so this world's levels don't use one.
await buildTileStrip(OUT, soilVariants(SOIL));
for (const [name, layer] of [['back-far', '00'], ['back-near', '01']]) await backdropLayer(pack('Background', `Layer ${layer}`), OUT, name);

// The Wood world's leaves and plants, turned autumn: the crumbling leaves, and the grass, flowers
// and vines the decoration places.
for (const name of AUTUMN_FROM_WOOD) {
  await sharp(join(WOOD_OUT, `${name}.png`)).modulate({ hue: TO_AUTUMN_HUE }).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
}

// ----- Stand-ins, drawn here, until the owner's pictures come (prompts/autumn-level).
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const save = (name, input) => sharp(input).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));

// The climbing vine, one cell tall: a stem that meets the next copy at its top and bottom, with
// leaves on both sides. The scene stacks it as tall as the vine is.
await save('vine', svg(TILE, TILE, `
  <path d="M32 0 C 22 16, 42 32, 32 48 S 30 60, 32 64" stroke="#4f3a17" stroke-width="9" fill="none"/>
  <path d="M32 0 C 22 16, 42 32, 32 48 S 30 60, 32 64" stroke="#8a9a2a" stroke-width="5" fill="none"/>
  <path d="M30 12 q -18 -6 -22 6 q 12 6 22 -6z" fill="#d9a12a" stroke="#8a5a14" stroke-width="2"/>
  <path d="M36 30 q 18 -8 24 4 q -12 8 -24 -4z" fill="#e0782a" stroke="#8a3e14" stroke-width="2"/>
  <path d="M30 50 q -16 -2 -20 10 q 12 2 20 -10z" fill="#a8b32e" stroke="#5e6a14" stroke-width="2"/>`));

// The cracked floor: the ground's top with deep cracks and a glimmer of light through them. It
// breaks when he lands on it, into a secret below.
const groundTop = await sharp(join(OUT, 'ground-top.png')).resize(TILE, TILE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await save('cracked', await sharp(groundTop).composite([{ input: svg(TILE, TILE, `
  <path d="M10 18 L22 30 L18 42 L30 54 M22 30 L36 26 L44 38 L56 34 M44 38 L40 56" stroke="#1d0f08" stroke-width="4" fill="none" stroke-linejoin="round"/>
  <path d="M10 18 L22 30 L18 42 L30 54 M22 30 L36 26 L44 38 L56 34 M44 38 L40 56" stroke="#ffd36a" stroke-width="1.2" fill="none" opacity="0.8"/>`) }]).png().toBuffer());

// The switch: a stone block with a round gem, dull grey until shot, then glowing green.
const switchBlock = (gem, glow) => svg(56, 56, `
  <rect x="3" y="3" width="50" height="50" rx="9" fill="#8a8574" stroke="#4a4638" stroke-width="3"/>
  <rect x="9" y="9" width="38" height="38" rx="6" fill="#a39e8a"/>
  ${glow ? `<circle cx="28" cy="28" r="15" fill="${glow}" opacity="0.5"/>` : ''}
  <circle cx="28" cy="28" r="11" fill="${gem}" stroke="#3a3a30" stroke-width="2.5"/>
  <circle cx="24" cy="24" r="3.5" fill="#ffffff" opacity="0.7"/>`);
await save('switch-off', switchBlock('#7a7f84'));
await save('switch-on', switchBlock('#5cf08a', '#b6ffc8'));

// The Guardian Gate's door: round, to fill the portal arch's hole, of old planks with iron bands and
// a big keyhole.
await save('gate-door', svg(128, 128, `
  <defs><clipPath id="round"><circle cx="64" cy="64" r="60"/></clipPath></defs>
  <g clip-path="url(#round)">
    <rect width="128" height="128" fill="#6b4024"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${4 + i * 24}" y="0" width="22" height="128" fill="${i % 2 ? '#7a4a2a' : '#6a3e22'}" stroke="#3e220f" stroke-width="2"/>`).join('')}
    <rect x="0" y="34" width="128" height="12" fill="#55595e" stroke="#2c2e31" stroke-width="2"/>
    <rect x="0" y="84" width="128" height="12" fill="#55595e" stroke="#2c2e31" stroke-width="2"/>
  </g>
  <circle cx="64" cy="64" r="60" fill="none" stroke="#3e220f" stroke-width="5"/>
  <circle cx="64" cy="62" r="17" fill="#c9a23a" stroke="#6a5212" stroke-width="3"/>
  <circle cx="64" cy="57" r="5" fill="#1a1208"/><path d="M60 59 L68 59 L66 72 L62 72z" fill="#1a1208"/>`));

// A small orange fish, facing left, in two poses: its tail flicked up, then down.
const fish = (tail) => svg(72, 44, `
  <path d="M54 22 L70 ${22 - tail} L70 ${22 + tail * 0.2} L66 22 L70 ${22 + tail} z" fill="#e0662a" stroke="#8a3412" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="32" cy="22" rx="25" ry="14" fill="#f08a3a" stroke="#8a3412" stroke-width="2.5"/>
  <path d="M28 9 Q34 2 42 10" fill="#e0662a" stroke="#8a3412" stroke-width="2"/>
  <ellipse cx="34" cy="27" rx="14" ry="6" fill="#ffc07a" opacity="0.8"/>
  <circle cx="16" cy="19" r="4.5" fill="#ffffff" stroke="#3a1a08" stroke-width="1.5"/><circle cx="15" cy="19" r="2.2" fill="#1a0a04"/>
  <path d="M8 25 Q11 27 13 25" stroke="#8a3412" stroke-width="2" fill="none"/>`);
await save('fish-1', fish(14));
await save('fish-2', fish(-14));
