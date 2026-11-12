import { smash } from './smash.js';

// The code for each of a boss's attacks, by its name in data/adventure/bossFights.js. Each says how
// his body shows and carries out one attack: windup(boss, data), the warning; attack(boss, data),
// the attack itself; recover(boss, data, kind), what follows; and, for attacks his body moves (the
// charge, the jump), update(boss, ms, data), which calls boss.finishAttack() when it's over.
// Several attacks can share one piece of code. His brain only picks attacks listed here.
export const BOSS_ATTACKS = {
  quickSmash: smash,
  bigSmash: smash,
};
