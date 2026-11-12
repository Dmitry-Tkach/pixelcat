import Phaser from 'phaser';
import './ui/ui.css';
import { AudioManager } from './audio/AudioManager.js';
import { setViewAspect } from './config/gameConfig.js';
import { setUpFpsCounter } from './ui/FpsCounter.js';
import { Overlay } from './ui/Overlay.js';
import { ScreenFx } from './ui/ScreenFx.js';

// Starts a game page: the runner's (pages/runner.js) or the adventure's (pages/adventure.js). Each
// page is its own game, with only its own scenes, art and progress, so it loads only what it needs.
// This is what they share: the Phaser game filling the window, the menu overlay, the sound and the
// screen wipes, in the registry for every scene.

const FONT_WAIT_MS = 1200;

// Fast in-game tests load the page with ?simulate. Production builds remove this entirely.
export const simulate = import.meta.env.DEV && new URLSearchParams(location.search).has('simulate');

// For checking any level while developing: open the page with ?unlockAll.
export const unlockAll = import.meta.env.DEV && new URLSearchParams(location.search).has('unlockAll');

const windowAspect = () => window.innerWidth / Math.max(1, window.innerHeight);

// `scenes`: the page's scenes, the first one starting. `setUp(game)`: puts the page's own things,
// such as its progress, in the registry, before the first scene starts.
export function startGame(scenes, setUp = () => {}) {
  const start = () => {
    // Fast in-game tests keep one fixed shape, so their results don't depend on the window.
    const size = simulate ? setViewAspect(16 / 9) : setViewAspect(windowAspect());
    const game = new Phaser.Game({
      type: simulate ? Phaser.CANVAS : Phaser.AUTO,
      // Animation-frame timers pause on background pages, and tests run several pages at once.
      fps: simulate ? { forceSetTimeOut: true } : undefined,
      parent: 'game',
      width: size.width,
      height: size.height,
      backgroundColor: '#7CCDF8',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      input: { activePointers: 2 },
      audio: { noAudio: true }, // AudioManager handles all sound
      scene: scenes,
    });
    const audio = new AudioManager();
    const overlay = new Overlay();
    overlay.onAction = () => {
      audio.unlock(); // browsers only allow audio to start from a user action
      audio.playSfx('click');
    };
    // Keeps filling the window when it's resized.
    if (!simulate) {
      window.addEventListener('resize', () => {
        const { width, height } = setViewAspect(windowAspect());
        game.scale.getParentBounds(); // otherwise Phaser fits the canvas to the previous window
        game.scale.setGameSize(width, height);
      });
    }
    game.registry.set('overlay', overlay);
    game.registry.set('audio', audio);
    game.registry.set('screenFx', new ScreenFx({ instant: simulate }));
    setUp(game);
    if (import.meta.env.DEV) window.__catEscape = game;
    if (import.meta.env.DEV && !simulate) setUpFpsCounter(game, { shown: new URLSearchParams(location.search).has('fps') });
  };
  // HUD text is drawn once, so wait briefly for the font. A slow or missing font must not block play.
  const fontReady = document.fonts?.load('600 24px Fredoka') ?? Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS));
  Promise.race([fontReady, timeout]).catch(() => {}).finally(start);
}
