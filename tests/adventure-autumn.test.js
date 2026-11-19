import { describe, expect, it } from 'vitest';
import { ADVENTURE_ART, ADVENTURE_LEVELS, adventureArtKey, adventureArtWorld } from '../src/data/adventure/index.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';
import { TILES, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { drawbridgeCells, drawbridgeProblems, hitsSwitch } from '../src/systems/adventure/drawbridges.js';

// The Autumn Forest (world 2) and what its first level brought: borrowed art, vines, cracked floor,
// drawbridges and the locked Guardian Gate.
const village = ADVENTURE_LEVELS.find((level) => level.id === 'autumn-1');

// A small level: ground along row 8, the start on the left and the portal on the right.
const tiny = (build) => {
  const b = mapBuilder(24, 14).ground(0, 23, 8).put(1, 7, '@').put(22, 7, 'E');
  build?.(b);
  return { id: 'tiny', world: 'autumn', map: b.rows(), drawbridges: b.drawbridges(), vines: b.vines() };
};

describe('the Autumn Forest', () => {
  it('uses its own pictures, and borrows the rest from the Wood world', () => {
    expect(adventureArtWorld('autumn', 'tiles')).toBe('autumn');
    expect(adventureArtWorld('autumn', 'minigun')).toBe('wood');
    expect(adventureArtKey('autumn', 'trap-mace')).toBe('adventure-wood-trap-mace');
    expect(adventureArtWorld('wood', 'tiles')).toBe('wood');
    // Nothing in its own list is something the Wood world must lend it: they'd be loaded twice.
    expect(new Set(ADVENTURE_ART.autumn).size).toBe(ADVENTURE_ART.autumn.length);
  });

  it('has its first level on the road map', () => {
    expect(village).toBeDefined();
    expect(village.world).toBe('autumn');
    expect(checkAdventureLevel(village)).toEqual([]);
  });
});

describe('climbing vines', () => {
  it('are ladders, and remember their cells for their look', () => {
    const b = mapBuilder(10, 10).ground(0, 9, 8).island(3, 6, 3).vine(4, 3, 7);
    expect(b.vines()).toEqual([3, 4, 5, 6, 7].map((row) => ({ col: 4, row })));
    expect(readAdventureMap(b.rows()).ladders).toHaveLength(5);
  });
});

describe('cracked floor', () => {
  it('goes into the ground, which joins it as if it were ground', () => {
    const b = mapBuilder(10, 6).ground(0, 9, 3).cracked(4, 5, 3);
    const { tiles, objects } = readAdventureMap(b.rows());
    expect(objects.filter((o) => o.type === 'cracked')).toHaveLength(2);
    // The ground beside it is plain ground top, not an edge.
    expect(tiles[3][3]).toBe(TILES.groundTop);
    expect(tiles[3][6]).toBe(TILES.groundTop);
  });

  it('lets the cat fall through it into what is below', () => {
    // A sealed cave under the floor, with a coin: only the cracked floor leads to it.
    const sealed = tiny((b) => b.hollow(8, 14, 10, 11).put(12, 11, 'o'));
    expect(adventureRoutes(sealed).unreachable.map((o) => o.type)).toContain('coin');
    const opened = tiny((b) => b.hollow(8, 14, 10, 11).hollow(10, 10, 9, 9).put(12, 11, 'o').cracked(10, 10, 8));
    expect(adventureRoutes(opened).unreachable).toEqual([]);
  });
});

describe('drawbridges', () => {
  it('cover the cells from their start to their end', () => {
    expect(drawbridgeCells({ from: 3, to: 5, row: 7 })).toEqual([{ col: 3, row: 7 }, { col: 4, row: 7 }, { col: 5, row: 7 }]);
  });

  it('are set off at their switch, not beside it', () => {
    const at = { col: 2, row: 3 };
    expect(hitsSwitch(at, 2 * 64 + 32, 3 * 64 + 32, 64)).toBe(true);
    expect(hitsSwitch(at, 2 * 64 + 32 + 64, 3 * 64 + 32, 64)).toBe(false);
  });

  it('must be in empty cells', () => {
    const level = tiny((b) => b.drawbridge(2, 7, 5, 8, 8));
    expect(drawbridgeProblems(level)).toEqual(['drawbridge 1 must be in empty cells']);
    expect(drawbridgeProblems(tiny((b) => b.gap(5, 8).drawbridge(2, 7, 5, 8, 8)))).toEqual([]);
  });

  it('carry the cat across a gap only once down', () => {
    const level = tiny((b) => b.gap(6, 18).drawbridge(3, 7, 6, 18, 8));
    expect(adventureRoutes(level).portal).toBe(true);
    expect(adventureRoutes(level, { bridgesUp: true }).portal).toBe(false);
  });

  it.each(ADVENTURE_LEVELS.filter((level) => level.drawbridges?.length).map((level) => [level.id, level]))(
    '%s: every switch can be reached before its bridge is down', (_id, level) => {
      const { reached } = adventureRoutes(level, { bridgesUp: true });
      for (const { switch: at } of level.drawbridges) expect(reached.has(`${at.col},${at.row}`), `switch at ${at.col},${at.row}`).toBe(true);
    },
  );
});

describe('The Forgotten Village', () => {
  it('needs its drawbridge: the chasm is too wide to jump', () => {
    expect(adventureRoutes(village, { bridgesUp: true }).portal).toBe(false);
  });

  it('locks its gate, and has the gold key for it', () => {
    expect(village.portalLocked).toBe(true);
    expect(readAdventureMap(village.map).objects.filter((o) => o.type === 'key')).toHaveLength(1);
    expect(checkAdventureLevel({ ...village, map: village.map.map((row) => row.replace('k', '.')) })).toContain('a locked portal needs a key, k');
  });

  it('hides its silver key and three crystals, all within reach', () => {
    const { objects } = readAdventureMap(village.map);
    expect(objects.filter((o) => o.type === 'gem')).toHaveLength(3);
    expect(adventureRoutes(village).unreachable).toEqual([]);
  });
});
