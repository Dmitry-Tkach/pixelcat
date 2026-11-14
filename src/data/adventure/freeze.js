// The freeze round (data/adventure/ammo.js): the enemy it hits is frozen in a block of ice. Frozen,
// it can't move, attack or hurt the cat, and the cat can stand on it, to reach somewhere higher. It
// cracks and shakes when it's about to thaw. Any other round, a dash, a slide or the rage shatters
// it, which knocks the enemy out. Another freeze round makes the ice last again. A boss is too big
// to freeze: it stings him instead, by his damage table (data/adventure/bossFights.js).
//   ms: how long the ice lasts. crackMs: how long before thawing it cracks and shakes. shakePx: how
//   far it shakes then. pad: how much bigger than the enemy's body the ice block is, each way.
//   tint: the enemy's colour inside the ice. alpha: how see-through the ice is. shards: how many
//   pieces fly when it shatters or thaws.
export const FREEZE = { ms: 5000, crackMs: 1000, shakePx: 2.5, pad: 10, tint: 0x9fdcff, alpha: 0.78, shards: 12, thawShards: 5 };

// The ice after `ms` more: how long it has left, whether it's cracking, and whether it has just
// thawed. Plain numbers, so it can be tested without Phaser.
export function iceAfter(msLeft, ms, { ms: total, crackMs } = FREEZE) {
  const left = Math.max(0, Math.min(total, msLeft) - ms);
  return { left, cracking: left > 0 && left <= crackMs, thawed: msLeft > 0 && left === 0 };
}
