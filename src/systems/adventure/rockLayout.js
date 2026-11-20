import { ROCK_DECOR } from '../../data/adventure/rocks.js';
import { cellRandom } from './cellRandom.js';

// Works out how a rock (data/adventure/rocks.js) is built from the kit: where its fill goes, where
// its edges run, which corners it has, and where its decoration sits, all in cells. Plain code, no
// Phaser, so tests can check it (systems/adventure/AdventureRocks.js draws it).
//   returns {
//     fills: [{ cols: [from, to], rows: [from, to] }]: boxes of fill that don't overlap;
//     tops: [{ row, from, to, left, right }]: the top edge along a row, from column to column, and
//       its corner at each end: 'outer' (the rock turns down) or 'inner' (a wall rises there);
//     sides: [{ col, from, to, side }]: a side edge down a column, from row to row; side -1 its left
//       side, 1 its right;
//     waterline: [{ row, from, to }]: its wet foot, along its bottom row (foot: 'water' only);
//     decor: [{ col, row, place, picture }]: place is face, underTop or onTop (ROCK_DECOR).
//   }

const key = (c, r) => `${c},${r}`;

// The rock's cells, as a set of "col,row".
export function rockCells({ parts }) {
  const cells = new Set();
  for (const { cols: [c0, c1], rows: [r0, r1] } of parts) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells.add(key(c, r));
  }
  return cells;
}

// Runs of cells in a line where `keep` holds: [{ at, from, to }].
function runs(cells, lines, along, keep) {
  const out = [];
  for (const at of lines) {
    let from = null, last = null;
    for (const i of [...along, null]) {
      const on = i !== null && keep(at, i);
      if (on && from === null) from = i;
      if (!on && from !== null) { out.push({ at, from, to: last }); from = null; }
      last = i;
    }
  }
  return out;
}

const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function rockLayout(rock) {
  const cells = rockCells(rock);
  const has = (c, r) => cells.has(key(c, r));
  const all = [...cells].map((k) => k.split(',').map(Number));
  const colsAll = span(Math.min(...all.map(([c]) => c)), Math.max(...all.map(([c]) => c)));
  const rowsAll = span(Math.min(...all.map(([, r]) => r)), Math.max(...all.map(([, r]) => r)));

  // The fill: each row's runs, rows with the same runs one under another joined into one box.
  const fills = [];
  let open = [];
  for (const r of [...rowsAll, null]) {
    const now = r === null ? [] : runs(cells, [r], colsAll, (row, c) => has(c, row));
    const next = [];
    for (const run of now) {
      const same = open.find((box) => box.cols[0] === run.from && box.cols[1] === run.to);
      if (same) { same.rows[1] = r; next.push(same); } else next.push({ cols: [run.from, run.to], rows: [r, r] });
    }
    fills.push(...open.filter((box) => !next.includes(box)));
    open = next;
  }

  const tops = runs(cells, rowsAll, colsAll, (r, c) => has(c, r) && !has(c, r - 1)).map(({ at: row, from, to }) => ({
    row, from, to, left: has(from - 1, row) ? 'inner' : 'outer', right: has(to + 1, row) ? 'inner' : 'outer',
  }));
  const sides = [
    ...runs(cells, colsAll, rowsAll, (c, r) => has(c, r) && !has(c - 1, r)).map(({ at: col, from, to }) => ({ col, from, to, side: -1 })),
    ...runs(cells, colsAll, rowsAll, (c, r) => has(c, r) && !has(c + 1, r)).map(({ at: col, from, to }) => ({ col, from, to, side: 1 })),
  ];
  const waterline = rock.foot === 'water'
    ? runs(cells, rowsAll, colsAll, (r, c) => has(c, r) && !has(c, r + 1)).map(({ at: row, from, to }) => ({ row, from, to }))
    : [];

  // Decoration, top to bottom, left to right, never next to another.
  const decor = [];
  const taken = new Set();
  const near = (c, r) => [-1, 0, 1].some((dc) => [-1, 0, 1].some((dr) => taken.has(key(c + dc, r + dr))));
  const inside = (c, r) => has(c - 1, r) && has(c + 1, r);
  for (const r of rowsAll) {
    for (const c of colsAll) {
      if (!has(c, r) || !inside(c, r)) continue;
      const place = !has(c, r - 1) ? 'onTop'
        : !has(c, r - 2) ? 'underTop'
          : has(c, r + 1) && inside(c, r - 1) && inside(c, r + 1) ? 'face' : null;
      if (!place || near(c, r) || cellRandom(c, r, 31) >= ROCK_DECOR[place].share) continue;
      const { pictures } = ROCK_DECOR[place];
      decor.push({ col: c, row: r, place, picture: pictures[Math.floor(cellRandom(c, r, 32) * pictures.length)] });
      taken.add(key(c, r));
    }
  }
  return { fills, tops, sides, waterline, decor };
}

// What's wrong with a level's rocks, as messages.
export function rockProblems(level) {
  const errors = [];
  const rows = level.map.length, cols = level.map[0].length;
  for (const [i, rock] of (level.rocks ?? []).entries()) {
    const name = `rock ${i + 1}`;
    if (!rock.parts?.length) { errors.push(`${name} has no parts`); continue; }
    for (const { cols: [c0, c1] = [], rows: [r0, r1] = [] } of rock.parts) {
      if (!(c0 <= c1 && r0 <= r1)) errors.push(`${name}: a part must run from a cell to one at or after it`);
      else if (c0 < 0 || r0 < 0 || c1 >= cols || r1 >= rows) errors.push(`${name}: a part is outside the map`);
    }
    if (rock.foot !== undefined && rock.foot !== 'water') errors.push(`${name}: its foot must be 'water' or left out`);
  }
  return errors;
}
