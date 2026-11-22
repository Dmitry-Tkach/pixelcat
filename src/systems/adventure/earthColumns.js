// Where an earth column (a level's columns: { col, width, top, bottom }, scenery holding an island
// up) is drawn, in px. Its cells run from row top to row bottom; it reaches REACH px further up
// into the island over it, and down into the ground under it, behind them, so it joins them with
// no gap under an island's rounded underside. Over or under empty cells it stops at its own cells.
// Plain code, no Phaser (AdventureScenery draws it; the level preview too).
export const COLUMN_REACH = 40; // px: deep enough to hide behind a tile's rounded edge, short of its top

export function columnSpan({ col, width, top, bottom }, map, tile) {
  const solidRow = (row) => row >= 0 && row < map.length && [...map[row].slice(col, col + width)].some((ch) => ch !== '.');
  const y0 = top * tile - (solidRow(top - 1) ? COLUMN_REACH : 0);
  const y1 = (bottom + 1) * tile + (solidRow(bottom + 1) ? COLUMN_REACH : 0);
  return { x: col * tile, y: y0, w: width * tile, h: y1 - y0 };
}
