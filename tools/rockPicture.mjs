// Draws a level's rock (data/adventure/rocks.js) as one picture, at full size, the way
// systems/adventure/AdventureRocks.js draws it in the game: the fill lined up with the world, the
// sides, the waterline, the top, the corners and the decoration. For the level preview, and to
// check the kit without a browser.
//   rockPicture(rock, art, tile) -> { input, left, top } (a PNG, and where it goes in the world, px),
//   or null if the world has no kit. art(name): the picture's file.
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { ROCK, ROCK_ART } from '../src/data/adventure/rocks.js';
import { fillBox, rockDecorAt, rockLayout } from '../src/systems/adventure/rockLayout.js';

const MARGIN = 220; // px round the rock's cells for what reaches past them (bulges, moss, plants)
const mod = (a, b) => ((a % b) + b) % b;

// A picture repeated over w x h px, as a tileSprite at world (x, y) with tilePosition (tx, ty) shows it.
export async function repeated(file, w, h, tx, ty, flip = false) {
  let tile = sharp(file);
  if (flip) tile = tile.flop();
  const buffer = await tile.png().toBuffer();
  const { width: tw, height: th } = await sharp(buffer).metadata();
  const plane = await sharp({ create: { width: w + tw, height: h + th, channels: 4, background: '#0000' } })
    .composite([{ input: buffer, tile: true, left: 0, top: 0 }]).png().toBuffer();
  // With a flip, the picture is mirrored as a whole, so its repeat starts from the right.
  const ox = flip ? mod(tw - mod(tx + w, tw), tw) : mod(tx, tw);
  return sharp(plane).extract({ left: ox, top: mod(ty, th), width: w, height: h }).png().toBuffer();
}

export async function rockPicture(rock, art, tile) {
  if (!existsSync(art(ROCK_ART.fill))) return null;
  const has = (name) => existsSync(art(name));
  const size = async (name) => sharp(art(name)).metadata();
  const { fills, tops, sides, waterline, decor } = rockLayout(rock);
  const cols = rock.parts.flatMap((p) => p.cols), rows = rock.parts.flatMap((p) => p.rows);
  const L = Math.min(...cols) * tile - MARGIN, T = Math.min(...rows) * tile - MARGIN;
  const W = (Math.max(...cols) + 1) * tile + MARGIN - L, H = (Math.max(...rows) + 1) * tile + MARGIN - T;
  const pieces = [];
  // Every piece is clipped to the canvas (sharp needs it inside), at whole pixels.
  const put = async (input, x, y) => {
    const { width, height } = await sharp(input).metadata();
    const left = Math.round(x - L), top = Math.round(y - T);
    const x0 = Math.max(0, left), y0 = Math.max(0, top), x1 = Math.min(W, left + width), y1 = Math.min(H, top + height);
    if (x1 <= x0 || y1 <= y0) return;
    const clipped = await sharp(input).extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 }).png().toBuffer();
    pieces.push({ input: clipped, left: x0, top: y0 });
  };
  for (const box of fills) {
    const { x, y, w, h } = fillBox(box, tile);
    await put(await repeated(art(ROCK_ART.fill), w, h, x, y), x, y);
  }
  if (has(ROCK_ART.side)) {
    const { width } = await size(ROCK_ART.side);
    const cap = has(ROCK_ART.sideCap) ? ROCK.cap : 0;
    for (const { col, from, to, side } of sides) {
      const x = side < 0 ? col * tile - ROCK.out : (col + 1) * tile + ROCK.out - width;
      const length = (to - from + 1) * tile;
      if (length > cap) await put(await repeated(art(ROCK_ART.side), width, length - cap, 0, cap, side > 0), x, from * tile + cap);
      if (cap) {
        let capPicture = sharp(art(ROCK_ART.sideCap)).extract({ left: 0, top: 0, width, height: Math.min(cap, length) });
        if (side > 0) capPicture = sharp(await capPicture.png().toBuffer()).flop();
        await put(await capPicture.png().toBuffer(), x, from * tile);
      }
    }
  }
  if (has(ROCK_ART.water)) {
    const { height } = await size(ROCK_ART.water);
    for (const { row, from, to } of waterline) {
      await put(await repeated(art(ROCK_ART.water), (to - from + 1) * tile, height, from * tile, 0), from * tile, (row + 1) * tile + ROCK.sink - height);
    }
  }
  const { corners } = ROCK_ART;
  for (const { row, from, to, left, right } of tops) {
    const y = row * tile - ROCK.lip;
    if (has(ROCK_ART.top)) {
      const { height } = await size(ROCK_ART.top);
      await put(await repeated(art(ROCK_ART.top), (to - from + 1) * tile, height, from * tile, 0), from * tile, y);
    }
    const ends = [
      left === 'outer' ? { name: corners.outerLeft, x: from * tile - ROCK.out, ox: 0 } : { name: corners.innerLeft, x: from * tile, ox: 0.5 },
      right === 'outer' ? { name: corners.outerRight, x: (to + 1) * tile + ROCK.out, ox: 1 } : { name: corners.innerRight, x: (to + 1) * tile, ox: 0.5 },
    ];
    for (const { name, x, ox } of ends) {
      if (!has(name)) continue;
      const { width } = await size(name);
      await put(await sharp(art(name)).png().toBuffer(), x - width * ox, y);
    }
  }
  for (const d of decor) {
    if (!has(d.picture)) continue;
    const { x, y, ox, oy } = rockDecorAt(d, tile);
    const { width, height } = await size(d.picture);
    await put(await sharp(art(d.picture)).png().toBuffer(), x - width * ox, y - height * oy);
  }
  const input = await sharp({ create: { width: W, height: H, channels: 4, background: '#0000' } }).composite(pieces).png().toBuffer();
  return { input, left: L, top: T };
}
