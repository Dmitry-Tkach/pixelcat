// The kinds of adventure level, and how long each should take a first-time player, from start to
// portal: the owner's plan (2026-11-21). Every level on the road map (roadmap.js) has a kind, so
// its design and the level reviewer (docs/level-review.md) aim at its time.
//   minutes: [shortest, longest] a first playthrough should take.
export const LEVEL_KINDS = {
  short: { name: 'Short action level', minutes: [2, 4] },
  standard: { name: 'Standard platforming', minutes: [5, 8] },
  exploration: { name: 'Longer exploration level', minutes: [10, 15] },
  boss: { name: 'Boss level', minutes: [3, 7] },
  music: { name: 'Music level', minutes: [2, 4] },
  timeAttack: { name: 'Time-attack level', minutes: [40 / 60, 1] },
};

// A level's target time, as words: "5–8 minutes", or "40–60 seconds" under a minute.
export function targetTime(kind) {
  const [lo, hi] = LEVEL_KINDS[kind].minutes;
  return hi <= 1 ? `${Math.round(lo * 60)}–${Math.round(hi * 60)} seconds` : `${lo}–${hi} minutes`;
}
