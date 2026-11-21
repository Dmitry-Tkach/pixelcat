import { describe, expect, it } from 'vitest';
import { TILES, readAdventureMap } from '../src/systems/adventureMap.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { scaffoldLayout, walkwayProblems } from '../src/systems/adventure/scaffoldLayout.js';
import { brickLayout, masonryCells, masonryProblems } from '../src/systems/adventure/brickLayout.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';

describe('the scaffold kit', () => {
  // Ground from row 8; a walkway on row 3 from column 2 to 9.
  const tiles = Array.from({ length: 10 }, (_, r) => Array(14).fill(r >= 8 ? 1 : -1));
  it('stands its posts on what is under them, at its ends by default', () => {
    const { posts } = scaffoldLayout({ from: 2, to: 9, row: 3 }, tiles);
    expect(posts).toEqual([{ col: 2, top: 4, bottom: 8 }, { col: 9, top: 4, bottom: 8 }]);
  });
  it('braces two posts the right distance apart, no taller than they are', () => {
    const { braces } = scaffoldLayout({ from: 2, to: 9, row: 3, posts: [2, 5, 9] }, tiles);
    expect(braces).toEqual([{ from: 2, to: 5, top: 4, rows: 3 }, { from: 5, to: 9, top: 4, rows: 4 }]);
    expect(scaffoldLayout({ from: 2, to: 12, row: 3, posts: [2, 12] }, tiles).braces).toEqual([]); // too far apart
  });
  it('finds a walkway that is off its bridge cells', () => {
    const b = mapBuilder(14, 10).ground(0, 13, 8).put(0, 7, '@').walkway(2, 9, 3);
    expect(walkwayProblems({ map: b.rows(), walkways: b.walkways() })).toEqual([]);
    expect(walkwayProblems({ map: b.rows(), walkways: [{ from: 2, to: 10, row: 3 }] })).toHaveLength(1);
  });
});

describe('the stone brick kit', () => {
  it('lays a wall\'s top and sides only where it is open', () => {
    // A wall from column 3 to 6, rows 2 to 7, standing in ground from row 6 at its right.
    const solid = (c, r) => (c >= 3 && c <= 6 && r >= 2 && r <= 7) || (c >= 7 && r >= 6);
    const { tops, sides } = brickLayout({ cols: [3, 6], rows: [2, 7] }, solid);
    expect(tops).toEqual([{ from: 3, to: 6, row: 2 }]);
    expect(sides).toEqual([{ col: 3, side: -1, from: 2, to: 7, cap: true }, { col: 6, side: 1, from: 2, to: 5, cap: true }]);
  });
  it('puts masonry on the map as ground, and checks it', () => {
    const b = mapBuilder(12, 10).ground(0, 11, 8).wall(3, 6, 2, 7).brickPillar(9, 4, 7);
    const level = { map: b.rows(), masonry: b.masonry() };
    expect(masonryProblems(level)).toEqual([]);
    expect(masonryCells(level.masonry).has('10,4')).toBe(true);
    expect(masonryProblems({ ...level, masonry: [{ cols: [3, 6], rows: [1, 7] }] })).toHaveLength(1);
  });
});

describe('trapdoors', () => {
  // Ground on row 3; a trapdoor at columns 3-4, a ladder from it down into a cave (rows 4-6).
  const b = mapBuilder(10, 8).ground(0, 9, 3).put(1, 2, '@').hollow(2, 6, 4, 6).trapdoor(3, 4, 3).ladder(4, 3, 6).put(6, 6, '*');
  const layout = readAdventureMap(b.rows());
  it('is drawn as the ground, the floor beside it joined to it', () => {
    expect(layout.tiles[3][2]).toBe(TILES.groundTop);
    expect(layout.tiles[3][3]).toBe(TILES.groundTop);
    expect(layout.trapdoors).toEqual([{ col: 3, row: 3 }, { col: 4, row: 3 }]);
  });
  it('lets the cat climb down its ladder to what is under it', () => {
    expect(adventureRoutes({ map: b.rows(), world: 'autumn' }).nearReached(6, 6, 1)).toBe(true);
  });
});
