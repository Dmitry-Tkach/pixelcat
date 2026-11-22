import { describe, expect, it } from 'vitest';
import { MAP_SIZE, MAP_WORLDS, mapArt, pathPoints, stopPositions } from '../src/ui/mapArt.js';
import { LEVELS, worldName } from '../src/data/levels/index.js';

const WORLDS = LEVELS.map(worldName);
const stops = WORLDS.map((world, i) => ({ number: i + 1, world, stars: [3, 2, 1][i] ?? 0, current: i === 3, locked: i > 3 }));

describe('the level map', () => {
  it('puts every stop inside the map, with room for its stars below it', () => {
    for (const { x, y } of stopPositions(LEVELS.length)) {
      expect(x).toBeGreaterThan(60);
      expect(x).toBeLessThan(MAP_SIZE.w - 60);
      expect(y).toBeGreaterThan(110); // below the world signs
      expect(y).toBeLessThan(MAP_SIZE.h - 90);
    }
  });

  it('keeps stops apart, so their buttons and stars never overlap', () => {
    const at = stopPositions(LEVELS.length);
    for (let i = 1; i < at.length; i++) expect(Math.hypot(at[i].x - at[i - 1].x, at[i].y - at[i - 1].y)).toBeGreaterThan(100);
  });

  it('runs the path from the left edge to the right edge, through every stop', () => {
    const at = stopPositions(4);
    const points = pathPoints(at);
    expect(points[0].x).toBeLessThan(at[0].x);
    expect(points.at(-1).x).toBeGreaterThan(at.at(-1).x);
    expect(points.slice(1, -1)).toEqual(at);
  });

  it('draws a number and three stars for each open level, and a padlock for each locked one', () => {
    const svg = mapArt(stops);
    for (const { number } of stops.filter((s) => !s.locked)) expect(svg).toContain(`>${number}</text>`);
    for (const { number } of stops.filter((s) => s.locked)) expect(svg).not.toContain(`>${number}</text>`);
    const open = stops.filter((s) => !s.locked).length;
    expect(svg.match(/fill="#ffd23f" stroke/g)).toHaveLength(3 + 2 + 1); // the stars earned
    expect(svg.match(/fill="#3b2a1a" stroke/g)).toHaveLength(open * 3 - 6); // and the rest
  });

  it('has ground and scenery for every world the levels are in', () => {
    for (const world of WORLDS) expect(MAP_WORLDS[world]).toBeDefined();
  });

  it('draws the same picture every time', () => {
    expect(mapArt(stops)).toBe(mapArt(stops));
  });
});
