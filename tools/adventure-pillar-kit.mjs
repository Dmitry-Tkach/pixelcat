// Cuts a world's earth pillar kit (data/adventure/pillars.js, PILLAR_KITS) from the owner's sheet
// into public/assets/adventure/<world>, for systems/adventure/pillarLayout.js:
// - each piece at PILLAR.cutScale of its drawing (the biggest a pillar is shown), haze cleared,
//   cropped to the drawing, so a flare's width is its top's and a foot's its bottom's;
// - the trunk made to loop top to bottom where it matches itself best;
// - all of it moved to the colour of the world's ground (its soil tile), a little darker, as the
//   pillars stand behind the level, keeping its own light and shade;
// - the flare's bottom and the foot's top faded, so they melt into the trunk behind them.
// Run: node tools/adventure-pillar-kit.mjs (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PILLAR, PILLAR_ART, PILLAR_KITS } from '../src/data/adventure/pillars.js';
import { readSheet } from './sheetPieces.mjs';
import { fade, looped, matched, rockColour, save, scaled } from './kitPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BEHIND = 0.88; // brightness against the ground's, as the pillars stand behind the level

for (const [world, kit] of Object.entries(PILLAR_KITS)) {
  const file = join(ROOT, 'images', 'levels', world, `${kit.sheet}.png`);
  const OUT = join(ROOT, 'public', 'assets', 'adventure', world);
  if (!existsSync(file)) { console.log(`${world}: no ${kit.sheet}.png yet`); continue; }
  mkdirSync(OUT, { recursive: true });
  const found = await readSheet(file, kit.pieces);
  for (const name of Object.keys(found)) found[name] = await scaled(found[name], PILLAR.cutScale);
  // The ground's colour: its soil tile, the earth inside the ground.
  const soilFile = join(OUT, 'soil.png');
  const { data, info } = await sharp(soilFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ground = rockColour([{ pixels: data, w: info.width, h: info.height }]);
  // Only its colour is the ground's: it keeps the drawing's own light and shade (its roots, stones).
  const own = rockColour(Object.values(found));
  const target = { mean: ground.mean.map((v) => v * BEHIND), spread: own.spread };
  const { piece: trunk, how } = looped(found[PILLAR_ART.trunk], false);
  const top = found[PILLAR_ART.top], foot = found[PILLAR_ART.foot];
  fade(top, ['bottom'], PILLAR.fade);
  fade(foot, ['top'], PILLAR.fade);
  for (const [name, p] of [[PILLAR_ART.top, top], [PILLAR_ART.trunk, trunk], [PILLAR_ART.foot, foot]]) {
    await save(matched(p, own, target), join(OUT, `${name}.png`));
    console.log(`${world} ${name}: ${p.w} x ${p.h}${name === PILLAR_ART.trunk ? `, ${how}` : ''}`);
  }
}
