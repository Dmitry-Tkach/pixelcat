// Draws an adventure level as one picture, for designing it: the real tiles, ladders, pickups,
// enemies and gunners, scaled down. With --routes, every cell the cat can stand on gets a dot, and
// anything he can't reach is ringed in red (see systems/adventureRoutes.js).
// Run after npm run assets: node tools/adventure-preview.mjs <out.png> [level index] [--routes]
// A boss's test arena (data/adventure/bossArenas.js) is drawn by his name in place of the index,
// as in node tools/adventure-preview.mjs out.png troll1, bigger, with him standing in it.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADVENTURE_LEVELS, adventureArtWorld, adventurePath } from '../src/data/adventure/index.js';
import { drawbridgeCells } from '../src/systems/adventure/drawbridges.js';
import { caveShades } from '../src/systems/adventure/caveFill.js';
import { columnSpan } from '../src/systems/adventure/earthColumns.js';
import { pillarLayout } from '../src/systems/adventure/pillarLayout.js';
import { PILLAR_ART } from '../src/data/adventure/pillars.js';
import { stairBox } from '../src/systems/adventure/stairSteps.js';
import { FISH, fishAt } from '../src/data/adventure/fish.js';
import { BOSS_ARENAS } from '../src/data/adventure/bossArenas.js';
import { bossLayout, bossPath } from '../src/data/adventure/bosses.js';
import { enemyLayout } from '../src/data/adventure/enemies.js';
import { gunnerLayout } from '../src/data/adventure/gunners.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { TILE, readAdventureMap } from '../src/systems/adventureMap.js';
import { DECOR } from '../src/data/adventure/decor.js';
import { BACKDROPS } from '../src/data/adventure/backdrop.js';
import { placeDecor } from '../src/systems/adventure/decorPlacement.js';
import { waterRuns } from '../src/systems/adventure/water.js';
import { GATES } from '../src/data/adventure/gates.js';
import { portalPosts } from '../src/systems/adventure/gatePlacement.js';
import { TRAPS } from '../src/data/adventure/traps.js';
import { floorRow, guardianBall, guardianFireColumn, guardianGeometry, maceHook } from '../src/systems/adventure/trapLogic.js';
import { seatPlace, wheelHub, wheelWith } from '../src/systems/adventure/wheels.js';
import { MILL_SEAT, MILL_STAND, MILL_WHEEL, standScale } from '../src/data/adventure/millArt.js';
import { PTERO_LOOKS, birdHome } from '../src/data/adventure/birds.js';
import { existsSync } from 'node:fs';
import { rockPicture } from './rockPicture.mjs';

const [out, index = '0'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const routes = process.argv.includes('--routes');
const level = BOSS_ARENAS[index] ?? ADVENTURE_LEVELS[Number(index)];
const SCALE = level.boss ? 0.5 : 0.25; // an arena is small, so it's drawn bigger
const CELL = TILE * SCALE;
const layout = readAdventureMap(level.map);
const { rows, cols, tiles, ladders, objects } = layout;
// A world's own picture, or the one it borrows from the Wood world.
const art = (name) => join('public', adventurePath(adventureArtWorld(level.world, name), name));
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
// Behind the tiles: waterfalls, caves' dark insides, and the wheels' stands and wheels (Mill Falls).
// A tile no bigger than the space it fills (sharp can't tile a bigger one).
const fitTile = async (tile, w, h) => {
  const { width, height } = await sharp(tile).metadata();
  return width <= w && height <= h ? tile : sharp(tile).extract({ left: 0, top: 0, width: Math.min(width, w), height: Math.min(height, h) }).png().toBuffer();
};
const scaled = async (file, factor) => {
  const { width } = await sharp(file).metadata();
  return sharp(file).resize({ width: Math.max(1, Math.round(width * factor * SCALE)) }).toBuffer();
};
const at = async (input, x, y, ox, oy) => {
  const { width, height } = await sharp(input).metadata();
  return { input, left: Math.max(0, Math.round(x * SCALE - width * ox)), top: Math.max(0, Math.round(y * SCALE - height * oy)) };
};
const millArt = existsSync(art('mill-wheel'));
const fronts = [];
const at_ = (input, p) => at(input, p.x, p.y, 0.5, 0.5);
if (millArt) {
  // Rocks from the world's rock kit (tools/rockPicture.mjs draws them the game's way, at full size).
  for (const rock of level.rocks ?? []) {
    const picture = await rockPicture(rock, art, TILE);
    if (!picture) continue;
    const { width } = await sharp(picture.input).metadata();
    comps.push({ input: await sharp(picture.input).resize(Math.round(width * SCALE)).png().toBuffer(), left: Math.max(0, Math.round(picture.left * SCALE)), top: Math.max(0, Math.round(picture.top * SCALE)) });
  }
  // Pictures rising out of the water (a cliff the falls pour down): behind the falls, as in the game.
  for (const { picture, col, row, width, fromWater } of level.props ?? []) {
    if (!fromWater) continue;
    const { width: own } = await sharp(art(picture)).metadata();
    comps.push(await at(await scaled(art(picture), width ? width / own : 1), col * TILE + TILE / 2, (row + 1) * TILE, 0.5, 1));
  }
  for (const { col, top, bottom, veil, width: shown, foamAt = [] } of level.waterfalls ?? []) {
    const x = col * TILE + TILE / 2;
    // A soft head (the Autumn world's) or the mossy lip, as AdventureScenery draws them.
    const soft = existsSync(art('fall-head'));
    const ownW = (await sharp(art(veil ? 'fall-veil' : 'fall-middle')).metadata()).width;
    const width = shown ?? ownW;
    const headPicture = soft ? await sharp(art('fall-head')).resize(Math.round(width * SCALE), null, { fit: 'fill' }).png().toBuffer() : await scaled(art('fall-top'), 1);
    const lipH = (await sharp(headPicture).metadata()).height / SCALE;
    const flowTop = top * TILE + lipH * (soft ? 0.45 : 0.8);
    const flowH = Math.max(1, Math.round((bottom * TILE - flowTop) * SCALE));
    const flow = await sharp(art(veil ? 'fall-veil' : 'fall-middle')).resize(Math.round(width * SCALE), flowH, { fit: 'fill' }).ensureAlpha(veil ? 0.85 : 1).toBuffer();
    const pieces = [await at(flow, x, flowTop, 0.5, 0), await at(headPicture, x, top * TILE, 0.5, 0), await at(await scaled(art('fall-splash'), 1), x, bottom * TILE + 10, 0.5, 1)];
    for (const row of existsSync(art('fall-foam')) ? foamAt : []) {
      pieces.push(await at(await sharp(art('fall-foam')).resize(Math.round(width * 1.4 * SCALE)).png().toBuffer(), x, row * TILE + 4, 0.5, 1));
    }
    (veil ? fronts : comps).push(...pieces);
  }
  // Earth columns behind the level (AdventureScenery's columns): the world's column picture, stacked.
  const pillarKit = Object.values(PILLAR_ART).every((name) => existsSync(art(name)));
  const pillarSizes = {};
  if (pillarKit) for (const [part, name] of Object.entries(PILLAR_ART)) { const { width: w, height: h } = await sharp(art(name)).metadata(); pillarSizes[part] = { w, h }; }
  for (const column of level.columns ?? []) {
    if (pillarKit) {
      // As AdventureScenery draws them: the trunk the whole way, the flare and the foot over it.
      const { x, top, bottom, scale, flare, foot } = pillarLayout(column, level.map, TILE, pillarSizes);
      const k = scale * SCALE;
      const tw = Math.max(1, Math.round(pillarSizes.trunk.w * k)), th = Math.max(1, Math.round((bottom - top) * SCALE));
      const trunkTile = await sharp(art(PILLAR_ART.trunk)).resize(tw, Math.max(1, Math.round(pillarSizes.trunk.h * k))).png().toBuffer();
      const trunk = await sharp({ create: { width: tw, height: th, channels: 4, background: '#0000' } }).composite([{ input: await fitTile(trunkTile, tw, th), tile: true, left: 0, top: 0 }]).png().toBuffer();
      comps.push({ input: trunk, left: Math.round(x * SCALE - tw / 2), top: Math.round(top * SCALE) });
      const piece = async (name) => sharp(art(name)).resize(Math.max(1, Math.round(pillarSizes[name === PILLAR_ART.top ? 'top' : 'foot'].w * k))).png().toBuffer();
      if (flare) comps.push(await at(await piece(PILLAR_ART.top), x, top, 0.5, 0));
      if (foot) comps.push(await at(await piece(PILLAR_ART.foot), x, bottom, 0.5, 1));
      continue;
    }
    if (!existsSync(art(`column-${column.width}`))) continue;
    const { x, y, w, h } = columnSpan(column, level.map, TILE);
    const [pw, ph] = [Math.round(w * SCALE), Math.round(h * SCALE)];
    const piece = await sharp(art(`column-${column.width}`)).resize(pw, Math.round(CELL)).png().toBuffer();
    const input = await sharp({ create: { width: pw, height: ph, channels: 4, background: '#0000' } }).composite([{ input: await fitTile(piece, pw, ph), tile: true, left: 0, top: 0 }]).png().toBuffer();
    comps.push({ input, left: Math.round(x * SCALE), top: Math.round(y * SCALE) });
  }
  // A world's own cave wall picture, repeated, or a dark wash (systems/adventure/AdventureScenery.js).
  const caveWall = existsSync(art('cave-back')) ? await sharp(art('cave-back')).resize(Math.round(160 * SCALE)).png().toBuffer() : null;
  // The cave wall, fading at its mouths (caveShades); a fading cell drawn at its corners' mean alpha.
  const { runs: caveCells, fades: caveMouths } = caveShades(level.map, level.caves);
  for (const { row, from, to, see = 1 } of [...caveCells, ...caveMouths.map(({ col, row, alpha }) => ({ row, from: col, to: col, see: alpha.reduce((a, b) => a + b) / 4 }))]) {
    const [c0, r0] = [from, row];
    const w = Math.round((to - from + 1) * CELL), h = Math.round(CELL);
    const input = caveWall
      ? await sharp({ create: { width: w, height: h, channels: 4, background: '#0000' } }).composite([{ input: await fitTile(caveWall, w, h), tile: true, left: 0, top: 0 }]).png().toBuffer()
      : Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#0f1a12" fill-opacity="0.88"/></svg>`);
    const faded = see < 1 ? await sharp(input).ensureAlpha().composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * see)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }]).png().toBuffer() : input;
    comps.push({ input: faded, left: Math.round(c0 * CELL), top: Math.round(r0 * CELL) });
  }
  for (const options of level.wheels ?? []) {
    const wheel = wheelWith(options);
    const hub = wheelHub(wheel);
    const ground = floorRow(tiles, wheel.col, wheel.row + 1);
    const floorY = (Math.min(ground ?? Infinity, level.water?.row ?? Infinity, rows) + 0.5) * TILE;
    const scale = standScale(wheel.radius, floorY - hub.y);
    const { width: sw, height: sh } = await sharp(art('mill-stand')).metadata();
    const stand = await sharp(art('mill-stand')).resize(Math.round(sw * scale.x * SCALE), Math.round(sh * scale.y * SCALE), { fit: 'fill' }).toBuffer();
    comps.push(await at(stand, hub.x, hub.y, MILL_STAND.axle.x, MILL_STAND.axle.y));
    comps.push(await at(await scaled(art('mill-wheel'), (wheel.radius * TILE) / MILL_WHEEL.rimRadius), hub.x, hub.y, 0.5, 0.5));
  }
}
const strip = 'public/assets/adventure/' + level.world + '/tiles.png';
// Every tile in the strip (its width says how many: the plain tiles, variants and undersides).
const stripTiles = Math.floor((await sharp(strip).metadata()).width / TILE);
const tileImages = await Promise.all(Array.from({ length: stripTiles }, (_, i) => sharp(strip).extract({ left: i * TILE, top: 0, width: TILE, height: TILE }).resize(CELL, CELL).toBuffer()));
// The automatic decoration (data/adventure/decor.js): vines behind the tiles, plants in front.
const decor = placeDecor(layout, DECOR[level.world]);
const decorPiece = async ({ picture, x, y, hang, flip }) => {
  let input = await image(art(picture));
  if (flip) input = await sharp(input).flop().toBuffer();
  const { width, height } = await sharp(input).metadata();
  return { input, left: Math.max(0, Math.round(x * SCALE - width / 2)), top: Math.max(0, Math.round(y * SCALE - (hang ? 0 : height))) };
};
for (const item of decor.filter((d) => d.hang)) comps.push(await decorPiece(item));
// Islands drawn by a picture instead (level.hiddenTiles) aren't shown.
const hiddenTile = (c, r) => (level.hiddenTiles ?? []).some(({ cols: [from, to], row }) => r === row && c >= from && c <= to);
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (tiles[r][c] >= 0 && !hiddenTile(c, r)) comps.push({ input: tileImages[tiles[r][c]], left: c * CELL, top: r * CELL });
for (const item of decor.filter((d) => !d.hang)) comps.push(await decorPiece(item));
// The water in the bottomless gaps (data/adventure/water.js), from its surface down.
if (level.water) {
  for (const { from, to } of waterRuns(layout, level.water.row)) {
    const w = (to - from + 1) * CELL, h = (rows - level.water.row) * CELL;
    comps.push({ input: await sharp('public/assets/adventure/fx/water/water.png').resize(Math.round(w), Math.round(h), { fit: 'fill' }).png().toBuffer(), left: Math.round(from * CELL), top: Math.round(level.water.row * CELL - 2) });
  }
}
const ladder = await sharp(art('ladder')).resize(CELL, CELL).toBuffer();
const vine = await sharp(art('vine')).resize(CELL, CELL).toBuffer();
const vineCells = new Set((level.vines ?? []).map(({ col, row }) => `${col},${row}`));
for (const { col, row } of ladders) comps.push({ input: vineCells.has(`${col},${row}`) ? vine : ladder, left: col * CELL, top: row * CELL });
// Drawbridges (systems/adventure/drawbridges.js): the switch, and the bridge drawn faint, as it's not
// there until the switch is hit.
for (const bridge of level.drawbridges ?? []) {
  const pictureOf = existsSync(art(bridge.look ?? 'drawbridge')) ? art(bridge.look ?? 'drawbridge') : art('bridge');
  const plank = await sharp(pictureOf).resize(CELL, null).ensureAlpha(0.45).png().toBuffer();
  const faint = await sharp(plank).composite([{ input: Buffer.from([255, 255, 255, 115]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }]).png().toBuffer();
  for (const { col, row } of drawbridgeCells(bridge)) comps.push({ input: bridge.switch ? faint : plank, left: col * CELL, top: row * CELL });
  if (bridge.switch) comps.push({ input: await sharp(art('switch-off')).resize(CELL, CELL).toBuffer(), left: bridge.switch.col * CELL, top: bridge.switch.row * CELL });
}

const ICON = {
  coin: 'coin-1', gem: 'gem', heart: 'heart', key: 'key', rage: 'mushroom', weapon: 'minigun',
  'ammo-standard': 'ammo-standard', 'ammo-explosive': 'ammo-explosive', 'ammo-laser': 'ammo-laser', 'ammo-freeze': 'ammo-freeze', 'ammo-fire': 'ammo-fire',
  bonus: 'bonus', box: 'box', stone: 'stone', spike: 'spike', chest: 'chest-locked', checkpoint: 'lantern', portal: 'portal',
  'silver-key': 'silver-key', 'silver-chest': 'chest-silver-locked', leaves: 'leaves', cracked: 'cracked',
};
// The gates (data/adventure/gates.js), each put together into one picture at its size in the game:
// a gate with its swirl in its hole, and the flag post with its flag raised.
const gates = GATES[level.world];
const tall = async (name, height) => sharp(art(name)).resize({ height: Math.round(height * SCALE) }).png().toBuffer();
const size = async (input) => sharp(input).metadata();
async function gateWithSwirl({ hole, height }, frameName, swirlName) {
  const frame = await tall(frameName, height);
  const { width: w, height: h } = await size(frame);
  const across = Math.round(hole.size * w);
  const swirl = await sharp(art(swirlName)).resize(across, across).toBuffer();
  const left = Math.round(hole.x * w - across / 2), top = Math.round(hole.y * h - across / 2);
  return sharp({ create: { width: w, height: h, channels: 4, background: '#0000' } })
    .composite([{ input: swirl, left: Math.max(0, left), top: Math.max(0, top) }, { input: frame, left: 0, top: 0 }]).png().toBuffer();
}
async function flagPost({ height, up, pole, flag }) {
  const poleImage = await tall(pole, height);
  const { width: w, height: h, } = await size(poleImage);
  const flagImage = await sharp(art(up)).resize({ width: Math.round((await size(art(up))).width * h / (await size(art(pole))).height) }).toBuffer();
  const fw = (await size(flagImage)).width, fx = Math.round(flag.x * w);
  const half = Math.ceil(Math.max(w / 2, fx + fw - w / 2)), poleLeft = Math.round(half - w / 2);
  return sharp({ create: { width: half * 2, height: h, channels: 4, background: '#0000' } })
    .composite([{ input: poleImage, left: poleLeft, top: 0 }, { input: flagImage, left: poleLeft + fx, top: Math.round(flag.upY * h) }]).png().toBuffer();
}
const GATE_PICTURES = gates && {
  start: await gateWithSwirl(gates.start, gates.start.ring, gates.start.swirl),
  checkpoint: await flagPost(gates.checkpoint),
  portal: await gateWithSwirl(gates.portal, gates.portal.arch, gates.portal.swirl),
  post: await tall(gates.portal.post, gates.portal.postHeight),
};
const placeAt = async (input, x, row) => {
  const { width, height } = await size(input);
  comps.push({ input, left: Math.max(0, Math.round(x * SCALE - width / 2)), top: Math.max(0, Math.round((row + 1) * CELL - height)) });
};
const place = async (input, col, row, bottom = false) => {
  const { width, height } = await sharp(input).metadata();
  const left = Math.round(col * CELL + CELL / 2 - width / 2);
  const top = bottom ? Math.round((row + 1) * CELL - height) : Math.round(row * CELL + CELL / 2 - height / 2);
  comps.push({ input, left: Math.max(0, left), top: Math.max(0, top) });
};
for (const o of objects) {
  if (GATE_PICTURES?.[o.type]) {
    await placeAt(GATE_PICTURES[o.type], o.col * TILE + TILE / 2, o.row);
    if (o.type === 'portal') for (const x of portalPosts(layout, o, gates.portal)) await placeAt(GATE_PICTURES.post, x, o.row);
  } else if (o.type === 'enemy') await place(await atlasFrame('enemies', o.kind, 'idle-0', enemyLayout(o.kind).frameW / SCALE * SCALE), o.col, o.row, true);
  else if (o.type === 'gunner') await place(await atlasFrame('gunners', o.kind, 'idle-0', gunnerLayout(o.kind).frameW), o.col, o.row, true);
  else if (o.type === 'start') await place(await sharp({ create: { width: CELL, height: CELL * 1.5, channels: 4, background: '#3a7bff' } }).png().toBuffer(), o.col, o.row, true);
  else if (ICON[o.type]) await place(await image(art(ICON[o.type])), o.col, o.row, ['spike', 'chest', 'silver-chest', 'checkpoint', 'portal'].includes(o.type));
}
// The moving traps (data/adventure/traps.js), drawn as they are at rest: the mace hanging straight
// down, the crusher at the top with a dotted line to where it slams, each idol with a dotted line
// along its darts' path.
const trapRules = TRAPS[level.world];
const dots = async (x0, y0, x1, y1, colour) => {
  const len = Math.hypot(x1 - x0, y1 - y0) * SCALE;
  for (let d = 0; d < len; d += 8) {
    const t = d / len;
    comps.push({ input: await sharp({ create: { width: 3, height: 3, channels: 4, background: colour } }).png().toBuffer(), left: Math.round((x0 + (x1 - x0) * t) * SCALE), top: Math.round((y0 + (y1 - y0) * t) * SCALE) });
  }
};
for (const trap of level.traps ?? []) {
  const r = trapRules[trap.kind];
  const x = trap.col * TILE + TILE / 2, feet = (trap.row + 1) * TILE;
  const flip = async (input) => ((trap.facing ?? 1) < 0 ? sharp(input).flop().toBuffer() : input);
  if (trap.kind === 'mace') {
    if (!trap.hanging) await placeAt(await flip(await image(art(r.gallows))), x, trap.row);
    const hook = maceHook(trap, r);
    const chain = trap.chain ?? r.chain;
    const link = await image(art(r.link));
    const { width: lw, height: lh } = await size(link);
    for (let y = 0; y < chain; y += lh / SCALE * 0.9) comps.push({ input: link, left: Math.round(hook.x * SCALE - lw / 2), top: Math.round((hook.y + y) * SCALE) });
    const ball = await image(art(r.ball));
    comps.push({ input: ball, left: Math.round(hook.x * SCALE - (await size(ball)).width / 2), top: Math.round((hook.y + chain) * SCALE) });
  } else if (trap.kind === 'crusher') {
    const block = await image(art(r.calm));
    const { width, height } = await size(block);
    const top = trap.row * TILE;
    const floor = floorRow(tiles, trap.col, trap.row) * TILE;
    await dots(x, top + height / SCALE, x, floor, '#ff4040');
    comps.push({ input: block, left: Math.round(x * SCALE - width / 2), top: Math.round(top * SCALE) });
  } else if (trap.kind === 'idol') {
    const idol = await flip(await image(art(r.calm)));
    await placeAt(idol, x, trap.row);
    const facing = trap.facing ?? 1;
    const mouthY = feet - r.height + r.mouth.y * r.height;
    await dots(x + facing * r.height * 0.4, mouthY, x + facing * (r.height * 0.4 + r.dartRange), mouthY, '#ffe040');
  } else if (trap.kind === 'mushroom') {
    await placeAt(await image(art(r.calm)), x, trap.row);
  } else if (trap.kind === 'guardian') {
    // His body awake, and each arm turned to hang its chain straight down, with its chain and ball.
    const geo = guardianGeometry(trap, r);
    const body = await image(art(r.awake));
    const { width: bw, height: bh } = await size(body);
    comps.push({ input: body, left: Math.round(geo.x * SCALE - bw / 2), top: Math.round(geo.feet * SCALE - bh) });
    for (const [i, arm] of geo.arms.entries()) {
      const link = await image(art(r.link));
      const { width: lw, height: lh } = await size(link);
      const end = { x: arm.socket.x, y: arm.socket.y + arm.armLength };
      for (let d = 0; d < geo.chain; d += (lh / SCALE) * 0.9) comps.push({ input: link, left: Math.round(end.x * SCALE - lw / 2), top: Math.round((end.y + d) * SCALE) });
      const ball = await image(art(r.ball));
      comps.push({ input: ball, left: Math.round(end.x * SCALE - (await size(ball)).width / 2), top: Math.round((end.y + geo.chain) * SCALE) });
      // The arm, turned about its middle; then placed so its shoulder lands on the socket.
      const pic = await image(art(r.arms[i]));
      const { width: w, height: h } = await size(pic);
      const turned = await sharp(pic).rotate((arm.restTurn * 180) / Math.PI, { background: '#0000' }).png().toBuffer();
      const { width: tw, height: th } = await size(turned);
      const { shoulder } = r.armJoints[i];
      const px = (shoulder.x - 0.5) * w, py = (shoulder.y - 0.5) * h, c = Math.cos(arm.restTurn), sn = Math.sin(arm.restTurn);
      const sx = tw / 2 + px * c - py * sn, sy = th / 2 + px * sn + py * c;
      comps.push({ input: turned, left: Math.round(arm.socket.x * SCALE - sx), top: Math.round(arm.socket.y * SCALE - sy) });
      if (i === 0) {
        // His fire's column, from his mouth down to the path, in orange dots.
        const mouthCol = Math.floor((geo.left + r.fire.mouth.x * r.bodySize.w) / TILE);
        const column = guardianFireColumn(trap, r, (floorRow(tiles, mouthCol, trap.row + 2) ?? rows) * TILE);
        await dots(column.left, column.top, column.left, column.bottom, '#ff9a20');
        await dots(column.right, column.top, column.right, column.bottom, '#ff9a20');
      }
      // A dotted arc where the ball swings, out to its widest.
      for (let a = 0; a <= r.swingDeg; a += 5) {
        const at = guardianBall(arm, (a * Math.PI) / 180);
        comps.push({ input: await sharp({ create: { width: 3, height: 3, channels: 4, background: '#ff4040' } }).png().toBuffer(), left: Math.round(at.x * SCALE), top: Math.round(at.y * SCALE) });
      }
    }
  }
}
// The boss, standing on the floor at his column, in his first idle frame.
if (level.boss) {
  const { kind, col } = level.boss;
  const L = bossLayout(kind);
  const atlas = JSON.parse(readFileSync(`public/${bossPath(kind)}.json`, 'utf8'));
  const page = atlas.textures.find((t) => t.frames.some((f) => f.filename === 'idle-0'));
  const f = page.frames.find((fr) => fr.filename === 'idle-0').frame;
  const frame = await sharp(`public/assets/adventure/bosses/${page.image}`).extract({ left: f.x, top: f.y, width: f.w, height: f.h })
    .resize({ width: Math.round(L.frameW * SCALE) }).toBuffer();
  let floor = rows - 1; // the top of the ground at the bottom of his column, under any islands
  while (floor > 0 && tiles[floor - 1][col] >= 0) floor -= 1;
  comps.push({ input: frame, left: Math.round(col * CELL + CELL / 2 - L.feetX * SCALE), top: Math.max(0, Math.round(floor * CELL - L.feetY * SCALE)) });
}
// Stairs (systems/adventure/stairSteps.js): the staircase picture over its box.
for (const flight of level.stairs ?? []) {
  const { left, right, top, bottom } = stairBox(flight, TILE);
  const picture = art(flight.dir > 0 ? 'stairs-up-right' : 'stairs-up-left');
  if (!existsSync(picture)) continue;
  comps.push({ input: await sharp(picture).resize(Math.round((right - left) * SCALE), Math.round((bottom - top) * SCALE), { fit: 'fill' }).png().toBuffer(), left: Math.round(left * SCALE), top: Math.round(top * SCALE) });
}
// Moving logs: where each starts, and a dotted line along its path.
const plank = await sharp(art('bridge')).resize(CELL, CELL).toBuffer();
for (const { col, row, width = 3, across = 0, up = 0, picture } of level.movers ?? []) {
  // A log with its own picture (the moving stone block), or planks.
  if (picture) comps.push({ input: await sharp(art(picture)).resize(Math.round(width * CELL), Math.round(CELL), { fit: 'fill' }).png().toBuffer(), left: Math.round(col * CELL), top: Math.round(row * CELL) });
  else for (let w = 0; w < width; w++) comps.push({ input: plank, left: Math.round((col + w) * CELL), top: Math.round(row * CELL) });
  const x0 = (col + width / 2) * CELL, y0 = (row + 0.5) * CELL, x1 = x0 + across * CELL, y1 = y0 - up * CELL;
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * CELL}" height="${rows * CELL}"><path d="M${x0} ${y0} L${x1} ${y1}" stroke="#ffe066" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${x1}" cy="${y1}" r="3" fill="#ffe066"/></svg>`), left: 0, top: 0 });
}
// Water wheels: the rim, spokes to the seats, and each seat where it starts, its top on the rim.
for (const options of millArt ? [] : level.wheels ?? []) {
  const wheel = wheelWith(options);
  const hub = wheelHub(wheel);
  const seats = Array.from({ length: wheel.seats }, (_, i) => seatPlace(wheel, i, 0));
  const r = wheel.radius * TILE * SCALE, hx = hub.x * SCALE, hy = hub.y * SCALE;
  const spokes = seats.map(({ x, y }) => `<path d="M${hx} ${hy} L${x * SCALE} ${y * SCALE}" stroke="#8a5a2b" stroke-width="3"/>`).join('');
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * CELL}" height="${rows * CELL}"><circle cx="${hx}" cy="${hy}" r="${r}" fill="none" stroke="#6b4423" stroke-width="4"/>${spokes}<circle cx="${hx}" cy="${hy}" r="8" fill="#8b8f86"/><circle cx="${hx}" cy="${hy}" r="3" fill="#7dff6a"/></svg>`), left: 0, top: 0 });
  for (const { x, y } of seats) {
    for (let w = 0; w < wheel.seatWidth; w++) {
      comps.push({ input: plank, left: Math.round((x / TILE - wheel.seatWidth / 2 + w) * CELL), top: Math.round((y / TILE) * CELL) });
    }
  }
}
// The wheels' seats, where each starts (Mill Falls' art), and the props, then what's in front.
if (millArt) {
  const seat = await scaled(art('mill-seat'), 1);
  for (const options of level.wheels ?? []) {
    const wheel = wheelWith(options);
    for (let i = 0; i < wheel.seats; i++) {
      const { x, y } = seatPlace(wheel, i, 0);
      comps.push(await at(seat, x, y - MILL_SEAT.top, 0.5, 0));
    }
  }
  for (const { picture, col, row, hang, front, width, spinMs, glow, stack, fromWater, dx = 0, dy = 0 } of level.props ?? []) {
    if (fromWater) continue; // drawn behind the falls
    // A stacked picture (a pier's post): repeated up `stack` rows, at its own width.
    if (stack) {
      const piece = await scaled(art(picture), 1);
      const { width: pw } = await sharp(piece).metadata();
      const h = Math.round(stack * CELL);
      const column = await sharp({ create: { width: pw, height: h, channels: 4, background: '#0000' } }).composite([{ input: await fitTile(piece, pw, h), tile: true, left: 0, top: 0 }]).png().toBuffer();
      comps.push({ input: column, left: Math.round((col * TILE + TILE / 2) * SCALE - pw / 2), top: Math.round((row + 1) * CELL - h) });
      continue;
    }
    const { width: own, height: ownH } = await sharp(art(picture)).metadata();
    // A lantern's warm glow (AdventureScenery's LANTERN_GLOW), under it.
    if (glow) {
      const r = Math.round(150 * SCALE), cy = (hang ? row * TILE + ownH * 0.72 : (row + 1) * TILE - ownH * 0.8) * SCALE;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r * 2}" height="${r * 2}"><defs><radialGradient id="g"><stop offset="0" stop-color="#ffa63d" stop-opacity="0.6"/><stop offset="0.35" stop-color="#ffa63d" stop-opacity="0.27"/><stop offset="1" stop-color="#ffa63d" stop-opacity="0"/></radialGradient></defs><circle cx="${r}" cy="${r}" r="${r}" fill="url(#g)"/></svg>`;
      comps.push({ input: Buffer.from(svg), left: Math.max(0, Math.round((col * TILE + TILE / 2) * SCALE - r)), top: Math.max(0, Math.round(cy - r)), blend: 'screen' });
    }
    const scaledPicture = await scaled(art(picture), width ? width / own : 1);
    const piece = spinMs
      ? await at(scaledPicture, col * TILE + TILE / 2, row * TILE + TILE / 2, 0.5, 0.5)
      : await at(scaledPicture, col * TILE + TILE / 2 + dx, (hang ? row * TILE : (row + 1) * TILE) + dy, 0.5, hang ? 0 : 1);
    (front ? fronts : comps).push(piece);
  }
  comps.push(...fronts);
}
// Leaping fish (data/adventure/fish.js): each one's leap dotted, and the fish at its top.
if (level.fish?.length && level.water) {
  const surfaceY = level.water.row * TILE;
  for (const fish of level.fish) {
    const points = Array.from({ length: 17 }, (_, i) => fishAt({ ...fish, phaseMs: 0 }, (FISH.leapMs * i) / 16 * 0.999, surfaceY, TILE));
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${(p.x * SCALE).toFixed(1)} ${(p.y * SCALE).toFixed(1)}`).join(' ');
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * CELL}" height="${rows * CELL}"><path d="${path}" stroke="#ff9a3c" stroke-width="2" stroke-dasharray="4 3" fill="none"/></svg>`), left: 0, top: 0 });
    const top = fishAt({ ...fish, phaseMs: 0 }, FISH.leapMs / 2, surfaceY, TILE);
    comps.push(await at(await scaled(art('fish-1'), 1), top.x, top.y, 0.5, 0.5));
  }
}
// Pterodactyls: where each waits, and a patrolling one's beat dotted.
if (existsSync(art('ptero-fly-0'))) {
  // Each bird in its own look (data/adventure/birds.js, PTERO_LOOKS): the owl, or a pterodactyl.
  const lookOf = async (look) => scaled(art(`${PTERO_LOOKS[look] ?? PTERO_LOOKS.orange}-fly-0`), 1);
  for (const bird of level.birds ?? []) {
    const home = birdHome(bird);
    if (bird.patrol) {
      const x0 = (home.x - bird.patrol * TILE) * SCALE, x1 = (home.x + bird.patrol * TILE) * SCALE, y = home.y * SCALE;
      comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * CELL}" height="${rows * CELL}"><path d="M${x0} ${y} L${x1} ${y}" stroke="#ff7a3c" stroke-width="2" stroke-dasharray="5 4"/></svg>`), left: 0, top: 0 });
    }
    comps.push(await at_(await lookOf(bird.look), home));
  }
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
// The world's backmost backdrop layer (data/adventure/backdrop.js), stretched behind the whole level.
const back = await sharp(art((BACKDROPS[level.world] ?? BACKDROPS.wood).layers[0].picture)).resize({ height: H, width: W, fit: 'cover' }).toBuffer();
await sharp({ create: { width: W, height: H, channels: 4, background: level.sky ?? '#8fd18f' } })
  .composite([{ input: back, left: 0, top: 0 }, ...comps]).png().toFile(out);
console.log(`${level.title}: ${cols} x ${rows} cells, drawn to ${out}`);
