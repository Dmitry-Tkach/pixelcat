import { PILLAR } from '../../data/adventure/pillars.js';
import { columnSpan } from './earthColumns.js';

// Where an earth pillar (a level's column: { col, width, top, bottom }) is drawn from the pillar
// kit (data/adventure/pillars.js), in px. Plain code, no Phaser (AdventureScenery draws it; the
// level preview too).
//   sizes: the kit's pieces as cut, { top, trunk, foot }, each { w, h }.
//   returns { x, top, bottom, scale, flare, foot }: the middle of the pillar, its top and bottom (it
//   reaches into the island over it and what it stands on, columnSpan), the scale its pieces are shown
//   at (never over 1), and whether it has a flare and a foot (only against something solid).
export function pillarLayout(column, map, tile, sizes) {
  const span = columnSpan(column, map, tile);
  // The run of solid cells in a row that the pillar's cells are under or on, in px, or null.
  const runAt = (row) => {
    if (row < 0 || row >= map.length) return null;
    const line = map[row];
    let a = column.col, b = column.col + column.width - 1;
    if (![...line.slice(a, b + 1)].every((ch) => ch !== '.')) return null;
    while (a > 0 && line[a - 1] !== '.') a--;
    while (b < line.length - 1 && line[b + 1] !== '.') b++;
    return { left: a * tile, right: (b + 1) * tile };
  };
  const above = runAt(column.top - 1), below = runAt(column.bottom + 1);
  const fits = [(column.width * tile + PILLAR.bulge) / sizes.trunk.w];
  if (above) fits.push((above.right - above.left - 2 * PILLAR.margin) / sizes.top.w);
  if (below) fits.push((below.right - below.left - 2 * PILLAR.margin) / sizes.foot.w);
  const ends = (above ? sizes.top.h : 0) + (below ? sizes.foot.h : 0);
  if (ends) fits.push(span.h / (ends * (1 - PILLAR.overlap)));
  const scale = Math.min(1, ...fits);
  // Its middle: under its cells, moved in if its flare or foot would reach past an island's end.
  let x = span.x + span.w / 2;
  for (const [run, size] of [[above, sizes.top], [below, sizes.foot]]) {
    if (!run) continue;
    const half = (size.w * scale) / 2 + PILLAR.margin;
    x = Math.min(Math.max(x, run.left + half), run.right - half);
  }
  return { x, top: span.y, bottom: span.y + span.h, scale, flare: Boolean(above), foot: Boolean(below) };
}
