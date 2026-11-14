// Where a level's water is (data/adventure/water.js): every stretch of columns with no tile from the
// water's row to the bottom of the map. Plain code, no Phaser, so tests can check it.
//   returns [{ from, to }]: the first and last column of each stretch.
export function waterRuns(layout, row) {
  const { tiles, rows, cols } = layout;
  const open = (c) => { for (let r = row; r < rows; r++) if (tiles[r][c] >= 0) return false; return true; };
  const runs = [];
  for (let c = 0; c < cols; c++) {
    if (!open(c)) continue;
    const last = runs[runs.length - 1];
    if (last && last.to === c - 1) last.to = c;
    else runs.push({ from: c, to: c });
  }
  return runs;
}

// Whether column `col` (it may be a fraction) is over water.
export const overWater = (runs, col) => runs.some(({ from, to }) => col >= from && col < to + 1);
