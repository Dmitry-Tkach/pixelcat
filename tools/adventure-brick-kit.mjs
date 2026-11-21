// Cuts a world's stone brick kit (data/adventure/bricks.js, BRICK_KITS) from the owner's sheet into
// public/assets/adventure/<world>, ready for systems/adventure/AdventureBricks.js:
// - every piece at the kit's scale, smaller than drawn, with ChatGPT's haze cleared;
// - the fill cut from inside its soft edge and looped both ways, so it repeats with no line;
// - the top strip looped side to side, its surface at BRICK.lip; a side strip from the first narrow
//   column under its mossy cap, looped top to bottom, its outer side line at BRICK.out; its cap (that
//   mossy top) cut as its own piece. They're solid courses of stone laid over the fill's edges, with
//   their own outline, as masonry ends: faded, their bricks showed through the fill's as ghosts;
// - the pillar, its trunk pillarWidth px wide, cut in three: its head (surface at lip), its trunk
//   (looped) and its wet foot;
// - the loose cap stone as a ledge, its surface at lip.
// Run: node tools/adventure-brick-kit.mjs (part of npm run assets).
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRICK, BRICK_ART, BRICK_KITS } from '../src/data/adventure/bricks.js';
import { readSheet } from './sheetPieces.mjs';
import { crop, fade, flipped, leftOutline, looped, placed, save, scaled, surfaceRow } from './kitPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIDE_CAP = 0.11; // the share of a narrow column at its top that is its mossy cap
const FILL_EDGE = 10; // px (as cut) round the fill's edge that are its soft outline, cut off

// A piece padded (or cut) at its top so its surface, measured over columns x0..x1, is `lip` down.
const surfaceAt = (p, x0 = 0, x1 = p.w - 1) => { const s = surfaceRow(p, x0, x1); return placed(p, p.w, p.h - s + BRICK.lip, 0, BRICK.lip - s); };
// A piece's left side line at `out` from its left edge.
const sideAt = (p) => { const o = Math.round(leftOutline(p)); return placed(p, p.w - o + BRICK.out, p.h, BRICK.out - o, 0); };

for (const [world, kit] of Object.entries(BRICK_KITS)) {
  const file = join(ROOT, 'images', 'levels', world, `${kit.sheet}.png`);
  const OUT = join(ROOT, 'public', 'assets', 'adventure', world);
  if (!existsSync(file)) { console.log(`${world}: no ${kit.sheet}.png yet`); continue; }
  mkdirSync(OUT, { recursive: true });
  const drawn = await readSheet(file, kit.pieces);
  const p = {};
  for (const name of Object.keys(drawn)) p[name] = await scaled(drawn[name], kit.scale);
  const out = async (name, piece, note = '') => { await save(piece, join(OUT, `${name}.png`)); console.log(`${world} ${name}: ${piece.w} x ${piece.h}${note}`); };

  { // The fill: its soft edge cut off, looped side to side, then top to bottom.
    const f = p.fill;
    const across = looped(crop(f, FILL_EDGE, FILL_EDGE, f.w - FILL_EDGE * 2, f.h - FILL_EDGE * 2), true);
    const down = looped(across.piece, false);
    await out(BRICK_ART.fill, down.piece, `, across ${across.how}; down ${down.how}`);
  }
  { // The top: looped, surface at lip.
    const { piece, how } = looped(p.top, true);
    await out(BRICK_ART.top, surfaceAt(piece), `, ${how}`);
  }
  { // The side and its cap, from the first narrow column.
    const col = p.sideA;
    const cap = Math.round(col.h * SIDE_CAP);
    const { piece, how } = looped(crop(col, 0, cap, col.w, col.h - cap), false);
    await out(BRICK_ART.side, sideAt(piece), `, ${how}`);
    const head = sideAt(surfaceAt(crop(col, 0, 0, col.w, cap * 2)));
    fade(head, ['bottom'], BRICK.fade); // it melts into the side strip under it
    await out(BRICK_ART.sideCap, head);
  }
  { // The pillar, its trunk (measured across its middle rows) pillarWidth wide: head, trunk, foot.
    const d = drawn.pillar, y0 = Math.round(d.h * 0.4), y1 = Math.round(d.h * 0.6);
    const trunkW = d.w - leftOutline(d, y0, y1) - leftOutline(flipped(d), y0, y1);
    const pillar = await scaled(d, kit.pillarWidth / trunkW);
    const headH = Math.round(pillar.h * BRICK.pillarHead), footH = Math.round(pillar.h * BRICK.pillarFoot);
    await out(BRICK_ART.pillarHead, surfaceAt(crop(pillar, 0, 0, pillar.w, headH)));
    const { piece, how } = looped(crop(pillar, 0, headH, pillar.w, pillar.h - headH - footH), false);
    await out(BRICK_ART.pillar, piece, `, ${how}`);
    await out(BRICK_ART.pillarFoot, crop(pillar, 0, pillar.h - footH, pillar.w, footH));
  }
  await out(BRICK_ART.ledge, surfaceAt(p.ledge));
}
