import { TILES } from '../../systems/adventureMap.js';

// Tile variants: the soil and the ground's top have a few versions drawn with a little more in them
// (pebbles, a root, a darker patch), after the ten plain tiles in the strip (tools/adventure-art.mjs
// draws them). The scene swaps a plain tile's picture for one now and then, by each cell's own
// number, the same every time. Only the picture changes: the game treats the tile as the plain one.
//   share: how many of those tiles get a variant (0 to 1). By the plain tile's place in the strip,
//   the places of its variants.
export const TILE_VARIANT_SHARE = 0.35;
export const TILE_VARIANTS = {
  [TILES.soil]: [10, 11, 12],
  [TILES.groundTop]: [13, 14],
};
export const TILE_STRIP_LENGTH = 15; // the ten plain tiles and the five variants
