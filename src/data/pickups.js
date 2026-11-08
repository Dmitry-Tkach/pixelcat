// Power-ups placed in levels. `height` is how far above the ground the box's lower edge floats.
// At 385 it is just above the reach of one jump, so it takes a double jump or a bin bounce.

export const PICKUPS = {
  superPaw: {
    texture: 'paw-box',
    height: 385,
  },
};

// Paw-print blocks float just over a running cat's head. Jumping into one from below bumps out its
// reward: treats, which count toward the level's stars, or a Super Paw.
// `height` is where the block's lower edge is. A running cat is about 140 tall, and one jump lifts
// its head to about 370, so a jump from under it always reaches.
export const PAW_BLOCK = {
  height: 250,
  size: 64,
  treats: 3, // how many treats a block holds, unless a level says otherwise
};
