import Phaser from 'phaser';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { ESCAPE_ANIMATION } from '../data/screens.js';
import { IMAGE_ASSETS } from '../data/themes.js';

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
    for (const [name, character] of Object.entries(CHARACTERS)) {
      for (const { file, frames } of Object.values(character.anims)) {
        for (let i = 1; i <= frames; i++) {
          this.load.image(frameKey(name, file, i), `assets/sprites/${character.folder}/${file}-${i}.png`);
        }
      }
    }
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
    this.scene.start('Game', { levelIndex: 0, autoStart: false });
  }
}
