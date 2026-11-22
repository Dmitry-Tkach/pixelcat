import { describe, expect, it } from 'vitest';
import { AMMO } from '../src/data/adventure/ammo.js';
import { BOSSES } from '../src/data/adventure/bosses.js';
import { BOSS_FIGHTS } from '../src/data/adventure/bossFights.js';
import { BossBrain, bossMaxHealth, bossPhaseFor, offersAssist, phaseAttacks } from '../src/systems/adventure/bosses/bossBrain.js';
import { BOSS_STATES, BossStateMachine } from '../src/systems/adventure/bosses/bossStateMachine.js';

const TROLL = BOSS_FIGHTS.troll1;
const STEP = 1 / 60;
const NEAR = { distance: 100 };
const FAR = { distance: 600 };
const HIGH = { distance: 300, catHigh: true };

// A brain for the troll, past his entrance and standing idle. `random` always gives the same number,
// so his picks can be predicted.
function idleTroll({ random = () => 0, assisted = false } = {}) {
  const brain = new BossBrain(TROLL, { random, assisted });
  brain.start();
  run(brain, TROLL.introSeconds + STEP);
  return brain;
}

// Moves time on in small steps, as the game does, and gathers every event.
function run(brain, seconds, sense = FAR) {
  const events = [];
  for (let t = 0; t < seconds; t += STEP) events.push(...brain.update(STEP, sense));
  return events;
}

// Runs until he's in `state`, or gives up after `limit` seconds.
function runUntil(brain, state, sense = FAR, limit = 20) {
  for (let t = 0; t < limit && brain.state !== state; t += STEP) brain.update(STEP, sense);
  return brain.state;
}

describe('the boss state machine', () => {
  it('refuses a move that is not allowed, and changes nothing', () => {
    const machine = new BossStateMachine();
    expect(machine.to('attack')).toBe(false);
    expect(machine.state).toBe('waiting');
    expect(machine.to('intro', { seconds: 1 })).toBe(true);
  });

  it('says once when a state\'s time is up', () => {
    const machine = new BossStateMachine();
    machine.to('intro', { seconds: 0.5 });
    expect(machine.update(0.3)).toBe(false);
    expect(machine.update(0.3)).toBe(true);
    expect(machine.update(0.3)).toBe(false);
  });

  it('clears what a state held on leaving it', () => {
    const machine = new BossStateMachine();
    machine.to('intro', { seconds: 1 });
    machine.to('idle');
    machine.to('windup', { seconds: 1, attack: 'bigSmash' });
    machine.update(0.5);
    machine.to('hurt', { seconds: 0.6 });
    expect(machine.data.attack).toBeUndefined();
    expect(machine.elapsed).toBe(0);
  });

  it('locks him once beaten', () => {
    const machine = new BossStateMachine();
    machine.to('intro');
    machine.to('idle');
    machine.to('defeated');
    expect(machine.isLocked).toBe(true);
    for (const state of Object.keys(BOSS_STATES)) expect(machine.to(state)).toBe(false);
  });

  it('every move goes to a state that exists', () => {
    for (const [state, next] of Object.entries(BOSS_STATES)) {
      for (const to of next) expect(BOSS_STATES[to], `${state} -> ${to}`).toBeDefined();
    }
  });
});

describe('the troll\'s fight data', () => {
  it('names only attacks that exist, in parts from full health down', () => {
    let last = Infinity;
    for (const phase of TROLL.phases) {
      expect(phase.from).toBeLessThan(last);
      last = phase.from;
      for (const { attack, range } of phaseAttacks(TROLL, phase)) {
        expect(TROLL.attacks[attack], attack).toBeDefined();
        expect(['near', 'far', 'high', 'any']).toContain(range);
      }
      for (const chain of phase.chains ?? []) {
        for (const attack of chain) expect(phaseAttacks(TROLL, phase).map((a) => a.attack)).toContain(attack);
      }
    }
    expect(TROLL.phases[0].from).toBe(1);
  });

  it('has a weak moment after every attack, a warning before it, and art for him', () => {
    for (const [name, attack] of Object.entries(TROLL.attacks)) {
      expect(attack.windup, name).toBeGreaterThanOrEqual(0.5);
      expect(attack.recover.weak, name).toBe(true);
      expect(attack.active ?? attack.maxActive, name).toBeGreaterThan(0);
    }
    expect(BOSSES.troll1).toBeDefined();
  });

  it('gives damage for every ammo kind', () => {
    for (const kind of Object.keys(AMMO)) expect(TROLL.damage[kind], kind).toBeGreaterThan(0);
  });

  it('takes about 90 seconds of good play: about 10 damage a weak moment, about 12 of them', () => {
    const roundsPerSecond = 1000 / AMMO.standard.everyMs;
    const perWeakMoment = roundsPerSecond * TROLL.attacks.bigSmash.recover.seconds * TROLL.damage.standard;
    const weakMoments = TROLL.health / perWeakMoment;
    expect(weakMoments).toBeGreaterThan(8);
    expect(weakMoments).toBeLessThan(16);
  });
});

describe('the boss brain', () => {
  it('can\'t be hurt during his entrance, then stands and walks to the cat', () => {
    const brain = new BossBrain(TROLL);
    brain.start();
    expect(brain.takeHit('standard')).toBe(0);
    run(brain, TROLL.introSeconds + STEP);
    expect(brain.state).toBe('idle');
    expect(brain.walkSpeed).toBe(TROLL.phases[0].walkSpeed);
  });

  it('smashes quickly at a cat close by, and with a shock wave at one further away', () => {
    const near = idleTroll();
    runUntil(near, 'windup', NEAR);
    expect(near.attack).toBe('quickSmash');
    const far = idleTroll();
    runUntil(far, 'windup', FAR);
    expect(far.attack).toBe('bigSmash');
  });

  it('jumps at a cat up on an island, even in part 1', () => {
    const brain = idleTroll();
    runUntil(brain, 'windup', HIGH);
    expect(brain.attack).toBe('jumpSlam');
  });

  it('goes warning, attack, then a weak moment, then back to walking', () => {
    const brain = idleTroll();
    const events = run(brain, TROLL.phases[0].pause + 0.9 + 0.25 + 1.5 + 0.2, FAR).map((e) => e.type);
    expect(events.slice(0, 4)).toEqual(['windup', 'attack', 'recover', 'idle']);
  });

  it('hurts with his club only while it lands, and is weak only after the attack', () => {
    const brain = idleTroll();
    runUntil(brain, 'windup', FAR);
    expect(brain.clubHurts).toBe(false);
    expect(brain.isWeak).toBe(false);
    runUntil(brain, 'attack', FAR);
    expect(brain.clubHurts).toBe(true);
    expect(brain.touchHurts).toBe(false);
    runUntil(brain, 'recover', FAR);
    expect(brain.clubHurts).toBe(false);
    expect(brain.isWeak).toBe(true);
    expect(brain.recoverKind).toBe('stuck');
  });

  it('never picks the same attack twice in a row when another fits', () => {
    const brain = idleTroll();
    const picks = [];
    for (let i = 0; i < 6; i++) {
      runUntil(brain, 'windup', i % 2 ? NEAR : FAR);
      picks.push(brain.attack);
      runUntil(brain, 'idle', FAR);
    }
    for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
  });

  it('waits, walking, while every attack that fits is cooling down', () => {
    const brain = idleTroll();
    // The big smash is cooling down, and nothing else in part 1 fits a far cat.
    brain.cooldowns.bigSmash = TROLL.phases[0].pause + 1;
    run(brain, TROLL.phases[0].pause + 0.2, FAR);
    expect(brain.state).toBe('idle');
    expect(brain.walkSpeed).toBeGreaterThan(0);
    runUntil(brain, 'windup', FAR);
    expect(brain.attack).toBe('bigSmash');
  });

  describe('damage', () => {
    it('takes half damage outside his weak moments, and full damage in them', () => {
      const brain = idleTroll();
      expect(brain.takeHit('standard')).toBe(TROLL.damage.standard * TROLL.outsideWeakShare);
      runUntil(brain, 'recover', FAR);
      expect(brain.takeHit('standard')).toBe(TROLL.damage.standard);
      expect(brain.health).toBe(TROLL.health - 1.5);
    });

    it('counts a jump on his head only in a weak moment, and never a dash', () => {
      const brain = idleTroll();
      expect(brain.takeHit('stomp')).toBe(0);
      expect(brain.takeHit('dash')).toBe(0);
      runUntil(brain, 'recover', FAR);
      expect(brain.takeHit('stomp')).toBe(TROLL.damage.stomp);
      expect(brain.takeHit('dash')).toBe(0);
    });

    it('is hurt by the raging cat running into him, more in a weak moment', () => {
      const brain = idleTroll();
      expect(brain.takeHit('rage')).toBe(TROLL.damage.rage * TROLL.outsideWeakShare);
      runUntil(brain, 'recover', FAR);
      expect(brain.takeHit('rage')).toBe(TROLL.damage.rage);
    });

    it('is staggered by the bolt during a warning, which cancels the attack', () => {
      const brain = idleTroll();
      runUntil(brain, 'windup', FAR);
      brain.takeHit('bolt');
      expect(brain.state).toBe('hurt');
      expect(brain.attack).toBe(null);
      run(brain, TROLL.staggerSeconds + STEP);
      expect(brain.state).toBe('idle');
    });

    it('is not staggered in the middle of an attack', () => {
      const brain = idleTroll();
      runUntil(brain, 'attack', FAR);
      brain.takeHit('bolt');
      expect(brain.state).toBe('attack');
    });

    it('is beaten at no health, and nothing happens after that', () => {
      const brain = idleTroll();
      runUntil(brain, 'recover', FAR);
      brain.health = 1;
      brain.takeHit('standard');
      expect(brain.state).toBe('defeated');
      expect(brain.takeHit('bolt')).toBe(0);
      // His body hears it on the next update, and then never anything again.
      expect(brain.update(STEP, FAR).map((e) => e.type)).toEqual(['hit', 'defeated']);
      expect(run(brain, 5)).toEqual([]);
      expect(brain.state).toBe('defeated');
      expect(brain.walkSpeed).toBe(0);
      expect(brain.touchHurts).toBe(false);
    });
  });

  describe('his parts', () => {
    const toShare = (brain, share) => {
      brain.health = brain.maxHealth * share + 0.5;
    };

    it('finds the part for each share of his health', () => {
      expect(bossPhaseFor(TROLL, 1)).toBe(0);
      expect(bossPhaseFor(TROLL, 0.71)).toBe(0);
      expect(bossPhaseFor(TROLL, 0.7)).toBe(1);
      expect(bossPhaseFor(TROLL, 0.36)).toBe(1);
      expect(bossPhaseFor(TROLL, 0.35)).toBe(2);
      expect(bossPhaseFor(TROLL, 0)).toBe(2);
    });

    it('roars once at a new part, and can\'t be hurt while he roars', () => {
      const brain = idleTroll();
      toShare(brain, 0.7);
      brain.takeHit('standard');
      expect(brain.state).toBe('roar');
      expect(brain.phase).toBe(1);
      expect(brain.takeHit('standard')).toBe(0);
      const events = run(brain, TROLL.roarSeconds + 0.1);
      expect(events.filter((e) => e.type === 'roar')).toEqual([{ type: 'roar', phase: 1 }]);
      expect(brain.state).toBe('idle');
    });

    it('plays one roar, to the later part, for a big hit past two marks at once', () => {
      const brain = idleTroll();
      runUntil(brain, 'recover', FAR);
      brain.health = brain.maxHealth * 0.35 + 10;
      brain.takeHit('bolt'); // from 43% to 27%: past 35%, and staggered first
      expect(brain.state).toBe('hurt');
      const roars = run(brain, TROLL.staggerSeconds + TROLL.roarSeconds + 0.2).filter((e) => e.type === 'roar');
      expect(roars).toEqual([{ type: 'roar', phase: 2 }]);
      expect(brain.phase).toBe(2);
    });

    it('ends a weak moment at a new part\'s mark, so a part can\'t be shot through', () => {
      const brain = idleTroll();
      runUntil(brain, 'recover', FAR);
      toShare(brain, 0.7);
      brain.takeHit('standard');
      expect(brain.state).toBe('roar');
    });

    it('waits for the attack he\'s in to finish before roaring', () => {
      const brain = idleTroll();
      runUntil(brain, 'windup', FAR);
      toShare(brain, 0.7);
      brain.takeHit('standard');
      expect(brain.state).toBe('windup');
      runUntil(brain, 'attack', FAR);
      run(brain, TROLL.attacks.bigSmash.active + STEP);
      expect(brain.state).toBe('roar');
    });

    it('adds the stone burst and the charge in part 2', () => {
      const names = (phase) => phaseAttacks(TROLL, TROLL.phases[phase]).map((a) => a.attack);
      expect(names(0)).not.toContain('stoneBurst');
      expect(names(1)).toEqual(expect.arrayContaining(['stoneBurst', 'charge']));
      expect(phaseAttacks(TROLL, TROLL.phases[2]).find((a) => a.attack === 'jumpSlam').range).toBe('any');
    });
  });

  describe('attacks his body moves', () => {
    it('is dizzy, and weak, after charging into a wall', () => {
      const brain = idleTroll();
      brain.phase = 1;
      brain.lastAttack = 'bigSmash';
      brain.cooldowns.bigSmash = 10;
      brain.cooldowns.stoneBurst = 10;
      runUntil(brain, 'attack', FAR);
      expect(brain.attack).toBe('charge');
      expect(brain.touchHurts).toBe(true);
      brain.finishAttack({ hitWall: true });
      expect(brain.recoverKind).toBe('dizzy');
      expect(brain.isWeak).toBe(true);
    });

    it('only turns round, not weak, after a charge that missed the wall', () => {
      const brain = idleTroll();
      brain.phase = 1;
      brain.cooldowns.bigSmash = 10;
      brain.cooldowns.stoneBurst = 10;
      runUntil(brain, 'attack', FAR);
      brain.finishAttack({});
      expect(brain.recoverKind).toBe('turn');
      expect(brain.isWeak).toBe(false);
    });

    it('ends the attack at its limit if his body never says it\'s over', () => {
      const brain = idleTroll();
      runUntil(brain, 'attack', HIGH);
      expect(brain.attack).toBe('jumpSlam');
      run(brain, TROLL.attacks.jumpSlam.maxActive + STEP, HIGH);
      expect(brain.state).not.toBe('attack');
    });
  });

  it('chains a big smash into the stone burst in part 3, with only a moment between', () => {
    const brain = idleTroll({ random: () => 0 });
    brain.phase = 2;
    runUntil(brain, 'windup', FAR);
    expect(brain.attack).toBe('bigSmash');
    runUntil(brain, 'recover', FAR);
    expect(brain.isWeak).toBe(false);
    run(brain, TROLL.phases[2].chainGap + STEP, FAR);
    expect(brain.state).toBe('windup');
    expect(brain.attack).toBe('stoneBurst');
    runUntil(brain, 'recover', FAR);
    expect(brain.isWeak).toBe(true);
  });

  it('only picks the attacks his body can do, when told which', () => {
    const brain = new BossBrain(TROLL, { random: () => 0, only: ['bigSmash'] });
    brain.start();
    run(brain, TROLL.introSeconds + STEP);
    brain.phase = 2;
    for (let i = 0; i < 3; i++) {
      runUntil(brain, 'windup', FAR);
      expect(brain.attack).toBe('bigSmash');
      runUntil(brain, 'idle', FAR);
    }
    // Close by, or up on an island, nothing he can do fits: he waits.
    expect(runUntil(brain, 'windup', NEAR, 8)).toBe('idle');
    expect(runUntil(brain, 'windup', HIGH, 8)).toBe('idle');
  });

  it('offers an easier try after 3 losses, with a quarter less health', () => {
    expect(offersAssist(TROLL, 2)).toBe(false);
    expect(offersAssist(TROLL, 3)).toBe(true);
    expect(bossMaxHealth(TROLL, { assisted: true })).toBe(90);
    expect(idleTroll({ assisted: true }).health).toBe(90);
  });

  it('can be beaten by shooting in his weak moments, visiting all three parts on the way', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const brain = idleTroll({ random });
    const roars = [];
    let seconds = 0, shotClock = 0;
    const shotEvery = AMMO.standard.everyMs / 1000;
    while (!brain.isDefeated && seconds < 600) {
      const sense = Math.floor(seconds / 4) % 2 ? NEAR : FAR;
      for (const event of brain.update(STEP, sense)) if (event.type === 'roar') roars.push(event.phase);
      // The charge and the jump take him a moment to cross the arena.
      if (brain.state === 'attack' && !brain.attackData.active && brain.machine.elapsed >= 1.2) brain.finishAttack({ hitWall: true });
      shotClock += STEP;
      if (brain.isWeak && shotClock >= shotEvery) {
        shotClock = 0;
        brain.takeHit('standard');
      }
      seconds += STEP;
    }
    expect(brain.isDefeated).toBe(true);
    expect(roars).toEqual([1, 2]);
    // Perfect play: every weak moment used, no time lost dodging. Real fights take longer.
    expect(seconds).toBeGreaterThan(40);
    expect(seconds).toBeLessThan(180);
  });
});
