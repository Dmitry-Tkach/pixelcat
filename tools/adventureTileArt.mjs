// What every adventure world's art shares, for the tools that prepare it from a world pack
// (tools/adventure-art.mjs for the Wood, tools/adventure-autumn-art.mjs for the Autumn Forest):
// shrinking the pack's pictures, building the tile strip, and the backdrop layers.
import sharp from 'sharp';
import { join } from 'node:path';

export const TILE = 64;
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const FADED_EDGE = 0.8; // an edge column this much fainter than its neighbour is cut off (see trimFadedEdges)

// The ground, islands and bridge as one strip of 64px tiles, for the game's tilemap, in this order.
// systems/adventureMap.js (TILES) names each tile's place in the strip.
export const TILESET = ['ground-top-left', 'ground-top', 'ground-top-right', 'soil-left', 'soil', 'soil-right',
  'ledge-left', 'ledge', 'ledge-right', 'bridge'];

// How many empty rows a picture has under its drawing. Some pack images leave empty rows under the
// drawing, which would float it above the grass.
export async function emptyRowsBelow(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = info.height - 1; y >= 0; y--) {
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 20) return info.height - 1 - y;
  }
  return 0;
}

// Each pack picture shrunk to its scale and saved under its game name in `out`. pieces: { name:
// [file, scale] }. Those in `stands` stand on the ground, so their empty rows below are cut off: the
// picture's bottom is where it stands.
export async function shrinkPieces(pieces, out, stands) {
  for (const [name, [file, scale]] of Object.entries(pieces)) {
    const { width } = await sharp(file).metadata();
    let png = await sharp(file).resize({ width: Math.round(width * scale) }).png().toBuffer();
    const empty = stands.has(name) ? await emptyRowsBelow(png) : 0;
    if (empty > 0) {
      const { width: w, height: h } = await sharp(png).metadata();
      png = await sharp(png).extract({ left: 0, top: 0, width: w, height: h - empty }).png().toBuffer();
    }
    await sharp(png).png({ compressionLevel: 9 }).toFile(join(out, `${name}.png`));
  }
}

// The tile strip, tiles.png in `out`, from the TILESET pictures already saved there, with variants
// of the plainest tiles after them (data/adventure/tileVariants.js says which stands in for which),
// and the undersides last.
// variants: [[tile name, svg drawn over it]], each inside the tile's edges, so it still joins its
// neighbours.
export async function buildTileStrip(out, variants) {
  const fit = (name) => sharp(join(out, `${name}.png`)).resize(TILE, TILE, { fit: 'contain', background: CLEAR });
  const plain = await Promise.all(TILESET.map((name) => fit(name).png().toBuffer()));
  const extra = await Promise.all(variants.map(async ([name, svg]) => {
    const base = await fit(name).png().toBuffer();
    return sharp(base).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">${svg}</svg>`) }]).png().toBuffer();
  }));
  const all = [...plain, ...extra, ...await undersides(out)];
  await sharp({ create: { width: TILE * all.length, height: TILE, channels: 4, background: CLEAR } })
    .composite(all.map((input, i) => ({ input, left: i * TILE, top: 0 })))
    .png({ compressionLevel: 9 }).toFile(join(out, 'tiles.png'));
}

// The undersides (systems/adventureMap.js, TILES.underLeft, under, underRight): earth with open air
// under it, so an overhang or a cave's roof ends in a wavy edge, not a straight line. Each is the
// soil's top (its left, middle or right) over the bottom of an island tile (its rounded left, middle
// or right), from the same pack, blended where they meet. The island's earth is tinted to the soil's
// colour, and a corner's island moved sideways so its side lines up with the soil's.
const UNDERSIDE = { seam: 30, blend: 12 }; // px down the tile where the island's bottom takes over
async function undersides(out) {
  const raw = async (name) => (await sharp(join(out, `${name}.png`)).resize(TILE, TILE, { fit: 'contain', background: CLEAR }).ensureAlpha().raw().toBuffer());
  const px = (x, y) => (y * TILE + x) * 4;
  // The mean colour of a tile's solid earth between rows y0 and y1 (not its dark outline).
  const earth = (tile, y0, y1) => {
    const sum = [0, 0, 0];
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = 8; x < TILE - 8; x++) {
      const i = px(x, y);
      if (tile[i + 3] < 250 || tile[i] + tile[i + 1] + tile[i + 2] < 90) continue;
      for (let c = 0; c < 3; c++) sum[c] += tile[i + c];
      n++;
    }
    return sum.map((v) => v / Math.max(1, n));
  };
  // Where a tile's side is (its first solid pixel from that side), round the seam.
  const sideAt = (tile, fromRight) => {
    const xs = [];
    for (let y = UNDERSIDE.seam - 6; y <= UNDERSIDE.seam + 6; y++) {
      for (let k = 0; k < TILE; k++) {
        const x = fromRight ? TILE - 1 - k : k;
        if (tile[px(x, y) + 3] >= 128) { xs.push(x); break; }
      }
    }
    return xs.length ? xs.reduce((a, b) => a + b) / xs.length : 0;
  };
  const soilColour = earth(await raw('soil'), 0, TILE);
  const islandColour = earth(await raw('ledge'), UNDERSIDE.seam, TILE - 12);
  const tint = soilColour.map((v, c) => v - islandColour[c]);
  const made = [];
  for (const [soil, island, side] of [['soil-left', 'ledge-left', 'left'], ['soil', 'ledge', null], ['soil-right', 'ledge-right', 'right']]) {
    const top = await raw(soil), drawn = await raw(island);
    const shift = side ? Math.round(sideAt(top, side === 'right') - sideAt(drawn, side === 'right')) : 0;
    const tile = Buffer.alloc(TILE * TILE * 4);
    for (let y = 0; y < TILE; y++) {
      const t = Math.min(1, Math.max(0, (y - UNDERSIDE.seam + UNDERSIDE.blend / 2) / UNDERSIDE.blend)); // 0: soil, 1: island
      for (let x = 0; x < TILE; x++) {
        const i = px(x, y), sx = x - shift;
        const from = sx >= 0 && sx < TILE ? px(sx, y) : -1;
        const under = from < 0 ? [0, 0, 0, 0] : [0, 1, 2].map((c) => Math.max(0, Math.min(255, drawn[from + c] + tint[c]))).concat(drawn[from + 3]);
        for (let c = 0; c < 4; c++) tile[i + c] = Math.round(top[i + c] * (1 - t) + under[c] * t);
      }
    }
    made.push(await sharp(tile, { raw: { width: TILE, height: TILE, channels: 4 } }).png().toBuffer());
  }
  return made;
}

// The pebbles, roots and dark patches the variants draw, in a world's soil colours: { pebble,
// shine, dark, root, rootLight }.
export function soilVariants(soil) {
  const pebble = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${soil.pebble}" stroke="${soil.dark}" stroke-width="2"/>
  <ellipse cx="${x - rx * 0.3}" cy="${y - ry * 0.35}" rx="${rx * 0.4}" ry="${ry * 0.3}" fill="${soil.shine}"/>`;
  return [
    ['soil', pebble(18, 22, 7, 5) + pebble(42, 44, 9, 6) + pebble(30, 50, 4, 3)],
    ['soil', `<path d="M8 20 Q24 30 34 26 Q46 22 56 34" stroke="${soil.root}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M8 20 Q24 30 34 26 Q46 22 56 34" stroke="${soil.rootLight}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M34 26 Q36 38 30 46" stroke="${soil.root}" stroke-width="4" fill="none" stroke-linecap="round"/>`],
    ['soil', `<ellipse cx="32" cy="34" rx="20" ry="13" fill="${soil.dark}" opacity="0.45"/>` + pebble(24, 30, 4, 3)],
    ['ground-top', pebble(20, 44, 6, 4) + pebble(44, 52, 4, 3)],
    ['ground-top', pebble(38, 42, 8, 5)],
  ];
}

// A backdrop layer from the pack, at the game's height (720), saved as `name` in `out`. Shrinking
// one leaves its last column faded (nearly see-through), and repeated side by side, that column
// showed as a thin light line over a bright sky behind it: faded edge columns are cut off.
export async function backdropLayer(file, out, name) {
  const shrunk = await sharp(file).resize({ height: 720 }).png().toBuffer();
  await (await trimFadedEdges(shrunk)).png({ compressionLevel: 9 }).toFile(join(out, `${name}.png`));
}

// A picture with its faded edge columns cut off: a left or right column whose average opacity is
// under FADED_EDGE of the column next to it, inward.
async function trimFadedEdges(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const opacity = (x) => { let sum = 0; for (let y = 0; y < height; y++) sum += data[(y * width + x) * 4 + 3]; return sum / height; };
  let left = 0, right = width - 1;
  while (left < 3 && opacity(left) < opacity(left + 1) * FADED_EDGE) left += 1;
  while (right > width - 4 && opacity(right) < opacity(right - 1) * FADED_EDGE) right -= 1;
  return sharp(input).extract({ left, top: 0, width: right - left + 1, height });
}
