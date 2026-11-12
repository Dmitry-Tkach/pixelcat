import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ENEMIES, enemyFrameCount, enemyLayout, enemyPath } from '../src/data/adventure/enemies.js';
import { AMMO, EXPLOSION_PATH, LOADED, explosionFrameCount } from '../src/data/adventure/ammo.js';
import { FLASH_PATH, GUNNERS, flashFrameCount, gunnerFrameCount, gunnerLayout, gunnerPath } from '../src/data/adventure/gunners.js';
import { ADVENTURE_ART, ADVENTURE_HERO, ADVENTURE_LEVELS, adventurePath } from '../src/data/adventure/index.js';
import { CHARACTERS } from '../src/data/characters.js';
import { MOVEMENT } from '../src/config/gameConfig.js';
import { mapBuilder } from '../src/data/adventure/mapBuilder.js';
import { ADVENTURE_MAP_LOOK, ADVENTURE_MAP_WORLDS, ADVENTURE_ROADMAP } from '../src/data/adventure/roadmap.js';
import { mapArt } from '../src/ui/mapArt.js';
import { Progress } from '../src/systems/Progress.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { ENEMY_LETTERS, GUNNER_LETTERS, PILLAR_MAX_TILES, moverCells, pillarFoot, MAX_FALL_SPEED, PHYSICS_STEPS_PER_SECOND, TILE, TILES, TILE_BIAS, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';

describe('adventure levels', () => {
  it.each(ADVENTURE_LEVELS.map((level) => [level.id, level]))('%s has no mistakes', (_id, level) => {
    expect(checkAdventureLevel(level)).toEqual([]);
  });

  it.each(Object.entries(ADVENTURE_ART))('has every image the %s world uses', (world, names) => {
    for (const name of names) expect(existsSync(`public/${adventurePath(world, name)}`), name).toBe(true);
  });

  it.each(ADVENTURE_LEVELS.map((level) => [level.id, level]))('%s can be finished, with every coin, crystal and pickup in reach', (_id, level) => {
    const { portal, unreachable } = adventureRoutes(level);
    expect(portal).toBe(true);
    expect(unreachable.map((o) => `${o.type} at column ${o.col}, row ${o.row}`)).toEqual([]);
  });

  it.each(ADVENTURE_LEVELS.map((level) => [level.id, level]))('%s has no blind drops: from every edge, somewhere to land is in view', (_id, level) => {
    const { blindEdges } = adventureRoutes(level);
    expect(blindEdges.map(({ col, row, dir }) => `column ${col}, row ${row}, stepping ${dir > 0 ? 'right' : 'left'}`)).toEqual([]);
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

describe('the route checker', () => {
  const level = (map) => ({ map });
  it('finds the portal across a gap he can jump, but not one too wide', () => {
    const near = ['........', '@.....E.', '###..###'];
    expect(adventureRoutes(level(near)).portal).toBe(true);
    const far = ['...............', '@.............E', '###.........###'];
    expect(adventureRoutes(level(far)).portal).toBe(false);
  });

  it('finds a blind drop: an edge with nowhere to land in view', () => {
    // Up a ladder to a high island, whose right edge hangs 14 rows over the floor.
    const high = ['.....................', '.....................', '.==H.................', ...Array(12).fill('...H.................'), '@..H.................', '#####.........######E'];
    const blind = adventureRoutes(level(high)).blindEdges;
    expect(blind).toContainEqual({ col: 3, row: 1, dir: 1 });
  });

  it('rides a moving log across a gap too wide to jump', () => {
    const map = ['...............', '@.............E', '###.........###'];
    expect(adventureRoutes({ map }).portal).toBe(false);
    expect(adventureRoutes({ map, movers: [{ col: 3, row: 2, width: 3, across: 6 }] }).portal).toBe(true);
  });

  it('stands on crumbling leaves', () => {
    const map = ['..............', '@............E', '###..%%%%...##'];
    expect(adventureRoutes({ map }).portal).toBe(true);
    expect(adventureRoutes({ map: ['..............', '@............E', '###.........##'] }).portal).toBe(false);
  });

  it('climbs ladders, and finds a coin out of reach', () => {
    const map = ['o........', '.........', '.........', '.........', '.........', '.....=H=E', '......H..', '@.....H..', '#########'];
    const { portal, unreachable } = adventureRoutes(level(map));
    expect(portal).toBe(true);
    expect(unreachable.map((o) => o.type)).toEqual(['coin']);
  });
});

describe('moving logs', () => {
  it('cover every cell along their path', () => {
    expect([...moverCells({ col: 2, row: 5, width: 2, across: 2 })].sort()).toEqual(['2,5', '3,5', '4,5', '5,5'].sort());
    expect([...moverCells({ col: 0, row: 5, width: 1, up: 2 })].sort()).toEqual(['0,3', '0,4', '0,5'].sort());
  });

  it("are checked: one running into the ground, or a silver chest with no key, is a mistake", () => {
    const map = ['@....E', '......', '######'];
    expect(checkAdventureLevel({ map, movers: [{ col: 0, row: 1, width: 2, up: -1 }] })).toContain('moving log 1 runs into the ground at column 0, row 2');
    expect(checkAdventureLevel({ map: ['@.U..E', '######'] })).toContain('each silver chest needs a silver key');
  });

  it('are listed by the map builder', () => {
    const built = mapBuilder(10, 4).ground(0, 9, 3).mover(2, 1, { across: 4, width: 2 });
    expect(built.movers()).toEqual([{ col: 2, row: 1, width: 2, across: 4, up: 0 }]);
  });
});

describe('building an adventure map', () => {
  it('builds ground, islands and ladders into rows of letters', () => {
    const rows = mapBuilder(6, 4).ground(0, 5, 3).island(2, 4, 1).ladder(3, 1, 2).put(0, 2, '@').rows();
    expect(rows).toEqual(['......', '..=H=.', '@..H..', '######']);
  });

  it("won't put two things in one cell", () => {
    expect(() => mapBuilder(4, 2).put(1, 0, 'o').put(1, 0, 'g')).toThrow('already has o');
    expect(() => mapBuilder(4, 2).put(9, 0, 'o')).toThrow('outside the map');
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

  it('stands earth pillars only under low islands', () => {
    const low = ['====', '.R..', '....', '####'];
    expect(pillarFoot(readAdventureMap(low).tiles, 1, 1)).toBe(3);
    const high = ['====', '.R..', ...Array(PILLAR_MAX_TILES).fill('....'), '####'];
    expect(pillarFoot(readAdventureMap(high).tiles, 1, 1)).toBeNull();
    expect(checkAdventureLevel({ map: ['@..E', ...high] })).toContain('the pillar in column 1, row 2 is too high above the ground to stand on it');
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

describe('the minigun\'s ammunition', () => {
  it.each(Object.keys(AMMO))('has art for %s rounds and their crate', (kind) => {
    const { bullet, crate, rounds } = AMMO[kind];
    expect(ADVENTURE_ART.wood).toContain(bullet);
    expect(ADVENTURE_ART.wood).toContain(crate);
    expect(rounds).toBeGreaterThan(0); // all of it is limited
  });

  it('comes loaded with rounds it has art for', () => {
    for (const kind of Object.keys(LOADED)) expect(AMMO[kind]).toBeDefined();
  });

  it('has every explosion frame', () => {
    const { frames } = JSON.parse(readFileSync(`public/${EXPLOSION_PATH}.json`, 'utf8'));
    for (let i = 0; i < explosionFrameCount(); i++) expect(frames[`explosion-${i}`]).toBeDefined();
  });

  it('places a crate of each kind with its letter', () => {
    expect(readAdventureMap(['aez', '###']).objects.map((o) => o.type)).toEqual(['ammo-standard', 'ammo-explosive', 'ammo-laser']);
    for (const kind of Object.keys(AMMO)) expect(AMMO[kind].crate).toBe(`ammo-${kind}`);
  });
});

describe('the battle cat in the adventure', () => {
  it('has every move the adventure plays', () => {
    const roles = ['idle', 'run', 'jump', 'fall', 'slide', 'hurt', 'caught', 'victory', 'shoot', 'burst', 'rage', 'dash',
      'climb', 'climbUp', 'climbDown', 'hang', 'special', 'specialEnd'];
    for (const role of roles) expect(CHARACTERS.battleCat.anims[role], role).toBeDefined();
  });

  it('starts with bare paws, and only shoots once he has found the minigun', () => {
    expect(CHARACTERS[ADVENTURE_HERO.character].anims.shoot).toBeUndefined();
    expect(CHARACTERS[ADVENTURE_HERO.armed].anims.shoot).toBeDefined();
    expect(readAdventureMap(['w', '#']).objects).toEqual([{ type: 'weapon', col: 0, row: 0 }]);
  });

  it('has the same hitboxes with and without the minigun, and every move he uses bare-pawed', () => {
    const paws = CHARACTERS[ADVENTURE_HERO.character], armed = CHARACTERS[ADVENTURE_HERO.armed];
    expect(paws.hitboxes).toEqual(armed.hitboxes);
    expect(paws.scale).toBe(armed.scale);
    // Picking up the minigun keeps whatever he's doing, so every bare-pawed move has an armed one.
    for (const role of Object.keys(paws.anims)) expect(armed.anims[role], role).toBeDefined();
    for (const character of [paws, armed]) {
      const { frameList, frames, beamFrame } = character.anims.special;
      expect((frameList ?? [])[beamFrame - 1]).toBe(frames); // the beam is his special's last frame
    }
  });

  it('swaps frames of the same size when he picks up the minigun', async () => {
    const sharp = (await import('sharp')).default;
    const size = async (folder) => { const { width, height } = await sharp(`public/assets/sprites/${folder}/idle-1.png`).metadata(); return [width, height]; };
    expect(await size(CHARACTERS[ADVENTURE_HERO.character].folder)).toEqual(await size(CHARACTERS[ADVENTURE_HERO.armed].folder));
  });

  it('has every frame of every move on disk, the same size but his special', async () => {
    const sharp = (await import('sharp')).default;
    for (const name of [ADVENTURE_HERO.character, ADVENTURE_HERO.armed]) {
      const { folder, anims } = CHARACTERS[name];
      const idle = await sharp(`public/assets/sprites/${folder}/idle-1.png`).metadata();
      for (const [role, { file, frames }] of Object.entries(anims)) {
        for (let n = 1; n <= frames; n++) {
          const path = `public/assets/sprites/${folder}/${file}-${n}.png`;
          expect(existsSync(path), path).toBe(true);
          if (role === 'special') continue;
          const { width, height } = await sharp(path).metadata();
          expect([width, height], path).toEqual([idle.width, idle.height]);
        }
      }
    }
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

describe("the adventure's road map", () => {
  it('has every built level on it, once, with a look for every world', () => {
    const ids = ADVENTURE_ROADMAP.map((stop) => stop.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const level of ADVENTURE_LEVELS) expect(ADVENTURE_ROADMAP.filter((stop) => stop.level === level.id)).toHaveLength(1);
    for (const { world } of ADVENTURE_ROADMAP) expect(ADVENTURE_MAP_WORLDS[world], world).toBeDefined();
  });

  it('draws a padlock for every level not built yet', () => {
    const stops = ADVENTURE_ROADMAP.map((stop, i) => ({ number: i + 1, world: stop.world, locked: !stop.level, stars: 0 }));
    const svg = mapArt(stops, { worlds: ADVENTURE_MAP_WORLDS, ...ADVENTURE_MAP_LOOK });
    for (const stop of stops) expect(svg.includes(`>${stop.number}</text>`)).toBe(!stop.locked);
  });

  it("keeps its progress apart from the runner's", () => {
    const saved = {};
    const storage = { getItem: (k) => saved[k] ?? null, setItem: (k, v) => { saved[k] = v; } };
    const adventure = new Progress({ levelIds: ['wood-1', 'wood-2'], storage, key: 'cat-escape-adventure' });
    adventure.record('wood-1', 2, 40);
    const runner = new Progress({ levelIds: ['city-1'], storage });
    expect(runner.hasStarted).toBe(false);
    expect(new Progress({ levelIds: ['wood-1', 'wood-2'], storage, key: 'cat-escape-adventure' }).isUnlocked(1)).toBe(true);
  });
});
