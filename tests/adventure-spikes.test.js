import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { SPIKES, spikePicture } from '../src/data/adventure/spikes.js';

const TILE = 64;

// Each world's spikes hurt where they're drawn: the hit box covers most of each picture's height
// (the owner found the Autumn thorns' top didn't hurt), never more than it, and stays inside its
// cell (a picture wider than its cell overlaps its neighbours' without hurting them).
describe('spikes', () => {
  it.each(Object.keys(SPIKES))('%s: its hit box matches its pictures', async (world) => {
    const { pictures, hit } = SPIKES[world];
    for (const picture of pictures) {
      const { data, info } = await sharp(`public/assets/adventure/${world}/${picture}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let top = info.height, left = info.width, right = -1;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 128) { top = Math.min(top, y); left = Math.min(left, x); right = Math.max(right, x); }
      }
      const drawnH = info.height - top, inCell = Math.min(right - left + 1, TILE);
      expect(hit.h, `${world} ${picture}`).toBeGreaterThanOrEqual(drawnH * 0.65);
      expect(hit.h, `${world} ${picture}`).toBeLessThanOrEqual(drawnH);
      expect(hit.w, `${world} ${picture}`).toBeGreaterThanOrEqual(inCell * 0.8);
      expect(hit.w, `${world} ${picture}`).toBeLessThanOrEqual(inCell);
    }
  });

  it('gives each cell one of its world\'s pictures, the same each time', () => {
    const random = (c, r) => ((c * 7 + r * 3) % 10) / 10;
    expect(spikePicture('autumn', 4, 2, random)).toBe(spikePicture('autumn', 4, 2, random));
    const seen = new Set(Array.from({ length: 10 }, (_, c) => spikePicture('autumn', c, 2, random)));
    expect(seen).toEqual(new Set(SPIKES.autumn.pictures));
    expect(spikePicture('wood', 1, 1, random)).toBe('spike');
  });
});
