import Phaser from 'phaser';
import { BATTLE_CATS } from '../data/adventure/heroes.js';
import { bossTryOutArena, loadAdventureArt, makeAdventureAnims } from './adventureLoading.js';
import { loadCharacters, makeCharacterAnims } from './characterLoading.js';

// The characters the adventure plays: the battle cat, with bare paws and with the minigun. Nobody
// from the runner.
export const ADVENTURE_CHARACTERS = Object.keys(BATTLE_CATS);

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
