// Power-ups placed in levels. `height` is how far above the ground the box's lower edge floats.
// At 358 it is just above the reach of one jump (a cat's head gets to about 343), so it takes a double
// jump or a bin bounce.

export const PICKUPS = {
  superPaw: {
    texture: 'paw-box',
    height: 358,
  },
  // Low enough to collect with one jump. See CATNIP below.
  catnip: {
    texture: 'catnip-box',
    height: 190,
  },
};

// Paw-print blocks float just over a running cat's head. Jumping into one from below bumps out its
// reward: treats, which count toward the level's stars, or a Super Paw.
// `height` is where the block's lower edge is. A running cat is about 113 tall, and one jump lifts
// its head to about 343, so a jump from under it always reaches.
export const PAW_BLOCK = {
  height: 250,
  size: 64,
  treats: 3, // how many treats a block holds, unless a level says otherwise
};

// The crow, which levels place with `crow: { t, until }` in a section. It drops acorns onto the road
// ahead of the cat, to jump.
//   fallSeconds: how long an acorn takes to land
//   landAhead:   how long before the cat gets there it lands, at the cat's speed when it was dropped
//   every:       seconds between acorns, and firstDrop before the first
//   follow:      how quickly it keeps up with the cat
export const CROW = {
  fallSeconds: 0.8,
  landAhead: 0.55,
  every: 1.8,
  firstDrop: 1.3,
  follow: 3,
  scale: 0.95,
  penalty: { speedMultiplier: 0.5, durationMs: 900 },
};

// Catnip: for `seconds`, the cat runs faster and bowls through obstacles without being slowed.
export const CATNIP = {
  seconds: 5,
  speedMultiplier: 1.2,
};
