import { LEVELS } from '../data/levels/index.js';
import { BootScene } from '../scenes/BootScene.js';
import { GameScene } from '../scenes/GameScene.js';
import { simulate, startGame, unlockAll } from '../startGame.js';
import { Progress } from '../systems/Progress.js';

// The runner's page, runner.html: "Bath Day Escape", with only the runner's scenes, art and progress.
startGame([BootScene, GameScene], (game) => {
  game.registry.set('progress', new Progress({ levelIds: LEVELS.map((level) => level.id), unlockAll }));
  // The fast in-game tests drive the runner through its simulator, once a level is running.
  if (simulate) {
    import('../testing/Simulator.js').then(({ Simulator }) => {
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
});
