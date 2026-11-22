import { ARROW_STONE, arrowAngle, hitsStone } from '../src/systems/adventure/arrowStones.js';
import { describe, expect, it } from 'vitest';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';
import { TILE } from '../src/systems/adventureMap.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { HUB, WHEEL, hitsHub, reversed, seatAngle, seatPlace, seatSpeed, wheelCells, wheelHub, wheelProblems, wheelWith } from '../src/systems/adventure/wheels.js';

describe('water wheels', () => {
  const wheel = { col: 10, row: 10, radius: 4, seats: 6, periodMs: 12000, dir: 1 };

  it('keeps every seat on its circle, starting with seat 0 at the top', () => {
    const hub = wheelHub(wheel);
    expect(seatPlace(wheel, 0, 0)).toEqual({ x: hub.x, y: hub.y - 4 * TILE });
    for (const ms of [0, 1234, 7000]) {
      for (let i = 0; i < 6; i++) {
        const { x, y } = seatPlace(wheel, i, ms);
        expect(Math.hypot(x - hub.x, y - hub.y)).toBeCloseTo(4 * TILE);
      }
    }
  });

  it('turns once a period, clockwise or the other way', () => {
    const start = seatPlace(wheel, 0, 0);
    const turned = seatPlace(wheel, 0, wheel.periodMs);
    expect(turned.x).toBeCloseTo(start.x);
    expect(turned.y).toBeCloseTo(start.y);
    // A quarter turn on: clockwise, the top seat has gone to the right; the other way, to the left.
    expect(seatPlace(wheel, 0, wheel.periodMs / 4).x).toBeGreaterThan(start.x);
    expect(seatPlace({ ...wheel, dir: -1 }, 0, wheel.periodMs / 4).x).toBeLessThan(start.x);
    expect(seatAngle(wheel, 1, 0) - seatAngle(wheel, 0, 0)).toBeCloseTo((2 * Math.PI) / 6);
  });

  it('lists the cells its seats pass through, top, bottom and sides', () => {
    const cells = wheelCells(wheel);
    for (const cell of ['9,6', '10,6', '11,6', '9,14', '13,10', '6,10']) expect(cells.has(cell), cell).toBe(true);
    expect(cells.has('10,10')).toBe(false); // not the hub
  });

  it("finds a wheel that runs into the ground, and the map builder lists them", () => {
    const level = mapBuilder(30, 20).ground(0, 29, 12).wheel(10, 10, { radius: 4 });
    expect(level.wheels()).toEqual([{ col: 10, row: 10, radius: 4 }]);
    expect(wheelProblems({ map: level.rows(), wheels: level.wheels() })[0]).toMatch(/runs into the ground/);
    const clear = mapBuilder(30, 20).ground(0, 29, 18).wheel(10, 10, { radius: 4 });
    expect(wheelProblems({ map: clear.rows(), wheels: clear.wheels() })).toEqual([]);
  });

  it('carries the cat up a cliff too high to jump', () => {
    const level = mapBuilder(30, 20).ground(0, 29, 18).ground(16, 29, 7).put(1, 17, '@').put(25, 6, 'E');
    const map = level.rows();
    expect(adventureRoutes({ map }).portal).toBe(false);
    expect(adventureRoutes({ map, wheels: [{ col: 10, row: 12, radius: 4 }] }).portal).toBe(true);
  });

  it("turns slowly enough to read, in every level", () => {
    for (const level of ADVENTURE_LEVELS) {
      for (const w of level.wheels ?? []) {
        const speed = seatSpeed(w);
        expect(speed, level.id).toBeGreaterThan(60);
        expect(speed, level.id).toBeLessThan(160);
      }
    }
    expect(wheelWith({}).radius).toBe(WHEEL.radius);
  });

  it('is hit in its hub, not on its rim', () => {
    const hub = wheelHub(wheel);
    expect(hitsHub(wheel, hub.x + 10, hub.y - 10)).toBe(true);
    expect(hitsHub(wheel, hub.x + 4 * TILE * HUB.hubShare + 1, hub.y)).toBe(false);
    expect(hitsHub(wheel, hub.x, hub.y - 4 * TILE)).toBe(false);
  });

  it('turns the other way with every seat staying where it is', () => {
    const ms = 3456;
    const turned = reversed({ dir: 1, ms });
    expect(turned.dir).toBe(-1);
    for (let i = 0; i < 6; i++) {
      const before = seatPlace(wheel, i, ms);
      const after = seatPlace({ ...wheel, dir: turned.dir }, i, turned.ms);
      expect(after.x).toBeCloseTo(before.x);
      expect(after.y).toBeCloseTo(before.y);
    }
    // And on from there, the other way: the top seat, a little later, has moved left, not right.
    const top = { ...wheel, dir: -1 };
    expect(seatPlace(top, 0, 500).x).toBeLessThan(seatPlace(top, 0, 0).x);
  });

  it('finds rotten seats it does not have, and a wheel with no good seat', () => {
    const map = mapBuilder(30, 20).ground(0, 29, 18).rows();
    const check = (broken) => wheelProblems({ map, wheels: [{ col: 10, row: 10, radius: 4, seats: 4, broken }] });
    expect(check([1, 3])).toEqual([]);
    expect(check([4])[0]).toMatch(/doesn't have/);
    expect(check([0, 1, 2, 3])[0]).toMatch(/no good seat/);
  });
});


describe('arrow stones', () => {
  it('point the way they go next', () => {
    expect(arrowAngle({ x: 0, y: 0 }, { x: 100, y: 0 })).toBeCloseTo(0);
    expect(arrowAngle({ x: 0, y: 0 }, { x: -100, y: 0 })).toBeCloseTo(Math.PI);
    expect(arrowAngle({ x: 0, y: 100 }, { x: 0, y: 0 })).toBeCloseTo(-Math.PI / 2); // going up
  });

  it('are hit on the stone, and just above it, where a cat level with it shoots', () => {
    const rect = { left: 0, right: 192, top: 500, bottom: 544 };
    expect(hitsStone(rect, 100, 520)).toBe(true);
    expect(hitsStone(rect, 100, 500 - 21)).toBe(true); // his gun, standing level with it
    expect(hitsStone(rect, 100, 500 - ARROW_STONE.reach - 1)).toBe(false);
    expect(hitsStone(rect, 250, 520)).toBe(false);
  });
});
