import { describe, expect, it } from 'vitest';
import { FADE_COLS, MOODS, mixMoods, moodAt } from '../src/data/adventure/moods.js';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';

const stretches = [{ from: 10, to: 20, mood: 'hollow' }];

describe('moods', () => {
  it('is normal away from any stretch, and the stretch\'s own inside it', () => {
    expect(moodAt(0, stretches)).toEqual(MOODS.normal);
    expect(moodAt(15, stretches)).toEqual(mixMoods(MOODS.normal, MOODS.hollow, 1));
  });

  it('fades in and out softly at the ends', () => {
    const halfway = moodAt(10 - FADE_COLS / 2, stretches);
    expect(halfway.washAlpha).toBeGreaterThan(0);
    expect(halfway.washAlpha).toBeLessThan(MOODS.hollow.washAlpha);
    expect(moodAt(20 + FADE_COLS, stretches).washAlpha).toBeCloseTo(0);
  });

  it('mixes colours channel by channel', () => {
    expect(mixMoods({ ...MOODS.normal, wash: 0x000000 }, { ...MOODS.normal, wash: 0xff8040 }, 0.5).wash).toBe(0x804020);
  });

  it('only uses moods that exist, in stretches inside the level', () => {
    for (const level of ADVENTURE_LEVELS) {
      for (const { from, to, mood } of level.moods ?? []) {
        expect(MOODS[mood], `${level.id}: ${mood}`).toBeDefined();
        expect(from).toBeLessThan(to);
        expect(to).toBeLessThan(level.map[0].length);
      }
    }
  });
});
