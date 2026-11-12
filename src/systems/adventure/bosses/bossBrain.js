import { BossStateMachine } from './bossStateMachine.js';

// An adventure boss's brain: it decides what he does, and keeps his health and his parts. Plain code
// with no Phaser, so vitest can test it. It reads his fight from data/adventure/bossFights.js.
//
// His body (with Phaser) calls:
//   start()                  when the fight begins
//   update(seconds, sense)   every frame, with what he can see: `distance`, across, to the cat, and
//                            `catHigh`, whether the cat is up on an island. It returns what just
//                            happened, as events for his body to show: intro, idle, windup, attack,
//                            recover, roar, hurt, hit, defeated.
//   finishAttack(result)     when an attack his body moves (the charge, the jump) is over, with what
//                            happened, such as { hitWall: true }
//   takeHit(kind)            when the cat hits him, with the attack's name. It returns the damage done.
// and reads walkSpeed, touchHurts, clubHurts, isWeak and the rest to move him and hurt the cat.

// The states in which nothing hurts him.
const UNHURT = new Set(['waiting', 'intro', 'roar', 'defeated']);
// What follows an attack that needed something to happen and it didn't, if its data doesn't say.
const MISSED = { kind: 'turn', seconds: 0.5, weak: false };

// Which part he's in at this share of his health: the last one whose mark he's reached.
export function bossPhaseFor(fight, share) {
  let index = 0;
  fight.phases.forEach((phase, i) => {
    if (share <= phase.from) index = i;
  });
  return index;
}

// His full health, or less in the easier try.
export function bossMaxHealth(fight, { assisted = false } = {}) {
  return assisted ? Math.round(fight.health * fight.assist.healthShare) : fight.health;
}

// Whether to offer the easier try, after this many losses to him in a row.
export function offersAssist(fight, lossesInARow) {
  return lossesInARow >= fight.assist.afterLosses;
}

// A part's attacks, each with the range it's picked at in that part.
export function phaseAttacks(fight, phase) {
  return phase.attacks.map((entry) => {
    const attack = typeof entry === 'string' ? entry : entry.attack;
    return { attack, range: (typeof entry === 'string' ? null : entry.range) ?? fight.attacks[attack].range };
  });
}

export class BossBrain {
  // `random` picks his attacks (tests pass their own). `assisted` is the easier try.
  constructor(fight, { random = Math.random, assisted = false } = {}) {
    this.fight = fight;
    this.random = random;
    this.maxHealth = bossMaxHealth(fight, { assisted });
    this.health = this.maxHealth;
    this.machine = new BossStateMachine();
    this.phase = 0;
    this.pendingPhase = null; // a part he's reached, whose roar is still to come
    this.cooldowns = {}; // seconds left before he can pick each attack again
    this.lastAttack = null;
    this.chainNext = null; // the attack he'll do straight after this one
    this.events = [];
  }

  get state() {
    return this.machine.state;
  }

  get attack() {
    return this.machine.data.attack ?? null;
  }

  get attackData() {
    return this.attack ? this.fight.attacks[this.attack] : null;
  }

  get phaseData() {
    return this.fight.phases[this.phase];
  }

  get healthShare() {
    return this.health / this.maxHealth;
  }

  // After an attack: stuck, dizzy, landing or turn.
  get recoverKind() {
    return this.state === 'recover' ? this.machine.data.kind : null;
  }

  // His weak moments: full damage, and a jump on his head counts.
  get isWeak() {
    return this.state === 'recover' && this.machine.data.weak === true;
  }

  get isInvulnerable() {
    return UNHURT.has(this.state);
  }

  get isDefeated() {
    return this.state === 'defeated';
  }

  // Touching him hurts the cat only during attacks that say so (the charge, the jump).
  get touchHurts() {
    return this.state === 'attack' && this.attackData.touchHurts === true;
  }

  // His club hurts only while it lands.
  get clubHurts() {
    return this.state === 'attack' && this.attackData.clubHurts === true;
  }

  // He walks to the cat only between attacks.
  get walkSpeed() {
    return this.state === 'idle' ? this.phaseData.walkSpeed : 0;
  }

  start() {
    this.go('intro', { seconds: this.fight.introSeconds });
  }

  update(seconds, sense = {}) {
    if (this.isDefeated) return this.drain();
    for (const name of Object.keys(this.cooldowns)) this.cooldowns[name] = Math.max(0, this.cooldowns[name] - seconds);
    const timeUp = this.machine.update(seconds);
    switch (this.state) {
      case 'intro':
      case 'hurt':
        if (timeUp) this.toIdle();
        break;
      case 'idle':
        if (this.pendingPhase !== null) this.startRoar();
        else if (this.machine.elapsed >= this.phaseData.pause) this.tryAttack(sense);
        break;
      case 'windup':
        if (timeUp) this.startAttack();
        break;
      case 'attack':
        if (timeUp) this.finishAttack();
        break;
      case 'recover':
        if (timeUp) this.afterRecover();
        break;
      case 'roar':
        if (timeUp) this.toIdle();
        break;
      default:
        break;
    }
    return this.drain();
  }

  // The attack is over. For the charge and the jump his body says when, and what happened; the
  // others end on their own time, or at their limit (maxActive).
  finishAttack(result = {}) {
    if (this.state !== 'attack') return;
    const data = this.attackData;
    const attack = this.attack;
    if (this.pendingPhase !== null) {
      this.startRoar();
      return;
    }
    const recover = data.recover.onlyIf && !result[data.recover.onlyIf] ? data.missed ?? MISSED : data.recover;
    // Between two attacks of a chain there's only a moment, and it isn't a weak one.
    const chained = this.chainNext !== null;
    const seconds = chained ? this.phaseData.chainGap : recover.seconds;
    const weak = chained ? false : recover.weak === true;
    this.go('recover', { seconds, attack, kind: recover.kind, weak });
  }

  // The cat hits him with `kind` (an ammo kind, bolt, stomp, dash or rage). Returns the damage done.
  takeHit(kind) {
    if (this.isInvulnerable) return 0;
    const { fight } = this;
    if (kind === 'stomp' && !this.isWeak) return 0;
    const amount = (fight.damage[kind] ?? 0) * (this.isWeak ? 1 : fight.outsideWeakShare);
    if (amount <= 0) return 0;
    this.health = Math.max(0, this.health - amount);
    this.emit('hit', { kind, amount });
    if (this.health <= 0) {
      this.chainNext = null;
      this.pendingPhase = null;
      this.go('defeated');
      return amount;
    }
    // Past a part's mark, or two at once: one roar, to the furthest part reached.
    const reached = bossPhaseFor(fight, this.healthShare);
    if (reached > Math.max(this.phase, this.pendingPhase ?? -1)) this.pendingPhase = reached;
    if (fight.staggeredBy.includes(kind) && this.machine.canGo('hurt')) {
      this.chainNext = null;
      this.go('hurt', { seconds: fight.staggerSeconds });
    } else if (this.pendingPhase !== null && (this.state === 'idle' || this.state === 'recover')) {
      // A weak moment ends at a new part's mark, so a part can't be skipped by shooting through it.
      this.startRoar();
    }
    return amount;
  }

  // ----- Inside -----

  go(state, options) {
    if (!this.machine.to(state, options)) return false;
    const { seconds, ...data } = options ?? {};
    this.emit(state, data);
    return true;
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  drain() {
    const events = this.events;
    this.events = [];
    return events;
  }

  toIdle() {
    if (this.pendingPhase !== null && this.machine.canGo('roar')) this.startRoar();
    else this.go('idle');
  }

  startRoar() {
    this.phase = this.pendingPhase;
    this.pendingPhase = null;
    this.chainNext = null;
    this.go('roar', { seconds: this.fight.roarSeconds, phase: this.phase });
  }

  tryAttack(sense) {
    const attack = this.chooseAttack(sense);
    if (attack) this.startWindup(attack);
  }

  // The attacks that fit where the cat is and aren't cooling down, not the last one if there's
  // another, picked at random by weight. Null when none fits: he walks on and tries again.
  chooseAttack({ distance = Infinity, catHigh = false } = {}) {
    const { fight } = this;
    const fits = (range) => {
      if (range === 'any') return true;
      if (range === 'high') return catHigh;
      if (catHigh) return false;
      return range === 'near' ? distance <= fight.nearRange : distance > fight.nearRange;
    };
    let ready = phaseAttacks(fight, this.phaseData)
      .filter(({ attack, range }) => fits(range) && !(this.cooldowns[attack] > 0))
      .map(({ attack }) => attack);
    if (ready.length > 1) ready = ready.filter((attack) => attack !== this.lastAttack);
    if (ready.length === 0) return null;
    const weights = ready.map((attack) => fight.attacks[attack].weight ?? 1);
    let pick = this.random() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < ready.length; i++) {
      pick -= weights[i];
      if (pick < 0) return ready[i];
    }
    return ready[ready.length - 1];
  }

  startWindup(attack, { chained = false } = {}) {
    const data = this.fight.attacks[attack];
    this.cooldowns[attack] = data.cooldown;
    this.lastAttack = attack;
    this.chainNext = null;
    const { chains = [], chainChance = 0 } = this.phaseData;
    const chain = chained ? null : chains.find(([first]) => first === attack);
    if (chain && this.random() < chainChance) this.chainNext = chain[1];
    this.go('windup', { seconds: data.windup, attack });
  }

  startAttack() {
    const data = this.attackData;
    this.go('attack', { seconds: data.active ?? data.maxActive, attack: this.attack });
  }

  afterRecover() {
    if (this.pendingPhase !== null) {
      this.startRoar();
    } else if (this.chainNext !== null) {
      const next = this.chainNext;
      this.chainNext = null;
      this.startWindup(next, { chained: true });
    } else {
      this.toIdle();
    }
  }
}
