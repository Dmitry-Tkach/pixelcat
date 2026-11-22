// Draws a level's timber walkways (data/adventure/scaffolds.js) and stone brick masonry
// (data/adventure/bricks.js) as pictures at full size, the way systems/adventure/AdventureScaffolds.js
// and AdventureBricks.js draw them in the game. For the level preview, and to check the kits without
// a browser. Each returns { input, left, top } (a PNG, and where it goes in the world, px), or null
// if the world has no kit. art(name): the picture's file.
//   scaffoldPictures(walkway, tiles, art, tile) -> { back, front }: the posts and braces (behind the
//     ground's tiles) and the beam and its ends (in front);
//   brickPicture(box, solid, art, tile): a wall or a pillar, solid(c, r) as brickLayout takes it.
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { SCAFFOLD, SCAFFOLD_ART } from '../src/data/adventure/scaffolds.js';
import { BRICK, BRICK_ART } from '../src/data/adventure/bricks.js';
import { scaffoldLayout } from '../src/systems/adventure/scaffoldLayout.js';
import { brickLayout } from '../src/systems/adventure/brickLayout.js';
import { repeated } from './rockPicture.mjs';

const MARGIN = 160; // px round the cells for what reaches past them (moss, caps, plants)

// A canvas over a box of the world (px), and a way to put pieces on it, clipped to it at whole pixels.
function canvas(L, T, W, H) {
  const pieces = [];
  const put = async (input, x, y) => {
    const { width, height } = await sharp(input).metadata();
    const left = Math.round(x - L), top = Math.round(y - T);
    const x0 = Math.max(0, left), y0 = Math.max(0, top), x1 = Math.min(W, left + width), y1 = Math.min(H, top + height);
    if (x1 <= x0 || y1 <= y0) return;
    pieces.push({ input: await sharp(input).extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 }).png().toBuffer(), left: x0, top: y0 });
  };
  const done = async () => ({ input: await sharp({ create: { width: W, height: H, channels: 4, background: '#0000' } }).composite(pieces).png().toBuffer(), left: L, top: T });
  return { put, done };
}
const flop = async (file) => sharp(file).flop().png().toBuffer();

export async function scaffoldPictures(walkway, tiles, art, tile) {
  if (!existsSync(art(SCAFFOLD_ART.beam))) return null;
  const meta = async (name) => sharp(art(name)).metadata();
  const { from, to, row } = walkway;
  const { posts, braces } = scaffoldLayout(walkway, tiles);
  const bottom = Math.max(row + 1, ...posts.map((p) => p.bottom));
  const L = from * tile - MARGIN, T = row * tile - MARGIN, W = (to + 1) * tile + MARGIN - L, H = bottom * tile + MARGIN - T;
  const back = canvas(L, T, W, H), front = canvas(L, T, W, H);
  const beam = await meta(SCAFFOLD_ART.beam), post = await meta(SCAFFOLD_ART.post);
  const left = from * tile, right = (to + 1) * tile, deck = row * tile - SCAFFOLD.lip, postTop = deck + beam.height * 0.6;
  for (const { from: a, to: b, top, rows } of braces) {
    const x0 = a * tile + tile / 2, x1 = b * tile + tile / 2;
    await back.put(await sharp(art(SCAFFOLD_ART.brace)).resize(Math.round(x1 - x0), rows * tile, { fit: 'fill' }).png().toBuffer(), x0, top * tile);
  }
  for (const { col, bottom: foot } of posts) {
    const h = Math.round(foot * tile - postTop);
    if (h > 0) await back.put(await repeated(art(SCAFFOLD_ART.post), post.width, h, 0, 0), col * tile + tile / 2 - post.width / 2, postTop);
  }
  await front.put(await repeated(art(SCAFFOLD_ART.beam), right - left, beam.height, left, 0), left, deck);
  await front.put(await sharp(art(SCAFFOLD_ART.endLeft)).png().toBuffer(), left, deck);
  const end = await meta(SCAFFOLD_ART.endRight);
  await front.put(await sharp(art(SCAFFOLD_ART.endRight)).png().toBuffer(), right - end.width, deck);
  return { back: await back.done(), front: await front.done() };
}

export async function brickPicture(box, solid, art, tile) {
  if (!existsSync(art(BRICK_ART.fill))) return null;
  const meta = async (name) => sharp(art(name)).metadata();
  const layout = brickLayout(box, solid);
  const { cols: [c0, c1], rows: [r0, r1] } = box;
  const x = c0 * tile, y = r0 * tile, w = (c1 - c0 + 1) * tile, h = (r1 - r0 + 1) * tile;
  const { put, done } = canvas(x - MARGIN, y - MARGIN, w + MARGIN * 2, h + MARGIN * 2);
  if (layout.look === 'pillar') {
    const trunk = await meta(BRICK_ART.pillar), foot = await meta(BRICK_ART.pillarFoot), head = await meta(BRICK_ART.pillarHead);
    const mid = x + w / 2, footTop = y + h - foot.height;
    if (footTop > y) await put(await repeated(art(BRICK_ART.pillar), trunk.width, Math.round(footTop - y), 0, 0), mid - trunk.width / 2, y);
    await put(await sharp(art(BRICK_ART.pillarFoot)).png().toBuffer(), mid - foot.width / 2, footTop);
    await put(await sharp(art(BRICK_ART.pillarHead)).png().toBuffer(), mid - head.width / 2, y - BRICK.lip);
    return done();
  }
  await put(await repeated(art(BRICK_ART.fill), w, h, x, y), x, y);
  const side = await meta(BRICK_ART.side);
  for (const { col, side: dir, from, to, cap } of layout.sides) {
    const sx = dir < 0 ? col * tile - BRICK.out : (col + 1) * tile + BRICK.out - side.width;
    await put(await repeated(art(BRICK_ART.side), side.width, (to - from + 1) * tile, 0, from * tile, dir > 0), sx, from * tile);
  }
  const top = await meta(BRICK_ART.top);
  for (const { from, to, row } of layout.tops) {
    await put(await repeated(art(BRICK_ART.top), (to - from + 1) * tile, top.height, from * tile, 0), from * tile, row * tile - BRICK.lip);
  }
  for (const { col, side: dir, from, cap } of layout.sides) {
    if (!cap || !existsSync(art(BRICK_ART.sideCap))) continue;
    const sx = dir < 0 ? col * tile - BRICK.out : (col + 1) * tile + BRICK.out - side.width;
    await put(dir > 0 ? await flop(art(BRICK_ART.sideCap)) : await sharp(art(BRICK_ART.sideCap)).png().toBuffer(), sx, from * tile - BRICK.lip);
  }
  return done();
}
