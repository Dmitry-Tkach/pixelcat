import { GAME } from '../config/gameConfig.js';
import { PICKUPS } from '../data/pickups.js';
import { outline } from '../ui/Outline.js';

const PULSE_MS = 420;
const COLLECT_MS = 220;

// Floating power-up boxes. The cat collects one by touching it.
export class Pickups {
  constructor(scene, level, startX = 0) {
    this.scene = scene;
    this.items = (level.pickups ?? []).filter(({ at }) => at > startX).map(({ type, at }) => {
      const definition = PICKUPS[type];
      const item = scene.physics.add.staticImage(at, GAME.GROUND_Y - definition.height, definition.texture);
      item.setOrigin(0.5, 1).setDepth(5);
      outline(item);
      item.refreshBody();
      item.pickupType = type;
      item.collected = false;
      scene.tweens.add({ targets: item, scale: 1.1, duration: PULSE_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
        this.scene.tweens.killTweensOf(item);
        this.scene.tweens.add({
          targets: item,
          scale: 1.7,
          alpha: 0,
          duration: COLLECT_MS,
          onComplete: () => item.setVisible(false),
        });
        callback(item.pickupType);
      },
      (_cat, item) => !item.collected,
    );
  }
}
