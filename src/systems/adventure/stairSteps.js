// Stairs the cat walks up (systems/adventure/AdventureStairs.js): a staircase picture over a rise of
// ground, with small invisible steps under it. As he walks into a step no higher than STAIRS.stepUp,
// he steps up onto it, so he climbs the stairs without jumping; going down, he drops step by step.
// Plain code, no Phaser, so tests can check the steps.
//
// A level lists them as stairs: [{ at, row, dir, rows, width }]:
//   at: the column where the higher ground begins (dir 1, rising to the right) or the column after it
//     ends (dir -1, rising to the left): the stairs end against it;
//   row: the row the cat stands on at their foot; rows: how many rows they climb (2 by default);
//   width: how wide they're shown (px), if not the picture's own width.

// steps: how many invisible steps a staircase has. stepUp: the highest step (px) he steps up onto
// as he walks. depth: in front of the ground, over the higher ground's edge.
export const STAIRS = { steps: 8, stepUp: 24, depth: 2.05, width: 221 };

// The staircase's box in the world (px): left, right, the foot's floor (bottom) and its top.
export function stairBox({ at, row, dir, rows = 2, width = STAIRS.width }, tile) {
  const edge = at * tile;
  const bottom = (row + 1) * tile;
  const [left, right] = dir > 0 ? [edge - width, edge] : [edge, edge + width];
  return { left, right, bottom, top: bottom - rows * tile };
}

// Its invisible steps, each a box (px) from its own height down to the floor, rising the way the
// stairs rise. The highest is as high as the higher ground.
export function stairSteps(stairs, tile, steps = STAIRS.steps) {
  const { left, right, bottom, top } = stairBox(stairs, tile);
  const run = (right - left) / steps, rise = (bottom - top) / steps;
  return Array.from({ length: steps }, (_, i) => {
    const height = rise * (i + 1);
    const x = stairs.dir > 0 ? left + run * i : right - run * (i + 1);
    return { left: x, top: bottom - height, width: run, height };
  });
}

// Whether the cat, walking into a step, steps up onto it: its top no higher above his feet than
// stepUp, and he isn't rising (jumping). rise: how far up he goes.
export function stepsUp({ feet, vy }, stepTop, stepUp = STAIRS.stepUp) {
  const rise = feet - stepTop;
  return rise > 0 && rise <= stepUp && vy >= 0 ? rise : 0;
}
