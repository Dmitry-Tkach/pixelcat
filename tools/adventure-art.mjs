// Prepares the art for the adventure levels from the free world packs in images/assets/worlds, at the
// size the game uses and with short names. The packs are left alone.
// Tiles are drawn at 128px and used at 64px, so the battle cat is about two tiles tall.
// Run: npm run assets (or node tools/adventure-art.mjs)
import sharp from 'sharp';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENEMIES, PACK_FRAMES, enemyLayout } from '../src/data/adventure/enemies.js';
import { FLASH, GUNNERS, gunnerLayout } from '../src/data/adventure/gunners.js';
import { PILLAR } from '../src/data/adventure/index.js';
import { EXPLOSION } from '../src/data/adventure/ammo.js';

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
  // The battle cat's bullet, from the gangsta cats pack.
  bullet: [join(WORLDS, 'characters', 'gangsta-cats', 'Png', 'Bullets', 'Artboard 1.png'), 0.4],
  // The gunners' bullet: the red one.
  'enemy-bullet': [join(WORLDS, 'characters', 'gangsta-cats', 'Png', 'Bullets', 'Artboard 1 copy 2.png'), 0.4],
};

rmSync(OUT, { recursive: true, force: true });
const out = join(OUT, 'wood');
mkdirSync(out, { recursive: true });
// Things that stand on the ground. Some pack images leave empty rows under the drawing, which would
// float it above the grass, so those rows are cut off: the picture's bottom is where it stands.
const STANDS = new Set(['chest-locked', 'chest-open', 'portal', 'statue', 'bush-1', 'bush-2', 'plant-1', 'plant-2',
  'fence', 'sign-right', 'sign-up', 'rock', 'lantern', 'spike']);
const emptyRowsBelow = async (png) => {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = info.height - 1; y >= 0; y--) {
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 20) return info.height - 1 - y;
  }
  return 0;
};
for (const [name, [file, scale]] of Object.entries(WOOD)) {
  const { width } = await sharp(file).metadata();
  let png = await sharp(file).resize({ width: Math.round(width * scale) }).png().toBuffer();
  const empty = STANDS.has(name) ? await emptyRowsBelow(png) : 0;
  if (empty > 0) {
    const { width: w, height: h } = await sharp(png).metadata();
    png = await sharp(png).extract({ left: 0, top: 0, width: w, height: h - empty }).png().toBuffer();
  }
  await sharp(png).png({ compressionLevel: 9 }).toFile(join(out, `${name}.png`));
}
// The minigun the battle cat can find, cut from the frame of him standing with it: the barrel and the
// gold housing, without his paws and chin, which are grey, white or red.
{
  const box = { left: 118, top: 115, width: 64, height: 35 };
  const allGunFrom = 146; // right of here, everything is gun
  const { data, info } = await sharp(join(ROOT, 'images', 'sprites', 'battle-cat', 'Idle (1).png')).extract(box).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, n = w * info.height, keep = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    if (a < 100) continue;
    if (p % w + box.left >= allGunFrom) { keep[p] = 1; continue; }
    const most = Math.max(r, g, b), least = Math.min(r, g, b);
    const metal = most < 85 || (r - b > 35 && r > 90);
    keep[p] = metal && least <= 200 && !(most - least < 22 && most >= 85) ? 1 : 0;
  }
  // Only its biggest piece: specks of his outline go.
  const piece = new Int32Array(n).fill(-1);
  let biggest = -1, biggestSize = 0;
  for (let start = 0, id = 0; start < n; start++, id++) {
    if (!keep[start] || piece[start] >= 0) continue;
    const stack = [start];
    piece[start] = id;
    let size = 0;
    while (stack.length) {
      const p = stack.pop();
      size += 1;
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < n && keep[q] && piece[q] < 0) { piece[q] = id; stack.push(q); }
      }
    }
    if (size > biggestSize) { biggest = id; biggestSize = size; }
  }
  for (let p = 0; p < n; p++) if (piece[p] !== biggest) data[p * 4 + 3] = 0;
  await sharp(data, { raw: info }).trim().png({ compressionLevel: 9 }).toFile(join(out, 'minigun.png'));
}

// The minigun's other ammunition (see data/adventure/ammo.js): an orange explosive round, recoloured
// from the pack's red one, which the gunners fire; a long green laser bolt; and a crate of each, a
// small wooden box with its round on it, and one for standard rounds.
const BULLETS = join(WORLDS, 'characters', 'gangsta-cats', 'Png', 'Bullets');
await sharp(join(BULLETS, 'Artboard 1 copy 2.png')).modulate({ hue: 32, brightness: 1.15 }).resize({ width: 54 }).png({ compressionLevel: 9 }).toFile(join(out, 'bullet-explosive.png'));
await sharp(join(BULLETS, 'Artboard 1 copy.png')).resize(72, 34, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(join(out, 'bullet-laser.png'));
for (const [kind, bullet] of [['standard', 'bullet'], ['explosive', 'bullet-explosive'], ['laser', 'bullet-laser']]) {
  const box = await sharp(join(out, 'box.png')).resize(48, 48).toBuffer();
  const round = await sharp(join(out, `${bullet}.png`)).resize({ width: 44 }).toBuffer();
  const { height } = await sharp(round).metadata();
  await sharp({ create: { width: 52, height: 52, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: box, left: 2, top: 4 }, { input: round, left: 4, top: Math.round(28 - height / 2) }])
    .png({ compressionLevel: 9 }).toFile(join(out, `ammo-${kind}.png`));
}

// The earth pillar that holds an island up, in three parts, so the scene can build one of any height
// from the island down to what's below it: the cap under the island, the middle, which repeats
// (every other copy upside down, so they always join), and the base standing on the ground.
// PILLAR in data/adventure/index.js has the heights of the cuts.
const roots = join(out, 'roots.png');
for (const [name, top, bottom] of [['pillar-cap', PILLAR.capFrom, PILLAR.middleFrom], ['pillar-middle', PILLAR.middleFrom, PILLAR.baseFrom], ['pillar-base', PILLAR.baseFrom, PILLAR.height]]) {
  const { width } = await sharp(roots).metadata();
  await sharp(roots).extract({ left: 0, top, width, height: bottom - top }).png({ compressionLevel: 9 }).toFile(join(out, `${name}.png`));
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
// The enemies and gunners, from the gangsta cats pack: each one's animations as a Phaser atlas (a
// grid of frames and a JSON list of where each frame is), keeping every step-th frame of the pack's.
const GANGSTA = join(ROOT, 'images', 'assets', 'worlds', 'characters', 'gangsta-cats', 'Png');
const ATLAS_COLUMNS = 10;

// frames: [{ name, file }]. crop: the part of each pack frame kept, which is resized to w x h.
async function writeAtlas(outDir, name, frames, crop, w, h) {
  const rows = Math.ceil(frames.length / ATLAS_COLUMNS);
  const atlas = { frames: {}, meta: { image: `${name}.png`, size: { w: w * Math.min(ATLAS_COLUMNS, frames.length), h: h * rows }, scale: '1' } };
  const pieces = await Promise.all(frames.map(async (frame, i) => {
    const x = (i % ATLAS_COLUMNS) * w;
    const y = Math.floor(i / ATLAS_COLUMNS) * h;
    atlas.frames[frame.name] = {
      frame: { x, y, w, h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h },
    };
    const input = await sharp(frame.file).extract({ left: crop.x, top: crop.y, width: crop.w, height: crop.h }).resize(w, h).toBuffer();
    return { input, left: x, top: y };
  }));
  await sharp({ create: { width: atlas.meta.size.w, height: atlas.meta.size.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(pieces).png({ compressionLevel: 9 }).toFile(join(outDir, `${name}.png`));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(atlas));
}

// Every step-th file of a pack folder, checking it has as many as expected.
function packFrames(dir, expected, step, prefix) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (files.length < expected) throw new Error(`${dir}: expected ${expected} frames, found ${files.length}`);
  return files.slice(0, expected).filter((_, i) => i % step === 0).map((file, i) => ({ name: `${prefix}-${i}`, file: join(dir, file) }));
}

const enemiesOut = join(OUT, 'enemies');
mkdirSync(enemiesOut, { recursive: true });
for (const [kind, enemy] of Object.entries(ENEMIES)) {
  const { frameW, frameH } = enemyLayout(kind);
  const frames = Object.entries(enemy.anims).flatMap(([anim, { folder, step }]) =>
    packFrames(join(GANGSTA, 'Enemies', enemy.source, folder), PACK_FRAMES[folder], step, anim));
  await writeAtlas(enemiesOut, kind, frames, enemy.crop, frameW, frameH);
}

const gunnersOut = join(OUT, 'gunners');
mkdirSync(gunnersOut, { recursive: true });
for (const [kind, gunner] of Object.entries(GUNNERS)) {
  const { frameW, frameH } = gunnerLayout(kind);
  const frames = Object.entries(gunner.anims).flatMap(([anim, { folder, frames: count, step }]) =>
    packFrames(join(GANGSTA, 'Characters', gunner.source, folder), count, step, anim));
  await writeAtlas(gunnersOut, kind, frames, gunner.crop, frameW, frameH);
}
// The explosion of an explosive round: only the middle of the pack's big frames, where it is.
const fxOut = join(OUT, 'fx');
mkdirSync(fxOut, { recursive: true });
{
  const { crop, size } = EXPLOSION;
  await writeAtlas(fxOut, 'explosion', packFrames(join(GANGSTA, EXPLOSION.folder), EXPLOSION.frames, EXPLOSION.step, 'explosion'),
    crop, size, Math.round(crop.h * (size / crop.w)));
}
// The muzzle flash, whole frames, scaled down.
await writeAtlas(gunnersOut, 'flash', packFrames(join(GANGSTA, FLASH.folder), FLASH.frames, FLASH.step, 'flash'),
  { x: 0, y: 0, ...FLASH.size }, Math.round(FLASH.size.w * FLASH.scale), Math.round(FLASH.size.h * FLASH.scale));

console.log(`Adventure art prepared in public/assets/adventure (${Object.keys(WOOD).length + 2} images, ${Object.keys(ENEMIES).length} enemies, ${Object.keys(GUNNERS).length} gunners)`);
