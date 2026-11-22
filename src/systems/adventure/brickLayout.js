// Where a masonry box's pieces go (data/adventure/bricks.js), in cells. Plain code, no Phaser.
//   solid(c, r): whether a cell is solid ground (so a wall's edge against more ground has no strip:
//   the wall goes on into it).
// A wall: its fill over the whole box; its top strip where the cell over it is open; a side strip
// down each side, on the rows where the cell beside it is open, with a cap where that run starts at
// the wall's top. A pillar: its head on its top row, its trunk down to its foot, on its bottom row.
export function brickLayout({ cols: [from, to], rows: [top, bottom], look = 'wall' }, solid) {
  if (look === 'pillar') return { look, from, to, top, bottom };
  const tops = [];
  for (let c = from; c <= to; c++) {
    if (solid(c, top - 1)) continue;
    const last = tops.at(-1);
    if (last && last.to === c - 1) last.to = c; else tops.push({ from: c, to: c, row: top });
  }
  const sides = [];
  for (const [col, side] of [[from, -1], [to, 1]]) {
    let run = null;
    for (let r = top; r <= bottom; r++) {
      if (solid(col + side, r)) { run = null; continue; }
      if (run) run.to = r;
      else { run = { col, side, from: r, to: r, cap: r === top && !solid(col, r - 1) }; sides.push(run); }
    }
  }
  return { look, fill: { from, to, top, bottom }, tops, sides };
}

// Every cell of a level's masonry, as "col,row" (the ground the kit draws instead of earth).
export function masonryCells(masonry = []) {
  const cells = new Set();
  for (const { cols: [c0, c1], rows: [r0, r1] } of masonry) for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) cells.add(`${c},${r}`);
  return cells;
}

// What's wrong with a level's masonry, as messages: each box all solid ground on the map.
export function masonryProblems(level) {
  const errors = [];
  for (const [i, m] of (level.masonry ?? []).entries()) {
    const { cols: [c0, c1], rows: [r0, r1] } = m;
    if (!(c0 <= c1 && r0 <= r1)) { errors.push(`masonry ${i + 1} must be a box`); continue; }
    if (m.look === 'pillar' && c1 - c0 !== 1) errors.push(`masonry ${i + 1}: a pillar is two cells wide`);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (level.map[r]?.[c] !== '#') { errors.push(`masonry ${i + 1}'s cell (${c}, ${r}) isn't ground`); return errors; }
  }
  return errors;
}
