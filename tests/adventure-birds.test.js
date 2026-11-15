import { describe, expect, it } from 'vitest';
import { BIRD, BIRD_KINDS, birdHome, diveAt, hoverY, inReach } from '../src/data/adventure/birds.js';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';
import { TILE, readAdventureMap } from '../src/systems/adventureMap.js';

describe('pterodactyls', () => {
  it('dive at the cat only from his side and above him, within reach', () => {
    expect(inReach(0, 0, 5 * TILE, 3 * TILE)).toBe(true);
    expect(inReach(0, 0, 0, 3 * TILE)).toBe(false); // straight above him: never
    expect(inReach(0, 0, 5 * TILE, -TILE)).toBe(false); // he's above it
    expect(inReach(0, 0, 20 * TILE, 3 * TILE)).toBe(false); // too far
  });

  it('dive at least a little and at most 45 degrees below level, toward him, at their speed', () => {
    const steep = diveAt(0, 0, 100, 600);
    expect(Math.atan2(steep.vy, Math.abs(steep.vx)) * 180 / Math.PI).toBeCloseTo(BIRD.angle.maxDeg);
    const flat = diveAt(0, 0, -600, 0);
    expect(flat.vx).toBeLessThan(0);
    expect(Math.atan2(flat.vy, Math.abs(flat.vx)) * 180 / Math.PI).toBeCloseTo(BIRD.angle.minDeg);
    expect(Math.hypot(flat.vx, flat.vy)).toBeCloseTo(BIRD.diveSpeed);
    expect(flat.distance).toBeCloseTo(600 + BIRD.overshoot);
  });

  it('warn longer than the traps do, and dive faster than he runs', () => {
    expect(BIRD.warnMs).toBeGreaterThanOrEqual(600);
    expect(BIRD.diveSpeed).toBeGreaterThan(380);
  });

  it('hover up and down round their home, a loop each way', () => {
    const y0 = birdHome({ col: 3, row: 5 }).y;
    expect(hoverY(y0, 0)).toBeCloseTo(y0);
    expect(hoverY(y0, BIRD.hover.periodMs / 4)).toBeCloseTo(y0 - BIRD.hover.loop * TILE);
  });

  it('are listed by the map builder', () => {
    const level = mapBuilder(10, 10).bird('diver', 4, 3, { wake: 2 });
    expect(level.birds()).toEqual([{ kind: 'diver', col: 4, row: 3, wake: 2 }]);
  });

  it.each(ADVENTURE_LEVELS.map((level) => [level.id, level]))('%s puts its birds in open air, of a kind there is', (_id, level) => {
    const { tiles } = readAdventureMap(level.map);
    for (const { kind, col, row } of level.birds ?? []) {
      expect(BIRD_KINDS).toContain(kind);
      expect(tiles[row]?.[col], `${kind} at ${col},${row}`).toBe(-1);
    }
  });
});
