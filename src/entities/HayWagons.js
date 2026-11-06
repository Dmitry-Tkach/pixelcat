import { GAME, WAGON } from '../config/gameConfig.js';
import { wagonRearX } from '../systems/obstacleMotion.js';

const TEXTURE = 'hay-wagon';
const DECK_THICKNESS = 34;
const LANDING_TOLERANCE = 10;
const RIDING_TOLERANCE = 4;
const OFF_SCREEN_BEHIND = 300;

// Hay wagons driving along the road. The cat can jump on for a faster ride, or stay on the road.
// Like the swinging crates, they follow the cat's progress rather than the clock, so a wagon is
// still in the right place after a hit changes when the cat arrives.
export class HayWagons {
  constructor(scene, level) {
    this.scene = scene;
    this.boarded = () => {};
    this.wasRiding = false;
    this.items = (level.wagons ?? []).map(({ at }) => {
      const wagon = scene.physics.add.image(at, GAME.GROUND_Y + GAME.GROUND_OVERLAP, TEXTURE);
      wagon.meetAt = at;
      wagon.setOrigin(0, 1).setDepth(3);
      wagon.body.setAllowGravity(false);
      wagon.body.setImmovable(true);
      wagon.body.moves = false; // update() places it directly
      wagon.body.setSize(WAGON.DECK_WIDTH, DECK_THICKNESS, false);
      wagon.body.setOffset(0, wagon.height - GAME.GROUND_OVERLAP - WAGON.DECK_HEIGHT);
      return wagon;
    });
  }

  // Only catches a cat coming down from above, unless it's deliberately dropping off.
  onLand(cat) {
    if (this.items.length === 0) return;
    this.scene.physics.add.collider(
      cat,
      this.items,
      () => { cat.onPlatform = true; },
      (_cat, wagon) => {
        const previousBottom = cat.body.prev.y + cat.body.height;
        return !cat.isDropping && cat.body.velocity.y >= 0 && previousBottom <= wagon.body.top + LANDING_TOLERANCE;
      },
    );
  }

  // `callback` runs each time the cat lands on a wagon.
  onBoard(callback) {
    this.boarded = callback;
  }

  isRiding(cat) {
    if (!cat.onGround) return false;
    const deckY = GAME.GROUND_Y - WAGON.DECK_HEIGHT;
    if (Math.abs(cat.body.bottom - deckY) > RIDING_TOLERANCE) return false;
    return this.items.some((wagon) => {
      const x = cat.body.center.x;
      return wagon.visible && x >= wagon.x && x <= wagon.x + WAGON.DECK_WIDTH;
    });
  }

  update(cat) {
    const leftEdge = this.scene.cameras.main.scrollX - OFF_SCREEN_BEHIND;
    for (const wagon of this.items) {
      if (!wagon.visible) continue;
      wagon.x = wagonRearX(cat.x, wagon.meetAt, WAGON.SPEED_RATIO);
      if (wagon.x + wagon.width < leftEdge) {
        wagon.setVisible(false);
        wagon.body.enable = false;
      }
    }
    const riding = this.isRiding(cat);
    if (riding && !this.wasRiding) this.boarded();
    this.wasRiding = riding;
    return riding;
  }
}
