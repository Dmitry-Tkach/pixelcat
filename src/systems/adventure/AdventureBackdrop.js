import Phaser from 'phaser';
import { GAME } from '../../config/gameConfig.js';
import { ROOM, backdropFxKey, layerRise } from '../../data/adventure/backdrop.js';

const EDGE = 4; // px more each way than a layer needs, to keep its picture's join off screen

// Draws an adventure world's backdrop (data/adventure/backdrop.js): its layers behind the level,
// each repeating sideways and moving at its own speed with the camera, across and a little up and
// down; soft light rays that breathe; fog drifting low; and leaves in front of the cat. They're all
// fixed to the screen, and moved by hand each frame, from where the camera is.
export class AdventureBackdrop {
  // backdrop: the world's settings. art(name): the world's picture of that name.
  constructor(scene, backdrop, art) {
    this.scene = scene;
    this.backdrop = backdrop;
    this.startY = null; // where the camera was the first frame, for how far it has climbed
    const fixed = (object) => object.setScrollFactor(0);
    this.layers = backdrop.layers.map((layer) => {
      const sprite = fixed(scene.add.tileSprite(0, 0, 4, 4, art(layer.picture)).setOrigin(0, 0).setDepth(layer.depth));
      if (layer.tint !== undefined) sprite.setTint(layer.tint);
      if (layer.alpha !== undefined) sprite.setAlpha(layer.alpha);
      return { ...layer, sprite };
    });
    const { rays, fog, front } = backdrop;
    this.rays = rays && fixed(scene.add.image(0, 0, backdropFxKey('rays')).setOrigin(0.5, 0)
      .setDepth(rays.depth).setTint(rays.tint).setBlendMode(Phaser.BlendModes.ADD));
    this.fog = fog && fixed(scene.add.tileSprite(0, 0, 4, 4, backdropFxKey('fog')).setOrigin(0, 1)
      .setDepth(fog.depth).setTint(fog.tint).setAlpha(fog.alpha));
    this.front = front && fixed(scene.add.tileSprite(0, 0, 4, 4, art(front.picture)).setOrigin(0, 1).setDepth(front.depth));
    this.fit();
  }

  // Sizes everything to the screen, as it is now: each layer as tall as the screen and ROOM more
  // each way (and EDGE px), its picture scaled to that height. Phaser repeats a picture up and down
  // too, and its top and bottom rows blend where they meet: the extra px keep that line off screen.
  fit() {
    const { WIDTH, HEIGHT } = GAME;
    const room = HEIGHT * ROOM + EDGE;
    for (const layer of this.layers) {
      const tall = HEIGHT + room * 2;
      layer.sprite.setSize(WIDTH, tall);
      const scale = tall / layer.sprite.texture.getSourceImage().height;
      layer.sprite.setTileScale(scale, scale);
      layer.baseY = -room;
    }
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
    this.room = room - EDGE;
  }

  // Each frame, from where the camera is, and the time (ms) for the rays' breathing and the fog's
  // drift.
  update(cam, time) {
    if (this.startY === null) this.startY = cam.scrollY;
    const climbed = cam.scrollY - this.startY;
    for (const layer of this.layers) {
      const { sprite, drift, rise, baseY } = layer;
      sprite.tilePositionX = (cam.scrollX * drift) / sprite.tileScaleX;
      sprite.y = baseY + layerRise(climbed, rise, this.room);
    }
    const { rays, fog, front } = this.backdrop;
    if (this.rays) {
      const breath = Math.sin((time / rays.breatheMs) * Math.PI * 2);
      this.rays.setAlpha(rays.alpha * (0.75 + 0.25 * breath)).setX(GAME.WIDTH / 2 + breath * rays.swayPx);
    }
    if (this.fog) this.fog.tilePositionX = (cam.scrollX * fog.drift + (time / 1000) * fog.speed) / this.fog.tileScaleX;
    if (this.front) this.front.tilePositionX = cam.scrollX * front.drift;
  }
}
