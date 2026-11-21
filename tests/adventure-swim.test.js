import { describe, expect, it } from 'vitest';
import { poolAt, poolProblems, poolSurface, strokeSpeed, swimVelocity, swimsAt } from '../src/systems/adventure/pools.js';
import { SWIM } from '../src/data/adventure/swim.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';
import { readAdventureMap } from '../src/systems/adventureMap.js';
import { damLayout } from '../src/data/adventure/dam.js';
import { everUnderwater, poolDecor } from '../src/systems/adventure/poolDecor.js';
import { POOL_FISH, poolFishAt } from '../src/data/adventure/fish.js';

// A pool from row 5 to row 8, columns 6 to 11, rising to row 3 at stage 1.
const pool = { cols: [6, 11], bottom: 8, surface: 5, stages: [3] };

describe('a pool', () => {
  it('rises a stage at a time, and stays at its last', () => {
    expect([0, 1, 2].map((s) => poolSurface(pool, s))).toEqual([5, 3, 3]);
    expect(poolSurface({ ...pool, stages: undefined }, 2)).toBe(5);
  });

  it('holds a point under its surface, inside its columns, down to its bottom', () => {
    expect(poolAt([pool], 6, 5)).toBe(pool);
    expect(poolAt([pool], 11.9, 8.9)).toBe(pool);
    expect(poolAt([pool], 6, 4)).toBeNull(); // above the surface
    expect(poolAt([pool], 6, 4, 1)).toBe(pool); // the water has risen
    expect(poolAt([pool], 12, 6)).toBeNull();
    expect(poolAt([pool], 6, 9)).toBeNull(); // the floor
  });
});

describe('swimming', () => {
  it('starts once his middle is under the surface', () => {
    expect(swimsAt(300 + SWIM.submerge + 1, 300, SWIM.submerge)).toBe(true);
    expect(swimsAt(300 + SWIM.submerge, 300, SWIM.submerge)).toBe(false);
  });

  it('strokes up underwater, and leaps out at the surface', () => {
    expect(strokeSpeed(300 + SWIM.surfaceBand + 10, 300, SWIM)).toBe(SWIM.stroke);
    expect(strokeSpeed(300 + SWIM.surfaceBand - 10, 300, SWIM)).toBe(SWIM.outJump);
    expect(SWIM.outJump).toBeLessThan(SWIM.stroke); // a leap is stronger than a stroke
  });

  it('is slower than running, and sinks slowly', () => {
    expect(swimVelocity(1000, 1000, 420, SWIM)).toEqual({ vx: 420 * SWIM.speedShare, vy: SWIM.maxSink });
    expect(swimVelocity(-1000, -1000, 420, SWIM)).toEqual({ vx: -420 * SWIM.speedShare, vy: -SWIM.maxRise });
  });
});

// A small level: a low bank on the left (its top row 10), a deep well (columns 6 to 11, its floor
// row 18) full of water to row 12, rising to row 5 at stage 1, and a tall cliff on the right (its top
// row 4) with the portal on it. A coin under the water. withLever: a lever on the bank.
const well = (withLever) => {
  const b = mapBuilder(20, 20).ground(0, 5, 10).ground(6, 11, 18).ground(12, 19, 4)
    .put(1, 9, '@').put(16, 3, 'E').put(9, 16, 'o');
  return {
    id: 'well', world: 'autumn', map: b.rows(),
    pools: [{ cols: [6, 11], bottom: 17, surface: 12, stages: [5] }],
    levers: withLever ? [{ col: 3, row: 9 }] : [],
  };
};

describe('the route checker in the water', () => {
  it('falls into the water and swims down to a coin under it', () => {
    const { reached, unreachable } = adventureRoutes(well(false));
    expect(reached.has('6,12')).toBe(true); // in from the bank, at the surface
    expect(unreachable.some((o) => o.col === 9 && o.row === 16)).toBe(false);
  });

  it('leaps out only a little: from low water the cliff is out of reach', () => {
    expect(adventureRoutes(well(false)).portal).toBe(false);
  });

  it('raises the water with a lever, and swims up to what it opens', () => {
    const { stage, portal, reached } = adventureRoutes(well(true));
    expect(stage).toBe(1);
    expect(reached.has('9,5')).toBe(true); // the risen surface
    expect(portal).toBe(true); // leapt out onto the cliff
  });

  it('finds a pool outside the map, or stages that sink', () => {
    const map = well(false).map;
    expect(poolProblems({ map, pools: [{ cols: [6, 30], bottom: 8, surface: 6 }] })).toHaveLength(1);
    expect(poolProblems({ map, pools: [{ cols: [6, 11], bottom: 8, surface: 6, stages: [7] }] })).toHaveLength(1);
    expect(poolProblems({ map, pools: [pool] })).toEqual([]);
  });
});

describe('the Grand Dam', () => {
  const wall = { w: 960, h: 519 };
  const layout = damLayout({ col: 20, row: 15 }, wall, 64);
  it('stands on its row, centred on its column', () => {
    expect(layout.foot).toBe(16 * 64);
    expect(layout.left + wall.w / 2).toBe(20 * 64 + 32);
    expect(layout.top).toBe(16 * 64 - wall.h);
  });
  it('has three gates, left to right, each in its arch', () => {
    expect(layout.gates).toHaveLength(3);
    expect(layout.gates[0].x).toBeLessThan(layout.gates[1].x);
    for (const gate of layout.gates) expect(gate.width).toBeGreaterThan(100);
  });
});

describe('a pool floor\'s decoration', () => {
  const level = well(false);
  const { tiles } = readAdventureMap(level.map);
  const placed = poolDecor(level, tiles);
  it('stands only on the floor under the water, never side by side', () => {
    expect(placed.length).toBeGreaterThan(0);
    for (const d of placed) {
      expect(d.row).toBe(17); // the well's floor is row 18: they stand on it
      expect(poolAt(level.pools, d.col, d.row, 9)).not.toBeNull();
    }
    for (let i = 1; i < placed.length; i++) expect(placed[i].col - placed[i - 1].col).toBeGreaterThanOrEqual(2);
  });
  it('keeps the ground\'s own plants off anywhere the water ever reaches', () => {
    expect(everUnderwater(level.pools, 8, 5)).toBe(true); // under the risen water
    expect(everUnderwater(level.pools, 2, 9)).toBe(false); // the bank
  });
});

describe('a pool fish', () => {
  const fish = { from: 2, to: 6, row: 5 };
  const trip = ((6 - 2) * 64 / POOL_FISH.speed) * 1000;
  it('swims right from its first end, then back', () => {
    expect(poolFishAt(fish, 0, 64)).toMatchObject({ x: 2 * 64 + 32, right: true });
    expect(poolFishAt(fish, trip / 2, 64).x).toBeCloseTo(4 * 64 + 32);
    expect(poolFishAt(fish, trip * 1.5, 64)).toMatchObject({ right: false });
    expect(poolFishAt(fish, trip * 1.5, 64).x).toBeCloseTo(4 * 64 + 32);
  });
  it('stays near its row, bobbing', () => {
    for (const ms of [0, 400, 800, 1200]) expect(Math.abs(poolFishAt(fish, ms, 64).y - (5 * 64 + 32))).toBeLessThanOrEqual(POOL_FISH.bob + 0.001);
  });
});

describe('the route checker in a low gap under the water', () => {
  // A pool over a floor at row 9, a pillar from row 5 down to the floor but for a gap: one row
  // high (row 8) in one level, two rows (7 and 8) in the other, with a coin in it.
  const gap = (rows) => {
    const b = mapBuilder(16, 12).ground(0, 15, 9).ground(0, 3, 4).put(1, 3, '@').put(14, 8, 'E')
      .fill(8, 9, 5, 8).hollow(8, 9, 9 - rows, 8).put(8, 8, 'o');
    return { id: 'gap', world: 'autumn', map: b.rows(), pools: [{ cols: [4, 15], bottom: 8, surface: 5 }] };
  };
  it('lets him swim through a gap two rows high, not one', () => {
    const coin = (level) => adventureRoutes(level).unreachable.some((o) => o.col === 8 && o.row === 8);
    expect(coin(gap(2))).toBe(false);
    expect(coin(gap(1))).toBe(true);
  });
});
