// Whether the cat lands on a platform he can jump up through (a moving log, crumbling leaves) from
// above. Plain numbers, so it can be tested without Phaser.
//
// He lands if he isn't rising past it, and his feet are near its top now, or were above it when the
// frame began. The second matters when he falls fast, after a double jump: in one physics step he
// can fall further than `margin`, and would drop straight through.
//   bottom, prevBottom: his feet now, and when the frame began
//   top, prevTop: the platform's top now, and when the frame began (the same, if it doesn't move)
//   vy, platformVy: his speed and the platform's, down being positive
export const LAND_MARGIN = 18; // his feet can be this far into one and still land on it from above
export const RISING_SLACK = 5; // px a second: rising slower than the platform than this still lands

export function landsFromAbove({ bottom, prevBottom, top, prevTop = top, vy, platformVy = 0 }, margin = LAND_MARGIN) {
  if (vy < platformVy - RISING_SLACK) return false;
  return bottom <= top + margin || prevBottom <= prevTop + margin;
}

// Whether the cat, riding a moving log, is still on it: over it, his feet close to its top, and not
// jumping off. The game then carries him along by however far it moved. (Phaser's own carrying
// misses steps where a log going down drops away from his feet, and counts a frame's movement more
// than once when a frame has several physics steps.)
//   left, right, bottom: his body; top, logLeft, logRight: the log's
export const RIDE_GAP = 6; // px: his feet this far above the log's top still ride it

export function staysOn({ left, right, bottom, vy, top, logLeft, logRight, platformVy = 0 }) {
  // Jumping off: rising faster than the log rises. (On a log going down, he falls slower than it at
  // first, which isn't jumping.)
  if (vy < Math.min(platformVy, 0) - RISING_SLACK) return false;
  return right > logLeft && left < logRight && bottom >= top - RIDE_GAP && bottom <= top + LAND_MARGIN;
}
