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
// was on it a moment ago (walking down, he'd lift off it a little each step). tuck: how far (px) the
// staircase reaches into the higher ground, behind its wavy edge, so no sky shows between them.
// depth: behind the ground's tiles (2), so that edge is in front of it.
export const STAIRS = { below: 28, above: 14, tuck: 26, depth: 1.99, width: 221 };

// The slope's box in the world (px): left, right, the foot's floor (bottom) and its top. It rises
// from the picture's foot to the higher ground's edge, so the cat's feet reach the top just as he
// steps onto the ground (stairPicture tucks the picture on past the edge).
export function stairBox({ at, row, dir, rows = 2, width = STAIRS.width }, tile) {
  const edge = at * tile;
  const bottom = (row + 1) * tile;
  const run = width - STAIRS.tuck;
  const [left, right] = dir > 0 ? [edge - run, edge] : [edge, edge + run];
  return { left, right, bottom, top: bottom - rows * tile };
}

// The staircase picture's box (px), at its own width: from the slope's foot on `tuck` px past the
// higher ground's edge, behind its wavy edge, so no sky shows between them.
export function stairPicture(flight, tile) {
  const box = stairBox(flight, tile);
  return flight.dir > 0 ? { ...box, right: box.right + STAIRS.tuck } : { ...box, left: box.left - STAIRS.tuck };
}

// The higher ground's cells the stairs stand against ({ col, row, side }): their side facing the
// stairs is no wall, so the cat walks off the top step onto the ground (their tops stay solid).
export function stairWall({ at, row, dir, rows = 2 }) {
  const col = dir > 0 ? at : at - 1;
  return Array.from({ length: rows }, (_, i) => ({ col, row: row - i, side: dir > 0 ? 'left' : 'right' }));
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
// He's on them from when that front reaches their foot (so the first step lifts him gently, not
// all at once) until his middle passes their top. left, right: his body's sides. Null if he's off them.
export function feetOnStairs(stairs, { left, right }, tile) {
  const up = stairs.dir > 0;
  const front = up ? right : left;
  const box = stairBox(stairs, tile);
  const middle = (left + right) / 2;
  const onFoot = up ? front > box.left : front < box.right;
  const pastTop = up ? middle > box.right : middle < box.left;
  if (!onFoot || pastTop) return null;
  return stairSurface(stairs, Math.min(box.right, Math.max(box.left, front)), tile);
}

// Whether he's put on the stairs this frame: not rising (jumping), and his feet a little under the
// slope, or just over it if he was on it a moment ago, or crossing it as he falls. Standing on the
// floor under the slope (onFloor: after a knock-back, a dash, a slow frame, or starting there), he's
// lifted onto it however far under it he is: no one stands inside a staircase, or walks under it
// into the wall at its top.
export function holdsOnStairs({ feet, prevFeet, vy, wasOn, onFloor = false }, surface) {
  if (surface === null || vy < 0) return false;
  if (onFloor && feet > surface) return true;
  if (feet >= surface - (wasOn ? STAIRS.above : 1) && feet <= surface + STAIRS.below) return true;
  return prevFeet <= surface + 1 && feet >= surface;
}
