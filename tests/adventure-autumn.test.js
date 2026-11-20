import { describe, expect, it } from 'vitest';
import { ADVENTURE_ART, ADVENTURE_LEVELS, adventureArtKey, adventureArtWorld } from '../src/data/adventure/index.js';
import { mapBuilder, vineRuns } from '../src/data/adventure/mapBuilder.js';
import { TILES, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { drawbridgeCells, drawbridgeProblems, hitsSwitch } from '../src/systems/adventure/drawbridges.js';
import { FISH, fishAt, fishProblems, touchesFish } from '../src/data/adventure/fish.js';
import { MOLE, moleStep } from '../src/systems/adventure/moleLogic.js';

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

// How far (cells) the cat can shoot a switch from: well within the minigun's range.
const SHOT_RANGE = 12;

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
      for (const bridge of level.drawbridges) {
        // Only this bridge up: the others are down, as the cat lowered them on his way.
        const { reached } = adventureRoutes({ ...level, drawbridges: level.drawbridges.filter((other) => other !== bridge) });
        const { switch: at, shot } = bridge;
        // A switch to be shot from across: somewhere he stands on its row, in front of it, with no
        // ground between. Any other, he walks to.
        const seen = shot && [...reached].some((cell) => {
          const [c, r] = cell.split(',').map(Number);
          if (r !== at.row || Math.abs(c - at.col) > SHOT_RANGE) return false;
          const [a, b] = c < at.col ? [c, at.col] : [at.col, c];
          for (let x = a + 1; x < b; x++) if (level.map[r][x] === '#') return false;
          return true;
        });
        expect(shot ? seen : reached.has(`${at.col},${at.row}`), `switch at ${at.col},${at.row}`).toBe(true);
      }
    },
  );
});

describe('The Forgotten Village', () => {
  it('needs each of its drawbridges: neither chasm can be jumped', () => {
    for (const bridge of village.drawbridges) {
      const others = village.drawbridges.filter((other) => other !== bridge);
      expect(adventureRoutes({ ...village, drawbridges: others }).portal, `the bridge from column ${bridge.from}`).toBe(false);
    }
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

describe('leaping fish', () => {
  const surfaceY = 31 * 64;
  const fish = { col: 10, rise: 4, across: 2, restMs: 1000 };

  it('arc out of the water and back, highest halfway', () => {
    const leapMs = FISH.leapMs;
    const start = fishAt(fish, 0, surfaceY, 64);
    const top = fishAt(fish, leapMs / 2, surfaceY, 64);
    expect(start.y).toBeCloseTo(surfaceY);
    expect(top.y).toBeCloseTo(surfaceY - 4 * 64);
    expect(top.x).toBeCloseTo(10 * 64 + 32);
    expect(start.angle).toBeLessThan(0); // nose up as it leaves the water, travelling right
    expect(fishAt(fish, leapMs * 0.9, surfaceY, 64).angle).toBeGreaterThan(0); // nose down as it dives
  });

  it('rest under water between leaps, and count their leaps', () => {
    expect(fishAt(fish, FISH.leapMs + 10, surfaceY, 64)).toBeNull();
    const cycle = FISH.leapMs + fish.restMs;
    expect(fishAt(fish, cycle + 10, surfaceY, 64).leap).toBe(1);
  });

  it('take turns, by their phase', () => {
    expect(fishAt({ ...fish, phaseMs: FISH.leapMs + 10 }, 0, surfaceY, 64)).toBeNull();
  });

  it('touch only what is close', () => {
    const place = { x: 100, y: 100 };
    expect(touchesFish(place, 110, 105)).toBe(true);
    expect(touchesFish(place, 160, 100)).toBe(false);
  });

  it('must leap from open water', () => {
    const level = { map: ['....', '##..'], water: { row: 1 } };
    expect(fishProblems({ ...level, fish: [{ col: 3 }] })).toEqual([]);
    expect(fishProblems({ ...level, fish: [{ col: 0 }] })).toEqual(["fish 1 must leap from open water, not from column 0's ground"]);
    expect(fishProblems({ map: level.map, fish: [{ col: 3 }] })).toEqual(['fish need water: the level has none']);
  });
});

describe('vine runs', () => {
  it('group a level\'s vine cells into one run for each vine', () => {
    const cells = [{ col: 4, row: 5 }, { col: 4, row: 3 }, { col: 4, row: 4 }, { col: 9, row: 1 }, { col: 9, row: 2 }];
    expect(vineRuns(cells)).toEqual([{ col: 4, top: 3, bottom: 5 }, { col: 9, top: 1, bottom: 2 }]);
  });
});

describe('the mole', () => {
  const run = (steps) => steps.reduce(({ state, log }, [ms, cat]) => {
    const { state: next, changed } = moleStep(state, ms, cat);
    return { state: next, log: changed ? [...log, changed] : log };
  }, { state: { state: 'hidden', ms: 0, swings: 0 }, log: [] });

  it('waits, pops up when the cat comes near, and sinks back after a while', () => {
    const near = { near: true, attacking: false };
    const { log } = run([[MOLE.restMs, near], [10, near], [MOLE.riseMs, near], [MOLE.upMs, near], [MOLE.riseMs, near]]);
    expect(log).toEqual(['rising', 'up', 'sinking', 'hidden']);
  });

  it('stays hidden while the cat is away', () => {
    expect(run([[MOLE.restMs * 3, { near: false, attacking: false }]]).log).toEqual([]);
  });

  it('never sinks in the middle of a swing', () => {
    const swinging = { near: true, attacking: true };
    const { state } = run([[MOLE.restMs, swinging], [10, swinging], [MOLE.riseMs, swinging], [MOLE.upMs * 2, swinging]]);
    expect(state.state).toBe('up');
  });

  it('goes down after its swings', () => {
    const up = { state: 'up', ms: 0, swings: MOLE.swings };
    expect(moleStep(up, 16, { near: true, attacking: false }).changed).toBe('sinking');
  });
});
