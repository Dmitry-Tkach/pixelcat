// Where a level's cave wall is drawn (systems/adventure/AdventureScenery.js): its caves' cells
// (level.caves, rectangles), and the ground cells round them, as the ground's edge tiles are wavy
// and see-through at their edges, and the sky showed through between them and the cave. A ground
// cell that also borders the open air outside (the outside of a hill) is left alone, so the wall
// never shows outside. Given as runs along each row, so each is drawn as one strip. Plain code.
const NEIGHBOURS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
const SOLID = new Set(['#', 'Z']);

export function caveRuns(map, caves = []) {
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
      if (around.some(([x, y]) => cave.has(key(x, y))) && !around.some(([x, y]) => outside(x, y))) cells.add(key(c, r));
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
