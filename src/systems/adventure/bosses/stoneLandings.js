// Where a boss's stone burst lands. Plain code with no Phaser, so vitest can test it.
//
// The stones look random, but the burst is fair:
// - one stone always comes down where the cat stands, so standing still never works;
// - the rest spread out, never two on top of each other;
// - there's always a gap with no stone, at least `gap` px wide, edge to edge, to escape into.
//
// left, right: the arena's open floor, inside its walls. catX: where the cat stands. count: how many
// stones. stoneW: one stone's width, where it hurts. gap: the safe gap to keep. random: 0 to 1.
// Returns each stone's x, the cat's first.
const SPREAD = 2; // stones land at least this many stone widths apart
const TRIES = 40; // tries at a place for each stone, before giving up on it

export function stoneLandings({ left, right, catX, count, stoneW, gap, random = Math.random }) {
  const lo = left + stoneW / 2;
  const hi = right - stoneW / 2;
  const landings = [Math.min(hi, Math.max(lo, catX))];
  for (let i = 1; i < count; i++) {
    for (let t = 0; t < TRIES; t++) {
      const x = lo + random() * (hi - lo);
      if (landings.every((other) => Math.abs(other - x) >= stoneW * SPREAD)) {
        landings.push(x);
        break;
      }
    }
  }
  // Too crowded to escape: take stones away, the last placed first, until a gap is clear. The
  // stone at the cat stays.
  while (landings.length > 1 && widestGap(landings, left, right, stoneW) < gap) landings.pop();
  return landings;
}

// The widest stretch of floor no stone lands on, edge to edge, walls included.
export function widestGap(landings, left, right, stoneW) {
  const edges = [left, ...landings.slice().sort((a, b) => a - b).flatMap((x) => [x - stoneW / 2, x + stoneW / 2]), right];
  let widest = 0;
  for (let i = 0; i < edges.length; i += 2) widest = Math.max(widest, edges[i + 1] - edges[i]);
  return widest;
}
