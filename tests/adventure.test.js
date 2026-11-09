import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADVENTURE_ART, ADVENTURE_LEVELS, adventurePath } from '../src/data/adventure/index.js';
import { CHARACTERS } from '../src/data/characters.js';
import { MOVEMENT } from '../src/config/gameConfig.js';
import { MAX_FALL_SPEED, PHYSICS_STEPS_PER_SECOND, TILE, TILES, TILE_BIAS, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';

describe('adventure levels', () => {
  it.each(ADVENTURE_LEVELS.map((level) => [level.id, level]))('%s has no mistakes', (_id, level) => {
    expect(checkAdventureLevel(level)).toEqual([]);
  });

  it.each(Object.entries(ADVENTURE_ART))('has every image the %s world uses', (world, names) => {
    for (const name of names) expect(existsSync(`public/${adventurePath(world, name)}`), name).toBe(true);
  });

  it('only uses worlds that have art', () => {
    for (const level of ADVENTURE_LEVELS) expect(ADVENTURE_ART[level.world]).toBeDefined();
  });

  // One jump has to reach from one island to the next, unless a ladder joins them.
  it('keeps island steps within reach of a double jump', () => {
    const jump = MOVEMENT.JUMP_VELOCITY ** 2 / (2 * MOVEMENT.GRAVITY);
    const airJump = MOVEMENT.AIR_JUMP_VELOCITY ** 2 / (2 * MOVEMENT.GRAVITY);
    expect(jump + airJump).toBeGreaterThan(4 * TILE); // islands rise at most 4 tiles at a time
  });
});

describe('reading an adventure map', () => {
  const map = [
    '......',
    '.====.',
    '......',
    '.####.',
    '.####.',
  ];
  const { tiles } = readAdventureMap(map);

  it('gives the ground a grassy top with ends, and soil below', () => {
    expect(tiles[3].slice(1, 5)).toEqual([TILES.groundTopLeft, TILES.groundTop, TILES.groundTop, TILES.groundTopRight]);
    expect(tiles[4].slice(1, 5)).toEqual([TILES.soilLeft, TILES.soil, TILES.soil, TILES.soilRight]);
  });

  it('gives an island its two ends', () => {
    expect(tiles[1].slice(1, 5)).toEqual([TILES.ledgeLeft, TILES.ledge, TILES.ledge, TILES.ledgeRight]);
  });

  it('counts a ladder on an island row as island, so the cat can stand at its top', () => {
    const { tiles: withLadder, ladders } = readAdventureMap(['.=H=.', '..H..', '#####']);
    expect(withLadder[0][2]).toBe(TILES.ledge);
    expect(ladders).toEqual([{ col: 2, row: 0 }, { col: 2, row: 1 }]);
  });

  it('finds the mistakes it checks for', () => {
    expect(checkAdventureLevel({ map: ['..H..', '..H..', '#####'] })).toEqual(expect.arrayContaining([
      'the map needs exactly one start, @',
      'the map needs exactly one portal, E',
      "the ladder in column 2 doesn't reach an island",
    ]));
  });
});

describe('landing on tiles', () => {
  // A cat that sinks deeper than TILE_BIAS into a tile in one step falls straight through it.
  const step = (speed) => speed / PHYSICS_STEPS_PER_SECOND;

  it('pushes the cat out of the ground at its fastest fall, and when diving', () => {
    expect(step(MAX_FALL_SPEED)).toBeLessThan(TILE_BIAS);
    expect(step(MOVEMENT.FAST_FALL_VELOCITY)).toBeLessThan(TILE_BIAS);
    expect(MOVEMENT.FAST_FALL_VELOCITY).toBeLessThanOrEqual(MAX_FALL_SPEED);
  });

  it('still lets the cat jump up through an island', () => {
    expect(TILE_BIAS).toBeLessThan(TILE);
  });
});

describe('the battle cat in the adventure', () => {
  it('is about two tiles tall', () => {
    const { hitboxes, scale } = CHARACTERS.battleCat;
    expect(hitboxes.run.h * scale / TILE).toBeGreaterThan(1.5);
    expect(hitboxes.run.h * scale / TILE).toBeLessThan(2.2);
  });
});
