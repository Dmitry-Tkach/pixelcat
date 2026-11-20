// Stairs the cat walks up (systems/adventure/AdventureStairs.js): a staircase picture over a rise of
// ground, with a smooth slope under it that his feet keep to, so he walks up and down without
// jumping. (Small solid steps were tried first: his body is wider than a step, so he touched the
// next ones too and was pushed about, glitching, as the owner saw.) Plain code, no Phaser.
//
// A level lists them as stairs: [{ at, row, dir, rows, width }]:
//   at: the column where the higher ground begins (dir 1, rising to the right) or the column after it
//     ends (dir -1, rising to the left): the stairs end against it;
//   row: the row the cat stands on at their foot; rows: how many rows they climb (2 by default);
//   width: how wide they're shown (px), if not the picture's own width.

// below: how far (px) under the slope his feet can be and still be put on it (he sinks a little
// each step as he walks up). above: how far over it they can be and still be held to it, while he
// was on it a moment ago (walking down, he'd lift off it a little each step). depth: in front of the
// ground, over the higher ground's edge.
export const STAIRS = { below: 28, above: 14, depth: 2.05, width: 221 };

// The staircase's box in the world (px): left, right, the foot's floor (bottom) and its top.
export function stairBox({ at, row, dir, rows = 2, width = STAIRS.width }, tile) {
  const edge = at * tile;
  const bottom = (row + 1) * tile;
  const [left, right] = dir > 0 ? [edge - width, edge] : [edge, edge + width];
  return { left, right, bottom, top: bottom - rows * tile };
}

// The slope's height (px, a world y) at x, or null off the stairs. It runs straight from the floor
// at the foot to the higher ground's top.
export function stairSurface(stairs, x, tile) {
  const { left, right, bottom, top } = stairBox(stairs, tile);
  if (x < left || x > right) return null;
  const up = stairs.dir > 0 ? (x - left) / (right - left) : (right - x) / (right - left);
  return bottom - up * (bottom - top);
}

// Where his feet stand on the stairs: the slope's height under the front of his body (the side the
// stairs rise to), so at their top his feet are level with the higher ground, clear of its edge.
// left, right: his body's sides. Null if he's off them.
export function feetOnStairs(stairs, { left, right }, tile) {
  const front = stairs.dir > 0 ? right : left;
  const box = stairBox(stairs, tile);
  const x = Math.min(box.right, Math.max(box.left, front));
  const middle = (left + right) / 2;
  if (middle < box.left || middle > box.right) return null;
  return stairSurface(stairs, x, tile);
}

// Whether he's put on the stairs this frame: not rising (jumping), and his feet a little under the
// slope, or just over it if he was on it a moment ago, or crossing it as he falls.
export function holdsOnStairs({ feet, prevFeet, vy, wasOn }, surface) {
  if (surface === null || vy < 0) return false;
  if (feet >= surface - (wasOn ? STAIRS.above : 1) && feet <= surface + STAIRS.below) return true;
  return prevFeet <= surface + 1 && feet >= surface;
}
