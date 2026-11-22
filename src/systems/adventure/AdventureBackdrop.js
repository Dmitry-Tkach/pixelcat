import Phaser from 'phaser';
import { GAME } from '../../config/gameConfig.js';
import { ROOM, backdropFxKey, layerRise } from '../../data/adventure/backdrop.js';

// Draws an adventure world's backdrop (data/adventure/backdrop.js): its layers behind the level,
// each repeating sideways and moving at its own speed with the camera, across and a little up and
// down; soft light rays that breathe; fog drifting low; and leaves in front of the cat. They're all
// fixed to the screen, and moved by hand each frame, from where the camera is.
// Each layer is a row of plain copies of its picture, side by side, rather than a Phaser tile sprite:
// a tile sprite stretches its picture to a power-of-two size to repeat it (1173 px wide to 2048),
// which blurred the owner's painted layers, and blends its edges into lines.
export class AdventureBackdrop {
  // backdrop: the world's settings. art(name): the world's picture of that name.
  constructor(scene, backdrop, art) {
    this.scene = scene;
    this.backdrop = backdrop;
    this.startY = null; // where the camera was the first frame, for how far it has climbed
    this.fitted = false; // fitted again on the first frame (see update)
    const fixed = (object) => object.setScrollFactor(0);
    // Each made at the screen's size from the start: made tiny and sized after, they didn't show
    // until the window was resized.
    const { WIDTH, HEIGHT } = GAME;
    this.art = art;
    this.layers = backdrop.layers.map((layer) => ({ ...layer, images: [] }));
    const { rays, fog, front } = backdrop;
    this.rays = rays && fixed(scene.add.image(0, 0, backdropFxKey('rays')).setOrigin(0.5, 0)
      .setDepth(rays.depth).setTint(rays.tint).setBlendMode(Phaser.BlendModes.ADD));
    this.fog = fog && fixed(scene.add.tileSprite(0, HEIGHT, WIDTH, HEIGHT * fog.height, backdropFxKey('fog')).setOrigin(0, 1)
      .setDepth(fog.depth).setTint(fog.tint).setAlpha(fog.alpha));
    this.front = front && fixed(scene.add.tileSprite(0, HEIGHT, WIDTH, HEIGHT / 3, art(front.picture)).setOrigin(0, 1).setDepth(front.depth));
    this.fit();
  }

  // Sizes everything to the screen, as it is now: each layer as tall as the screen and ROOM more
  // each way, its picture scaled to that height, in as many copies as cover the screen and one more.
  fit() {
    const { WIDTH, HEIGHT } = GAME;
    const room = Math.round(HEIGHT * ROOM);
    for (const layer of this.layers) {
      // A layer that rises gets room above and below; one that doesn't is just the screen's height.
      const still = !layer.rise;
      layer.tall = still ? HEIGHT : HEIGHT + room * 2;
      const source = this.scene.textures.get(this.art(layer.picture)).getSourceImage();
      // Whole px wide, so the copies meet exactly, with no hairline between them.
      layer.wide = Math.round((source.width * layer.tall) / source.height);
      layer.baseY = still ? 0 : -room;
      const copies = Math.ceil(WIDTH / layer.wide) + 1;
      while (layer.images.length < copies) {
        const image = this.scene.add.image(0, 0, this.art(layer.picture)).setOrigin(0, 0).setScrollFactor(0).setDepth(layer.depth);
        if (layer.alpha !== undefined) image.setAlpha(layer.alpha);
        layer.images.push(image);
      }
      while (layer.images.length > copies) layer.images.pop().destroy();
      for (const image of layer.images) image.setDisplaySize(layer.wide, layer.tall);
    }
    if (this.moodTint) this.setMood(this.moodTint);
    if (this.rays) this.rays.setPosition(WIDTH / 2, 0).setDisplaySize(WIDTH * 1.2, HEIGHT);
    if (this.fog) this.fog.setPosition(0, HEIGHT).setSize(WIDTH, HEIGHT * this.backdrop.fog.height);
    if (this.fog) {
      const scale = (HEIGHT * this.backdrop.fog.height) / this.fog.texture.getSourceImage().height;
      this.fog.setTileScale(scale, scale);
    }
    if (this.front) {
      const { height } = this.front.texture.getSourceImage();
      this.front.setPosition(0, HEIGHT).setSize(WIDTH, height * (this.backdrop.front.scale ?? 1));
    }
    this.room = room;
  }

  // A mood's light and colour (data/adventure/moods.js): the layers tinted (over their own tint),
  // and the rays and fog brighter or fainter.
  setMood(mood) {
    this.moodTint = mood;
    const [mr, mg, mb] = [(mood.backdrop >> 16) & 255, (mood.backdrop >> 8) & 255, mood.backdrop & 255];
    for (const { images, tint = 0xffffff } of this.layers) {
      const r = ((tint >> 16) & 255) * mr / 255, g = ((tint >> 8) & 255) * mg / 255, b = (tint & 255) * mb / 255;
      const colour = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
      for (const image of images) image.setTint(colour);
    }
    this.moodRays = mood.rays;
    if (this.fog) this.fog.setAlpha(Math.min(1, this.backdrop.fog.alpha * mood.fog));
  }

  // Each frame, from where the camera is, and the time (ms) for the rays' breathing and the fog's
  // drift.
  update(cam, time) {
    // Fitted once more on the first frame, as a window resize would: the layers showed only after
    // one.
    if (!this.fitted) {
      this.fit();
      this.fitted = true;
    }
    if (this.startY === null) this.startY = cam.scrollY;
    const climbed = cam.scrollY - this.startY;
    for (const { images, drift, rise, baseY, wide } of this.layers) {
      // How far along its row of copies the layer has moved, kept within one copy's width.
      const along = (((cam.scrollX * drift) % wide) + wide) % wide;
      const y = Math.round(baseY + layerRise(climbed, rise, this.room));
      images.forEach((image, i) => image.setPosition(Math.round(i * wide - along), y));
    }
    const { rays, fog, front } = this.backdrop;
    if (this.rays) {
      const breath = Math.sin((time / rays.breatheMs) * Math.PI * 2);
      this.rays.setAlpha(Math.min(1, rays.alpha * (this.moodRays ?? 1) * (0.75 + 0.25 * breath))).setX(GAME.WIDTH / 2 + breath * rays.swayPx);
    }
    if (this.fog) this.fog.tilePositionX = (cam.scrollX * fog.drift + (time / 1000) * fog.speed) / this.fog.tileScaleX;
    if (this.front) this.front.tilePositionX = cam.scrollX * front.drift;
  }
}
