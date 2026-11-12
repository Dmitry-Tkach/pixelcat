import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADVENTURE_ROADMAP, ADVENTURE_WORLDS, ROADMAP_LOOK, ROADMAP_PIECES } from '../src/data/adventure/roadmap.js';
import { roadmapLayout } from '../src/systems/adventure/roadmapLayout.js';
import { adventureRoadmapPictures } from '../src/ui/adventureRoadmap.js';

describe('the adventure\'s worlds', () => {
  it('climbs through the owner\'s 8 worlds in order, 3 levels each', () => {
    expect(ADVENTURE_WORLDS).toEqual(['Forest Ruins', 'Rustic Village', 'Graveyard', 'Crystal Cavern', 'Bone Wastes', 'Sky Temple', 'Dark Fortress', 'Ancient Wilds']);
    for (const world of ADVENTURE_WORLDS) expect(ADVENTURE_ROADMAP.filter((stop) => stop.world === world), world).toHaveLength(3);
    expect(ADVENTURE_ROADMAP).toHaveLength(24);
  });

  it('keeps each world\'s levels together, on its island', () => {
    const order = ADVENTURE_ROADMAP.map((stop) => stop.world).filter((world, i, all) => i === 0 || world !== all[i - 1]);
    expect(order).toEqual(ADVENTURE_WORLDS);
  });
});

describe('the road map', () => {
  const layout = roadmapLayout(ROADMAP_LOOK, ROADMAP_PIECES, ADVENTURE_WORLDS.length);
  const levels = layout.worlds.flatMap((world) => world.levels);

  it('has every piece it shows', () => {
    for (const src of adventureRoadmapPictures()) expect(existsSync(`public/${src}`), src).toBe(true);
    expect(ROADMAP_PIECES.islands).toHaveLength(ADVENTURE_WORLDS.length);
    expect(ROADMAP_PIECES.titles).toHaveLength(ADVENTURE_WORLDS.length);
  });

  it('has a place for every level, inside the map', () => {
    expect(levels).toHaveLength(ADVENTURE_ROADMAP.length);
    for (const { x, y } of levels) {
      expect(x - layout.button.w / 2).toBeGreaterThanOrEqual(0);
      expect(x + layout.button.w / 2).toBeLessThanOrEqual(layout.w);
      expect(y - layout.button.h / 2).toBeGreaterThanOrEqual(0);
      expect(y + layout.button.h / 2).toBeLessThanOrEqual(layout.h);
    }
  });

  it('climbs like a ladder: each world higher than the one before, its levels across its island', () => {
    layout.worlds.forEach((world, i) => {
      const ys = world.levels.map((p) => p.y);
      expect(Math.max(...ys) - Math.min(...ys)).toBe(0);
      for (const { x } of world.levels) {
        expect(x).toBeGreaterThan(world.island.x);
        expect(x).toBeLessThan(world.island.x + world.island.w);
      }
      if (i > 0) expect(world.island.y).toBeLessThan(layout.worlds[i - 1].island.y);
    });
  });

  it('snakes: one world left to right, the next right to left, so each climb stays on one side', () => {
    layout.worlds.forEach((world, i) => {
      const [a, , c] = world.levels;
      expect(i % 2 === 0 ? a.x < c.x : a.x > c.x, `world ${i + 1}`).toBe(true);
      if (i > 0) {
        const last = layout.worlds[i - 1].levels[2];
        expect(Math.sign(last.x - layout.w / 2), `the climb to world ${i + 1}`).toBe(Math.sign(a.x - layout.w / 2));
      }
    });
  });

  it('draws the road through every level, in order', () => {
    expect(layout.route.startsWith(`M${levels[0].x.toFixed(1)} ${levels[0].y.toFixed(1)}`)).toBe(true);
    for (const { x, y } of levels) expect(layout.route).toContain(`${x.toFixed(1)} ${y.toFixed(1)}`);
  });

  it('never puts two buttons on top of each other', () => {
    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < levels.length; j++) {
        expect(Math.hypot(levels[i].x - levels[j].x, levels[i].y - levels[j].y), `${i + 1} and ${j + 1}`).toBeGreaterThan(layout.button.w);
      }
    }
  });
});
