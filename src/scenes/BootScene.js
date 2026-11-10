import Phaser from 'phaser';
import { EXPLOSION, EXPLOSION_KEY, EXPLOSION_PATH, explosionFrameCount } from '../data/adventure/ammo.js';
import { ENEMIES, enemyAnimKey, enemyFrameCount, enemyKey, enemyPath } from '../data/adventure/enemies.js';
import { FLASH, FLASH_KEY, FLASH_PATH, GUNNERS, flashFrameCount, gunnerAnimKey, gunnerFrameCount, gunnerKey, gunnerPath } from '../data/adventure/gunners.js';
import { ADVENTURE_ART, adventureKey, adventurePath } from '../data/adventure/index.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { ESCAPE_ANIMATION } from '../data/screens.js';
import { LEVELS } from '../data/levels/index.js';
import { IMAGE_ASSETS } from '../data/themes.js';

const BOSS_TRY_OUT_RUN_UP = 300;

// Loads everything from the data files, so new content needs no loading code.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Fetched early so it's ready the moment a level ends. It's shown in the HTML menu, not Phaser.
    new Image().src = ESCAPE_ANIMATION.src;
    for (const [key, path] of Object.entries(IMAGE_ASSETS)) {
      this.load.image(key, path);
    }
    for (const [world, names] of Object.entries(ADVENTURE_ART)) {
      for (const name of names) this.load.image(adventureKey(world, name), adventurePath(world, name));
    }
    for (const kind of Object.keys(ENEMIES)) {
      this.load.atlas(enemyKey(kind), `${enemyPath(kind)}.png`, `${enemyPath(kind)}.json`);
    }
    for (const kind of Object.keys(GUNNERS)) {
      this.load.atlas(gunnerKey(kind), `${gunnerPath(kind)}.png`, `${gunnerPath(kind)}.json`);
    }
    this.load.atlas(FLASH_KEY, `${FLASH_PATH}.png`, `${FLASH_PATH}.json`);
    this.load.atlas(EXPLOSION_KEY, `${EXPLOSION_PATH}.png`, `${EXPLOSION_PATH}.json`);
    for (const [name, character] of Object.entries(CHARACTERS)) {
      for (const { file, frames } of Object.values(character.anims)) {
        for (let i = 1; i <= frames; i++) {
          this.load.image(frameKey(name, file, i), `assets/sprites/${character.folder}/${file}-${i}.png`);
        }
      }
    }
  }

  // For trying a boss while developing: open the page with ?boss for the first one, or name one,
  // as in ?boss=orangeCat.
  firstLevel() {
    const params = new URLSearchParams(location.search);
    const wantsBoss = import.meta.env.DEV && params.has('boss');
    const type = params.get('boss');
    const levelIndex = wantsBoss ? LEVELS.findIndex((level) => level.boss && (!type || level.boss.type === type)) : -1;
    if (levelIndex < 0) return { levelIndex: 0, autoStart: false };
    const x = LEVELS[levelIndex].boss.at - BOSS_TRY_OUT_RUN_UP;
    return { levelIndex, autoStart: true, checkpoint: { x, treats: 0, hasPaw: false, rosterIndex: 0 } };
  }

  create() {
    for (const [name, character] of Object.entries(CHARACTERS)) {
      for (const [role, { file, frames, frameList, fps, repeat }] of Object.entries(character.anims)) {
        const numbers = frameList ?? Array.from({ length: frames }, (_, i) => i + 1);
        this.anims.create({
          key: animKey(name, role),
          frames: numbers.map((n) => ({ key: frameKey(name, file, n) })),
          frameRate: fps,
          repeat,
        });
      }
    }
    // The adventure's spinning coins.
    for (const world of Object.keys(ADVENTURE_ART)) {
      this.anims.create({
        key: adventureKey(world, 'coin-spin'),
        frames: [1, 2, 3, 4, 5, 6].map((n) => ({ key: adventureKey(world, `coin-${n}`) })),
        frameRate: 10,
        repeat: -1,
      });
    }
    // The adventure's enemies.
    for (const [kind, { anims }] of Object.entries(ENEMIES)) {
      for (const [anim, info] of Object.entries(anims)) {
        this.anims.create({
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
        this.anims.create({
          key: gunnerAnimKey(kind, anim),
          frames: Array.from({ length: gunnerFrameCount(info) }, (_, i) => ({ key: gunnerKey(kind), frame: `${anim}-${i}` })),
          frameRate: info.fps,
          repeat: info.repeat,
        });
      }
    }
    this.anims.create({
      key: FLASH_KEY,
      frames: Array.from({ length: flashFrameCount() }, (_, i) => ({ key: FLASH_KEY, frame: `flash-${i}` })),
      frameRate: FLASH.fps,
      repeat: 0,
    });
    this.anims.create({
      key: EXPLOSION_KEY,
      frames: Array.from({ length: explosionFrameCount() }, (_, i) => ({ key: EXPLOSION_KEY, frame: `explosion-${i}` })),
      frameRate: EXPLOSION.fps,
      repeat: 0,
    });
    // For trying the adventure while developing: open the page with ?adventure.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('adventure')) {
      this.scene.start('Adventure', { levelIndex: 0 });
      return;
    }
    this.scene.start('Game', this.firstLevel());
  }
}
