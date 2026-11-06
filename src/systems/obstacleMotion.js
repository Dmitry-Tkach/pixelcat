// Calculations for moving obstacles, with no Phaser dependency so they can be unit-tested.
// Levels say where a moving obstacle meets the cat. These work out when and where it must start.

// How far along the level the cat is when the obstacle starts moving.
export function activationCatX(meetAt, catSpeed, leadSeconds) {
  return meetAt - catSpeed * leadSeconds;
}

// Where the obstacle waits, so it reaches `meetAt` just as a full-speed cat does.
export function startX(meetAt, speed, leadSeconds) {
  return meetAt + speed * leadSeconds;
}

// Height along a jump-shaped arc: zero at both ends, and `height` at the midpoint.
export function arcHeight(elapsed, seconds, height) {
  if (elapsed <= 0 || elapsed >= seconds) return 0;
  const u = (2 * elapsed) / seconds - 1;
  return height * (1 - u * u);
}

// A leap starts early enough that its highest point arrives as the obstacle reaches the cat.
export function shouldStartLeap(distance, catSpeed, speed, leapSeconds) {
  return distance <= ((catSpeed + speed) * leapSeconds) / 2;
}

// Where a wagon's rear starts, so that it reaches `meetAt` just as a cat at top speed does. It starts
// driving when that cat is `startAhead` from there, at `ratio` of the cat's speed.
export function wagonStartX(meetAt, startAhead, ratio) {
  return meetAt - startAhead * ratio;
}

// Puts a time into the range -cycle/2 to cycle/2, measured from the nearest repeat of something.
export function wrapToCycle(seconds, cycle) {
  return seconds - cycle * Math.round(seconds / cycle);
}

// How far a car is across the road: -1 at the far side, 0 in the cat's lane, 1 at the near side.
// It's in the lane `delaySeconds` after `meetSeconds`.
export function crossingProgress(elapsed, meetSeconds, crossSeconds, delaySeconds = 0) {
  return (2 * (elapsed - meetSeconds - delaySeconds)) / crossSeconds;
}

// How strongly a pulsing obstacle is on, from 0 to 1, timed so that it's fully `position`
// ('on' or 'off') when a full-speed cat arrives at `meetSeconds`.
export function pulseStrength(elapsed, meetSeconds, period, position) {
  const wave = Math.cos((2 * Math.PI * (elapsed - meetSeconds)) / period);
  const towardOn = position === 'on' ? wave : -wave;
  return Math.max(0, Math.min(1, towardOn * 2 + 0.5));
}

// Height of a swinging obstacle over time, timed to be at `position` ('low' or 'high')
// when a full-speed cat arrives at `meetSeconds`.
export function swingHeight(elapsed, meetSeconds, period, maxHeight, position) {
  const wave = Math.cos((2 * Math.PI * (elapsed - meetSeconds)) / period);
  const towardTop = position === 'high' ? wave : -wave;
  return (maxHeight / 2) * (1 + towardTop);
}
