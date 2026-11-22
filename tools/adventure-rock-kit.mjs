// Cuts a world's rock kit (data/adventure/rocks.js, ROCK_KITS) from the owner's four sheets into
// public/assets/adventure/<world>, ready for systems/adventure/AdventureRocks.js:
// - every piece at its sheet's scale, smaller than drawn, with ChatGPT's haze cleared;
// - the fill colour-matched to the rock of the edges and sides (it was drawn apart from them), and
//   the loose boulders and pebbles too, so the kit is one rock;
// - the strips made to loop: cut where their two ends match best, or, if no place matches, their
//   ends blended into each other;
// - each piece measured (where its surface is, where its side is) and padded so it lines up as
//   ROCK says (lip, out, an inner corner's wall at its middle, the foam's sink);
// - the edges where a piece ends in the middle of rock faded, so it melts into the fill.
// Run: node tools/adventure-rock-kit.mjs (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROCK, ROCK_KITS } from '../src/data/adventure/rocks.js';
import { readSheet } from './sheetPieces.mjs';
import { crop, fade as fadeBy, flipped, leftOutline, looped, matched, placed, rockColour, save, scaled, solid, surfaceRow } from './kitPieces.mjs';

const fade = (p, sides, px = ROCK.fade) => fadeBy(p, sides, px);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const [world, kit] of Object.entries(ROCK_KITS)) {
  const sheets = join(ROOT, 'images', 'levels', world);
  const OUT = join(ROOT, 'public', 'assets', 'adventure', world);
  const file = (sheet) => join(sheets, `${sheet}.png`);
  if (![kit.fill, kit.edges, kit.sides, kit.decoration].every(({ sheet }) => existsSync(file(sheet)))) {
    console.log(`${world}: its rock kit isn't all drawn yet`);
    continue;
  }
  mkdirSync(OUT, { recursive: true });
  const sheet = async ({ sheet: name, pieces, scale }) => {
    const found = await readSheet(file(name), pieces);
    for (const key of Object.keys(found)) found[key] = await scaled(found[key], scale);
    return found;
  };
  const edges = await sheet(kit.edges), sides = await sheet(kit.sides), decor = await sheet(kit.decoration);
  const rock = rockColour([edges['rock-water'], sides['rock-side']]);

  // The fill: the whole square, scaled, colour-matched. It repeats as it was drawn.
  const { data, info } = await sharp(file(kit.fill.sheet)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const fill = await scaled({ pixels: data, w: info.width, h: info.height }, kit.fill.scale);
  await save(matched(fill, rockColour([fill]), rock), join(OUT, 'rock-fill.png'));

  // The top: looped side to side, its surface at `lip`, its cut bottom faded.
  {
    const { piece, how } = looped(edges['rock-top'], true);
    const top = placed(piece, piece.w, piece.h - surfaceRow(piece) + ROCK.lip, 0, ROCK.lip - surfaceRow(piece));
    fade(top, ['bottom']);
    await save(top, join(OUT, 'rock-top.png'));
    console.log(`${world} rock top: ${top.w} x ${top.h}, ${how}`);
  }
  // The waterline: looped, cut off at the foot of its foam (its last mostly-solid row) plus the
  // sink, its cut top faded.
  {
    const { piece, how } = looped(edges['rock-water'], true);
    let foot = piece.h - 1;
    while (foot > 0) { let n = 0; for (let x = 0; x < piece.w; x++) if (solid(piece, x, foot)) n++; if (n >= 0.3 * piece.w) break; foot--; }
    const water = crop(piece, 0, 0, piece.w, foot + 1);
    fade(water, ['top']);
    await save(water, join(OUT, 'rock-water.png'));
    console.log(`${world} rock waterline: ${water.w} x ${water.h}, ${how}`);
  }
  // The side: looped top to bottom, its side line at `out`, its cut inner edge faded.
  {
    const { piece, how } = looped(sides['rock-side'], false);
    const side = placed(piece, piece.w - Math.round(leftOutline(piece)) + ROCK.out, piece.h, ROCK.out - Math.round(leftOutline(piece)), 0);
    fade(side, ['right']);
    await save(side, join(OUT, 'rock-side.png'));
    // Its cap: its start, faded in from the top, so a side grows out from under its corner.
    const cap = crop(side, 0, 0, side.w, ROCK.cap);
    fade(cap, ['top'], ROCK.cap / 2);
    await save(cap, join(OUT, 'rock-side-cap.png'));
    console.log(`${world} rock side: ${side.w} x ${side.h}, ${how}`);
  }
  // The outer corners: surface at `lip` (measured over the ledge, away from the side), side line at
  // `out` from their outer edge (the right one measured mirrored), cut edges faded.
  for (const [name, right] of [['rock-corner-left', false], ['rock-corner-right', true]]) {
    let p = right ? flipped(sides[name]) : sides[name];
    const surface = surfaceRow(p, Math.round(p.w * 0.45), p.w - 1);
    const outline = leftOutline(p, surface + Math.round((p.h - surface) / 3), p.h - 1);
    fade(p, ['right', 'bottom']); // where it goes on into the top strip and the fill
    p = placed(p, p.w - Math.round(outline) + ROCK.out, p.h - surface + ROCK.lip, ROCK.out - Math.round(outline), ROCK.lip - surface);
    await save(right ? flipped(p) : p, join(OUT, `${name}.png`));
  }
  // The inner corners: the ledge's surface at `lip`, the wall's face at the middle, cut edges faded.
  // The right one (wall on its right) is measured as drawn; the left one mirrored to match.
  for (const [name, wallLeft] of [['rock-inner-right', false], ['rock-inner-left', true]]) {
    let p = wallLeft ? flipped(sides[name]) : sides[name];
    const surface = surfaceRow(p, 0, Math.round(p.w * 0.35));
    // The wall's face: where the rock begins, from the left, in the rows over the ledge.
    let face = p.w, y0 = Math.round(surface * 0.3), y1 = Math.max(y0, surface - 12);
    for (let y = y0; y <= y1; y++) for (let x = 0; x < p.w; x++) if (solid(p, x, y)) { face = Math.min(face, x); break; }
    const half = Math.max(face, p.w - face);
    fade(p, ['left', 'right', 'top', 'bottom']); // the ledge, the wall and the rock under go on past it
    p = placed(p, half * 2, p.h - surface + ROCK.lip, half - face, ROCK.lip - surface);
    await save(wallLeft ? flipped(p) : p, join(OUT, `${name}.png`));
  }
  // The decoration: as cut; the boulders and pebbles colour-matched to the rock.
  for (const [name, p] of Object.entries(decor)) {
    await save(/boulder|pebbles/.test(name) ? matched(p, rockColour([p]), rock) : p, join(OUT, `${name}.png`));
  }
  console.log(`${world}: rock kit cut, ${7 + Object.keys(decor).length} pieces`);
}
