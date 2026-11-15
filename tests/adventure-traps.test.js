import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { TRAPS, TRAP_KINDS } from '../src/data/adventure/traps.js';
import { ADVENTURE_ART, ADVENTURE_LEVELS, adventurePath } from '../src/data/adventure/index.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';
import {
  circleHitsRect, crusherAngry, crusherStart, crusherStep, landsOnCap, maceAngle, maceHook, swingPoint, trapProblems,
} from '../src/systems/adventure/trapLogic.js';
import { TILE, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';

const pictures = (rules) => Object.values(rules).flatMap((kind) => Object.entries(kind)
  .filter(([key, value]) => typeof value === 'string' && ['gallows', 'link', 'ball', 'calm', 'angry', 'dart', 'squashed'].includes(key))
  .map(([, value]) => value));

// A small test level: ground along the bottom (row 9), an island at row 3, and the given traps.
function testLevel(traps) {
  const builder = mapBuilder(30, 10).ground(0, 29, 9).island(10, 14, 3);
  for (const { kind, col, row, ...options } of traps) builder.trap(kind, col, row, options);
  const level = { world: 'wood', map: builder.rows(), traps: builder.traps() };
  return { level, problems: trapProblems(level, readAdventureMap(level.map)) };
}

describe('the traps', () => {
  it('use only pictures in their world\'s art, and those are prepared', () => {
    for (const [world, rules] of Object.entries(TRAPS)) {
      expect(Object.keys(rules).sort()).toEqual([...TRAP_KINDS].sort());
      for (const picture of pictures(rules)) {
        expect(ADVENTURE_ART[world], picture).toContain(picture);
        expect(existsSync(`public/${adventurePath(world, picture)}`), picture).toBe(true);
      }
    }
  });

  it('are placed sensibly in every level', () => {
    for (const level of ADVENTURE_LEVELS) {
      expect(trapProblems(level, readAdventureMap(level.map)), level.id).toEqual([]);
      expect(checkAdventureLevel(level), level.id).toEqual([]);
    }
  });

  it('are listed by the map builder, with their options', () => {
    const traps = mapBuilder(10, 5).trap('idol', 3, 2, { facing: -1 }).traps();
    expect(traps).toEqual([{ kind: 'idol', col: 3, row: 2, facing: -1 }]);
  });
});

describe('the mace', () => {
  const rules = TRAPS.wood.mace;

  it('swings from straight down to its widest and back', () => {
    expect(maceAngle(0, rules)).toBeCloseTo(0);
    expect(maceAngle(rules.periodMs / 4, rules)).toBeCloseTo((rules.swingDeg * Math.PI) / 180);
    expect(maceAngle(rules.periodMs / 2, rules)).toBeCloseTo(0);
    expect(maceAngle((rules.periodMs * 3) / 4, rules)).toBeCloseTo((-rules.swingDeg * Math.PI) / 180);
  });

  it('hangs its ball straight under the hook at rest, and out to the side as it swings', () => {
    expect(swingPoint({ x: 100, y: 50 }, 80, 0)).toEqual({ x: 100, y: 130 });
    const out = swingPoint({ x: 100, y: 50 }, 80, Math.PI / 2);
    expect(out.x).toBeCloseTo(20);
    expect(out.y).toBeCloseTo(50);
  });

  it('hurts only what its ball touches', () => {
    const cat = { left: 0, top: 0, right: 40, bottom: 80 };
    expect(circleHitsRect({ x: 60, y: 40 }, 25, cat)).toBe(true);
    expect(circleHitsRect({ x: 70, y: 40 }, 25, cat)).toBe(false);
    expect(circleHitsRect({ x: 20, y: 40 }, 5, cat)).toBe(true);
  });

  it('hangs from a gallows on the side its beam points', () => {
    const right = maceHook({ col: 5, row: 8 }, rules);
    const left = maceHook({ col: 5, row: 8, facing: -1 }, rules);
    const middle = 5 * TILE + TILE / 2;
    expect(right.x - middle).toBeCloseTo(middle - left.x);
    expect(right.x).toBeGreaterThan(middle);
    expect(right.y).toBeLessThan(9 * TILE);
  });
});

describe('the crusher', () => {
  const rules = TRAPS.wood.crusher;

  it('waits, glows, slams down once, rests, and lifts back to wait again', () => {
    const fall = 200;
    let s = crusherStart();
    const phases = [s.phase];
    let slams = 0;
    for (let t = 0; t < 20000 && phases.length < 6; t += 16) {
      s = crusherStep(s, 16, rules, fall);
      if (s.slam) { slams += 1; expect(s.drop).toBe(fall); }
      if (s.phase !== phases.at(-1)) phases.push(s.phase);
      expect(s.drop).toBeGreaterThanOrEqual(0);
      expect(s.drop).toBeLessThanOrEqual(fall);
    }
    expect(phases).toEqual(['wait', 'warn', 'fall', 'down', 'rise', 'wait']);
    expect(slams).toBe(1);
    expect(s.drop).toBe(0);
  });

  it('looks angry from its warning until it starts lifting', () => {
    expect(['wait', 'warn', 'fall', 'down', 'rise'].map(crusherAngry)).toEqual([false, true, true, true, false]);
  });
});

describe('the bounce mushroom', () => {
  const cap = { x: 100, top: 500, half: 40 };

  it('bounces a cat falling onto its cap', () => {
    expect(landsOnCap({ prevBottom: 490, bottom: 510, vy: 600, x: 120 }, cap)).toBe(true);
  });

  it('ignores a cat going up, beside it, or already below its cap', () => {
    expect(landsOnCap({ prevBottom: 510, bottom: 490, vy: -600, x: 100 }, cap)).toBe(false);
    expect(landsOnCap({ prevBottom: 490, bottom: 510, vy: 600, x: 150 }, cap)).toBe(false);
    expect(landsOnCap({ prevBottom: 530, bottom: 550, vy: 600, x: 100 }, cap)).toBe(false);
  });
});

describe('the trap checks', () => {
  it('pass traps that stand, hang and fall where they should', () => {
    const { problems } = testLevel([
      { kind: 'idol', col: 3, row: 8 },
      { kind: 'mushroom', col: 6, row: 8 },
      { kind: 'mace', col: 12, row: 4, hanging: true, chain: 100 },
      { kind: 'crusher', col: 20, row: 1 },
      { kind: 'mace', col: 24, row: 8 },
    ]);
    expect(problems).toEqual([]);
  });

  it('find a trap of no known kind, one standing on nothing, and a hanging one with nothing above', () => {
    expect(testLevel([{ kind: 'cannon', col: 3, row: 8 }]).problems[0]).toMatch(/isn't a kind of trap/);
    expect(testLevel([{ kind: 'idol', col: 3, row: 5 }]).problems[0]).toMatch(/isn't standing on anything/);
    expect(testLevel([{ kind: 'mace', col: 20, row: 4, hanging: true }]).problems[0]).toMatch(/no island above/);
  });

  it('find a crusher that waits so low a plain jump under it would touch it', () => {
    expect(testLevel([{ kind: 'crusher', col: 20, row: 4 }]).problems[0]).toMatch(/waits too low/);
  });

  it('find a mace whose ball would hang into the ground', () => {
    expect(testLevel([{ kind: 'mace', col: 12, row: 4, hanging: true, chain: 400 }]).problems[0]).toMatch(/hangs into the ground/);
  });

  it('find a trap on a cell that already has something', () => {
    const builder = mapBuilder(10, 5).ground(0, 9, 4).put(3, 3, 'o').trap('idol', 3, 3);
    const level = { world: 'wood', map: builder.rows(), traps: builder.traps() };
    expect(trapProblems(level, readAdventureMap(level.map))[0]).toMatch(/already has o/);
  });
});
