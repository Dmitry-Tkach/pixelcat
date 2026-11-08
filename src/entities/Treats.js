import { GAME } from '../config/gameConfig.js';

const FADE_MS = 160;
const COIN_SCALE = 0.78;
// Each coin bobs gently and spins now and then, each at its own moment.
const BOB = { height: 5, ms: 900 };
const SPIN = { ms: 160, every: 2600, thinnest: 0.12 };
const SPIN_CYCLE_MS = SPIN.ms * 2 + SPIN.every;
const ON_SCREEN_MARGIN = 120; // coins just off screen are moved too, so none pops as it scrolls in

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
        item.restY = item.y;
        item.offsetMs = Math.abs(at * 7) % SPIN.every;
        return item;
      })
      .sort((a, b) => a.x - b.x);
    this.firstOnScreen = 0;
  }

  // Bobs and spins the coins on screen. Only the picture moves: the body stays put, so collecting
  // works the same. Coins are in order along the road, so the search starts where it left off.
  update(timeMs, view) {
    const left = view.x - ON_SCREEN_MARGIN;
    const right = view.right + ON_SCREEN_MARGIN;
    const { items } = this;
    while (this.firstOnScreen > 0 && items[this.firstOnScreen - 1].x >= left) this.firstOnScreen -= 1;
    while (this.firstOnScreen < items.length && items[this.firstOnScreen].x < left) this.firstOnScreen += 1;
    for (let i = this.firstOnScreen; i < items.length && items[i].x <= right; i++) {
      const item = items[i];
      if (item.collected) continue;
      const t = timeMs + item.offsetMs;
      item.y = item.restY - BOB.height * (0.5 - 0.5 * Math.cos((t / BOB.ms) * Math.PI));
      const spin = t % SPIN_CYCLE_MS;
      const half = spin < SPIN.ms ? spin / SPIN.ms : spin < SPIN.ms * 2 ? (SPIN.ms * 2 - spin) / SPIN.ms : 0;
      const eased = 1 - Math.cos((half * Math.PI) / 2);
      item.scaleX = COIN_SCALE * (1 - (1 - SPIN.thinnest) * eased);
    }
  }

  onCollect(cat, callback) {
    if (this.items.length === 0) return;
    this.scene.physics.add.overlap(
      cat,
      this.items,
      (_cat, item) => {
        item.collected = true;
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
