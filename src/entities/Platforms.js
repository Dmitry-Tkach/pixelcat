import { GAME } from '../config/gameConfig.js';

const THICKNESS = 34;
const LANDING_TOLERANCE = 10;
const TEXTURES = { awning: 'platform-awning', plank: 'platform-plank', leafy: 'platform-leafy', hay: 'platform-hay', rooftop: 'platform-roof' };
const ROOF_WALL_TEXTURE = 'roof-wall';
const WALL_BURIED = 10; // the wall goes a little way into the road, so it looks planted

// Floating ledges. The cat jumps up through them and lands on top, so they never block it.
export class Platforms {
  constructor(scene, level, startX = 0) {
    this.scene = scene;
    this.items = (level.platforms ?? [])
      .filter(({ at, width }) => at + width > startX)
      .map(({ at, width, height, style }) => {
        const top = GAME.GROUND_Y - height;
        const item = scene.add.tileSprite(at + width / 2, top + THICKNESS / 2, width, THICKNESS, TEXTURES[style]);
        item.setDepth(4);
        // A rooftop has a building under it. The cat on the road runs in front of the wall.
        if (style === 'rooftop') {
          const wallHeight = height - THICKNESS + WALL_BURIED;
          scene.add.tileSprite(at + width / 2, top + THICKNESS + wallHeight / 2, width, wallHeight, ROOF_WALL_TEXTURE).setDepth(3);
        }
        scene.physics.add.existing(item, true);
        return item;
      });
  }

  // Only catches a cat coming down from above, unless it's deliberately dropping through.
  onLand(cat) {
    if (this.items.length === 0) return;
    this.scene.physics.add.collider(
      cat,
      this.items,
      () => { cat.onPlatform = true; },
      (_cat, item) => {
        const previousBottom = cat.body.prev.y + cat.body.height;
        return !cat.isDropping && cat.body.velocity.y >= 0 && previousBottom <= item.body.top + LANDING_TOLERANCE;
      },
    );
  }
}
