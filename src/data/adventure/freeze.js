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

// Freezing a small trap with a freeze round (systems/adventure/trapIce.js): a mace stops mid-swing,
// a crusher stops where it is, a dart idol stops shooting. Frozen, it can't hurt, and a mace's ball
// is a block of ice the cat can stand on. The guardian is too big to freeze, and a mushroom isn't a
// danger. It cracks and shakes, then thaws, the way an enemy's ice does (FREEZE's look).
// A trap is bigger than an enemy: it takes `shots` freeze rounds, close together, to freeze. Each
// one frosts it more (frostTints, lightest first); with no round for frostFadeMs, the frost melts.
//   kinds: the traps a freeze round freezes. ms: how long the ice lasts. crackMs: how long before
//   thawing it cracks and shakes. pad: px the ice is bigger than the trap each way. ballShare: half
//   a mace ball's ice block, as a share of the ball's height.
export const TRAP_FREEZE = {
  kinds: ['mace', 'crusher', 'idol'], ms: 5000, crackMs: 1000, pad: 8, ballShare: 0.4,
  shots: 3, frostFadeMs: 2500, frostTints: [0xe2f4ff, 0xc0e8ff],
};

// A freeze round reaches a trap with `frost` rounds in it already: its frost now, and whether it
// freezes (then its frost starts again from nothing).
export function frostAfterHit(frost, { shots } = TRAP_FREEZE) {
  const now = frost + 1;
  return now >= shots ? { frost: 0, freezes: true } : { frost: now, freezes: false };
}

export const canFreezeTrap = (kind) => TRAP_FREEZE.kinds.includes(kind);

// The block of ice round a frozen mace's ball (its middle at `ball`), which the cat can stand on.
export function frozenBallBlock(ball, ballHeight, { ballShare } = TRAP_FREEZE) {
  const half = ballHeight * ballShare;
  return { left: ball.x - half, right: ball.x + half, top: ball.y - half, bottom: ball.y + half };
}
