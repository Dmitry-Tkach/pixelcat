// The fire round (data/adventure/ammo.js): the enemy it hits catches fire. Burning, it can't attack
// (a gunner can't shoot), a walker runs about in a panic, and it loses a hit point every `tickMs`
// until the fire goes out. A burning enemy that touches another sets it alight too. A boss doesn't
// catch fire: the round stings him, by his damage table (data/adventure/bossFights.js).
//   ms: how long it burns. tickMs: how often the fire hurts it, once each, from when it caught.
//   panicSpeed: how much faster than its walk a burning walker runs. tint: its colour, flickering
//   with `flickerTint`. flamesEveryMs: how often flames rise off it.
export const BURN = { ms: 3000, tickMs: 1000, panicSpeed: 2.2, tint: 0xffa070, flickerTint: 0xff5a2a, flamesEveryMs: 45 };

// The fire after `ms` more: how long it has left, how many times it hurts in that time (each time a
// whole tick has burned since it caught), and whether it has just gone out. Plain numbers, so it
// can be tested without Phaser.
export function fireAfter(msLeft, ms, { ms: total, tickMs } = BURN) {
  const before = Math.min(total, msLeft);
  const left = Math.max(0, before - ms);
  const ticks = Math.floor((total - left) / tickMs) - Math.floor((total - before) / tickMs);
  return { left, ticks, out: before > 0 && left === 0 };
}
