import { describe, expect, it } from 'vitest';
import { AMBIENCE } from '../src/data/adventure/ambience.js';
import { BACKDROPS } from '../src/data/adventure/backdrop.js';

describe('the moving life', () => {
  it('has sensible ranges for every world', () => {
    for (const [world, { fireflies, leaves, sway }] of Object.entries(AMBIENCE)) {
      for (const [low, high] of [fireflies.lifeMs, fireflies.size, leaves.lifeMs, leaves.fall, leaves.across, leaves.size, sway.periodMs]) {
        expect(low, world).toBeLessThanOrEqual(high);
      }
      expect(fireflies.everyMs, world).toBeGreaterThanOrEqual(100); // not so many they cost much
      expect(leaves.everyMs, world).toBeGreaterThanOrEqual(300);
    }
  });

  it('draws fireflies in front of the backdrop and behind the level, and leaves behind the cat', () => {
    for (const [world, { fireflies, leaves }] of Object.entries(AMBIENCE)) {
      const back = Math.max(...BACKDROPS[world].layers.map((layer) => layer.depth));
      expect(fireflies.depth, world).toBeGreaterThan(back);
      expect(fireflies.depth, world).toBeLessThan(2); // the tiles
      expect(leaves.depth, world).toBeLessThan(5); // the cat and enemies
    }
  });
});
