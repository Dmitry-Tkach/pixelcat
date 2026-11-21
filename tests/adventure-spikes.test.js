import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { SPIKE_HIT } from '../src/data/adventure/spikes.js';

// Each world's spikes hurt where they're drawn: the hit box covers most of its picture's height (the
// owner found the Autumn thorns' top didn't hurt), never more than the picture.
describe('spikes', () => {
  it.each(Object.keys(SPIKE_HIT))('%s: its hit box matches its picture', async (world) => {
    const { data, info } = await sharp(`public/assets/adventure/${world}/spike.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let top = info.height, left = info.width, right = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 128) { top = Math.min(top, y); left = Math.min(left, x); right = Math.max(right, x); }
    }
    const drawnH = info.height - top, drawnW = right - left + 1;
    const hit = SPIKE_HIT[world];
    expect(hit.h).toBeGreaterThanOrEqual(drawnH * 0.65);
    expect(hit.h).toBeLessThanOrEqual(drawnH);
    expect(hit.w).toBeGreaterThanOrEqual(drawnW * 0.8);
    expect(hit.w).toBeLessThanOrEqual(drawnW);
  });
});
