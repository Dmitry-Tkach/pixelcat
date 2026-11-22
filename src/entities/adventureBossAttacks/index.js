import { charge } from './charge.js';
import { jumpSlam } from './jumpSlam.js';
import { smash } from './smash.js';
import { stoneBurst } from './stoneBurst.js';

// The code for each of a boss's attacks, by its name in data/adventure/bossFights.js. Each says how
// his body shows and carries out one attack:
//   windup(boss, data)                 the warning
//   attack(boss, data)                 the attack itself
//   update(boss, ms, data)             each frame of an attack his body moves (the charge, the jump),
//                                      which calls boss.finishAttack() when it's over
//   recover(boss, data, kind)          what follows: stuck, dizzy, landing or turn
//   recoverUpdate(boss, ms, data, kind)  each frame of that, if it moves (the dizzy stars)
// Several attacks can share one piece of code. His brain only picks attacks listed here.
export const BOSS_ATTACKS = {
  quickSmash: smash,
  bigSmash: smash,
  stoneBurst,
  charge,
  jumpSlam,
};
