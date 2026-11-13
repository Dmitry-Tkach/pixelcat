import Phaser from 'phaser';
import { ADVENTURE_HERO } from '../data/adventure/index.js';
import { bossTryOutArena, loadAdventureArt, makeAdventureAnims } from './adventureLoading.js';
import { loadCharacters, makeCharacterAnims } from './characterLoading.js';

// The characters the adventure plays: its hero, with bare paws and with the minigun. Nobody from the
// runner, and none of the hero's other looks.
export const ADVENTURE_CHARACTERS = [ADVENTURE_HERO.character, ADVENTURE_HERO.armed];

// The adventure's boot scene, on its page (adventure.html): loads only the adventure's art and its
// battle cats, then opens its home screen. While developing:
//   ?boss=troll1   goes straight to a boss's test arena
//   ?adventure     goes straight to the first level
export class AdventureBootScene extends Phaser.Scene {
  constructor() {
    super('AdventureBoot');
  }

  preload() {
    loadAdventureArt(this);
    loadCharacters(this, ADVENTURE_CHARACTERS);
  }

  create() {
    makeCharacterAnims(this, ADVENTURE_CHARACTERS);
    makeAdventureAnims(this);
    const arena = bossTryOutArena();
    if (arena) {
      this.scene.start('Adventure', { level: arena });
      return;
    }
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('adventure')) {
      this.scene.start('Adventure', { levelIndex: 0 });
      return;
    }
    this.scene.start('AdventureMenu', { screen: 'home' });
  }
}
