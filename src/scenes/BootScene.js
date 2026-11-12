import Phaser from 'phaser';
import { loadAdventureArt, makeAdventureAnims } from './adventureLoading.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { ESCAPE_ANIMATION, HOME_ANIMATION } from '../data/screens.js';
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
    new Image().src = HOME_ANIMATION.src;
    for (const [key, path] of Object.entries(IMAGE_ASSETS)) {
      this.load.image(key, path);
    }
    loadAdventureArt(this);
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
    makeAdventureAnims(this);
    // For trying the adventure while developing: open the page with ?adventure.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('adventure')) {
      this.scene.start('Adventure', { levelIndex: 0 });
      return;
    }
    this.scene.start('Game', this.firstLevel());
  }
}
