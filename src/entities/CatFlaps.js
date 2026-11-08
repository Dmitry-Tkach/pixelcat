import { GAME } from '../config/gameConfig.js';

const REACH = 60; // how close to the flap the cat must be to slide through it
const POP_OUT_SPEED = -520;
const POP_OUT_HEIGHT = 120; // where the cat's middle is as it hops out, above the road

// Cat flaps in garden walls. A cat that slides into one disappears through the back gardens and pops
// out of another flap further on, past whatever was on the road, and further ahead of the chaser.
// Running past a flap without sliding does nothing.
export class CatFlaps {
  constructor(scene, level, startX = 0) {
    this.scene = scene;
    this.carrying = null;
    this.entered = () => {};
    this.exited = () => {};
    this.items = (level.catFlaps ?? []).filter(({ at }) => at > startX).map(({ at, exitAt }) => {
      const way = { at, exitAt, used: false };
      scene.add.image(at, GAME.GROUND_Y + GAME.GROUND_OVERLAP, 'cat-flap').setOrigin(0.5, 1).setDepth(3.5);
      way.exit = scene.add.image(exitAt, GAME.GROUND_Y + GAME.GROUND_OVERLAP, 'cat-flap').setOrigin(0.5, 1).setDepth(3.5);
      return way;
    });
  }

  get isCarrying() {
    return Boolean(this.carrying);
  }

  // `onEnter(way)` runs as the cat goes in, and `onExit(way)` as it comes out.
  onUse(onEnter, onExit) {
    this.entered = onEnter;
    this.exited = onExit;
  }

  // Watches for a slide into a flap, and moves a cat that's gone through one. While it's away, the
  // cat has no body, so nothing on the road can touch it.
  update(ms, cat) {
    if (this.carrying) {
      this.carry(ms, cat);
      return;
    }
    if (!cat.isSliding || !cat.onGround) return;
    const way = this.items.find((item) => !item.used && Math.abs(cat.x - item.at) < REACH);
    if (!way) return;
    way.used = true;
    this.carrying = way;
    cat.endSlide();
    cat.setVisible(false);
    cat.body.enable = false;
    this.entered(way);
  }

  carry(ms, cat) {
    const way = this.carrying;
    cat.x = Math.min(way.exitAt, cat.x + cat.topSpeed * (ms / 1000));
    if (cat.x < way.exitAt) return;
    this.carrying = null;
    cat.body.enable = true;
    cat.body.reset(way.exitAt, GAME.GROUND_Y - POP_OUT_HEIGHT);
    cat.setVisible(true);
    cat.momentum = 1;
    cat.moveVelocity = cat.topSpeed;
    cat.setVelocityY(POP_OUT_SPEED);
    way.exit.setTexture('cat-flap-open');
    this.exited(way);
  }
}
