import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADVENTURE_ROADMAP, ADVENTURE_WORLDS, ROADMAP_MAP } from '../src/data/adventure/roadmap.js';

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

describe('the road map\'s picture', () => {
  const { w, h, hex, nodes } = ROADMAP_MAP;

  it('has its picture and backdrop', () => {
    for (const file of [ROADMAP_MAP.file, ROADMAP_MAP.backdrop]) expect(existsSync(`public/${file}`), file).toBe(true);
  });

  it('has a button for every level, whole inside the picture', () => {
    expect(nodes).toHaveLength(ADVENTURE_ROADMAP.length);
    for (const [x, y] of nodes) {
      expect(x - hex / 2).toBeGreaterThanOrEqual(0);
      expect(x + hex / 2).toBeLessThanOrEqual(w);
      expect(y - hex / 2).toBeGreaterThanOrEqual(0);
      expect(y + hex / 2).toBeLessThanOrEqual(h);
    }
  });

  it('climbs like a ladder: each world higher up than the one before, its 3 levels left to right', () => {
    for (let world = 0; world < ADVENTURE_WORLDS.length; world++) {
      const row = nodes.slice(world * 3, world * 3 + 3);
      expect(row[0][0]).toBeLessThan(row[1][0]);
      expect(row[1][0]).toBeLessThan(row[2][0]);
      // The three on one island are level with each other.
      expect(Math.max(...row.map(([, y]) => y)) - Math.min(...row.map(([, y]) => y))).toBeLessThan(hex / 2);
      if (world > 0) expect(row[0][1]).toBeLessThan(nodes[(world - 1) * 3][1] - hex);
    }
  });

  it('never puts two buttons on top of each other', () => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        expect(Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]), `${i + 1} and ${j + 1}`).toBeGreaterThan(hex);
      }
    }
  });
});
