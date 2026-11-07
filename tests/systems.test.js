import { afterEach, describe, expect, it } from 'vitest';
import { GAME, JUMP_AIR_TIME, VIEW, setViewAspect } from '../src/config/gameConfig.js';
import { CHARACTERS } from '../src/data/characters.js';
import { CHASERS } from '../src/data/chasers.js';
import { BOSSES } from '../src/data/bosses.js';
import { BossDirector } from '../src/systems/BossDirector.js';
import { ChaseDirector } from '../src/systems/ChaseDirector.js';
import { DistanceTracker } from '../src/systems/DistanceTracker.js';
import { GameStateMachine, STATE } from '../src/systems/GameStateMachine.js';
import { pulseStrength } from '../src/systems/obstacleMotion.js';
import { starText, starsFor } from '../src/systems/stars.js';
import { SpeedController } from '../src/systems/SpeedController.js';
import { StreakTracker } from '../src/systems/StreakTracker.js';

describe('BossDirector', () => {
  const definition = BOSSES.crownCat;
  const FRAME_MS = 50;
  const started = () => {
    const director = new BossDirector(definition);
    director.start();
    return director;
  };
  const runUntil = (director, state) => {
    for (let i = 0; i < 400 && director.state !== state; i++) {
      director.update(FRAME_MS);
      if (director.attack === 'charge' && director.state === 'active') director.finishActive();
    }
    expect(director.state).toBe(state);
  };

  it('warns before every attack', () => {
    const director = started();
    runUntil(director, 'windup');
    expect(director.isDangerous).toBe(false);
    runUntil(director, 'active');
    expect(director.isDangerous).toBe(true);
  });

  it('only takes a stomp while recovering', () => {
    const director = started();
    expect(director.hit()).toEqual([]);
    runUntil(director, 'active');
    expect(director.hit()).toEqual([]);
    expect(director.health).toBe(definition.health);
    runUntil(director, 'recover');
    expect(director.isVulnerable).toBe(true);
    expect(director.hit()).toEqual(['hurt']);
    expect(director.health).toBe(definition.health - 1);
  });

  it('can\'t be hit twice by one stomp', () => {
    const director = started();
    runUntil(director, 'recover');
    director.hit();
    expect(director.hit({ always: true })).toEqual([]);
  });

  it('takes a Super Paw at any time', () => {
    const director = started();
    runUntil(director, 'windup');
    expect(director.hit({ always: true })).toEqual(['hurt']);
  });

  it('is defeated at no health, and stays that way', () => {
    const director = started();
    for (let i = 0; i < definition.health; i++) {
      runUntil(director, 'recover');
      director.hit();
    }
    expect(director.isDefeated).toBe(true);
    director.update(10000);
    expect(director.state).toBe('defeated');
  });

  it('leaves a charge running until it hits something', () => {
    const director = started();
    director.attack = 'charge';
    director.enter('active');
    director.update(60000);
    expect(director.state).toBe('active');
    expect(director.finishActive()).toEqual(['recover']);
  });

  it('has a pattern and a pause for every amount of health, using attacks it knows, for every boss', () => {
    for (const boss of Object.values(BOSSES)) {
      for (let health = 1; health <= boss.health; health++) {
        expect(boss.idleSeconds[health]).toBeGreaterThan(0);
        for (const attack of boss.patterns[health]) expect(boss.attacks[attack]).toBeDefined();
      }
    }
  });

  it('gives every boss attacks of his own, and uses them all', () => {
    const owners = {};
    for (const [id, boss] of Object.entries(BOSSES)) {
      const used = new Set(Object.values(boss.patterns).flat());
      for (const attack of Object.keys(boss.attacks)) {
        expect(owners[attack], `${attack} is used by ${owners[attack]} and ${id}`).toBeUndefined();
        owners[attack] = id;
        expect(used.has(attack), `${id} never uses ${attack}`).toBe(true);
      }
    }
  });
});

describe('BossDirector for the Ginger Gunner', () => {
  const definition = BOSSES.orangeCat;
  const FRAME_MS = 50;

  // One frame. A dash or a slide ends when it gets where it's going, which the game decides.
  const step = (director) => {
    director.update(FRAME_MS);
    if (director.state === 'active' && director.attackData.active === undefined) director.finishActive();
  };

  // Steps through his attacks, noting which ones leave him open to a stomp.
  const openAfter = (health) => {
    const director = new BossDirector(definition);
    director.health = health;
    director.start();
    const open = new Set();
    const closed = new Set();
    for (let i = 0; i < 2000; i++) {
      step(director);
      if (director.state === 'recover') (director.isVulnerable ? open : closed).add(director.attack);
    }
    return { open: [...open].sort(), closed: [...closed].sort() };
  };

  it('can only be stomped once his gun overheats, after a spray or the beam', () => {
    expect(openAfter(3)).toEqual({ open: ['spray'], closed: ['burst'] });
    expect(openAfter(2)).toEqual({ open: ['spray'], closed: ['burst', 'dash', 'slideKick'] });
    expect(openAfter(1)).toEqual({ open: ['beam', 'spray'], closed: ['dash', 'leap', 'rage', 'slideKick'] });
  });

  it('opens with his rage when he\'s down to his last hit', () => {
    const director = new BossDirector(definition);
    director.start();
    for (let hit = 0; hit < 2; hit++) {
      for (let i = 0; i < 2000 && !director.isVulnerable; i++) step(director);
      expect(director.hit()).toEqual(['hurt']);
    }
    for (let i = 0; i < 2000 && director.state !== 'windup'; i++) step(director);
    expect(director.attack).toBe('rage');
  });

  it('hurts by touch only when he rushes at the cat or bursts into flames, not while he shoots', () => {
    const director = new BossDirector(definition);
    const touchHurts = {};
    for (const attack of Object.keys(definition.attacks)) {
      director.attack = attack;
      director.enter('active');
      touchHurts[attack] = director.isDangerous;
    }
    expect(touchHurts).toEqual({ burst: false, spray: false, beam: false, dash: true, slideKick: true, leap: true, rage: true });
  });

  // A cat jumps a little before the last low shot reaches it, and must land before the first high one.
  it('pauses between lanes for longer than a jump lasts, so a cat can land and then slide', () => {
    const JUMP_EARLY_SECONDS = 0.1;
    expect(definition.attacks.spray.laneGap).toBeGreaterThan(JUMP_AIR_TIME - JUMP_EARLY_SECONDS);
  });

  it('cools down long enough for the cat to cross most of the arena', () => {
    for (const attack of ['spray', 'beam']) {
      expect(definition.attacks[attack].recover).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('ChaseDirector high ground', () => {
  const FRAME_MS = 100;
  const HIGH = 200;
  const LOW = 50;
  const climbSeconds = 2.5;
  const director = () => new ChaseDirector({
    chase: { ownerSpeed: 300, startGap: 150, maxGap: 900, catchGap: 110 },
    chasers: ['girl'],
    highGround: { safeHeight: 150, holdMargin: 20, beneathRange: 100, climbSeconds },
  });
  const step = (chase, catHeight, catSpeed = 0) => chase.update(FRAME_MS, { catX: 1000, catSpeed, catHeight, catRunning: catSpeed > 0 });

  it('catches a stopped cat on the road', () => {
    const chase = director();
    for (let i = 0; i < 3; i++) step(chase, LOW);
    expect(chase.tracker.isCaught).toBe(true);
    expect(chase.climbedUp).toBe(false);
  });

  it('waits beneath a high cat, warns once, and climbs up when the time runs out', () => {
    const chase = director();
    const events = [];
    for (let i = 0; i < (climbSeconds * 1000) / FRAME_MS - 1; i++) events.push(...step(chase, HIGH));
    expect(chase.tracker.isCaught).toBe(false);
    expect(chase.isBeneathCat).toBe(true);
    expect(events.filter((event) => event === 'climbWarn')).toHaveLength(1);
    step(chase, HIGH);
    expect(chase.tracker.isCaught).toBe(true);
    expect(chase.climbedUp).toBe(true);
  });

  it('calls off the climb when the cat runs on, even slower than the chaser', () => {
    const chase = director();
    step(chase, HIGH);
    const events = [];
    for (let i = 0; i < 40; i++) events.push(...step(chase, HIGH, 240));
    expect(events).toContain('climbCancel');
    expect(chase.tracker.isCaught).toBe(false);
    expect(chase.climbedUp).toBe(false);
  });
});

const chase = { ownerSpeed: 300, startGap: 500, maxGap: 600, catchGap: 100 };

describe('DistanceTracker', () => {
  it('grows the gap when the cat outruns the owner, up to the maximum', () => {
    const tracker = new DistanceTracker(chase);
    tracker.update(1, 350);
    expect(tracker.gap).toBe(550);
    tracker.update(10, 350);
    expect(tracker.gap).toBe(600);
  });

  it('catches the cat once a slowed cat loses enough distance', () => {
    const tracker = new DistanceTracker(chase);
    tracker.update(1, 100);
    expect(tracker.isCaught).toBe(false);
    tracker.update(1, 100);
    expect(tracker.isCaught).toBe(true);
    expect(tracker.safety).toBe(0);
  });

  it('reports full safety at the maximum gap', () => {
    const tracker = new DistanceTracker({ ...chase, startGap: 600 });
    expect(tracker.safety).toBe(1);
  });
});

describe('SpeedController', () => {
  it('slows down during a penalty, then recovers', () => {
    const speed = new SpeedController(400);
    speed.applyPenalty({ speedMultiplier: 0.5, durationMs: 900 });
    expect(speed.speed).toBe(200);
    speed.update(899);
    expect(speed.isSlowed).toBe(true);
    speed.update(2);
    expect(speed.isSlowed).toBe(false);
    expect(speed.speed).toBe(400);
  });
});

describe('sprint boost', () => {
  it('speeds up for its duration, then returns to normal', () => {
    const speed = new SpeedController(400);
    speed.applyBoost({ multiplier: 1.2, durationMs: 1000 });
    expect(speed.speed).toBeCloseTo(480);
    speed.update(1001);
    expect(speed.isSprinting).toBe(false);
    expect(speed.speed).toBe(400);
  });

  it('ends when the cat is hit', () => {
    const speed = new SpeedController(400);
    speed.applyBoost({ multiplier: 1.2, durationMs: 1000 });
    speed.applyPenalty({ speedMultiplier: 0.5, durationMs: 500 });
    expect(speed.isSprinting).toBe(false);
    expect(speed.speed).toBe(200);
  });
});

describe('StreakTracker', () => {
  it('earns a sprint on the third pass in a row, then starts again', () => {
    const streak = new StreakTracker(3);
    expect(streak.recordAvoided()).toBe(false);
    expect(streak.recordAvoided()).toBe(false);
    expect(streak.recordAvoided()).toBe(true);
    expect(streak.count).toBe(0);
  });

  it('resets when the cat is hit', () => {
    const streak = new StreakTracker(3);
    streak.recordAvoided();
    streak.recordAvoided();
    streak.recordHit();
    expect(streak.recordAvoided()).toBe(false);
    expect(streak.count).toBe(1);
  });
});

describe('ChaseDirector', () => {
  const level = { chase, attacks: [{ at: 100 }] };
  const run = (director, seconds, { catX = 200, catSpeed = 300, catHeight = 0 } = {}) => {
    const events = [];
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      events.push(...director.update(1000 / 60, { catX, catSpeed, catHeight }));
    }
    return events;
  };

  it('warns, dashes, and grabs a cat on the ground', () => {
    const director = new ChaseDirector(level);
    const before = director.tracker.gap;
    const events = run(director, 1.2);
    expect(events).toEqual(expect.arrayContaining(['warn', 'dash', 'grabbed']));
    expect(director.tracker.gap).toBeLessThan(before);
  });

  it('misses a cat that stays in the air through the strike, and loses ground', () => {
    const director = new ChaseDirector(level);
    const before = director.tracker.gap;
    const events = run(director, 1.4, { catHeight: 200 });
    expect(events).toContain('dodged');
    expect(events).not.toContain('grabbed');
    expect(director.tracker.gap).toBeGreaterThan(before);
  });

  it('reaches the cat at the strike, then backs off', () => {
    const director = new ChaseDirector(level);
    run(director, 1.12, { catHeight: 200 });
    expect(director.phase).toBe('striking');
    expect(director.visibleDistance).toBeLessThan(100);
    run(director, 1, { catHeight: 200 });
    expect(director.phase).toBe('chasing');
    expect(director.visibleDistance).toBeGreaterThan(400);
  });

  it('counts a knockout during a lunge as a counter, and skips attacks while she is away', () => {
    const director = new ChaseDirector({ chase, attacks: [{ at: 100 }, { at: 150 }] });
    run(director, 0.2);
    expect(director.isAttacking).toBe(true);
    expect(director.knockOut()).toBe(true);
    expect(director.attacks).toHaveLength(1);
    const events = run(director, 6);
    expect(director.attacks).toHaveLength(0);
    expect(events).toContain('returned');
    expect(events).not.toContain('warn');
  });

  it('keeps the distance full during a knockout, even if the cat is slowed', () => {
    const director = new ChaseDirector({ chase });
    director.knockOut();
    run(director, 1, { catSpeed: 0 });
    expect(director.tracker.gap).toBe(chase.maxGap);
  });

  it('runs back in from off-screen after a knockout', () => {
    const director = new ChaseDirector({ chase });
    director.knockOut();
    run(director, 3.55);
    expect(director.visibleDistance).toBeGreaterThan(chase.maxGap + 300);
    run(director, 1.2);
    expect(director.visibleDistance).toBeLessThanOrEqual(chase.maxGap);
  });
});

describe('chaser roster', () => {
  const step = (director, seconds, catSpeed = 300) => {
    const events = [];
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      events.push(...director.update(1000 / 60, { catX: 0, catSpeed, catHeight: 0 }));
    }
    return events;
  };

  it('starts with the first chaser, and uses their speed', () => {
    const director = new ChaseDirector({ chase, chasers: ['boy', 'grandma'] });
    expect(director.chaserId).toBe('boy');
    expect(director.tracker.ownerSpeed).toBe(chase.ownerSpeed + CHASERS.boy.speedDelta);
  });

  it('moves to the next chaser after a knockout, and repeats the last', () => {
    const director = new ChaseDirector({ chase, chasers: ['girl', 'grandma'] });
    director.knockOut();
    step(director, 3.6);
    expect(director.chaserId).toBe('grandma');
    expect(director.tracker.ownerSpeed).toBe(chase.ownerSpeed + CHASERS.grandma.speedDelta);
    director.knockOut();
    step(director, 3.6);
    expect(director.chaserId).toBe('grandma');
  });

  it('gives every chaser every pose the game needs', () => {
    for (const { character } of Object.values(CHASERS)) {
      for (const role of ['idle', 'run', 'hop', 'catch', 'stumble', 'lose']) {
        expect(CHARACTERS[character].anims[role], `${character} ${role}`).toBeDefined();
      }
    }
  });
});

describe('view shape', () => {
  afterEach(() => setViewAspect(16 / 9));
  const STANDARD = 16 / 9;

  it('matches the original layout at 16:9', () => {
    expect(setViewAspect(STANDARD)).toEqual({ width: 1280, height: 720 });
    expect(VIEW.CAT_OFFSET).toBeCloseTo(673.33, 1);
    expect(VIEW.SCROLL_Y).toBeCloseTo(-40);
    expect(VIEW.TOP).toBeCloseTo(-80);
  });

  it('fills a wider window, adding space behind the cat rather than ahead', () => {
    const aheadAt16By9 = VIEW.AHEAD;
    expect(setViewAspect(2.2).height).toBe(720);
    expect(GAME.WIDTH).toBe(1584);
    expect(VIEW.RIGHT_OFFSET - VIEW.CAT_OFFSET).toBeCloseTo(aheadAt16By9);
    expect(VIEW.CAT_OFFSET).toBeGreaterThan(673.33);
  });

  it('fills a taller window by showing more sky, with the road still at the bottom', () => {
    expect(setViewAspect(1.25)).toEqual({ width: 1280, height: 1024 });
    expect(VIEW.TOP).toBeLessThan(-80);
    // Where the bottom of the world lands on screen: it must be the bottom edge.
    const screenY = (720 - VIEW.SCROLL_Y - GAME.HEIGHT / 2) * GAME.CAMERA_ZOOM + GAME.HEIGHT / 2;
    expect(screenY).toBeCloseTo(GAME.HEIGHT);
    expect(VIEW.RIGHT_OFFSET - VIEW.CAT_OFFSET).toBeCloseTo(VIEW.AHEAD);
  });
});

describe('stars', () => {
  it('gives one for finishing, one for most treats, and one for never being grabbed', () => {
    expect(starsFor({ collected: 0, total: 40, grabs: 2 })).toBe(1);
    expect(starsFor({ collected: 28, total: 40, grabs: 2 })).toBe(2);
    expect(starsFor({ collected: 0, total: 40, grabs: 0 })).toBe(2);
    expect(starsFor({ collected: 28, total: 40, grabs: 0 })).toBe(3);
    expect(starText(2)).toBe('★★☆');
  });
});

describe('checkpoint restart', () => {
  it('skips lunges behind the checkpoint, and keeps the chaser', () => {
    const level = { chase, chasers: ['girl', 'boy'], attacks: [{ at: 100 }, { at: 900 }] };
    const director = new ChaseDirector(level, { startX: 500, rosterIndex: 1 });
    expect(director.attacks).toHaveLength(1);
    expect(director.chaserId).toBe('boy');
  });
});

describe('sprinkler state', () => {
  it('is fully on or off when a full-speed cat arrives, as the level asks', () => {
    expect(pulseStrength(5, 5, 2.4, 'on')).toBe(1);
    expect(pulseStrength(5, 5, 2.4, 'off')).toBe(0);
    expect(pulseStrength(5 - 1.2, 5, 2.4, 'on')).toBe(0);
  });
});

describe('GameStateMachine', () => {
  it('follows the level flow and reports each change', () => {
    const seen = [];
    const machine = new GameStateMachine((next) => seen.push(next));
    expect(machine.to(STATE.PLAYING)).toBe(true);
    expect(machine.to(STATE.PAUSED)).toBe(true);
    expect(machine.to(STATE.PLAYING)).toBe(true);
    expect(machine.to(STATE.COMPLETE)).toBe(true);
    expect(seen).toEqual(['playing', 'paused', 'playing', 'complete']);
  });

  it('ignores moves that the flow does not allow', () => {
    const machine = new GameStateMachine();
    expect(machine.to(STATE.COMPLETE)).toBe(false);
    machine.to(STATE.PLAYING);
    machine.to(STATE.FAILED);
    expect(machine.to(STATE.COMPLETE)).toBe(false);
    expect(machine.is(STATE.FAILED)).toBe(true);
  });
});

describe('terrain speed', () => {
  it('changes speed while on the terrain, and combines with hits', () => {
    const control = new SpeedController(400);
    control.setTerrain(0.5);
    expect(control.speed).toBe(200);
    control.applyPenalty({ speedMultiplier: 0.5, durationMs: 100 });
    expect(control.speed).toBe(100);
    control.update(200);
    expect(control.speed).toBe(200);
    control.setTerrain(1);
    expect(control.speed).toBe(400);
  });
});
