import { describe, expect, it } from 'vitest';
import { BOSS_FIGHTS } from '../src/data/adventure/bossFights.js';
import { stoneLandings, widestGap } from '../src/systems/adventure/bosses/stoneLandings.js';
import { TILE } from '../src/systems/adventureMap.js';

const { stones } = BOSS_FIGHTS.troll1.attacks.stoneBurst;
// The troll's test arena: open floor from column 1 to 22.
const ARENA = { left: TILE, right: 23 * TILE };
const STONE_W = 48;

const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('the stone burst\'s landings', () => {
  it('measures the widest gap between stones, walls included', () => {
    expect(widestGap([100], 0, 400, 20)).toBe(290);
    expect(widestGap([100, 300], 0, 400, 20)).toBe(180);
  });

  it('always drops one stone where the cat stands, keeps them all on the floor, and spreads them out', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const catX = ARENA.left + (seed * 37) % (ARENA.right - ARENA.left);
      const count = stones.min + (seed % (stones.max - stones.min + 1));
      const landings = stoneLandings({ ...ARENA, catX, count, stoneW: STONE_W, gap: stones.gapTiles * TILE, random: seeded(seed) });
      expect(Math.abs(landings[0] - catX)).toBeLessThanOrEqual(STONE_W / 2);
      for (const x of landings) {
        expect(x).toBeGreaterThanOrEqual(ARENA.left + STONE_W / 2);
        expect(x).toBeLessThanOrEqual(ARENA.right - STONE_W / 2);
      }
      const sorted = landings.slice().sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(STONE_W * 2);
    }
  });

  it('always leaves a safe gap of at least 2 tiles, and usually throws all the stones it should', () => {
    let full = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const count = stones.max;
      const landings = stoneLandings({ ...ARENA, catX: 400, count, stoneW: STONE_W, gap: stones.gapTiles * TILE, random: seeded(seed) });
      expect(widestGap(landings, ARENA.left, ARENA.right, STONE_W)).toBeGreaterThanOrEqual(stones.gapTiles * TILE);
      if (landings.length === count) full += 1;
    }
    expect(full).toBeGreaterThan(150);
  });

  it('keeps the gap even in a crowded little arena, by throwing fewer', () => {
    const landings = stoneLandings({ left: 0, right: 500, catX: 250, count: 7, stoneW: STONE_W, gap: 128, random: seeded(3) });
    expect(widestGap(landings, 0, 500, STONE_W)).toBeGreaterThanOrEqual(128);
    expect(landings.length).toBeGreaterThanOrEqual(1);
  });
});
