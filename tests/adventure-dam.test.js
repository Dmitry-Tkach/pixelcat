import { describe, expect, it } from 'vitest';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { MOVEMENT } from '../src/config/gameConfig.js';
import { TILE } from '../src/systems/adventureMap.js';
import { SWIM } from '../src/data/adventure/swim.js';

// The Hidden Dam's puzzle: each lever is reached only once the one before it has raised the water,
// and the far cliff only once all three have. (At stage s, s levers have been pulled.)
const dam = ADVENTURE_LEVELS.find((level) => level.id === 'autumn-2');
const at = (stage) => adventureRoutes(dam, { stage });
const reaches = (routes, { col, row }) => routes.nearReached(col, row, 1);
const CLIFF = { col: 143, row: 21 }; // the far cliff's checkpoint

describe('The Hidden Dam\'s levers', () => {
  it('opens one at a time, each lever reached only after the one before', () => {
    const [l1, l2, l3] = dam.levers;
    expect(reaches(at(0), l1)).toBe(true);
    expect(reaches(at(0), l2)).toBe(false);
    expect(reaches(at(1), l2)).toBe(true);
    expect(reaches(at(1), l3)).toBe(false);
    expect(reaches(at(2), l3)).toBe(true);
  });

  it('opens the way on, to the far cliff, only with all three', () => {
    for (const stage of [0, 1, 2]) expect(reaches(at(stage), CLIFF), `stage ${stage}`).toBe(false);
    expect(reaches(at(3), CLIFF)).toBe(true);
  });
});

// The real reach, from the physics (not the route checker's safe share): a jump with the double
// jump, on land; a leap out of the water (no double jump after it: AdventureSwimming.leave), as how
// far over the water's surface it lifts his feet (they start SWIM.feetUnder under it).
const realJump = (MOVEMENT.JUMP_VELOCITY ** 2 + MOVEMENT.AIR_JUMP_VELOCITY ** 2) / (2 * MOVEMENT.GRAVITY) / TILE;
const realLeap = (SWIM.outJump ** 2 / (2 * MOVEMENT.GRAVITY) - SWIM.feetUnder) / TILE;
// To stand on row r his feet must reach row r + 1's top: that far over a surface at row s.
const over = (s, r) => s - (r + 1);
const surfaces = [30, ...dam.pools.find((p) => p.stages).stages]; // the valley's water, stage by stage

describe('The Hidden Dam, by the real jump and leap', () => {
  const [, l2, l3] = dam.levers;
  it('keeps lever 2 out of a jump from the valley floor', () => {
    expect(30 - l2.row).toBeGreaterThan(realJump);
  });
  it('keeps each next ledge out of a leap from the water before its stage', () => {
    expect(over(surfaces[1], l3.row)).toBeGreaterThan(realLeap); // lever 3, from stage 1's water
    expect(over(surfaces[2], CLIFF.row)).toBeGreaterThan(realLeap); // the far cliff, from stage 2's water
  });
  it('lets a leap out of the water reach a bank one row over it, with room to spare', () => {
    expect(realLeap - over(23, 21)).toBeGreaterThan(0.5); // a bank whose top is a row over the water
  });
  it('makes the depths\' wall a dive: its top far over the water', () => {
    expect(over(23, 12)).toBeGreaterThan(realLeap); // the wall's top row 13 (stand 12), the water at 23
    expect(18 - 13).toBeGreaterThan(4); // and over 4 rows up from the ? block's ledge (stand 17), out of a running jump
  });
});
