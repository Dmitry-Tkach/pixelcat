import { describe, expect, it } from 'vitest';
import { fillBox, rockCells, rockLayout, rockProblems } from '../src/systems/adventure/rockLayout.js';
import { ROCK } from '../src/data/adventure/rocks.js';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';

// A stepped cliff: a low step (columns 0 to 9, from row 5) and a high one on its right (columns 4
// to 9, from row 2), down to row 8, standing in water.
const cliff = { parts: [{ cols: [0, 9], rows: [5, 8] }, { cols: [4, 9], rows: [2, 8] }], foot: 'water' };

describe('the rock kit\'s layout', () => {
  const { fills, tops, sides, waterline, decor } = rockLayout(cliff);

  it('fills every cell once, in boxes that don\'t overlap', () => {
    const seen = new Map();
    for (const { cols: [c0, c1], rows: [r0, r1] } of fills) {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) seen.set(`${c},${r}`, (seen.get(`${c},${r}`) ?? 0) + 1);
    }
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
    expect(new Set(seen.keys())).toEqual(rockCells(cliff));
    // The high step down to the low step's top, the low step's top row, then the full width under:
    // each box's sides all outline or all inside.
    expect(fills.map(({ cols, rows }) => ({ cols, rows }))).toEqual([
      { cols: [0, 3], rows: [5, 5] },
      { cols: [4, 9], rows: [2, 5] },
      { cols: [0, 9], rows: [6, 8] },
    ]);
  });

  it('knows which sides of each fill box are the rock\'s outline', () => {
    const open = (c0, r0) => fills.find(({ cols, rows }) => cols[0] === c0 && rows[0] === r0).open;
    expect(open(0, 5)).toEqual({ left: true, right: false, top: true, bottom: false }); // the high step on its right, rock under
    expect(open(4, 2)).toEqual({ left: true, right: true, top: true, bottom: false });
    expect(open(0, 6)).toEqual({ left: true, right: true, top: false, bottom: true });
  });

  it('keeps the fill short of the outline, where the edges draw it', () => {
    const box = fillBox(fills[0], 64);
    expect(box).toEqual({ x: ROCK.inset, y: 5 * 64 + ROCK.inset, w: 4 * 64 - ROCK.inset, h: 64 - ROCK.inset });
  });

  it('runs the top along each step, with the right corners', () => {
    expect(tops).toEqual([
      { row: 2, from: 4, to: 9, left: 'outer', right: 'outer' },
      { row: 5, from: 0, to: 3, left: 'outer', right: 'inner' }, // the high step's wall rises on its right
    ]);
  });

  it('runs the sides down each outline', () => {
    expect(sides).toEqual(expect.arrayContaining([
      { col: 0, from: 5, to: 8, side: -1 },
      { col: 4, from: 2, to: 4, side: -1 }, // the high step's left side, above the low step
      { col: 9, from: 2, to: 8, side: 1 },
    ]));
    expect(sides).toHaveLength(3);
  });

  it('has a wet foot only when it stands in water', () => {
    expect(waterline).toEqual([{ row: 8, from: 0, to: 9 }]);
    expect(rockLayout({ ...cliff, foot: undefined }).waterline).toEqual([]);
  });

  it('scatters decoration the same way every time, never side by side, never on an outline', () => {
    expect(rockLayout(cliff).decor).toEqual(decor);
    const big = rockLayout({ parts: [{ cols: [0, 39], rows: [0, 29] }] }).decor;
    expect(big.length).toBeGreaterThan(20);
    for (const a of big) {
      expect(a.col > 0 && a.col < 39).toBe(true);
      for (const b of big) if (a !== b) expect(Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row))).toBeGreaterThan(1);
    }
    expect(big.filter((d) => d.place === 'onTop').every((d) => d.row === 0)).toBe(true);
    expect(big.filter((d) => d.place === 'underTop').every((d) => d.row === 1)).toBe(true);
  });
});

describe('rock checks', () => {
  const map = ['....', '....', '####'];
  it('finds parts back to front, outside the map, or a wrong foot', () => {
    expect(rockProblems({ map, rocks: [{ parts: [{ cols: [0, 3], rows: [0, 1] }], foot: 'water' }] })).toEqual([]);
    expect(rockProblems({ map, rocks: [{ parts: [{ cols: [3, 0], rows: [0, 1] }] }] })).toHaveLength(1);
    expect(rockProblems({ map, rocks: [{ parts: [{ cols: [0, 4], rows: [0, 1] }] }] })).toHaveLength(1);
    expect(rockProblems({ map, rocks: [{ parts: [{ cols: [0, 1], rows: [0, 1] }], foot: 'sand' }] })).toHaveLength(1);
  });

  it('passes every adventure level\'s rocks', () => {
    for (const level of ADVENTURE_LEVELS) expect(rockProblems(level), level.name).toEqual([]);
  });
});
