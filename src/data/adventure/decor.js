// Each world's automatic decoration (systems/adventure/decorPlacement.js places it, from the map):
// plants on the tops of the ground and islands, and vines hanging under the islands, chosen and
// nudged at random but the same every time the level is played. The ruins, torches and the like are
// placed by hand, in the level's map.
//
// tops: on a ground or island top with open air above it. under: hanging from an island's
// underside, with open air below it. For each: pictures, the world's art to choose from (by name);
// chance, how likely each cell is to get one (0 to 1); jitter, how far (px) it may be nudged across;
// sink, how far (px) into the tile its bottom (or top, for vines) goes, so it looks rooted.
// depth: tops are drawn just in front of the tiles (2), so grass grows over their edge; vines just
// behind them, so the island covers where they hang from.
// The pictures are code-drawn stand-ins (tools/adventure-decor-art.mjs) until the owner's props
// sheet (prompts/forest-level/06-props-plants.md) comes, under the same names.
export const DECOR = {
  wood: {
    tops: {
      pictures: ['decor-tuft-1', 'decor-tuft-2', 'decor-tuft-1', 'decor-flowers-1', 'decor-flowers-2', 'bush-1', 'plant-1'],
      chance: 0.4, jitter: 14, sink: 6, depth: 2.1,
    },
    under: {
      pictures: ['decor-vine-1', 'decor-vine-2', 'decor-vine-3'],
      chance: 0.5, jitter: 10, sink: 10, depth: 1.9,
    },
  },
};

// Cells kept clear of plants on top: where these stand, so they're always easy to see.
export const DECOR_KEEP_CLEAR = new Set(['start', 'portal', 'checkpoint', 'chest', 'silver-chest', 'weapon']);
