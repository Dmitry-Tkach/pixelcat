import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { ADVENTURE_ART, ADVENTURE_LEVELS, adventureArtKey, adventureArtWorld, adventurePath } from '../src/data/adventure/index.js';
import { mapBuilder, vineRuns } from '../src/data/adventure/mapBuilder.js';
import { TILES, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { BRIDGE_HOLD, drawbridgeCells, drawbridgeProblems, hitsSwitch } from '../src/systems/adventure/drawbridges.js';
import { FISH, fishAt, fishProblems, touchesFish } from '../src/data/adventure/fish.js';
import { MOLE, moleStep } from '../src/systems/adventure/moleLogic.js';
import { cameraBottom } from '../src/systems/adventure/cameraFloor.js';
import { caveRuns, caveShades } from '../src/systems/adventure/caveFill.js';
import { secretCoverTiles } from '../src/systems/adventure/secretCover.js';
import { COLUMN_REACH, columnSpan } from '../src/systems/adventure/earthColumns.js';
import { pillarLayout } from '../src/systems/adventure/pillarLayout.js';
import { rockCells } from '../src/systems/adventure/rockLayout.js';
import { PILLAR, PILLAR_ART } from '../src/data/adventure/pillars.js';
import { STAIRS, feetOnStairs, holdsOnStairs, stairBox, stairPicture, stairSurface, stairWall } from '../src/systems/adventure/stairSteps.js';

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
    expect(adventureArtKey('autumn', 'trap-crusher')).toBe('adventure-wood-trap-crusher');
    expect(adventureArtKey('autumn', 'trap-mace')).toBe('adventure-autumn-trap-mace'); // the owner's spiked ball
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

describe('falling and timed bridges', () => {
  it('pass their options from the map builder', () => {
    const level = tiny((b) => b.drawbridge(2, 7, 5, 8, 8, { falls: true }).drawbridge(10, 7, 12, 14, 8, { shot: true, holdMs: 5000 }));
    expect(level.drawbridges[0]).toMatchObject({ falls: true });
    expect(level.drawbridges[1]).toMatchObject({ shot: true, holdMs: 5000 });
    expect(level.drawbridges[0].holdMs).toBeUndefined();
  });

  it('need a timed bridge to last longer than its warning, and to have a switch', () => {
    const map = tiny().map.map((row, r) => (r === 3 ? '.'.repeat(24) : row));
    expect(drawbridgeProblems({ map, drawbridges: [{ switch: { col: 2, row: 2 }, from: 4, to: 6, row: 3, holdMs: BRIDGE_HOLD.warnMs }] })).toHaveLength(1);
    expect(drawbridgeProblems({ map, drawbridges: [{ from: 4, to: 6, row: 3, holdMs: 6000 }] })).toHaveLength(1);
    expect(drawbridgeProblems({ map, drawbridges: [{ switch: { col: 2, row: 2 }, from: 4, to: 6, row: 3, holdMs: 6000 }] })).toEqual([]);
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

  it.each(ADVENTURE_LEVELS.filter((level) => level.drawbridges?.some((b) => b.switch)).map((level) => [level.id, level]))(
    '%s: every switch can be reached before its bridge is down', (_id, level) => {
      for (const bridge of level.drawbridges.filter((b) => b.switch)) {
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
  it('needs each of its drawbridges: for the portal, for the gold key, or for a way of its own', () => {
    const key = readAdventureMap(village.map).objects.find((o) => o.type === 'key');
    const needed = (bridge) => {
      const others = village.drawbridges.filter((other) => other !== bridge);
      const { portal, unreachable } = adventureRoutes({ ...village, drawbridges: others });
      return { forGate: !portal || unreachable.some((o) => o.col === key.col && o.row === key.row), forAny: !portal || unreachable.length > 0 };
    };
    const switched = village.drawbridges.filter((b) => b.switch);
    // Every switch opens the way to something: no switch for nothing.
    for (const bridge of switched) expect(needed(bridge).forAny, `the bridge from column ${bridge.from}`).toBe(true);
    // The ruins' and the gate's are on the way to the portal; the high rope bridge is the mill's other way.
    expect(switched.filter((b) => needed(b).forGate).map((b) => b.from)).toEqual([77, 155]);
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

describe('the camera over deep ground', () => {
  // Ground from row 3 down to the map's bottom (row 9), a cracked cell in it, and a gap.
  const map = ['......', '......', '......', '####.#', '####.#', '####.#', '####.#', '####.#', '####.#', '####.#'];
  map[3] = '#Z##.#';

  it('stops four rows under the ground below the cat, not at the map\'s bottom', () => {
    expect(cameraBottom(map, 0, 3, 4, 64, 0)).toBe(7 * 64);
  });

  it('counts cracked floor as ground, so the secret under it stays hidden', () => {
    expect(cameraBottom(map, 1, 3, 4, 64, 0)).toBe(7 * 64);
  });

  it('stops at the map\'s bottom over a gap, and never past it', () => {
    expect(cameraBottom(map, 4, 3, 4, 64)).toBe(10 * 64);
    expect(cameraBottom(map, 0, 8, 4, 64)).toBe(10 * 64);
  });

  it('looks down past the edge of a cliff it stands near', () => {
    // Column 0 is solid ground; the gap at column 4 is three columns away.
    expect(cameraBottom(map, 1, 3, 4, 64, 3)).toBe(10 * 64);
    expect(cameraBottom(map, 0, 3, 4, 64, 3)).toBe(7 * 64);
  });
});

describe('scenery in every level', () => {
  // A picture standing in a level (a house, a tree) stands on ground or an island under the middle
  // of its width (UNDER_SHARE), never on a bridge or over a gap, and not inside the ground. Hanging,
  // turning, in-water and in-front pictures aren't standing.
  const UNDER_SHARE = 0.6;
  it.each(ADVENTURE_LEVELS.map((level) => [level.id, level]))('%s stands its pictures on the ground', async (_id, level) => {
    for (const prop of level.props ?? []) {
      if (prop.hang || prop.spinMs || prop.inWater || prop.front || prop.fromWater || prop.free) continue;
      // A boulder half-buried in the earth sits in the ground.
      if (prop.inGround) {
        expect(level.map[prop.row][prop.col], `${prop.picture} at (${prop.col}, ${prop.row}) isn't in the ground`).toBe('#');
        continue;
      }
      const file = `public/${adventurePath(adventureArtWorld(level.world, prop.picture), prop.picture)}`;
      const width = prop.width ?? (await sharp(file).metadata()).width;
      const half = (width * UNDER_SHARE) / 2 / 64;
      const name = `${prop.picture} at (${prop.col}, ${prop.row})`;
      expect(level.map[prop.row][prop.col], `${name} is inside the ground`).not.toBe('#');
      // Ground or an island as the game reads them (a ladder's top on an island is island), cracked
      // floor, or a timber walkway's deck; not a thin bridge.
      const { tiles } = readAdventureMap(level.map);
      const onWalkway = (c) => (level.walkways ?? []).some((w) => w.row === prop.row + 1 && c >= w.from && c <= w.to);
      const holds = (c) => level.map[prop.row + 1]?.[c] === 'Z' || onWalkway(c) || ((tiles[prop.row + 1]?.[c] ?? -1) >= 0 && tiles[prop.row + 1][c] !== TILES.bridge);
      for (let c = Math.floor(prop.col + 0.5 - half); c <= Math.floor(prop.col + 0.5 + half); c++) {
        expect(holds(c), `${name} has no ground under column ${c}`).toBe(true);
      }
    }
  });
});

describe('cave walls', () => {
  // A hill (#) with a cave inside it (rows 2 and 3, columns 2 to 4), open air (.) round the hill.
  const map = [
    '.......',
    '.#####.',
    '.#...#.',
    '.#...#.',
    '.#####.',
  ];
  const cells = (runs) => runs.flatMap(({ row, from, to }) => Array.from({ length: to - from + 1 }, (_, i) => `${from + i},${row}`));

  it('fill the cave', () => {
    const filled = cells(caveRuns(map, [{ cols: [2, 4], rows: [2, 3] }]));
    for (const cell of ['2,2', '3,2', '4,2', '2,3', '4,3']) expect(filled).toContain(cell);
  });

  it('reach under ground round the cave, but not ground facing the open air outside', () => {
    const wide = ['.........', '.#######.', '.##...##.', '.##...##.', '.#######.', '.#######.'];
    const filled = cells(caveRuns(wide, [{ cols: [3, 5], rows: [2, 3] }]));
    expect(filled).toContain('2,2'); // the cave's side wall, with ground beyond it
    expect(filled).toContain('3,4'); // its floor
    expect(filled).not.toContain('1,2'); // the hill's outside
  });

  it('come as runs along each row', () => {
    expect(caveRuns(map, [{ cols: [2, 4], rows: [2, 3] }]).filter((run) => run.row === 2)).toEqual([{ row: 2, from: 2, to: 4 }]);
  });
});

describe('stairs', () => {
  const flight = { at: 10, row: 5, dir: 1 }; // the higher ground begins at column 10, two rows up
  const box = stairBox(flight, 64);

  it('slope smoothly from the floor at their foot to the higher ground at their top', () => {
    expect(stairSurface(flight, box.left, 64)).toBe(6 * 64);
    expect(stairSurface(flight, box.right, 64)).toBe(4 * 64);
    expect(stairSurface(flight, (box.left + box.right) / 2, 64)).toBe(5 * 64);
    expect(stairSurface(flight, box.left - 1, 64)).toBeNull();
  });

  it('slope the other way for stairs rising to the left', () => {
    const left = { ...flight, dir: -1 };
    const b = stairBox(left, 64);
    expect(stairSurface(left, b.left, 64)).toBe(4 * 64);
    expect(stairSurface(left, b.right, 64)).toBe(6 * 64);
  });

  it('put his feet where the front of his body is, level with the higher ground at the top', () => {
    const atTop = { left: box.right - 60, right: box.right };
    expect(feetOnStairs(flight, atTop, 64)).toBe(4 * 64);
    expect(feetOnStairs(flight, { left: box.left - 200, right: box.left - 140 }, 64)).toBeNull();
  });

  it('hold him on while he walks, but not while he jumps, and catch him as he falls onto them', () => {
    expect(holdsOnStairs({ feet: 310, prevFeet: 300, vy: 50, wasOn: true }, 300)).toBe(true); // a little under: walking up
    expect(holdsOnStairs({ feet: 292, prevFeet: 290, vy: 20, wasOn: true }, 300)).toBe(true); // a little over: walking down
    expect(holdsOnStairs({ feet: 292, prevFeet: 290, vy: 20, wasOn: false }, 300)).toBe(false); // in the air over them
    expect(holdsOnStairs({ feet: 305, prevFeet: 300, vy: -400, wasOn: true }, 300)).toBe(false); // jumping off
    expect(holdsOnStairs({ feet: 360, prevFeet: 280, vy: 2000, wasOn: false }, 300)).toBe(true); // falling through: caught
  });

  it('lift him onto them from their own floor under them, however far under he is', () => {
    expect(holdsOnStairs({ feet: 400, prevFeet: 400, vy: 0, wasOn: false, onFloor: true }, 300, 400)).toBe(true);
    expect(holdsOnStairs({ feet: 400, prevFeet: 400, vy: 0, wasOn: false }, 300, 400)).toBe(false); // in the air, not on the floor
    expect(holdsOnStairs({ feet: 400, prevFeet: 400, vy: -300, wasOn: false, onFloor: true }, 300, 400)).toBe(false); // jumping
  });

  it('leave him on a floor of his own under them (a cave under the stairs)', () => {
    expect(holdsOnStairs({ feet: 640, prevFeet: 640, vy: 0, wasOn: false, onFloor: true }, 300, 400)).toBe(false);
  });

  it('rise to the higher ground\'s edge, the picture tucked on behind its wavy edge', () => {
    const flight = { at: 18, row: 26, dir: 1 };
    expect(stairBox(flight, 64).right).toBe(18 * 64); // his feet reach the top as he steps onto the ground
    expect(stairPicture(flight, 64)).toMatchObject({ left: stairBox(flight, 64).left, right: 18 * 64 + STAIRS.tuck });
    expect(stairPicture(flight, 64).right - stairPicture(flight, 64).left).toBe(STAIRS.width); // at its own width
  });

  it('open the higher ground\'s side behind them, so he walks off the top step onto it', () => {
    expect(stairWall({ at: 18, row: 26, dir: 1 })).toEqual([{ col: 18, row: 26, side: 'left' }, { col: 18, row: 25, side: 'left' }]);
    expect(stairWall({ at: 122, row: 25, dir: -1 })).toEqual([{ col: 121, row: 25, side: 'right' }, { col: 121, row: 24, side: 'right' }]);
  });

  it.each(ADVENTURE_LEVELS.filter((level) => level.stairs?.length).map((level) => [level.id, level]))(
    '%s ends each staircase against its higher ground, standing on the floor', (_id, level) => {
      for (const s of level.stairs) {
        const name = `the stairs at column ${s.at}`;
        const top = s.row + 1 - (s.rows ?? 2); // the higher ground's surface row
        expect(level.map[top][s.dir > 0 ? s.at : s.at - 1], `${name}: no higher ground`).toBe('#');
        const { left, right } = stairBox(s, 64);
        for (let c = Math.floor(left / 64); c <= Math.floor((right - 1) / 64); c++) {
          expect('#Z', `${name}: no floor under column ${c}`).toContain(level.map[s.row + 1][c]);
        }
      }
    },
  );
});

describe('a secret cave\'s cover', () => {
  // Ground from row 2 down, a cave in rows 3 and 4, columns 2 to 4.
  const map = ['.......', '.......', '#######', '##...##', '##...##', '#######'];
  const cover = secretCoverTiles(map, { cols: [2, 4], rows: [3, 4] });
  const at = (c, r) => cover.find((t) => t.col === c && t.row === r)?.tile;

  it('is the ground\'s own tiles, as if the cave were solid', () => {
    expect(at(3, 3)).toBe(TILES.soil); // inside the cave: plain earth
    expect(at(1, 3)).toBe(TILES.soil); // beside it: plain earth, not a wavy edge
    expect(at(3, 2)).toBe(TILES.groundTop); // over it: the ground's top
  });

  it('under a shaft\'s island, is plain earth, and leaves the island the level\'s own', () => {
    // An island (=) over a shaft (a cave) down into the secret, as under the mine.
    const shaft = ['.......', '.......', '###=###', '##...##', '##...##', '#######'];
    const over = secretCoverTiles(shaft, { cols: [2, 4], rows: [3, 4] }, [{ cols: [3, 3], rows: [2, 3] }]);
    const tile = (c, r) => over.find((t) => t.col === c && t.row === r)?.tile;
    expect(tile(3, 3)).toBe(TILES.soil); // under the island: earth, not a grassy top
    expect(over.find((t) => t.col === 3 && t.row === 2)?.behind).toBe(true); // the island: the level draws it, earth behind it
  });

  it('reaches one cell round the cave, and no further', () => {
    expect(at(0, 3)).toBeUndefined();
    expect(at(3, 1)).toBeUndefined(); // air over the ground stays air
  });
});

describe('an earth column', () => {
  // An island on row 1 (columns 1 to 4), the ground from row 6; a column under the island.
  const map = ['......', '.====.', '......', '......', '......', '......', '######'];
  it('reaches into the island over it and the ground under it, so there\'s no gap', () => {
    expect(columnSpan({ col: 2, width: 2, top: 2, bottom: 5 }, map, 64)).toEqual({ x: 128, y: 2 * 64 - COLUMN_REACH, w: 128, h: 4 * 64 + 2 * COLUMN_REACH });
  });
  it('stops at its own cells over or under empty air', () => {
    expect(columnSpan({ col: 2, width: 2, top: 3, bottom: 4 }, map, 64)).toEqual({ x: 128, y: 3 * 64, w: 128, h: 2 * 64 });
  });
});

describe('an earth pillar from the kit', () => {
  // A 4-cell island on row 1 (columns 1 to 4), the ground from row 9; a pillar under the island.
  const map = ['........', '.====...', ...Array(7).fill('........'), '########'];
  const sizes = { top: { w: 600, h: 300 }, trunk: { w: 240, h: 500 }, foot: { w: 470, h: 250 } };
  const pillar = pillarLayout({ col: 2, width: 2, top: 2, bottom: 8 }, map, 64, sizes);

  it('is never shown bigger than cut', () => {
    expect(pillarLayout({ col: 2, width: 3, top: 2, bottom: 8 }, ['.' + '='.repeat(20), ...map.slice(1).map((r) => r.padEnd(21, r.at(-1)))], 64, sizes).scale).toBeLessThanOrEqual(1);
  });

  it('is made small enough for its flare to fit under the island', () => {
    expect(pillar.scale * sizes.top.w).toBeLessThanOrEqual(4 * 64 - 2 * PILLAR.margin + 0.001);
    expect(pillar.x - (pillar.scale * sizes.top.w) / 2).toBeGreaterThanOrEqual(64 + PILLAR.margin - 0.001);
  });

  it('has a flare and a foot against something solid, and reaches into them', () => {
    expect(pillar).toMatchObject({ flare: true, foot: true, top: 2 * 64 - COLUMN_REACH, bottom: 9 * 64 + COLUMN_REACH });
    expect(pillarLayout({ col: 2, width: 2, top: 3, bottom: 7 }, map, 64, sizes)).toMatchObject({ flare: false, foot: false });
  });
});

describe('a cave\'s mouth', () => {
  // Ground with a cave in rows 2 and 3, columns 1 to 5, open to the air on its right (columns 6, 7).
  const map = ['........', '#######.', '#.......', '#.......', '########'];
  const { runs, fades } = caveShades(map, [{ cols: [1, 5], rows: [2, 3] }]);
  const fade = (c, r) => fades.find((f) => f.col === c && f.row === r)?.alpha;

  it('fades the wall out towards the air, clear at its edge', () => {
    expect(fade(5, 2)).toEqual([0.5, 0, 0.5, 0]); // the last cell: half at its inner side, clear at the air
    expect(fade(4, 2)).toEqual([1, 0.5, 1, 0.5]);
  });

  it('is solid further in', () => {
    const solid = new Set(runs.flatMap(({ row, from, to }) => Array.from({ length: to - from + 1 }, (_, i) => `${from + i},${row}`)));
    expect(solid.has('2,2') && solid.has('1,3')).toBe(true);
    expect(solid.has('5,2')).toBe(false);
  });
});

describe('a hole down into a cave', () => {
  // A hole (column 3) through the ground (rows 1, 2) into a cave (row 3).
  const map = ['.......', '###.###', '###.###', '#.....#', '#######'];
  const { runs, fades } = caveShades(map, [{ cols: [3, 3], rows: [1, 2] }, { cols: [1, 5], rows: [3, 3] }]);
  const all = new Set([...runs.flatMap(({ row, from, to }) => Array.from({ length: to - from + 1 }, (_, i) => `${from + i},${row}`)), ...fades.map((f) => `${f.col},${f.row}`)]);

  it('has the wall behind the ground at its edges, faded like the hole, so no sky shows in a box', () => {
    expect(all.has('2,1') && all.has('4,1')).toBe(true);
    expect(fades.find((f) => f.col === 2 && f.row === 1).alpha.slice(0, 2)).toEqual([0, 0]); // clear at the air
  });
});

describe('a cave under a thin roof', () => {
  // A one-row roof (row 1) between the sky and a cave (row 2), closed at both ends.
  const map = ['.......', '#######', '#.....#', '#######'];
  it('stays solid: the sky over the hill isn\'t its mouth', () => {
    expect(caveShades(map, [{ cols: [1, 5], rows: [2, 2] }]).fades).toEqual([]);
  });
});

describe('the ground\'s underside', () => {
  // An overhang (rows 1, 2, columns 0 to 3) over open air, ground under all from row 4.
  const map = ['......', '####..', '####..', '......', '######'];
  const { tiles } = readAdventureMap(map);
  it('ends earth with open air under it in a wavy underside, its corner rounded', () => {
    expect(tiles[2].slice(0, 4)).toEqual([TILES.underLeft, TILES.under, TILES.under, TILES.underRight]); // the map's edge counts as open, as for every tile
    expect(tiles[1][1]).toBe(TILES.groundTop); // its top is still the top
  });
  it('keeps the map\'s bottom row plain soil', () => {
    expect(tiles[4][2]).toBe(TILES.groundTop);
    expect(readAdventureMap(['####', '####']).tiles[1][1]).toBe(TILES.soil);
  });
});

// Each earth pillar stands in the middle of the island it holds up, as the game draws it (its foot
// can push it aside if it hasn't room on the ground: the owner saw it off-centre).
describe('earth pillars in every Autumn level', () => {
  it('stand in the middle of their islands', async () => {
    const dir = 'public/assets/adventure/autumn';
    const size = async (name) => { const { width: w, height: h } = await sharp(`${dir}/${name}.png`).metadata(); return { w, h }; };
    const sizes = { top: await size(PILLAR_ART.top), trunk: await size(PILLAR_ART.trunk), foot: await size(PILLAR_ART.foot) };
    for (const level of ADVENTURE_LEVELS.filter((l) => l.world === 'autumn')) {
      for (const column of level.columns ?? []) {
        const line = level.map[column.top - 1];
        const island = (ch) => ch === '=' || ch === 'H'; // a ladder's top on an island is island
        if (!line || !island(line[column.col])) continue; // only those under an island
        let a = column.col, b = column.col;
        while (island(line[a - 1])) a--;
        while (island(line[b + 1])) b++;
        const { x } = pillarLayout(column, level.map, 64, sizes);
        expect(Math.abs(x - ((a + b + 1) / 2) * 64), `${level.id}: the pillar at column ${column.col}`).toBeLessThan(8);
      }
    }
  });
});


// A rock stands on something: every cell along its bottom edge is ground, or has ground or a pool's
// water under it, so the rock's flat cut bottom is never seen in the air (the owner saw one).
describe('rocks in every level', () => {
  it('stand on ground or in water, never in the air', () => {
    for (const level of ADVENTURE_LEVELS) {
      for (const rock of level.rocks ?? []) {
        const cells = rockCells(rock);
        for (const cell of cells) {
          const [c, r] = cell.split(',').map(Number);
          if (cells.has(`${c},${r + 1}`)) continue; // not its bottom edge
          const ground = (row) => level.map[row]?.[c] === '#';
          const water = (level.pools ?? []).some((p) => c >= p.cols[0] && c <= p.cols[1] && r + 1 <= p.bottom)
            || (level.water && r + 1 >= level.water.row); // a pool's, or the open water in the gaps
          expect(ground(r) || ground(r + 1) || water, `${level.id}: a rock's bottom at (${c}, ${r}) is in the air`).toBe(true);
        }
      }
    }
  });
});
