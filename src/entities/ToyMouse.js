import { GAME } from '../config/gameConfig.js';

const WIGGLE_MS = 380;
const COLLECT_MS = 240;

// The level's hidden collectible. It's only for finding: it isn't needed for any star.
export class ToyMouse {
  constructor(scene, level, alreadyFound) {
    this.scene = scene;
    this.item = null;
    if (!level.mouse || alreadyFound) return;
    const { at, height } = level.mouse;
    this.item = scene.physics.add.staticImage(at, GAME.GROUND_Y - height, 'toy-mouse');
    this.item.setOrigin(0.5, 1).setDepth(5);
    this.item.refreshBody();
    scene.tweens.add({ targets: this.item, angle: 12, duration: WIGGLE_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  onCollect(cat, callback) {
    if (!this.item) return;
    let found = false;
    this.scene.physics.add.overlap(cat, this.item, () => {
      if (found) return;
      found = true;
      this.scene.tweens.killTweensOf(this.item);
      this.scene.tweens.add({ targets: this.item, y: this.item.y - 50, alpha: 0, duration: COLLECT_MS, onComplete: () => this.item.setVisible(false) });
      callback();
    });
  }
}
