import { VIEW } from '../config/gameConfig.js';

const MAX_LAYER_WIDTH = 4000; // wide enough for any window: what's off-screen isn't visible
// Skips the art's top row. Otherwise it blends with the bottom row when the textures repeat, which
// draws a faint line across the sky along the top of each layer.
const TOP_ROW_SKIP = 1;

// Draws a theme's repeating layers and scrolls each one at its own rate.
export class ParallaxBackground {
  // `light` is an optional tint for the time of day.
  constructor(scene, theme, light = 0xffffff) {
    // Fixed sideways, because scrolling is done by moving the tile textures. They still follow
    // the camera's vertical offset, so the street lines up with the characters.
    this.backdrop = scene.add.image(0, 0, theme.backdrop)
      .setOrigin(0)
      .setScrollFactor(0, 1)
      .setDepth(0)
      .setTint(light);
    this.layers = theme.layers.map(({ texture, factor, y, height, depth }, i) => ({
      factor,
      sprite: scene.add.tileSprite(0, y, MAX_LAYER_WIDTH, height, texture)
        .setOrigin(0)
        .setScrollFactor(0, 1)
        .setDepth(depth ?? 1 + i * 0.1)
        .setTint(light)
        .setTilePosition(0, TOP_ROW_SKIP),
    }));
  }

  // Follows the camera, and the window's shape, which can change at any time.
  // The sky stays behind the camera when it rises. The scenery stays in the world, and sinks.
  sync(cameraX, rise = 0) {
    this.backdrop.setPosition(VIEW.LEFT_OFFSET, VIEW.TOP - rise).setDisplaySize(VIEW.WIDTH, VIEW.HEIGHT);
    for (const { sprite, factor } of this.layers) {
      sprite.x = VIEW.LEFT_OFFSET;
      sprite.tilePositionX = cameraX * factor;
    }
  }
}
