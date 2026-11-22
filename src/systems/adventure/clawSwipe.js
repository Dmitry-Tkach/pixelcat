// The cat's claw swipe: his close attack with bare paws, and when the minigun is out of rounds. X
// swipes once (systems/AdventureMoves.js plays it); the swipe strikes everything in front of him,
// within reach, part way through his animation. Plain logic, without Phaser, so it can be tested.

// ms: how long the swipe animation shows (his 4 frames at 14 a second). hitMs: when it strikes, as
// his paw sweeps through. cooldownMs: the least time from one swipe to the next. reach: how far in
// front of his body it strikes, in px (about a tile). above: how far over his head it reaches, for
// tall enemies. boss: the name a boss's damage table lists it by (data/adventure/bossFights.js).
// rageReachShare: how much further it reaches in a rage, the slash drawn as much bigger.
export const CLAW = { ms: 285, hitMs: 130, cooldownMs: 380, reach: 64, above: 16, boss: 'claw', rageReachShare: 1.6 };

// The slash the game draws for the swipe: a glowing crescent, drawn once into a texture, swung down
// through the area in front of him, then fading, with sparks flying off.
//   radius: the crescent's outer curve, in px (his reach). thickness: how thick it is in the middle;
//   it thins to points at the ends. from, to: where it starts and ends round the curve, in radians
//   (0 straight ahead, down positive). core: the bright inner edge's share of the thickness.
//   glow, coreColour: its colours. blur: how far the glow spreads, in px. tail: how see-through it
//   is where the swing began (the top), fading in to solid where it ends.
//   swing: how far it turns as it shows, in radians. fadeMs: how long it shows. grow: its size at
//   the start and the end. sparks: how many fly off, how fast (px a second) and how long they last.
export const CLAW_SLASH = {
  radius: 64, thickness: 16, from: -1.2, to: 1.0, core: 0.45,
  glow: 'rgba(255, 201, 74, 0.75)', coreColour: '#ffffff', blur: 10, tail: 0,
  swing: [-0.3, 0.12], fadeMs: 210, grow: [0.8, 1.12],
  sparks: { count: 7, speed: [140, 300], lifespan: 280, tint: [0xffffff, 0xfff1b8, 0xffc94a] },
  key: 'adventure-claw-slash',
};

// A crescent's outline for a 2D canvas: the outer curve round (cx, cy) from `from` to `to`, and
// back by a gentler curve that's `thickness` inside it halfway along, meeting it in points at the ends.
export function crescentPath(ctx, cx, cy, radius, thickness, from, to) {
  const at = (r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  const [sx, sy] = at(radius, from);
  const [ex, ey] = at(radius, to);
  const [mx, my] = at(radius - thickness, (from + to) / 2);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, from, to);
  // The inner curve's control point, so the curve passes through (mx, my) halfway.
  ctx.quadraticCurveTo(2 * mx - (sx + ex) / 2, 2 * my - (sy + ey) / 2, sx, sy);
  ctx.closePath();
}

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
