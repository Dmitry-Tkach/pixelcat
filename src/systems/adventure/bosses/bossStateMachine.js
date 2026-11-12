// The states an adventure boss can be in, and the moves allowed between them. Plain code with no
// Phaser, so vitest can test it. The boss's brain (bossBrain.js) decides when to move; this only
// keeps the rules:
// - a move that isn't listed is refused, so a bug can't put him in an impossible state;
// - each state can last a set time, and says once when that time is up;
// - whatever a state holds (its time, its attack) is cleared on leaving it, so nothing from an old
//   state can fire later;
// - a state with no moves out (being beaten) locks him there for good.

// Every state, and where it can go next. See docs/adventure-boss-troll.md.
export const BOSS_STATES = {
  waiting: ['intro'], // before the fight starts
  intro: ['idle'], // his entrance; he can't be hurt
  idle: ['windup', 'roar', 'hurt', 'defeated'], // walking to the cat, between attacks
  windup: ['attack', 'hurt', 'defeated'], // the warning before an attack
  attack: ['recover', 'roar', 'defeated'], // the attack itself
  recover: ['idle', 'windup', 'roar', 'hurt', 'defeated'], // after an attack: stuck, dizzy or landing
  hurt: ['idle', 'roar', 'defeated'], // staggered by a big hit
  roar: ['idle'], // starting a new part; he can't be hurt
  defeated: [], // beaten: nothing happens after this
};

export class BossStateMachine {
  constructor(states = BOSS_STATES, initial = 'waiting') {
    this.states = states;
    this.state = initial;
    this.elapsed = 0;
    this.seconds = null;
    this.data = {};
    this.timeUpSaid = false;
  }

  is(state) {
    return this.state === state;
  }

  get isLocked() {
    return this.states[this.state].length === 0;
  }

  canGo(next) {
    return this.states[this.state].includes(next);
  }

  // Moves to `next`, for `seconds` (null: until something else moves him on), holding `data`
  // (such as which attack). Returns false, and changes nothing, for a move that isn't allowed.
  to(next, { seconds = null, ...data } = {}) {
    if (!this.canGo(next)) return false;
    this.state = next;
    this.elapsed = 0;
    this.seconds = seconds;
    this.data = data;
    this.timeUpSaid = false;
    return true;
  }

  // Moves time on. Returns true once, on the update the state's time runs out.
  update(seconds) {
    this.elapsed += seconds;
    if (this.seconds === null || this.timeUpSaid || this.elapsed < this.seconds) return false;
    this.timeUpSaid = true;
    return true;
  }
}
