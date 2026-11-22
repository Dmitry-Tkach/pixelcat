// The rock kit (systems/adventure/rockLayout.js, AdventureRocks.js): how a world's rock pictures
// are shown. Every cliff and rock wall is built the way 2D games build them, from one kit: a
// seamless fill for the inside, strips along its edges (the mossy top, the rough sides, the wet
// waterline), corners where the edges turn, and decoration scattered over it so it never looks
// repeated. Each piece is drawn bigger than it's shown, so it's always sharp.
//
// A level lists its rocks as rocks: [{ parts, foot }]:
//   parts: [{ cols: [from, to], rows: [from, to] }]: the rock's shape, as boxes of cells, joined
//     into one (a stepped cliff is a box for each step, all down to the same foot);
//   foot: 'water' for wet stones along its bottom (it stands in water), else nothing there (its foot
//     is hidden behind the ground).
// Rocks are scenery: the cat passes in front of them. What he stands on is the map.

// How the kit's pictures line up. The tool that cuts them (tools/adventure-rock-kit.mjs) measures
// each piece and pads it so these hold for every world's kit, so the drawing code needs no numbers
// of its own:
//   lip: px from the top of the top strip, and of every corner, down to the rock's surface (its
//     moss and plants rise over it);
//   out: px from the left of the side strip, and of a left outer corner, to the rock's side line (its
//     boulders bulge out past it); a right outer corner is the same from its right;
//   an inner corner's wall face is at its middle;
//   sink: the waterline strip's foam reaches this far (px) under the rock's foot, into the water.
// fade: px over which a piece's cut edges fade into the fill, so there's no line where they meet.
// cap: px of the side strip's start, cut as its own piece with its top faded in, so a side grows out
// from under its corner with no line. inset: px the fill stops short of the rock's outline, where
// the edge pieces draw it, so the fill's straight edge never shows.
export const ROCK = { lip: 40, out: 70, sink: 8, fade: 64, cap: 120, inset: 24, depth: 1.59 }; // depth: behind the waterfalls (1.6) and the ground

// The pictures, by name in the world's art.
export const ROCK_ART = {
  fill: 'rock-fill',
  top: 'rock-top',
  side: 'rock-side',
  sideCap: 'rock-side-cap',
  water: 'rock-water',
  corners: { outerLeft: 'rock-corner-left', outerRight: 'rock-corner-right', innerLeft: 'rock-inner-left', innerRight: 'rock-inner-right' },
};

// A world's kit, drawn by the owner (prompts 16 to 19): its four sheets in images/levels/<world>,
// the pieces on each (in rows, as found on the sheet, left to right), and the scale each sheet is
// shown at, so their boulders come out the same size (about 110 px), all smaller than drawn.
export const ROCK_KITS = {
  autumn: {
    fill: { sheet: 'rock-fill', scale: 0.42 },
    edges: { sheet: 'rock-edges', scale: 0.5, pieces: [['rock-top'], ['rock-water']] },
    sides: {
      sheet: 'rock-sides', scale: 0.62,
      pieces: [['rock-corner-left'], ['rock-corner-right'], ['rock-side', 'rock-inner-right'], ['rock-inner-left']],
    },
    decoration: {
      sheet: 'rock-decoration', scale: 0.4,
      pieces: [
        ['rock-fern-1', 'rock-fern-2', 'rock-moss-1', 'rock-moss-2'],
        ['rock-crack-1', 'rock-crack-2', 'rock-flowers-1', 'rock-flowers-2'],
        ['rock-boulder-1', 'rock-boulder-2', 'rock-pebbles-1', 'rock-pebbles-2'],
      ],
    },
  },
};

// Decoration, placed "at random" by a number worked out from each cell, so a rock looks the same
// every time. share: how many of the cells that can take one do. Never two next to each other.
//   face: on the rock's face, away from its edges (cracks, ferns and flowers growing from cracks);
//   underTop: hanging from the top's moss, just under it;
//   onTop: standing on its top (loose boulders, pebbles).
export const ROCK_DECOR = {
  face: { share: 0.08, pictures: ['rock-crack-1', 'rock-crack-2', 'rock-fern-1', 'rock-fern-2', 'rock-flowers-1', 'rock-flowers-2'] },
  underTop: { share: 0.3, pictures: ['rock-moss-1', 'rock-moss-2'] },
  onTop: { share: 0.15, pictures: ['rock-boulder-1', 'rock-boulder-2', 'rock-pebbles-1', 'rock-pebbles-2'] },
};

// Every picture a world's rock kit gives it (for its art list, data/adventure/index.js).
export const rockKitArt = (world) => {
  const kit = ROCK_KITS[world];
  return kit ? [ROCK_ART.fill, ROCK_ART.sideCap, ...[kit.edges, kit.sides, kit.decoration].flatMap(({ pieces }) => pieces.flat())] : [];
};
