// Builds an adventure level's map (see systems/adventureMap.js for what each letter is) from named
// pieces, so a big level reads as its sections rather than as rows of letters:
//   ground(from, to, top)  solid ground from column `from` to `to`, its surface at row `top`
//   gap(from, to)          no ground there at all: falling in loses a heart and goes back to the checkpoint
//   island(from, to, row)  a floating island; bridge(from, to, row) a thin one
//   ladder(col, top, bottom)  from the island at `top` down to `bottom`
//   vine(col, top, bottom)  a climbing vine: a ladder that looks like a vine. vines() lists its cells.
//   cracked(from, to, row)  cracked floor in the ground's surface: it breaks for good when landed on
//   drawbridge(switchCol, switchRow, from, to, row, { shot })  a bridge that drops into place when its
//                          switch is shot or touched (systems/adventure/drawbridges.js); shot: its
//                          switch is out of reach, to be shot from across; look: its planks' picture
//                          (the world's drawbridge plank if none). drawbridges() lists them.
//   put(col, row, letter)  one thing: a coin, an enemy, a sign...
//   coins(from, to, row)   a line of coins; arc(from, to, row, rise) coins over a jump
//   mover(col, row, { across, up, width, speed })  a moving log: it starts at (col, row), its left
//                          end, and glides `across` cells sideways and `up` cells up (negative for
//                          left or down), and back. movers() lists them for the level.
//   wheel(col, row, options)  a water wheel, its hub at (col, row), with seats round it that stay level
//                          (systems/adventure/wheels.js for the options). wheels() lists them.
//   bird(kind, col, row, options)  a pterodactyl, 'diver' or 'hover' (data/adventure/birds.js). birds() lists them.
//   hollow(from, to, top, bottom)  clears the ground in just those rows: a cave in the rock
//   fill(from, to, top, bottom)  solid ground in just those rows, over a hollow (a cave's roof)
//   trap(kind, col, row, options)  a moving trap: a mace, crusher, idol or mushroom (see
//                          data/adventure/traps.js for each kind's options). traps() lists them.
// Everything but ground and gaps must go in an empty cell, so pieces can't silently overwrite each other.
export function mapBuilder(cols, rows) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
  const movers = [];
  const traps = [];
  const wheels = [];
  const birds = [];
  const vines = [];
  const drawbridges = [];
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
    vine(col, top, bottom) {
      builder.ladder(col, top, bottom);
      for (let r = top; r <= bottom; r++) vines.push({ col, row: r });
      return builder;
    },
    drawbridge(switchCol, switchRow, from, to, row, { shot = false, look } = {}) {
      inside(switchCol, switchRow);
      inside(from, row);
      inside(to, row);
      drawbridges.push({ switch: { col: switchCol, row: switchRow }, from, to, row, ...(shot ? { shot } : {}), ...(look ? { look } : {}) });
      return builder;
    },
    cracked(from, to, row) { span(from, to, (c) => place(c, row, 'Z', '#.')); return builder; },
    put(col, row, letter) { place(col, row, letter); return builder; },
    coins(from, to, row) { span(from, to, (c) => place(c, row, 'o')); return builder; },
    // Coins rising and falling over a jump: `rise` rows higher in the middle than at the ends.
    arc(from, to, row, rise) {
      const mid = (from + to) / 2, half = (to - from) / 2 || 1;
      span(from, to, (c) => place(c, row - Math.round(rise * (1 - ((c - mid) / half) ** 2)), 'o'));
      return builder;
    },
    mover(col, row, { across = 0, up = 0, width = 3, speed, arrow, parks, picture } = {}) {
      inside(col, row);
      movers.push({ col, row, width, across, up, ...(speed ? { speed } : {}), ...(arrow ? { arrow } : {}), ...(parks ? { parks } : {}), ...(picture ? { picture } : {}) });
      return builder;
    },
    hollow(from, to, top, bottom) {
      span(from, to, (c) => { for (let r = top; r <= bottom; r++) { inside(c, r); if (grid[r][c] === '#') grid[r][c] = '.'; } });
      return builder;
    },
    fill(from, to, top, bottom) {
      span(from, to, (c) => { for (let r = top; r <= bottom; r++) { inside(c, r); grid[r][c] = '#'; } });
      return builder;
    },
    bird(kind, col, row, options = {}) {
      inside(col, row);
      birds.push({ kind, col, row, ...options });
      return builder;
    },
    wheel(col, row, options = {}) {
      inside(col, row);
      wheels.push({ col, row, ...options });
      return builder;
    },
    trap(kind, col, row, options = {}) {
      inside(col, row);
      traps.push({ kind, col, row, ...options });
      return builder;
    },
    rows: () => grid.map((r) => r.join('')),
    movers: () => movers.map((m) => ({ ...m })),
    traps: () => traps.map((t) => ({ ...t })),
    wheels: () => wheels.map((w) => ({ ...w })),
    birds: () => birds.map((b) => ({ ...b })),
    vines: () => vines.map((v) => ({ ...v })),
    drawbridges: () => drawbridges.map((d) => ({ ...d, switch: { ...d.switch } })),
  };
  return builder;
}

// A level's vine cells (vines()) as runs, one for each vine: { col, top, bottom }.
export function vineRuns(cells) {
  const runs = [];
  for (const { col, row } of [...cells].sort((a, b) => a.col - b.col || a.row - b.row)) {
    const last = runs.at(-1);
    if (last && last.col === col && last.bottom === row - 1) last.bottom = row;
    else runs.push({ col, top: row, bottom: row });
  }
  return runs;
}
