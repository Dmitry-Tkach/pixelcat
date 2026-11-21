import { SCAFFOLD } from '../../data/adventure/scaffolds.js';

// Where a walkway's pieces go (data/adventure/scaffolds.js), in cells: its posts, each from under
// its deck down to the first tile under it (ground, an island, a walkway, a pool's floor), or the
// map's bottom; and a brace between each two posts next to each other that are braceMin to braceMax
// cells apart, as tall as they're apart, but no taller than the shorter post. Plain code, no Phaser.
//   tiles: the level's tiles (readAdventureMap), -1 for empty.
export function scaffoldLayout({ from, to, row, posts }, tiles) {
  const cols = [...new Set(posts ?? [from, to])].sort((a, b) => a - b);
  const placed = cols.map((col) => {
    let foot = row + 1;
    while (foot < tiles.length && (tiles[foot]?.[col] ?? -1) < 0) foot++;
    return { col, top: row + 1, bottom: foot }; // bottom: the row it stands on (its foot at that row's top)
  });
  const braces = [];
  for (let i = 1; i < placed.length; i++) {
    const a = placed[i - 1], b = placed[i];
    const gap = b.col - a.col, tall = Math.min(a.bottom, b.bottom) - a.top;
    if (gap < SCAFFOLD.braceMin || gap > SCAFFOLD.braceMax || tall < 2) continue;
    braces.push({ from: a.col, to: b.col, top: a.top, rows: Math.min(gap, tall) });
  }
  return { posts: placed, braces };
}

// What's wrong with a level's walkways, as messages: each on the map's bridge cells, its posts
// under it.
export function walkwayProblems(level) {
  const errors = [];
  for (const [i, w] of (level.walkways ?? []).entries()) {
    const name = `walkway ${i + 1}`;
    if (!(w.from <= w.to)) { errors.push(`${name} must run from a column to one at or after it`); continue; }
    for (let c = w.from; c <= w.to; c++) if (level.map[w.row]?.[c] !== '-') errors.push(`${name}'s cell (${c}, ${w.row}) isn't a bridge cell`);
    for (const col of w.posts ?? []) if (col < w.from || col > w.to) errors.push(`${name}'s post at column ${col} isn't under it`);
  }
  return errors;
}
