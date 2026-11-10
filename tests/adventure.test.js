import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES, enemyFrameCount, enemyLayout, enemyPath } from '../src/data/adventure/enemies.js';
import { FLASH_PATH, GUNNERS, flashFrameCount, gunnerFrameCount, gunnerLayout, gunnerPath } from '../src/data/adventure/gunners.js';
import { ADVENTURE_ART, ADVENTURE_HERO, ADVENTURE_LEVELS, adventurePath } from '../src/data/adventure/index.js';
import { CHARACTERS } from '../src/data/characters.js';
import { MOVEMENT } from '../src/config/gameConfig.js';
import { ENEMY_LETTERS, GUNNER_LETTERS, MAX_FALL_SPEED, PHYSICS_STEPS_PER_SECOND, TILE, TILES, TILE_BIAS, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';

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

describe('adventure enemies', () => {
  it.each(Object.keys(ENEMIES))('the %s has an atlas with every frame its animations use', (kind) => {
    const file = `public/${enemyPath(kind)}`;
    expect(existsSync(`${file}.png`)).toBe(true);
    const { frames } = JSON.parse(readFileSync(`${file}.json`, 'utf8'));
    for (const [anim, info] of Object.entries(ENEMIES[kind].anims)) {
      for (let i = 0; i < enemyFrameCount(info); i++) expect(frames[`${anim}-${i}`], `${anim}-${i}`).toBeDefined();
    }
    expect(enemyFrameCount(ENEMIES[kind].anims.attack)).toBeGreaterThan(ENEMIES[kind].anims.attack.hitFrame);
  });

  it.each(Object.keys(ENEMIES))('the %s has its body inside its frame, standing on its feet', (kind) => {
    const { frameW, frameH, body, feet } = enemyLayout(kind);
    expect(body.x).toBeGreaterThanOrEqual(0);
    expect(body.x + body.w).toBeLessThanOrEqual(frameW);
    expect(body.y + body.h).toBeLessThanOrEqual(frameH);
    expect(Math.abs(body.y + body.h - feet)).toBeLessThanOrEqual(1);
  });

  it.each(Object.keys(ENEMIES))('the %s is shorter than the battle cat, so it can be jumped on', (kind) => {
    const { hitboxes, scale } = CHARACTERS.battleCat;
    expect(enemyLayout(kind).body.h).toBeLessThan(hitboxes.run.h * scale * ADVENTURE_HERO.scale);
  });

  it('has a map letter for each kind, and finds enemies standing on nothing', () => {
    expect(Object.values(ENEMY_LETTERS).sort()).toEqual(Object.keys(ENEMIES).sort());
    const { objects } = readAdventureMap(['.g.', '###']);
    expect(objects).toEqual([{ type: 'enemy', kind: 'goon', col: 1, row: 0 }]);
    expect(checkAdventureLevel({ map: ['.v.@E', '.....', '#####'] })).toContain("the spiky in column 1 isn't standing on anything");
  });
});

describe('adventure gunners', () => {
  it.each(Object.keys(GUNNERS))('the %s has an atlas with every frame its animations use', (kind) => {
    const { frames } = JSON.parse(readFileSync(`public/${gunnerPath(kind)}.json`, 'utf8'));
    for (const [anim, info] of Object.entries(GUNNERS[kind].anims)) {
      for (let i = 0; i < gunnerFrameCount(info); i++) expect(frames[`${anim}-${i}`], `${anim}-${i}`).toBeDefined();
    }
  });

  it('has a muzzle flash with every frame', () => {
    const { frames } = JSON.parse(readFileSync(`public/${FLASH_PATH}.json`, 'utf8'));
    for (let i = 0; i < flashFrameCount(); i++) expect(frames[`flash-${i}`]).toBeDefined();
  });

  it.each(Object.keys(GUNNERS))('the %s stands on its paws, with the end of its gun inside its frame', (kind) => {
    const { frameW, frameH, body, feet, muzzle } = gunnerLayout(kind);
    expect(Math.abs(body.y + body.h - feet)).toBeLessThanOrEqual(1);
    expect(feet).toBeLessThan(frameH);
    expect(muzzle.x).toBeGreaterThan(body.x + body.w / 2); // in front of it: the art faces right
    expect(muzzle.x).toBeLessThanOrEqual(frameW);
    expect(muzzle.y).toBeLessThan(feet);
  });

  it('has a map letter for each kind', () => {
    expect(Object.values(GUNNER_LETTERS).sort()).toEqual(Object.keys(GUNNERS).sort());
    expect(readAdventureMap(['.2.', '###']).objects).toEqual([{ type: 'gunner', kind: 'raygun', col: 1, row: 0 }]);
    expect(checkAdventureLevel({ map: ['.3.@E', '.....', '#####'] })).toContain("the rifle in column 1 isn't standing on anything");
  });

  it('shoots slowly enough to dodge', () => {
    for (const { bulletSpeed } of Object.values(GUNNERS)) expect(bulletSpeed).toBeLessThan(900);
  });
});

describe('the battle cat in the adventure', () => {
  it('has every move the adventure plays', () => {
    const roles = ['idle', 'run', 'jump', 'fall', 'slide', 'hurt', 'caught', 'victory', 'shoot', 'burst', 'rage', 'dash',
      'climb', 'climbUp', 'climbDown', 'special', 'specialEnd'];
    for (const role of roles) expect(CHARACTERS.battleCat.anims[role], role).toBeDefined();
  });

  it('places a rage mushroom with m', () => {
    expect(readAdventureMap(['m', '#']).objects).toEqual([{ type: 'rage', col: 0, row: 0 }]);
  });

  it('takes more shots to knock out the spiky enemy, which can\'t be landed on', () => {
    for (const enemy of Object.values(ENEMIES)) expect(enemy.hp).toBeGreaterThanOrEqual(1);
    expect(ENEMIES.spiky.hp).toBeGreaterThan(ENEMIES.goon.hp);
  });

  it('is between one and two tiles tall, so islands two tiles apart leave him room', () => {
    const { hitboxes, scale } = CHARACTERS.battleCat;
    const tiles = (hitboxes.run.h * scale * ADVENTURE_HERO.scale) / TILE;
    expect(tiles).toBeGreaterThan(1.2);
    expect(tiles).toBeLessThan(2);
  });
});
