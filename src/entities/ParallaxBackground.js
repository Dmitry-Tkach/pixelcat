import Phaser from 'phaser';
import { VIEW } from '../config/gameConfig.js';
import { makeEffectTextures } from '../ui/Effects.js';

const START_WIDTH = 1280; // replaced by the window's width on the first sync
const EDGE = 2; // a pixel or two past each side, so no gap shows at the edges
// Skips the art's top row. Otherwise it blends with the bottom row when the textures repeat, which
// draws a faint line across the sky along the top of each layer.
const TOP_ROW_SKIP = 1;
const HAZE_DEPTH = 1.22; // over the sky and the buildings, behind the street and everything on it
const SUNBEAM_DEPTH = 1.25; // over the near buildings, behind the street
const STREET_TOP = 520; // where the scenery ends and the street begins, in the layers' art
const HAZE_ABOVE = 2000; // reaches well above the view, for when the camera rises
const SUNBEAM_ALPHA = { from: 0.18, to: 0.32, ms: 3200 };
const AMBIENCE_DEPTH = 1.26;
// Specks of dust caught in the light, and leaves blown off the trees. They float on the screen,
// drifting left as the cat runs right.
const AMBIENCE = {
  motes: {
    texture: 'fx-dot',
    config: {
      x: { min: 0, max: 1 }, y: { min: 0.08, max: 0.7 },
      lifespan: 6000, frequency: 260, quantity: 1,
      speedX: { min: -40, max: -12 }, speedY: { min: -10, max: 8 },
      scale: { min: 0.15, max: 0.35 },
      // Fades in and out over its life, so specks never pop.
      alpha: { onEmit: () => 0, onUpdate: (_particle, _key, t) => Math.sin(t * Math.PI) * 0.9 },
      tint: 0xfff6d0, blendMode: 'ADD',
    },
  },
  leaves: {
    texture: 'fx-leaf',
    config: {
      x: { min: 0.2, max: 1.1 }, y: { min: -0.05, max: 0 },
      lifespan: 7000, frequency: 1100, quantity: 1,
      speedX: { min: -120, max: -50 }, speedY: { min: 40, max: 80 },
      rotate: { min: 0, max: 360 }, scale: { min: 0.5, max: 0.9 },
      tint: [0x57cf62, 0x3cc46e, 0x9ceb8f],
    },
  },
  // Blossom from the village's gardens.
  petals: {
    texture: 'fx-leaf',
    config: {
      x: { min: 0.2, max: 1.1 }, y: { min: -0.05, max: 0 },
      lifespan: 7000, frequency: 700, quantity: 1,
      speedX: { min: -110, max: -40 }, speedY: { min: 30, max: 70 },
      rotate: { min: 0, max: 360 }, scale: { min: 0.35, max: 0.6 },
      tint: [0xffc2d6, 0xffffff, 0xf58fab],
    },
  },
  // Dandelion seeds floating up over the fields.
  fluff: {
    texture: 'fx-dot',
    config: {
      x: { min: 0.1, max: 1.1 }, y: { min: 0.55, max: 0.75 },
      lifespan: 6500, frequency: 600, quantity: 1,
      speedX: { min: -70, max: -25 }, speedY: { min: -30, max: -8 },
      scale: { min: 0.18, max: 0.3 },
      alpha: { onEmit: () => 0, onUpdate: (_particle, _key, t) => Math.sin(t * Math.PI) * 0.95 },
      tint: 0xffffff,
    },
  },
  // Fireflies glowing as the sun goes down, low over the street.
  fireflies: {
    texture: 'fx-dot',
    config: {
      x: { min: 0, max: 1 }, y: { min: 0.35, max: 0.72 },
      lifespan: 4200, frequency: 300, quantity: 1,
      speedX: { min: -30, max: 10 }, speedY: { min: -14, max: 14 },
      scale: { min: 0.22, max: 0.38 },
      alpha: { onEmit: () => 0, onUpdate: (_particle, _key, t) => Math.max(0, Math.sin(t * Math.PI * 3)) * 0.95 },
      tint: [0xfff27a, 0xd8ff7a], blendMode: 'ADD',
    },
  },
};

// Draws a theme's repeating layers and scrolls each one at its own rate, with the theme's light and
// whatever drifts through its air.
export class ParallaxBackground {
  // `light` is an optional tint for the time of day.
  constructor(scene, theme, light = 0xffffff) {
    this.scene = scene;
    // Fixed sideways, because scrolling is done by moving the tile textures. They still follow
    // the camera's vertical offset, so the street lines up with the characters.
    this.backdrop = scene.add.image(0, 0, theme.backdrop)
      .setOrigin(0)
      .setScrollFactor(0, 1)
      .setDepth(0)
      .setTint(light);
    this.layers = theme.layers.map(({ texture, factor, drift = 0, y, height, depth }, i) => ({
      factor,
      drift,
      height,
      sprite: scene.add.tileSprite(0, y, START_WIDTH, height, texture)
        .setOrigin(0)
        .setScrollFactor(0, 1)
        .setDepth(depth ?? 1 + i * 0.1)
        .setTint(light)
        .setTilePosition(0, TOP_ROW_SKIP),
    }));
    if (theme.haze) {
      this.haze = scene.add.rectangle(0, 0, 10, 10, theme.haze.color, theme.haze.alpha)
        .setOrigin(0).setScrollFactor(0, 1).setDepth(HAZE_DEPTH);
    }
    if (theme.sunbeams) {
      this.sunbeams = scene.add.image(0, 0, theme.sunbeams).setOrigin(0).setScrollFactor(0)
        .setDepth(SUNBEAM_DEPTH).setBlendMode(Phaser.BlendModes.ADD).setAlpha(SUNBEAM_ALPHA.from);
      // The light breathes a little, as if clouds pass over the sun.
      scene.tweens.add({ targets: this.sunbeams, alpha: SUNBEAM_ALPHA.to, duration: SUNBEAM_ALPHA.ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    makeEffectTextures(scene);
    this.ambience = (theme.ambience ?? []).map((name) => {
      const { texture, config } = AMBIENCE[name];
      const emitter = scene.add.particles(0, 0, texture, {
        ...config,
        x: 0,
        y: 0,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, 1, 1) },
      });
      emitter.setScrollFactor(0).setDepth(AMBIENCE_DEPTH);
      emitter.ambienceArea = { x: config.x, y: config.y };
      return emitter;
    });
  }

  // Follows the camera, and the window's shape, which can change at any time.
  // The sky stays behind the camera when it rises. The scenery stays in the world, and sinks.
  sync(cameraX, rise = 0) {
    const seconds = this.scene.time.now / 1000;
    this.backdrop.setPosition(VIEW.LEFT_OFFSET, VIEW.TOP - rise).setDisplaySize(VIEW.WIDTH, VIEW.HEIGHT);
    // Each layer is only as wide as the window, so nothing is drawn off screen.
    const width = Math.ceil(VIEW.WIDTH) + EDGE * 2;
    for (const { sprite, factor, drift, height } of this.layers) {
      if (sprite.width !== width) sprite.setSize(width, height);
      sprite.x = VIEW.LEFT_OFFSET - EDGE;
      sprite.tilePositionX = cameraX * factor + seconds * drift - EDGE;
    }
    this.sunbeams?.setPosition(VIEW.LEFT_OFFSET, VIEW.TOP).setDisplaySize(VIEW.WIDTH, VIEW.HEIGHT);
    // The haze stops where the street starts, so the road and everything on it keep their colour.
    this.haze?.setPosition(VIEW.LEFT_OFFSET, VIEW.TOP - rise - HAZE_ABOVE).setSize(VIEW.WIDTH, STREET_TOP - (VIEW.TOP - rise - HAZE_ABOVE));
    // The air fills whatever the window shows.
    for (const emitter of this.ambience) {
      const { x, y } = emitter.ambienceArea;
      const zone = emitter.emitZones[0]?.source;
      if (!zone) continue;
      zone.setTo(VIEW.LEFT_OFFSET + x.min * VIEW.WIDTH, VIEW.TOP + y.min * VIEW.HEIGHT, (x.max - x.min) * VIEW.WIDTH, Math.max(1, (y.max - y.min) * VIEW.HEIGHT));
    }
  }
}
