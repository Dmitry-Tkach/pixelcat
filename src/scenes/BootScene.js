import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters.js';
import { loadCharacters, makeCharacterAnims } from './characterLoading.js';
import { ESCAPE_ANIMATION, HOME_ANIMATION } from '../data/screens.js';
import { LEVELS } from '../data/levels/index.js';
import { IMAGE_ASSETS } from '../data/themes.js';

const BOSS_TRY_OUT_RUN_UP = 300;

// The runner's boot scene, on its page (runner.html): loads everything the runner uses from the
// data files, so new content needs no loading code. The adventure has its own (AdventureBootScene).
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
    // Every character, the battle cats too: ?cat=battle tries the battle cat in the runner.
    loadCharacters(this, Object.keys(CHARACTERS));
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
    makeCharacterAnims(this, Object.keys(CHARACTERS));
    this.scene.start('Game', this.firstLevel());
  }
}
