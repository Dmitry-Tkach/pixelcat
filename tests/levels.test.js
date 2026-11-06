import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/data/levels/index.js';
import { MUSIC_TRACKS } from '../src/data/music.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { IMAGE_ASSETS, THEMES } from '../src/data/themes.js';
import { Progress } from '../src/systems/Progress.js';
import { validateLevel } from '../src/systems/levelValidation.js';

describe('Progress', () => {
  const ids = ['a', 'b', 'c'];
  const memoryStorage = (initial = {}) => {
    const data = { ...initial };
    return {
      data,
      getItem: (key) => data[key] ?? null,
      setItem: (key, value) => { data[key] = value; },
    };
  };

  it('starts with only the first level open', () => {
    const progress = new Progress({ levelIds: ids, storage: memoryStorage() });
    expect(progress.isUnlocked(0)).toBe(true);
    expect(progress.isUnlocked(1)).toBe(false);
    expect(progress.nextIndex).toBe(0);
    expect(progress.hasStarted).toBe(false);
  });

  it('opens the next level on finishing one, and survives a reload', () => {
    const storage = memoryStorage();
    new Progress({ levelIds: ids, storage }).record('a', 2, 30);
    const reloaded = new Progress({ levelIds: ids, storage });
    expect(reloaded.isUnlocked(1)).toBe(true);
    expect(reloaded.isUnlocked(2)).toBe(false);
    expect(reloaded.nextIndex).toBe(1);
    expect(reloaded.totalStars).toBe(2);
  });

  it('keeps the best result', () => {
    const progress = new Progress({ levelIds: ids, storage: memoryStorage() });
    progress.record('a', 3, 40);
    progress.record('a', 1, 50);
    expect(progress.resultFor('a')).toEqual({ stars: 3, coins: 50 });
  });

  it('survives damaged or blocked storage', () => {
    expect(new Progress({ levelIds: ids, storage: memoryStorage({ 'cat-escape-progress': '{oops' }) }).results).toEqual({});
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const progress = new Progress({ levelIds: ids, storage: blocked });
    progress.record('a', 1, 1);
    expect(progress.isUnlocked(1)).toBe(true);
  });

  it('keeps a found toy mouse, even if a later run misses it', () => {
    const progress = new Progress({ levelIds: ids, storage: memoryStorage() });
    progress.record('a', 1, 1, true);
    progress.record('a', 1, 1, false);
    expect(progress.resultFor('a').mouse).toBe(true);
    expect(progress.totalMice).toBe(1);
  });

  it('can open every level', () => {
    expect(new Progress({ levelIds: ids, storage: memoryStorage(), unlockAll: true }).isUnlocked(2)).toBe(true);
  });
});

describe('world themes', () => {
  it('swap only to obstacles and ledges that exist', () => {
    for (const theme of Object.values(THEMES)) {
      for (const type of Object.values(theme.swap ?? {})) expect(OBSTACLES[type], type).toBeDefined();
    }
  });

  it('have every image they use', () => {
    for (const theme of Object.values(THEMES)) {
      expect(IMAGE_ASSETS[theme.backdrop], theme.backdrop).toBeDefined();
      expect(IMAGE_ASSETS[theme.gate], theme.gate).toBeDefined();
      for (const { texture } of theme.layers) expect(IMAGE_ASSETS[texture], texture).toBeDefined();
    }
    for (const type of Object.values(OBSTACLES)) {
      if (type.texture) expect(IMAGE_ASSETS[type.texture], type.texture).toBeDefined();
    }
  });
});

describe('level data', () => {
  it.each(LEVELS.map((level) => [level.id, level]))('%s is playable and fair', (_id, level) => {
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toEqual([]);
  });

  it.each(LEVELS.map((level) => [level.id, level]))('%s hides one toy mouse', (_id, level) => {
    expect(level.mouse).toBeDefined();
    expect(level.mouse.at).toBeLessThan(level.length);
  });

  it('builds each level toward the end: the finale is the longest', () => {
    const longest = Math.max(...LEVELS.map((level) => level.length / level.cat.speed));
    expect(LEVELS.at(-1).length / LEVELS.at(-1).cat.speed).toBe(longest);
  });

  it('has unique level ids', () => {
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);
  });

  it('measures spacing from the edges of wide mud, not its middle', () => {
    const speed = LEVELS[5].cat.speed;
    const pair = (gap) => ({
      ...LEVELS[5],
      attacks: [],
      wagons: [],
      obstacles: [{ type: 'mudPool', at: 2000 }, { type: 'pumpkin', at: 2000 + gap }],
    });
    expect(validateLevel(pair(speed * 1.4), OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('obstacles 0 and 1 are too close to avoid both');
    expect(validateLevel(pair(speed * 1.8), OBSTACLES, THEMES, MUSIC_TRACKS)).toEqual([]);
  });

  it('flags mud too wide to jump across', () => {
    const types = { ...OBSTACLES, mudPool: { ...OBSTACLES.mudPool, zone: { width: 900, speedMultiplier: 0.6 } } };
    const level = { ...LEVELS[5], attacks: [], wagons: [], obstacles: [{ type: 'mudPool', at: 2000 }] };
    expect(validateLevel(level, types, THEMES, MUSIC_TRACKS)).toContain('obstacle 0 (mudPool) is too wide to jump across');
  });

  it('flags a lunge during a wagon ride', () => {
    const level = { ...LEVELS[5], obstacles: [], wagons: [{ at: 2000 }], attacks: [{ at: 2000 }] };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('wagon 0 has a lunge during its ride');
  });

  it('flags obstacles placed too close together', () => {
    const level = {
      ...LEVELS[0],
      obstacles: [{ type: 'cone', at: 1000 }, { type: 'cone', at: 1100 }],
    };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('obstacles 0 and 1 are too close to avoid both');
  });

  it('allows tighter spacing only for an obstacle marked as a combo', () => {
    const pair = (combo) => ({
      ...LEVELS[0],
      attacks: [],
      platforms: [],
      treats: [],
      checkpoints: [],
      obstacles: [{ type: 'cone', at: 1000 }, { type: 'banner', at: 1400, combo }],
    });
    expect(validateLevel(pair(false), OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('obstacles 0 and 1 are too close to avoid both');
    expect(validateLevel(pair(true), OBSTACLES, THEMES, MUSIC_TRACKS)).toEqual([]);
  });

  it('flags a lunge that lands on top of an obstacle', () => {
    const level = { ...LEVELS[0], attacks: [{ at: 700 }], obstacles: [{ type: 'cone', at: 1078 }] };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('lunge 0 lands too close to an obstacle');
  });

  it('flags a chaser who would be faster than the cat', () => {
    const level = { ...LEVELS[2], chase: { ...LEVELS[2].chase, ownerSpeed: 455 } };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('boy would be faster than the cat');
  });

  it('flags an unknown chaser', () => {
    const level = { ...LEVELS[0], chasers: ['ghost'] };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('unknown chaser "ghost"');
  });

  it('flags a checkpoint with an obstacle right after it', () => {
    const level = { ...LEVELS[0], attacks: [], checkpoints: [1000], obstacles: [{ type: 'cone', at: 1100 }] };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('checkpoint 0 has an obstacle too soon after it');
  });

  it('flags a ledge that can\'t be reached from the one before', () => {
    const level = {
      ...LEVELS[0],
      platforms: [{ at: 1000, width: 200, height: 100, style: 'plank' }, { at: 1250, width: 200, height: 360, style: 'plank' }],
    };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('platform 1 can\'t be reached from platform 0');
  });

  it('flags a swinging obstacle with no position', () => {
    const level = { ...LEVELS[0], obstacles: [{ type: 'crate', at: 1000 }] };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('obstacle 0 (crate) needs a position of "low" or "high"');
  });

  it('flags an owner who can never be outrun', () => {
    const level = { ...LEVELS[0], chase: { ...LEVELS[0].chase, ownerSpeed: 9999 } };
    expect(validateLevel(level, OBSTACLES, THEMES, MUSIC_TRACKS)).toContain('the owner must be slower than the cat at full speed');
  });
});
