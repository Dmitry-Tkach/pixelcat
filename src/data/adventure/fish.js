// Leaping fish: they jump out of a level's water in an arc and dive back in, over and over, and hurt
// the cat if they touch him. A round knocks one out until its next leap. Plain code, no Phaser, so
// tests can check them (systems/adventure/AdventureFish.js draws them).
//
// A level lists them as fish: [{ col, rise, across, restMs, phaseMs }]:
//   col: the column it leaps from the middle of, at the water's surface;
//   rise: how many cells high its leap goes;
//   across: how many cells it travels in its leap, to the right (negative for left);
//   restMs: how long it stays under water between leaps; phaseMs: how far into its first leap it
//   starts, so fish side by side take turns.

// leapMs: how long one leap takes, from leaving the water to falling back in. hit: the size (px) of
// what hurts the cat, round its middle. flapMs: how often its tail flicks. scale: shown at this size.
export const FISH = { leapMs: 1400, restMs: 1600, rise: 5, across: 2, hit: { w: 44, h: 30 }, flapMs: 130, scale: 1, depth: 4 };

// Where a fish is, `ms` after the level began: { x, y, angle, right, leap } (the middle of it, px;
// the way it points, degrees; whether it's travelling right; which leap this is), or null while it's
// under water. surfaceY: the water's surface, px.
export function fishAt(fish, ms, surfaceY, tile) {
  const { leapMs } = FISH;
  const rise = (fish.rise ?? FISH.rise) * tile;
  const across = (fish.across ?? FISH.across) * tile;
  const cycle = leapMs + (fish.restMs ?? FISH.restMs);
  const into = ms + (fish.phaseMs ?? 0);
  const t = ((into % cycle) + cycle) % cycle;
  if (t >= leapMs) return null;
  const u = t / leapMs;
  const startX = fish.col * tile + tile / 2 - across / 2;
  // A parabola: up `rise` at the middle of the leap, down to the surface at its ends.
  const x = startX + across * u;
  const y = surfaceY - rise * 4 * u * (1 - u);
  const dx = across || 1, dy = -rise * 4 * (1 - 2 * u);
  return { x, y, angle: (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI, right: across >= 0, leap: Math.floor(into / cycle) };
}

// Whether a point (px) is on a fish at (x, y).
export const touchesFish = (place, x, y) => Math.abs(x - place.x) <= FISH.hit.w / 2 && Math.abs(y - place.y) <= FISH.hit.h / 2;

// What's wrong with a level's fish, as messages: each must leap from open water, in a level with water.
export function fishProblems(level) {
  const errors = [];
  const fish = level.fish ?? [];
  if (fish.length && !level.water) errors.push('fish need water: the level has none');
  for (const [i, { col, rise = FISH.rise }] of fish.entries()) {
    const name = `fish ${i + 1}`;
    if (!(rise >= 1)) errors.push(`${name} must leap at least a cell high`);
    if (!level.water) continue;
    const surface = level.map[level.water.row]?.[col];
    if (surface === undefined) errors.push(`${name} is off the map`);
    else if (surface !== '.') errors.push(`${name} must leap from open water, not from column ${col}'s ground`);
  }
  return errors;
}

// Fish that swim in a level's pools (systems/adventure/AdventurePoolFish.js), unlike the leaping
// ones: a level lists them as poolFish: [{ from, to, row }]: each swims to and fro between the
// middles of columns from and to, along row's middle, bobbing gently, turning at each end. Touching
// one hurts the cat; a round knocks it out for good (it spins and sinks away).
//   speed: px a second; bob: px up and down; bobMs: one bob.
export const POOL_FISH = { speed: 110, bob: 10, bobMs: 1600 };

// Where a pool fish is, `ms` after the level began: { x, y, right } (its middle, px; whether it's
// swimming right). Each starts at its `from` end, swimming right.
export function poolFishAt({ from, to, row }, ms, tile) {
  const x0 = from * tile + tile / 2, x1 = to * tile + tile / 2;
  const span = Math.max(1, x1 - x0), trip = (span / POOL_FISH.speed) * 1000;
  const t = ms % (trip * 2);
  const right = t < trip;
  const x = right ? x0 + (t / trip) * span : x1 - ((t - trip) / trip) * span;
  const y = row * tile + tile / 2 + Math.sin((2 * Math.PI * ms) / POOL_FISH.bobMs) * POOL_FISH.bob;
  return { x, y, right };
}
