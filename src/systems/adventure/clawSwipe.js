// The cat's claw swipe: his close attack with bare paws, and when the minigun is out of rounds. X
// swipes once (systems/AdventureMoves.js plays it); the swipe strikes everything in front of him,
// within reach, part way through his animation. Plain logic, without Phaser, so it can be tested.

// ms: how long the swipe animation shows (his 4 frames at 14 a second). hitMs: when it strikes, as
// his paw sweeps through. cooldownMs: the least time from one swipe to the next. reach: how far in
// front of his body it strikes, in px (about a tile). above: how far over his head it reaches, for
// tall enemies. boss: the name a boss's damage table lists it by (data/adventure/bossFights.js).
export const CLAW = { ms: 285, hitMs: 130, cooldownMs: 380, reach: 64, above: 16, boss: 'claw' };

// The arc the game draws for the swipe: three white claw marks, sweeping from `from` to `to`
// (radians, 0 straight ahead, down positive), `gap` px apart, fading out over `fadeMs`.
export const CLAW_ARC = { from: -1.1, to: 0.9, width: 5, gap: 9, fadeMs: 170, grow: 1.15, colour: 0xffffff };

// The area the swipe strikes, in front of a body ({ left, right, top, bottom }) facing `dir` (1
// right, -1 left): from his front edge out to `reach`, from just over his head down to his feet.
export function clawArea(body, dir, { reach, above } = CLAW) {
  const front = dir > 0 ? body.right : body.left;
  return {
    left: dir > 0 ? front : front - reach,
    right: dir > 0 ? front + reach : front,
    top: body.top - above,
    bottom: body.bottom,
  };
}

// Whether two boxes ({ left, right, top, bottom }) overlap.
export function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}
