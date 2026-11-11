// Builds an adventure level's map (see systems/adventureMap.js for what each letter is) from named
// pieces, so a big level reads as its sections rather than as rows of letters:
//   ground(from, to, top)  solid ground from column `from` to `to`, its surface at row `top`
//   gap(from, to)          no ground there at all: falling in loses a heart and goes back to the checkpoint
//   island(from, to, row)  a floating island; bridge(from, to, row) a thin one
//   ladder(col, top, bottom)  from the island at `top` down to `bottom`
//   put(col, row, letter)  one thing: a coin, an enemy, a sign...
//   coins(from, to, row)   a line of coins; arc(from, to, row, rise) coins over a jump
//   mover(col, row, { across, up, width, speed })  a moving log: it starts at (col, row), its left
//                          end, and glides `across` cells sideways and `up` cells up (negative for
//                          left or down), and back. movers() lists them for the level.
// Everything but ground and gaps must go in an empty cell, so pieces can't silently overwrite each other.
export function mapBuilder(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  const movers = [];
  const inside = (c, r) => {
    if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || c >= cols || r < 0 || r >= rows) throw new Error(`(${c}, ${r}) is outside the map`);
  };
  const place = (c, r, letter, over = '.') => {
    inside(c, r);
    if (!over.includes(grid[r][c])) throw new Error(`(${c}, ${r}) already has ${grid[r][c]}, so ${letter} can't go there`);
    grid[r][c] = letter;
  };
  const span = (from, to, each) => { for (let c = from; c <= to; c++) each(c); };
  const builder = {
    ground(from, to, top) {
      span(from, to, (c) => { for (let r = 0; r < rows; r++) { inside(c, r); grid[r][c] = r >= top ? '#' : (grid[r][c] === '#' ? '.' : grid[r][c]); } });
      return builder;
    },
    gap(from, to) {
      span(from, to, (c) => { for (let r = 0; r < rows; r++) if (grid[r][c] === '#') grid[r][c] = '.'; });
      return builder;
    },
    island(from, to, row) { span(from, to, (c) => place(c, row, '=')); return builder; },
    bridge(from, to, row) { span(from, to, (c) => place(c, row, '-')); return builder; },
    // Its top cell is on the island's row, and is part of the island.
    ladder(col, top, bottom) {
      for (let r = top; r <= bottom; r++) place(col, r, 'H', r === top ? '=.' : '.');
      return builder;
    },
    put(col, row, letter) { place(col, row, letter); return builder; },
    coins(from, to, row) { span(from, to, (c) => place(c, row, 'o')); return builder; },
    // Coins rising and falling over a jump: `rise` rows higher in the middle than at the ends.
    arc(from, to, row, rise) {
      const mid = (from + to) / 2, half = (to - from) / 2 || 1;
      span(from, to, (c) => place(c, row - Math.round(rise * (1 - ((c - mid) / half) ** 2)), 'o'));
      return builder;
    },
    mover(col, row, { across = 0, up = 0, width = 3, speed } = {}) {
      inside(col, row);
      movers.push({ col, row, width, across, up, ...(speed ? { speed } : {}) });
      return builder;
    },
    rows: () => grid.map((r) => r.join('')),
    movers: () => movers.map((m) => ({ ...m })),
  };
  return builder;
}
