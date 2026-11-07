import Phaser from 'phaser';
import './ui/ui.css';
import { AudioManager } from './audio/AudioManager.js';
import { setViewAspect } from './config/gameConfig.js';
import { LEVELS } from './data/levels/index.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { Progress } from './systems/Progress.js';
import { showFpsCounter } from './ui/FpsCounter.js';
import { Overlay } from './ui/Overlay.js';
import { ScreenFx } from './ui/ScreenFx.js';

const FONT_WAIT_MS = 1200;

// Fast in-game tests load the page with ?simulate. Production builds remove this entirely.
const simulate = import.meta.env.DEV && new URLSearchParams(location.search).has('simulate');

const windowAspect = () => window.innerWidth / Math.max(1, window.innerHeight);

function start() {
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
    scene: [BootScene, GameScene],
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
  game.registry.set('progress', new Progress({
    levelIds: LEVELS.map((level) => level.id),
    // For checking any level while developing: open the page with ?unlockAll.
    unlockAll: import.meta.env.DEV && new URLSearchParams(location.search).has('unlockAll'),
  }));
  if (import.meta.env.DEV) window.__catEscape = game;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('fps')) showFpsCounter(game);
  if (simulate) {
    import('./testing/Simulator.js').then(({ Simulator }) => {
      const waitForLevel = () => {
        if (!game.scene.isActive('Game')) {
          setTimeout(waitForLevel, 30);
          return;
        }
        window.__simulator = new Simulator(game);
      };
      waitForLevel();
    });
  }
}

// HUD text is drawn once, so wait briefly for the font. A slow or missing font must not block play.
const fontReady = document.fonts?.load('600 24px Fredoka') ?? Promise.resolve();
const timeout = new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS));
Promise.race([fontReady, timeout]).catch(() => {}).finally(start);
