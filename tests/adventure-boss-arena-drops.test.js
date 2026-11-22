import { describe, expect, it } from 'vitest';
import { BOSS_FIGHTS } from '../src/data/adventure/bossFights.js';
import { AdventureBossArena } from '../src/entities/AdventureBossArena.js';
import { TILE } from '../src/systems/adventureMap.js';

// A pretend troll and cat: only what the arena looks at.
function setUp({ phase = 1, state = 'idle', rounds = 100 } = {}) {
  const boss = { fight: BOSS_FIGHTS.troll1, halted: false, brain: { phase, state, isDefeated: false } };
  const cat = { body: { center: { x: 3 * TILE } } };
  const spawned = [], dropped = [];
  const arena = new AdventureBossArena({
    boss, cat, left: TILE, right: 23 * TILE,
    spawnEnemy: (kind, x, y) => {
      const goblin = { kind, x, y, active: true, dead: false };
      spawned.push(goblin);
      return goblin;
    },
    dropPickup: (kind, x) => {
      const crate = { kind, x, active: true };
      dropped.push(crate);
      return crate;
    },
    roundsLeft: () => rounds,
  });
  return { arena, boss, cat, spawned, dropped };
}

const seconds = (arena, s) => {
  for (let t = 0; t < s * 1000; t += 16) arena.update(16);
};

describe('the boss arena', () => {
  it('drops no goblins in part 1, and some in part 2, never more than allowed at once', () => {
    const first = setUp({ phase: 0 });
    seconds(first.arena, 60);
    expect(first.spawned).toEqual([]);
    const second = setUp({ phase: 1 });
    seconds(second.arena, 60);
    expect(second.spawned.length).toBe(BOSS_FIGHTS.troll1.phases[1].goblins.max);
  });

  it('drops a new goblin once one is knocked out', () => {
    const { arena, spawned } = setUp({ phase: 1 });
    seconds(arena, 60);
    spawned[0].dead = true;
    seconds(arena, BOSS_FIGHTS.troll1.phases[1].goblins.everySeconds + 1);
    expect(spawned.length).toBe(BOSS_FIGHTS.troll1.phases[1].goblins.max + 1);
  });

  it('drops goblins on the floor inside the walls, away from the cat', () => {
    const { arena, spawned, cat } = setUp({ phase: 2 });
    for (let i = 0; i < 30; i++) {
      seconds(arena, 13);
      for (const goblin of spawned) goblin.dead = true;
    }
    for (const goblin of spawned) {
      expect(goblin.x).toBeGreaterThan(TILE);
      expect(goblin.x).toBeLessThan(23 * TILE);
      expect(Math.abs(goblin.x - cat.body.center.x)).toBeGreaterThanOrEqual(4 * TILE);
    }
  });

  it('drops nothing during his entrance, or once he is beaten', () => {
    const intro = setUp({ phase: 1, state: 'intro', rounds: 0 });
    seconds(intro.arena, 30);
    intro.arena.shake();
    expect(intro.spawned).toEqual([]);
    expect(intro.dropped).toEqual([]);
    const beaten = setUp({ phase: 1, rounds: 0 });
    beaten.boss.brain.isDefeated = true;
    seconds(beaten.arena, 30);
    beaten.arena.shake();
    expect(beaten.spawned).toEqual([]);
    expect(beaten.dropped).toEqual([]);
  });

  it('drops an ammo crate when the tree shakes, from part 2, only if the cat is low and none is lying about', () => {
    expect(setUp({ phase: 0, rounds: 0 }).arena.shake()).toBeUndefined();
    const plenty = setUp({ phase: 1, rounds: 100 });
    plenty.arena.shake();
    expect(plenty.dropped).toEqual([]);
    const low = setUp({ phase: 1, rounds: 5 });
    low.arena.shake();
    low.arena.shake();
    expect(low.dropped.length).toBe(1);
    low.dropped[0].active = false; // collected
    low.arena.shake();
    expect(low.dropped.length).toBe(2);
    expect(low.dropped[0].kind).toBe('ammo-standard');
  });
});
