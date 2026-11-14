import { describe, expect, it } from 'vitest';
import { WOOD_LEVEL } from '../src/data/adventure/wood.js';
import { readAdventureMap } from '../src/systems/adventureMap.js';
import { overWater, waterRuns } from '../src/systems/adventure/water.js';

describe('water in the gaps', () => {
  it('finds stretches with no ground from the water down', () => {
    const layout = readAdventureMap(['....', '#..#', '#..#']);
    expect(waterRuns(layout, 1)).toEqual([{ from: 1, to: 2 }]);
  });

  it('leaves a pit with a floor dry', () => {
    const layout = readAdventureMap(['....', '#..#', '#.##']);
    expect(waterRuns(layout, 1)).toEqual([{ from: 1, to: 1 }]);
  });

  it('fills Thorn Hollow in the first level, and only the bottomless gaps', () => {
    const layout = readAdventureMap(WOOD_LEVEL.map);
    const runs = waterRuns(layout, WOOD_LEVEL.water.row);
    expect(runs).toContainEqual({ from: 70, to: 97 });
    expect(overWater(runs, 2)).toBe(false); // the start
    expect(overWater(runs, 16.5)).toBe(false); // the little spike pit has a floor
    expect(overWater(runs, 80)).toBe(true);
  });

  it('puts the water below the floor the cat walks on', () => {
    const layout = readAdventureMap(WOOD_LEVEL.map);
    const floor = layout.tiles.findIndex((row) => row[0] >= 0);
    expect(WOOD_LEVEL.water.row).toBeGreaterThan(floor);
    expect(WOOD_LEVEL.water.row).toBeLessThan(layout.rows);
  });
});
