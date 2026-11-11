// Draws an adventure level as one picture, for designing it: the real tiles, ladders, pickups,
// enemies and gunners, scaled down. With --routes, every cell the cat can stand on gets a dot, and
// anything he can't reach is ringed in red (see systems/adventureRoutes.js).
// Run after npm run assets: node tools/adventure-preview.mjs <out.png> [level index] [--routes]
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADVENTURE_LEVELS, adventurePath } from '../src/data/adventure/index.js';
import { enemyLayout } from '../src/data/adventure/enemies.js';
import { gunnerLayout } from '../src/data/adventure/gunners.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { TILE, readAdventureMap } from '../src/systems/adventureMap.js';

const [out, index = '0'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const routes = process.argv.includes('--routes');
const level = ADVENTURE_LEVELS[Number(index)];
const SCALE = 0.25;
const CELL = TILE * SCALE;
const { rows, cols, tiles, ladders, objects } = readAdventureMap(level.map);
const art = (name) => join('public', adventurePath(level.world, name));
const image = async (file, scale = SCALE) => {
  const { width } = await sharp(file).metadata();
  return sharp(file).resize({ width: Math.max(1, Math.round(width * scale)) }).toBuffer();
};
const atlasFrame = async (folder, kind, frame, w) => {
  const atlas = JSON.parse(readFileSync(`public/assets/adventure/${folder}/${kind}.json`, 'utf8'));
  const f = atlas.frames[frame].frame;
  return sharp(`public/assets/adventure/${folder}/${kind}.png`).extract({ left: f.x, top: f.y, width: f.w, height: f.h }).resize({ width: Math.round(w * SCALE) }).toBuffer();
};

const comps = [];
const strip = 'public/assets/adventure/' + level.world + '/tiles.png';
const tileImages = await Promise.all(Array.from({ length: 10 }, (_, i) => sharp(strip).extract({ left: i * TILE, top: 0, width: TILE, height: TILE }).resize(CELL, CELL).toBuffer()));
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (tiles[r][c] >= 0) comps.push({ input: tileImages[tiles[r][c]], left: c * CELL, top: r * CELL });
const ladder = await sharp(art('ladder')).resize(CELL, CELL).toBuffer();
for (const { col, row } of ladders) comps.push({ input: ladder, left: col * CELL, top: row * CELL });

const ICON = {
  coin: 'coin-1', gem: 'gem', heart: 'heart', key: 'key', rage: 'mushroom', weapon: 'minigun',
  'ammo-standard': 'ammo-standard', 'ammo-explosive': 'ammo-explosive', 'ammo-laser': 'ammo-laser',
  bonus: 'bonus', box: 'box', stone: 'stone', spike: 'spike', chest: 'chest-locked', checkpoint: 'lantern', portal: 'portal',
  'silver-key': 'silver-key', 'silver-chest': 'chest-silver-locked', leaves: 'leaves',
};
const place = async (input, col, row, bottom = false) => {
  const { width, height } = await sharp(input).metadata();
  const left = Math.round(col * CELL + CELL / 2 - width / 2);
  const top = bottom ? Math.round((row + 1) * CELL - height) : Math.round(row * CELL + CELL / 2 - height / 2);
  comps.push({ input, left: Math.max(0, left), top: Math.max(0, top) });
};
for (const o of objects) {
  if (o.type === 'enemy') await place(await atlasFrame('enemies', o.kind, 'idle-0', enemyLayout(o.kind).frameW / SCALE * SCALE), o.col, o.row, true);
  else if (o.type === 'gunner') await place(await atlasFrame('gunners', o.kind, 'idle-0', gunnerLayout(o.kind).frameW), o.col, o.row, true);
  else if (o.type === 'start') await place(await sharp({ create: { width: CELL, height: CELL * 1.5, channels: 4, background: '#3a7bff' } }).png().toBuffer(), o.col, o.row, true);
  else if (ICON[o.type]) await place(await image(art(ICON[o.type])), o.col, o.row, ['spike', 'chest', 'silver-chest', 'checkpoint', 'portal'].includes(o.type));
}
// Moving logs: where each starts, and a dotted line along its path.
const plank = await sharp(art('bridge')).resize(CELL, CELL).toBuffer();
for (const { col, row, width = 3, across = 0, up = 0 } of level.movers ?? []) {
  for (let w = 0; w < width; w++) comps.push({ input: plank, left: (col + w) * CELL, top: row * CELL });
  const x0 = (col + width / 2) * CELL, y0 = (row + 0.5) * CELL, x1 = x0 + across * CELL, y1 = y0 - up * CELL;
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * CELL}" height="${rows * CELL}"><path d="M${x0} ${y0} L${x1} ${y1}" stroke="#ffe066" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${x1}" cy="${y1}" r="3" fill="#ffe066"/></svg>`), left: 0, top: 0 });
}

if (routes) {
  const { reached, unreachable } = adventureRoutes(level);
  const dot = await sharp({ create: { width: 4, height: 4, channels: 4, background: '#1e7bff' } }).png().toBuffer();
  for (const cell of reached) {
    const [c, r] = cell.split(',').map(Number);
    comps.push({ input: dot, left: c * CELL + CELL / 2 - 2, top: r * CELL + CELL - 6 });
  }
  const ring = Buffer.from(`<svg width="${CELL * 2}" height="${CELL * 2}"><circle cx="${CELL}" cy="${CELL}" r="${CELL - 3}" fill="none" stroke="#ff2020" stroke-width="3"/></svg>`);
  for (const o of unreachable) comps.push({ input: ring, left: Math.max(0, o.col * CELL - CELL / 2), top: Math.max(0, o.row * CELL - CELL / 2) });
}

const W = cols * CELL, H = rows * CELL;
const back = await sharp(art('back-far')).resize({ height: H, width: W, fit: 'cover' }).toBuffer();
await sharp({ create: { width: W, height: H, channels: 4, background: level.sky ?? '#8fd18f' } })
  .composite([{ input: back, left: 0, top: 0 }, ...comps]).png().toFile(out);
console.log(`${level.title}: ${cols} x ${rows} cells, drawn to ${out}`);
