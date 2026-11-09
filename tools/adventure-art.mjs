// Prepares the art for the adventure levels from the free world packs in images/assets/worlds, at the
// size the game uses and with short names. The packs are left alone.
// Tiles are drawn at 128px and used at 64px, so the battle cat is about two tiles tall.
// Run: npm run assets (or node tools/adventure-art.mjs)
import sharp from 'sharp';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORLDS = join(ROOT, 'images', 'assets', 'worlds');
const OUT = join(ROOT, 'public', 'assets', 'adventure');
const HALF = 0.5;

// The Wood world (World Tree Roots). Each entry: game name, pack folder and file name, scale.
const WOOD_PREFIX = 'World_Tree_Roots_2D_Platformer_Tileset';
// The pack's tile folder is spelled 'Platfromer', but its files say 'Platformer'.
const wood = (folder, name) => join(WORLDS, 'wood', folder, `${WOOD_PREFIX}_${folder.replace('Platfromer', 'Platformer')} - ${name}.png`);
const WOOD = {
  // Ground, drawn as one block of soil with a grassy top, and floating ledges.
  'ground-top-left': [wood('Platfromer', 'Ground 04'), HALF],
  'ground-top': [wood('Platfromer', 'Ground 02'), HALF],
  'ground-top-right': [wood('Platfromer', 'Ground 08'), HALF],
  'soil-left': [wood('Platfromer', 'Ground 09'), HALF],
  soil: [wood('Platfromer', 'Ground 06'), HALF],
  'soil-right': [wood('Platfromer', 'Ground 13'), HALF],
  'ledge-left': [wood('Platfromer', 'Ground 10'), HALF],
  ledge: [wood('Platfromer', 'Ground 11'), HALF],
  'ledge-right': [wood('Platfromer', 'Ground 12'), HALF],
  bridge: [wood('Platfromer', 'Bridge Part 01'), 1],
  stone: [wood('Platfromer', 'Stone'), HALF],
  roots: [wood('Platfromer', 'Ground Additional 03'), HALF],
  ladder: [wood('Platfromer', 'Ladder'), HALF],
  spike: [wood('Platfromer', 'Spike'), HALF],
  bonus: [wood('Platfromer', 'Bonus'), HALF],
  'bonus-used': [wood('Platfromer', 'Brick 02'), HALF],
  box: [wood('Platfromer', 'Wooden Box'), HALF],
  // Things to collect.
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`coin-${n}`, [wood('Collectable Object', `Coin 0${n}`), 0.375]])),
  gem: [wood('Collectable Object', 'Crystal'), 0.4],
  key: [wood('Collectable Object', 'Golden Key'), 0.45],
  'chest-locked': [wood('Collectable Object', 'Locked Golden Treasure Box'), HALF],
  'chest-open': [wood('Collectable Object', 'Unlocked Golden Treasure Box'), HALF],
  heart: [wood('Collectable Object', 'Life'), 0.4],
  mushroom: [wood('Collectable Object', 'Mushroom'), HALF],
  // Scenery.
  portal: [wood('Environment', 'Portal'), HALF],
  'bush-1': [wood('Environment', 'Bush 01'), HALF],
  'bush-2': [wood('Environment', 'Bush 02'), HALF],
  'plant-1': [wood('Environment', 'Plant 01'), HALF],
  'plant-2': [wood('Environment', 'Plant 02'), HALF],
  fence: [wood('Environment', 'Fence 02'), HALF],
  'sign-right': [wood('Environment', 'Signpost 01'), HALF],
  'sign-up': [wood('Environment', 'Signpost 02'), HALF],
  ivy: [wood('Environment', 'Ivy 02'), HALF],
  rock: [wood('Environment', 'Rock 01'), HALF],
  statue: [wood('Environment', 'Statue'), HALF],
  lantern: [wood('Environment', 'Fireplace'), HALF],
};

rmSync(OUT, { recursive: true, force: true });
const out = join(OUT, 'wood');
mkdirSync(out, { recursive: true });
for (const [name, [file, scale]] of Object.entries(WOOD)) {
  const { width } = await sharp(file).metadata();
  await sharp(file).resize({ width: Math.round(width * scale) }).png({ compressionLevel: 9 }).toFile(join(out, `${name}.png`));
}
// The ground, islands and bridge as one strip of 64px tiles, for the game's tilemap, in this order.
// data/adventure/tiles.js names each tile's place in the strip.
const TILESET = ['ground-top-left', 'ground-top', 'ground-top-right', 'soil-left', 'soil', 'soil-right',
  'ledge-left', 'ledge', 'ledge-right', 'bridge'];
const TILE = 64;
await sharp({ create: { width: TILE * TILESET.length, height: TILE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(await Promise.all(TILESET.map(async (name, i) => ({
    input: await sharp(join(out, `${name}.png`)).resize(TILE, TILE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
    left: i * TILE,
    top: 0,
  }))))
  .png({ compressionLevel: 9 }).toFile(join(out, 'tiles.png'));

// The two background layers, at the game's height.
for (const [name, layer] of [['back-far', '00'], ['back-near', '01']]) {
  await sharp(wood('Background', `Layer ${layer}`)).resize({ height: 720 }).png({ compressionLevel: 9 }).toFile(join(out, `${name}.png`));
}
console.log(`Adventure art prepared in public/assets/adventure (${Object.keys(WOOD).length + 2} images)`);
