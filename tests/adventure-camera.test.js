import { describe, expect, it } from 'vitest';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { readAdventureMap } from '../src/systems/adventureMap.js';

describe('the camera\'s moments (a level\'s camera)', () => {
  for (const level of ADVENTURE_LEVELS.filter((l) => l.camera)) {
    const { rows, cols } = readAdventureMap(level.map);
    const { reached } = adventureRoutes(level);
    const within = (col, row) => col >= 0 && col < cols && row >= 0 && row < rows;

    it(`${level.id}: each shot starts where the cat can stand, and looks inside the map`, () => {
      for (const [i, { when, look }] of level.camera.shots.entries()) {
        let canStart = false;
        for (let c = when.cols[0]; c <= when.cols[1]; c++) for (let r = when.rows[0]; r <= when.rows[1]; r++) canStart ||= reached.has(`${c},${r}`);
        expect(canStart, `shot ${i + 1}`).toBe(true);
        expect(within(look.col, look.row), `shot ${i + 1}`).toBe(true);
      }
    });

    it(`${level.id}: each zone is inside the map, and the cat can be in it`, () => {
      for (const [i, { cols: zc, rows: zr, middleRow }] of (level.camera.zones ?? []).entries()) {
        expect(within(zc[1], zr[1]) && within(zc[0], zr[0]) && middleRow < rows, `zone ${i + 1}`).toBe(true);
        expect([...reached].some((cell) => {
          const [c, r] = cell.split(',').map(Number);
          return c >= zc[0] && c <= zc[1] && r >= zr[0] && r <= zr[1];
        }), `zone ${i + 1}`).toBe(true);
      }
    });
  }
});
