import { describe, expect, it } from 'vitest';
import { LEVEL_KINDS, targetTime } from '../src/data/adventure/levelKinds.js';
import { ADVENTURE_ROADMAP } from '../src/data/adventure/roadmap.js';

describe('level kinds', () => {
  it('gives every level on the road map a kind, and every boss level the boss kind', () => {
    for (const [i, step] of ADVENTURE_ROADMAP.entries()) {
      expect(LEVEL_KINDS[step.kind], step.id).toBeDefined();
      if (i % 3 === 2) expect(step.kind, step.id).toBe('boss');
    }
  });
  it('says each kind\'s target time in words', () => {
    expect(targetTime('standard')).toBe('5–8 minutes');
    expect(targetTime('timeAttack')).toBe('40–60 seconds');
  });
});
