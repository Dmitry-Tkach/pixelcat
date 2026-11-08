import { GAME } from '../config/gameConfig.js';
import { PAW_BLOCK } from '../data/pickups.js';
import { outline } from '../ui/Outline.js';

const BUMP = { height: 14, ms: 90 };
const COIN = { rise: 90, spread: 34, ms: 420, scale: 0.6 };

// Paw-print blocks: bump one from below to get what's inside. They're solid, so the cat can land on
// top of them too. See PAW_BLOCK in data/pickups.js.
export class PawBlocks {
  constructor(scene, level, startX = 0) {
    this.scene = scene;
    this.bumped = () => {};
    const all = level.pawBlocks ?? [];
    // Every block's treats count toward the level's total, like the treats on the road.
    this.treatTotal = all.filter((block) => block.reward === 'treats').reduce((sum, block) => sum + (block.count ?? PAW_BLOCK.treats), 0);
    this.group = scene.physics.add.staticGroup();
    this.items = all.filter(({ at }) => at > startX).map(({ at, reward, count }) => {
      const item = this.group.create(at, GAME.GROUND_Y - PAW_BLOCK.height, 'paw-block');
      item.setOrigin(0.5, 1).setDepth(5);
      outline(item);
      item.refreshBody();
      item.body.setSize(PAW_BLOCK.size, PAW_BLOCK.size);
      item.reward = reward;
      item.count = count ?? PAW_BLOCK.treats;
      item.used = false;
      return item;
    });
  }

  // `callback(item)` runs when the cat bumps a block that still has something in it.
  onBump(cat, callback) {
    if (this.items.length === 0) return;
    this.bumped = callback;
    this.scene.physics.add.collider(cat, this.group, (_cat, item) => {
      if (item.used || !cat.body.blocked.up) return;
      this.bump(item);
    });
  }

  bump(item) {
    item.used = true;
    item.setTexture('paw-block-used');
    // Only the picture jumps: the body stays put.
    const restY = item.y;
    this.scene.tweens.add({ targets: item, y: restY - BUMP.height, duration: BUMP.ms, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { item.y = restY; } });
    if (item.reward === 'treats') this.popCoins(item);
    this.bumped(item);
  }

  // The treats jump out of the top and fade, already counted.
  popCoins(item) {
    const top = item.y - PAW_BLOCK.size;
    for (let i = 0; i < item.count; i++) {
      const coin = this.scene.add.image(item.x, top, 'fish').setScale(COIN.scale).setDepth(6);
      const side = (i - (item.count - 1) / 2) * COIN.spread;
      this.scene.tweens.add({
        targets: coin,
        x: item.x + side,
        y: top - COIN.rise,
        alpha: 0,
        delay: i * 60,
        duration: COIN.ms,
        ease: 'Quad.easeOut',
        onComplete: () => coin.destroy(),
      });
    }
  }
}
