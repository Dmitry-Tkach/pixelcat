import { GAME } from '../config/gameConfig.js';

const FADE_MS = 160;
const COIN_SCALE = 0.78;

// Fish treats to collect. They give no direct advantage: they earn stars at the end of a level.
export class Treats {
  constructor(scene, level, startX = 0) {
    this.scene = scene;
    this.total = (level.treats ?? []).length;
    this.items = (level.treats ?? [])
      .filter(({ at }) => at > startX)
      .map(({ at, height }) => {
        const item = scene.physics.add.staticImage(at, GAME.GROUND_Y - height, 'fish');
        item.setOrigin(0.5, 1).setScale(COIN_SCALE).setDepth(5);
        item.refreshBody();
        item.collected = false;
        return item;
      });
  }

  onCollect(cat, callback) {
    if (this.items.length === 0) return;
    this.scene.physics.add.overlap(
      cat,
      this.items,
      (_cat, item) => {
        item.collected = true;
        this.scene.tweens.add({
          targets: item,
          y: item.y - 40,
          alpha: 0,
          duration: FADE_MS,
          onComplete: () => item.setVisible(false),
        });
        callback();
      },
      (_cat, item) => !item.collected,
    );
  }
}
