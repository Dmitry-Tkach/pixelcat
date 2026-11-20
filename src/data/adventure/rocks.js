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

// The pictures, by name in the world's art (tools cut them at these sizes, about half their drawn
// size). fill: the seamless texture, `fill` px square. top: the mossy lip, `height` tall, its moss
// rising `lip` px over the rock's top. side: the rough outline, `width` wide, bulging `out` px past
// the rock's side (the right side is the left one mirrored). water: the wet stones, `height` tall,
// reaching `up` px up from the rock's foot. corner: the outer and inner corners, `size` px square,
// placed `lip` px over the top like the top strip.
export const ROCK = {
  fill: 512,
  top: { height: 130, lip: 40 },
  side: { width: 130, out: 50 },
  water: { height: 110, up: 80 },
  corner: { size: 150 },
  depth: 1.59, // behind the waterfalls (1.6), which pour down its face, and the ground
};

export const ROCK_ART = {
  fill: 'rock-fill',
  top: 'rock-top',
  side: 'rock-side',
  water: 'rock-water',
  corners: { outerLeft: 'rock-corner-left', outerRight: 'rock-corner-right', innerLeft: 'rock-inner-left', innerRight: 'rock-inner-right' },
};

// Decoration, placed "at random" by a number worked out from each cell, so a rock looks the same
// every time. share: how many of the cells that can take one do. Never two next to each other.
//   face: on the rock's face, away from its edges (cracks, ferns and flowers growing from cracks);
//   underTop: hanging from the top's moss, just under it;
//   onTop: standing on its top (loose boulders, pebbles).
export const ROCK_DECOR = {
  face: { share: 0.14, pictures: ['rock-crack-1', 'rock-crack-2', 'rock-fern-1', 'rock-fern-2', 'rock-flowers-1', 'rock-flowers-2'] },
  underTop: { share: 0.3, pictures: ['rock-moss-1', 'rock-moss-2'] },
  onTop: { share: 0.15, pictures: ['rock-boulder-1', 'rock-boulder-2', 'rock-pebbles-1', 'rock-pebbles-2'] },
};
