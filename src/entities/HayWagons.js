import { GAME, WAGON } from '../config/gameConfig.js';
import { wagonStartX } from '../systems/obstacleMotion.js';

const TEXTURE = 'hay-wagon';
const DECK_THICKNESS = 34;
const LANDING_TOLERANCE = 10;
const RIDING_TOLERANCE = 4;
const OFF_SCREEN_BEHIND = 300;

// Hay wagons driving along the road. Each sets off as the cat gets close, and carries a cat riding
// on it, on top of the cat's own running. Standing still up there is only as fast as the wagon.
export class HayWagons {
  constructor(scene, level) {
    this.scene = scene;
    this.boarded = () => {};
    this.wasRiding = false;
    this.driveSpeed = level.cat.speed * WAGON.SPEED_RATIO;
    this.items = (level.wagons ?? []).map(({ at }) => {
      const wagon = scene.physics.add.image(wagonStartX(at, WAGON.START_AHEAD, WAGON.SPEED_RATIO), GAME.GROUND_Y + GAME.GROUND_OVERLAP, TEXTURE);
      wagon.setsOffAt = at - WAGON.START_AHEAD;
      wagon.driving = false;
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

  // The wagon the cat is standing on, if any.
  ridden(cat) {
    if (!cat.onGround) return null;
    const deckY = GAME.GROUND_Y - WAGON.DECK_HEIGHT;
    if (Math.abs(cat.body.bottom - deckY) > RIDING_TOLERANCE) return null;
    const x = cat.body.center.x;
    return this.items.find((wagon) => wagon.visible && x >= wagon.x && x <= wagon.x + WAGON.DECK_WIDTH) ?? null;
  }

  update(ms, cat) {
    const leftEdge = this.scene.cameras.main.scrollX - OFF_SCREEN_BEHIND;
    const riding = this.ridden(cat);
    const distance = this.driveSpeed * (ms / 1000);
    for (const wagon of this.items) {
      if (!wagon.visible) continue;
      if (!wagon.driving && cat.x >= wagon.setsOffAt) wagon.driving = true;
      if (wagon.driving) wagon.x += distance;
      if (wagon === riding) cat.x += distance;
      if (wagon.x + wagon.width < leftEdge) {
        wagon.setVisible(false);
        wagon.body.enable = false;
      }
    }
    const isRiding = Boolean(riding);
    if (isRiding && !this.wasRiding) this.boarded();
    this.wasRiding = isRiding;
  }
}
