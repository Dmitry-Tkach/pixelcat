import Phaser from 'phaser';
import { PAGES, goToPage } from '../ui/pages.js';
import { showAdventureHome, showAdventureMap } from '../ui/adventureMenus.js';
import { playHomeMusic, soundToggles } from '../ui/menuSound.js';

// The adventure's menus' scene: it draws nothing itself, so nothing is drawn behind the menus, and
// holds them up (ui/adventureMenus.js): the home screen, or with `screen: 'map'`, the road map.
// Exit leaves for the first page, the choice of games.
const SKY = '#0078fc'; // behind the menus, the home screen's sky, if anything shows

export class AdventureMenuScene extends Phaser.Scene {
  constructor() {
    super('AdventureMenu');
  }

  init({ screen = 'home' } = {}) {
    this.firstScreen = screen;
  }

  create() {
    this.overlay = this.registry.get('overlay');
    this.audio = this.registry.get('audio');
    this.screenFx = this.registry.get('screenFx');
    this.cameras.main.setBackgroundColor(SKY);
    this.screenFx.reveal();
    if (this.firstScreen === 'map') showAdventureMap(this);
    else showAdventureHome(this);
  }

  playHomeMusic() {
    playHomeMusic(this.audio, this.overlay);
  }

  soundToggles(redraw) {
    return soundToggles(this.audio, redraw);
  }

  // Exit: back to the first page (index.html).
  showChoiceScreen() {
    this.audio.stopMusic();
    goToPage(PAGES.choice, this.screenFx);
  }
}
