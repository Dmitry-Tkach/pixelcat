import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { TRAPS, TRAP_KINDS } from '../src/data/adventure/traps.js';
import { ADVENTURE_ART, ADVENTURE_LEVELS, adventurePath } from '../src/data/adventure/index.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';
import {
  MACE_SWING_LOW, SLIDE_HEIGHT, STAND_HEIGHT, circleHitsRect, crusherAngry, crusherContact, crusherCrushes, crusherStart,
  crusherStep, guardianBall, guardianFireColumn, guardianFirePhase, guardianGeometry, guardianPhase, guardianSwing, landsOnCap,
  maceAngle, maceHook, swingPoint,
  trapProblems,
} from '../src/systems/adventure/trapLogic.js';
import { TILE, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';

const PICTURE_KEYS = ['gallows', 'link', 'ball', 'calm', 'angry', 'dart', 'squashed', 'body', 'awake', 'arms'];
const pictures = (rules) => Object.values(rules).flatMap((kind) => Object.entries(kind)
  .filter(([key]) => PICTURE_KEYS.includes(key))
  .flatMap(([, value]) => value)
  .filter((value) => typeof value === 'string'));

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

  it('is stood on from above, bumped from below, and a wall at the sides', () => {
    const block = { left: 100, right: 200, top: 300, bottom: 400 };
    expect(crusherContact({ left: 120, right: 160, top: 210, bottom: 302 }, block)).toBe('top');
    expect(crusherContact({ left: 120, right: 160, top: 395, bottom: 485 }, block)).toBe('beneath');
    expect(crusherContact({ left: 60, right: 104, top: 320, bottom: 410 }, block)).toBe('side');
  });

  it('crushes him only falling or landing on him, not waiting, lifting or under his feet', () => {
    const block = { left: 100, right: 200, top: 300, bottom: 400 };
    const under = { left: 120, right: 160, top: 390, bottom: 480 };
    expect(crusherCrushes(under, block, { phase: 'fall', ms: 50 })).toBe(true);
    expect(crusherCrushes(under, block, { phase: 'down', ms: 50 })).toBe(true);
    expect(crusherCrushes(under, block, { phase: 'down', ms: 400 })).toBe(false);
    expect(crusherCrushes(under, block, { phase: 'wait', ms: 50 })).toBe(false);
    expect(crusherCrushes(under, block, { phase: 'rise', ms: 50 })).toBe(false);
    expect(crusherCrushes({ left: 120, right: 160, top: 210, bottom: 302 }, block, { phase: 'fall', ms: 50 })).toBe(false);
    expect(crusherCrushes({ left: 220, right: 260, top: 390, bottom: 480 }, block, { phase: 'fall', ms: 50 })).toBe(false);
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
      { kind: 'mace', col: 12, row: 4, hanging: true, chain: 172 },
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

  it('want a mace a slide passes under but a standing cat doesn\'t', () => {
    expect(MACE_SWING_LOW.min).toBeGreaterThan(SLIDE_HEIGHT);
    expect(MACE_SWING_LOW.max).toBeLessThan(STAND_HEIGHT);
    expect(testLevel([{ kind: 'mace', col: 12, row: 4, hanging: true, chain: 200 }]).problems[0]).toMatch(/too low to slide under/);
    expect(testLevel([{ kind: 'mace', col: 12, row: 4, hanging: true, chain: 100 }]).problems[0]).toMatch(/over a standing cat/);
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

describe('the stone guardian', () => {
  const r = TRAPS.wood.guardian;
  const most = (r.swingDeg * Math.PI) / 180;

  it('rests low, winds up outward, holds, and strikes back down, faster than it rose', () => {
    const at = (share) => guardianSwing(share * r.periodMs, r);
    expect(at(r.swing.rest / 2)).toBe(0);
    expect(at(r.swing.rest + r.swing.rise / 2)).toBeGreaterThan(0);
    expect(at(r.swing.rest + r.swing.rise + r.swing.hold / 2)).toBeCloseTo(most);
    expect(at(0.999)).toBeLessThan(most * 0.05);
    for (let t = 0; t < r.periodMs * 2; t += 37) {
      const swing = guardianSwing(t, r);
      expect(swing).toBeGreaterThanOrEqual(0);
      expect(swing).toBeLessThanOrEqual(most + 1e-9);
    }
    expect(r.swing.strike).toBeLessThan(r.swing.rise);
    expect(r.swing.rest + r.swing.rise + r.swing.hold + r.swing.strike).toBeCloseTo(1);
  });

  it('goes through its swing\'s parts in order', () => {
    const phases = [];
    for (let t = 0; t < r.periodMs; t += 20) {
      const phase = guardianPhase(t, r);
      if (phase !== phases.at(-1)) phases.push(phase);
    }
    expect(phases).toEqual(['rest', 'rise', 'hold', 'strike']);
  });

  it('hangs each ball straight under its arm\'s socket, and swings them out to either side', () => {
    const { x, arms } = guardianGeometry({ col: 10, row: 7 }, r);
    const [left, right] = arms;
    expect(guardianBall(left, 0).x).toBeCloseTo(left.socket.x);
    expect(guardianBall(right, 0).x).toBeCloseTo(right.socket.x);
    expect(left.socket.x).toBeLessThan(x);
    expect(right.socket.x).toBeGreaterThan(x);
    expect(guardianBall(left, most).x).toBeLessThan(guardianBall(left, 0).x);
    expect(guardianBall(right, most).x).toBeGreaterThan(guardianBall(right, 0).x);
  });

  // A path along row 15, and his platform of stones five cells up.
  const guardianLevel = (stones = [8, 9, 10, 11]) => {
    const builder = mapBuilder(20, 16).ground(0, 19, 15);
    for (const c of stones) builder.put(c, 10, 'X');
    builder.trap('guardian', 10, 9);
    const level = { world: 'wood', map: builder.rows(), traps: builder.traps() };
    return trapProblems(level, readAdventureMap(level.map));
  };

  it('stands on his stone platform, his maces low enough to hit but not to stop a slide', () => {
    expect(guardianLevel()).toEqual([]);
  });

  it('needs a whole platform under his feet', () => {
    expect(guardianLevel([8, 9, 10]).join(' ')).toMatch(/his platform needs stone/);
  });

  it('is solid in level 1, so nothing above his platform can be stood on: no way over him', () => {
    const level = ADVENTURE_LEVELS[0];
    const guardian = level.traps.find((t) => t.kind === 'guardian');
    const { reached } = adventureRoutes(level);
    for (const cell of reached) {
      const [c, row] = cell.split(',').map(Number);
      const over = c >= guardian.col - 2 && c < guardian.col + 2 && row <= guardian.row;
      expect(over, cell).toBe(false);
    }
  });

  it('pours fire from his mouth after a warning, now and then, never before he has swung once', () => {
    const f = r.fire;
    expect(guardianFirePhase(f.startMs, f)).toBe('idle'); // too soon after he wakes
    const first = Math.ceil(f.firstAfterMs / f.everyMs) * f.everyMs + f.startMs;
    expect(guardianFirePhase(first - f.warnMs / 2, f)).toBe('warn');
    expect(guardianFirePhase(first + f.pourMs / 2, f)).toBe('pour');
    expect(guardianFirePhase(first + f.pourMs + 10, f)).toBe('idle');
  });

  it('pours only while one mace rests low (a slide gets out under it) and the other isn\'t striking', () => {
    const f = r.fire;
    for (let ms = f.firstAfterMs; ms < f.firstAfterMs + f.everyMs * 3; ms += 25) {
      if (guardianFirePhase(ms, f) !== 'pour') continue;
      const arms = [guardianPhase(ms, r), guardianPhase(ms + r.periodMs / 2, r)];
      expect(arms.includes('rest'), `${ms} ms: ${arms}`).toBe(true);
      expect(arms.includes('strike'), `${ms} ms: ${arms}`).toBe(false);
    }
  });

  it('pours onto the safe middle, between his two maces at rest', () => {
    const trap = { col: 162, row: 16 };
    const { arms } = guardianGeometry(trap, r);
    const column = guardianFireColumn(trap, r, 1408);
    expect(column.left).toBeGreaterThan(guardianBall(arms[0], 0).x);
    expect(column.right).toBeLessThan(guardianBall(arms[1], 0).x);
    expect(column.top).toBeLessThan(column.bottom);
  });
});
