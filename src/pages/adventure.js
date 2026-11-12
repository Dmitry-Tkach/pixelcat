import { ADVENTURE_ROADMAP } from '../data/adventure/roadmap.js';
import { AdventureBootScene } from '../scenes/AdventureBootScene.js';
import { AdventureMenuScene } from '../scenes/AdventureMenuScene.js';
import { AdventureScene } from '../scenes/AdventureScene.js';
import { startGame, unlockAll } from '../startGame.js';
import { Progress } from '../systems/Progress.js';

// The adventure's page, adventure.html: "Adventure Paws", with only the adventure's scenes, art and
// progress. Its menus have a scene of their own (AdventureMenuScene), which draws nothing, so
// nothing is drawn behind them.
startGame([AdventureBootScene, AdventureMenuScene, AdventureScene], (game) => {
  game.registry.set('adventureProgress', new Progress({
    levelIds: ADVENTURE_ROADMAP.map((stop) => stop.id),
    key: 'cat-escape-adventure',
    unlockAll,
  }));
});
