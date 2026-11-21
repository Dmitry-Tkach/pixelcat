import { describe, expect, it } from 'vitest';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';

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
