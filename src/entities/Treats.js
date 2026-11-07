import { GAME } from '../config/gameConfig.js';

const FADE_MS = 160;
const COIN_SCALE = 0.78;
// Each coin bobs gently and spins now and then, each at its own moment.
const BOB = { height: 5, ms: 900 };
const SPIN = { ms: 160, every: 2600 };

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
        // Only the picture moves: the body stays put, so collecting works the same.
        const offset = Math.abs(at * 7) % SPIN.every;
        item.bob = scene.tweens.add({ targets: item, y: item.y - BOB.height, duration: BOB.ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: offset % BOB.ms });
        item.spin = scene.tweens.add({ targets: item, scaleX: COIN_SCALE * 0.12, duration: SPIN.ms, yoyo: true, repeat: -1, repeatDelay: SPIN.every, delay: offset, ease: 'Sine.easeIn' });
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
        item.bob.remove();
        item.spin.remove();
        item.setScale(COIN_SCALE);
        this.scene.tweens.add({
          targets: item,
          y: item.y - 40,
          alpha: 0,
          duration: FADE_MS,
          onComplete: () => item.setVisible(false),
        });
        callback(item);
      },
      (_cat, item) => !item.collected,
    );
  }
}
