import { describe, expect, it } from 'vitest';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { devPlace } from '../src/systems/adventure/devPlaces.js';

describe('the development places (?at=<place>)', () => {
  it('are each somewhere the cat can stand, and can reach', () => {
    for (const level of ADVENTURE_LEVELS) {
      const { reached } = adventureRoutes(level);
      for (const [name, { col, row }] of Object.entries(level.places ?? {})) expect(reached.has(`${col},${row}`), `${level.id} ${name}`).toBe(true);
    }
  });

  it('start the level that names the place, there', () => {
    expect(devPlace('?at=guardian')).toEqual({ levelIndex: 0, cell: ADVENTURE_LEVELS[0].places.guardian });
    expect(devPlace('?at=nowhere')).toBeNull();
    expect(devPlace('')).toBeNull();
  });
});
