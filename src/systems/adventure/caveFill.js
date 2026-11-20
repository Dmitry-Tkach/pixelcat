// Where a level's cave wall is drawn (systems/adventure/AdventureScenery.js): its caves' cells
// (level.caves, rectangles), and the ground cells round them, as the ground's edge tiles are wavy
// and see-through at their edges, and the sky showed through between them and the cave. A ground
// cell that also borders the open air outside (the outside of a hill) is left alone, so the wall
// never shows outside, unless `atMouths` (caveShades, which fades the wall out towards the air
// there). Given as runs along each row, so each is drawn as one strip. Plain code.
const NEIGHBOURS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const SOLID = new Set(['#', 'Z']);

export function caveRuns(map, caves = [], { atMouths = false } = {}) {
  const rows = map.length, cols = map[0].length;
  const key = (c, r) => `${c},${r}`;
  const cave = new Set();
  for (const { cols: [c0, c1], rows: [r0, r1] } of caves) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cave.add(key(c, r));
  }
  const inside = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows;
  const outside = (c, r) => inside(c, r) && !SOLID.has(map[r][c]) && !cave.has(key(c, r));
  const cells = new Set(cave);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (map[r][c] !== '#') continue;
      const around = NEIGHBOURS.map(([dc, dr]) => [c + dc, r + dr]);
      if (around.some(([x, y]) => cave.has(key(x, y))) && (atMouths || !around.some(([x, y]) => outside(x, y)))) cells.add(key(c, r));
    }
  }
  // Runs along each row.
  const runs = [];
  for (let r = 0; r < rows; r++) {
    let from = null;
    for (let c = 0; c <= cols; c++) {
      const on = c < cols && cells.has(key(c, r));
      if (on && from === null) from = c;
      if (!on && from !== null) { runs.push({ row: r, from, to: c - 1 }); from = null; }
    }
  }
  return runs;
}

// The cave wall's cells (caveRuns), faded where the cave opens to the open air (its mouth: the end
// of a mine, a hole down into it), so the wall melts into the daylight there instead of stopping in
// a straight line. Each corner of a cell is as see-through as it is near the air: clear on the
// air's edge, solid MOUTH_FADE cells in. Plain code.
//   returns { runs: [{ row, from, to }]: cells solid all over, as runs along each row;
//             fades: [{ col, row, alpha: [topLeft, topRight, bottomLeft, bottomRight] }] }.
export const MOUTH_FADE = 2; // cells

export function caveShades(map, caves = []) {
  const rows = map.length, cols = map[0].length;
  const key = (c, r) => `${c},${r}`;
  const wall = new Set();
  // The ground round a mouth too: its wavy edge would show the sky in a box, the cave faded beside it.
  for (const { row, from, to } of caveRuns(map, caves, { atMouths: true })) for (let c = from; c <= to; c++) wall.add(key(c, row));
  const cave = new Set();
  for (const { cols: [c0, c1], rows: [r0, r1] } of caves) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cave.add(key(c, r));
  const outside = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows && !SOLID.has(map[r][c]) && !cave.has(key(c, r));
  // The air at a mouth: open air beside the cave itself (not the sky over the hill it's in).
  const mouth = (c, r) => outside(c, r) && NEIGHBOURS.some(([dc, dr]) => cave.has(key(c + dc, r + dr)));
  // How many cells each wall cell is from a mouth's air (4 ways), or Infinity.
  const dist = new Map();
  let edge = [];
  for (const k of wall) {
    const [c, r] = k.split(',').map(Number);
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => mouth(c + dc, r + dr))) { dist.set(k, 1); edge.push([c, r]); }
  }
  for (let d = 2; edge.length; d++) {
    const next = [];
    for (const [c, r] of edge) {
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = key(c + dc, r + dr);
        if (wall.has(k) && !dist.has(k)) { dist.set(k, d); next.push([c + dc, r + dr]); }
      }
    }
    edge = next;
  }
  // A corner's see-through-ness: from the nearest of the four cells round it.
  const near = (c, r) => (mouth(c, r) ? 0 : dist.get(key(c, r)) ?? Infinity);
  const corner = (x, y) => Math.min(1, Math.min(near(x - 1, y - 1), near(x, y - 1), near(x - 1, y), near(x, y)) / MOUTH_FADE);
  const solid = new Set();
  const fades = [];
  for (const k of wall) {
    const [c, r] = k.split(',').map(Number);
    const alpha = [corner(c, r), corner(c + 1, r), corner(c, r + 1), corner(c + 1, r + 1)];
    if (alpha.every((a) => a === 1)) solid.add(k);
    else fades.push({ col: c, row: r, alpha });
  }
  const runs = [];
  for (let r = 0; r < rows; r++) {
    let from = null;
    for (let c = 0; c <= cols; c++) {
      const on = c < cols && solid.has(key(c, r));
      if (on && from === null) from = c;
      if (!on && from !== null) { runs.push({ row: r, from, to: c - 1 }); from = null; }
    }
  }
  return { runs, fades };
}
