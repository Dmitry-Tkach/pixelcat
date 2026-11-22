// The mole miner's steps (entities/AdventureMole.js), as plain code so tests can follow it:
//   hidden   under its mound. Once it has waited restMs, the cat coming near brings it up.
//   rising   popping out of the ground, riseMs.
//   up       out: it swings at the cat. After upMs, or `swings` swings, it goes back down, but never
//            in the middle of a swing.
//   sinking  back into the ground, riseMs, and it's hidden again.
// sees: how close across (px) the cat must be to bring it up; levelWithin: how far his feet can be
// above or below its own. swingSees: how close in front it swings at him.
export const MOLE = { sees: 4 * 64, levelWithin: 80, swingSees: 120, riseMs: 430, upMs: 3200, swings: 2, restMs: 1500 };

// One step: the mole's state ({ state, ms, swings }) `ms` later, and `changed`: the state it has
// just changed to, if it has. near: the cat is near; attacking: it's in the middle of a swing.
export function moleStep(mole, ms, { near, attacking }, rules = MOLE) {
  const now = { ...mole, ms: mole.ms + ms };
  const to = (state) => ({ state: { state, ms: 0, swings: state === 'up' ? 0 : now.swings }, changed: state });
  switch (now.state) {
    case 'hidden':
      return near && now.ms >= rules.restMs ? to('rising') : { state: now };
    case 'rising':
      return now.ms >= rules.riseMs ? to('up') : { state: now };
    case 'up':
      return !attacking && (now.ms >= rules.upMs || now.swings >= rules.swings) ? to('sinking') : { state: now };
    case 'sinking':
      return now.ms >= rules.riseMs ? to('hidden') : { state: now };
    default:
      return { state: now };
  }
}
