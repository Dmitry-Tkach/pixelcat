import { BOSSES, bossAnimKey, bossFrameCount, bossKey, bossPath } from '../data/adventure/bosses.js';
import { EXPLOSION, EXPLOSION_KEY, EXPLOSION_PATH, explosionFrameCount } from '../data/adventure/ammo.js';
import { ENEMIES, enemyAnimKey, enemyFrameCount, enemyKey, enemyPath } from '../data/adventure/enemies.js';
import { FLASH, FLASH_KEY, FLASH_PATH, GUNNERS, flashFrameCount, gunnerAnimKey, gunnerFrameCount, gunnerKey, gunnerPath } from '../data/adventure/gunners.js';
import { ADVENTURE_ART, adventureKey, adventurePath } from '../data/adventure/index.js';
import { BOSS_ARENAS } from '../data/adventure/bossArenas.js';
import { adventureHomePictures } from '../ui/adventureHome.js';
import { adventureRoadmapPictures } from '../ui/adventureRoadmap.js';

// Loads the adventure's own art and makes its animations: its tiles and pickups, enemies, gunners,
// bosses and effects. AdventureBootScene calls these, so new adventure content is loaded from its
// data with no loading code. (Its battle cats' frames load through characterLoading.js.)

// Pictures the adventure shares with the runner: the star of the effects (ui/Effects.js), which the
// troll's dizzy stars use too.
const SHARED_IMAGES = { star: 'assets/city/star.png' };

export function loadAdventureArt(scene) {
  // The home screen and the road map are HTML, not Phaser: their pictures are fetched now, so they
  // open whole.
  for (const src of [...adventureHomePictures(), ...adventureRoadmapPictures()]) new Image().src = src;
  for (const [key, path] of Object.entries(SHARED_IMAGES)) scene.load.image(key, path);
  for (const [world, names] of Object.entries(ADVENTURE_ART)) {
    for (const name of names) scene.load.image(adventureKey(world, name), adventurePath(world, name));
  }
  for (const kind of Object.keys(ENEMIES)) {
    scene.load.atlas(enemyKey(kind), `${enemyPath(kind)}.png`, `${enemyPath(kind)}.json`);
  }
  for (const kind of Object.keys(GUNNERS)) {
    scene.load.atlas(gunnerKey(kind), `${gunnerPath(kind)}.png`, `${gunnerPath(kind)}.json`);
  }
  scene.load.atlas(FLASH_KEY, `${FLASH_PATH}.png`, `${FLASH_PATH}.json`);
  scene.load.atlas(EXPLOSION_KEY, `${EXPLOSION_PATH}.png`, `${EXPLOSION_PATH}.json`);
  // The bosses: atlases of several pages, listed in one JSON.
  for (const kind of Object.keys(BOSSES)) {
    scene.load.multiatlas(bossKey(kind), `${bossPath(kind)}.json`, 'assets/adventure/bosses');
  }
}

export function makeAdventureAnims(scene) {
  // The adventure's spinning coins.
  for (const world of Object.keys(ADVENTURE_ART)) {
    scene.anims.create({
      key: adventureKey(world, 'coin-spin'),
      frames: [1, 2, 3, 4, 5, 6].map((n) => ({ key: adventureKey(world, `coin-${n}`) })),
      frameRate: 10,
      repeat: -1,
    });
  }
  // The adventure's enemies.
  for (const [kind, { anims }] of Object.entries(ENEMIES)) {
    for (const [anim, info] of Object.entries(anims)) {
      scene.anims.create({
        key: enemyAnimKey(kind, anim),
        frames: Array.from({ length: enemyFrameCount(info) }, (_, i) => ({ key: enemyKey(kind), frame: `${anim}-${i}` })),
        frameRate: info.fps,
        repeat: info.repeat,
      });
    }
  }
  // The adventure's gunners, and their muzzle flash.
  for (const [kind, { anims }] of Object.entries(GUNNERS)) {
    for (const [anim, info] of Object.entries(anims)) {
      scene.anims.create({
        key: gunnerAnimKey(kind, anim),
        frames: Array.from({ length: gunnerFrameCount(info) }, (_, i) => ({ key: gunnerKey(kind), frame: `${anim}-${i}` })),
        frameRate: info.fps,
        repeat: info.repeat,
      });
    }
  }
  scene.anims.create({
    key: FLASH_KEY,
    frames: Array.from({ length: flashFrameCount() }, (_, i) => ({ key: FLASH_KEY, frame: `flash-${i}` })),
    frameRate: FLASH.fps,
    repeat: 0,
  });
  for (const [kind, { anims }] of Object.entries(BOSSES)) {
    for (const [anim, info] of Object.entries(anims)) {
      scene.anims.create({
        key: bossAnimKey(kind, anim),
        frames: Array.from({ length: bossFrameCount(info) }, (_, i) => ({ key: bossKey(kind), frame: `${anim}-${i}` })),
        frameRate: info.fps,
        repeat: info.repeat,
      });
    }
  }
  scene.anims.create({
    key: EXPLOSION_KEY,
    frames: Array.from({ length: explosionFrameCount() }, (_, i) => ({ key: EXPLOSION_KEY, frame: `explosion-${i}` })),
    frameRate: EXPLOSION.fps,
    repeat: 0,
  });
}

// For trying an adventure boss while developing: the page opened with ?boss=troll1 goes straight to
// his test arena. Null otherwise, and in the build players get.
export function bossTryOutArena() {
  if (!import.meta.env.DEV) return null;
  return BOSS_ARENAS[new URLSearchParams(location.search).get('boss')] ?? null;
}
