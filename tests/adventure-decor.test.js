import { describe, expect, it } from 'vitest';
import { DECOR } from '../src/data/adventure/decor.js';
import { ADVENTURE_ART } from '../src/data/adventure/index.js';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';
import { cellRandom, placeDecor } from '../src/systems/adventure/decorPlacement.js';
import { TILE, readAdventureMap } from '../src/systems/adventureMap.js';

const levels = ADVENTURE_LEVELS.map((level) => ({ level, layout: readAdventureMap(level.map) }));

describe('the automatic decoration', () => {
  it('uses only pictures in its world\'s art', () => {
    for (const [world, { tops, under }] of Object.entries(DECOR)) {
      for (const picture of [...tops.pictures, ...under.pictures]) expect(ADVENTURE_ART[world], picture).toContain(picture);
    }
  });

  it('decorates a level the same way every time', () => {
    for (const { level, layout } of levels) {
      expect(placeDecor(layout, DECOR[level.world])).toEqual(placeDecor(layout, DECOR[level.world]));
    }
  });

  it('gives a cell a number from 0 to 1 that depends on the cell', () => {
    const values = new Set();
    for (let c = 0; c < 50; c++) {
      const v = cellRandom(c, 7, 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      values.add(v);
    }
    expect(values.size).toBe(50);
  });

  it('grows plants only on tops with open air above, and vines only under islands with air below', () => {
    for (const { level, layout } of levels) {
      const tileAt = (c, r) => layout.tiles[r]?.[c] ?? -1;
      const placed = placeDecor(layout, DECOR[level.world]);
      expect(placed.length, level.id).toBeGreaterThan(20);
      for (const item of placed) {
        const col = Math.floor(item.x / TILE);
        if (item.hang) {
          const row = Math.round((item.y + DECOR[level.world].under.sink) / TILE) - 1;
          expect(tileAt(col, row), `${level.id} vine at ${col},${row}`).toBeGreaterThanOrEqual(0);
          expect(tileAt(col, row + 1), `${level.id} vine at ${col},${row}`).toBe(-1);
        } else {
          const row = Math.round((item.y - DECOR[level.world].tops.sink) / TILE);
          expect(tileAt(col, row), `${level.id} plant at ${col},${row}`).toBeGreaterThanOrEqual(0);
          expect(tileAt(col, row - 1), `${level.id} plant at ${col},${row}`).toBe(-1);
        }
      }
    }
  });

  it('keeps ladders clear', () => {
    for (const { level, layout } of levels) {
      const ladders = new Set(layout.ladders.map(({ col, row }) => `${col},${row}`));
      for (const item of placeDecor(layout, DECOR[level.world])) {
        const col = Math.floor(item.x / TILE);
        const row = item.hang ? Math.round((item.y + 10) / TILE) : Math.round((item.y - 6) / TILE) - 1;
        expect(ladders.has(`${col},${row}`), `${level.id} at ${col},${row}`).toBe(false);
      }
    }
  });
});
