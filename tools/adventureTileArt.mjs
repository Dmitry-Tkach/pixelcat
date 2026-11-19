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
// of the plainest tiles after them (data/adventure/tileVariants.js says which stands in for which).
// variants: [[tile name, svg drawn over it]], each inside the tile's edges, so it still joins its
// neighbours.
export async function buildTileStrip(out, variants) {
  const fit = (name) => sharp(join(out, `${name}.png`)).resize(TILE, TILE, { fit: 'contain', background: CLEAR });
  const plain = await Promise.all(TILESET.map((name) => fit(name).png().toBuffer()));
  const extra = await Promise.all(variants.map(async ([name, svg]) => {
    const base = await fit(name).png().toBuffer();
    return sharp(base).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">${svg}</svg>`) }]).png().toBuffer();
  }));
  const all = [...plain, ...extra];
  await sharp({ create: { width: TILE * all.length, height: TILE, channels: 4, background: CLEAR } })
    .composite(all.map((input, i) => ({ input, left: i * TILE, top: 0 })))
    .png({ compressionLevel: 9 }).toFile(join(out, 'tiles.png'));
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
