import { describe, expect, it } from 'vitest';
import { poolAt, poolProblems, poolSurface, strokeSpeed, swimVelocity, swimsAt } from '../src/systems/adventure/pools.js';
import { SWIM } from '../src/data/adventure/swim.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';

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
