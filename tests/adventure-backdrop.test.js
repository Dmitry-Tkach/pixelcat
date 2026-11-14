import { describe, expect, it } from 'vitest';
import { BACKDROPS, layerRise } from '../src/data/adventure/backdrop.js';
import { ADVENTURE_ART } from '../src/data/adventure/index.js';

describe('the adventure backdrops', () => {
  it('gives every world a backdrop, with its pictures in the world\'s art', () => {
    for (const [world, names] of Object.entries(ADVENTURE_ART)) {
      const backdrop = BACKDROPS[world];
      expect(backdrop, world).toBeDefined();
      for (const { picture } of backdrop.layers) expect(names, `${world}: ${picture}`).toContain(picture);
      if (backdrop.front) expect(names, `${world}: ${backdrop.front.picture}`).toContain(backdrop.front.picture);
    }
  });

  it('puts the layers back to front, each nearer one moving more', () => {
    for (const { layers } of Object.values(BACKDROPS)) {
      for (let i = 1; i < layers.length; i++) {
        expect(layers[i].depth).toBeGreaterThan(layers[i - 1].depth);
        expect(layers[i].drift).toBeGreaterThan(layers[i - 1].drift);
      }
    }
  });

  it('moves a layer against the camera as it climbs, but no further than its room', () => {
    expect(layerRise(-100, 0.1, 50)).toBeCloseTo(10); // climbing up 100 px: the layer moves down 10
    expect(layerRise(200, 0.1, 50)).toBeCloseTo(-20);
    expect(layerRise(-5000, 0.1, 50)).toBe(50);
    expect(layerRise(5000, 0.1, 50)).toBe(-50);
  });
});
