import { TILE } from '../adventureMap.js';
import { WATER, waterKey } from '../../data/adventure/water.js';
import { overWater, waterRuns } from './water.js';

// A level's water (data/adventure/water.js): it fills each bottomless gap from the level's water row
// down, in two layers: behind the ground, reaching a little under it so it meets the cliffs cleanly,
// and a see-through surface in front of the cat, with a bright crest, so he sinks into it. The waves
// move, the front ones the other way. Something falling in splashes.
const WAVE_TOP = 10; // where the body picture's wavy surface is, from its top (tools/adventure-backdrop-art.mjs)
const CREST_MIDDLE = 12; // where the crest picture's line is, from its top
const DROP_TINTS = [0xffffff, 0xbff4f0, 0x7fe3dc];

export class AdventureWater {
  // water: the level's { row }, or undefined for none. bottom: the world's lowest px drawn.
  constructor(scene, water, layout, bottom) {
    this.scene = scene;
    this.runs = water ? waterRuns(layout, water.row) : [];
    this.surfaceY = water ? water.row * TILE : Infinity;
    this.layers = [];
    if (!this.runs.length) return;
    const top = this.surfaceY - WAVE_TOP;
    const height = Math.max(TILE, bottom - top);
    for (const { from, to } of this.runs) {
      const x = from * TILE, w = (to - from + 1) * TILE;
      const { reach } = WATER.back;
      const tile = (tx, ty, tw, th, key) => scene.add.tileSprite(tx, ty, tw, th, waterKey(key)).setOrigin(0, 0);
      this.layers.push({ sprite: tile(x - reach, top, w + reach * 2, height, 'body').setDepth(WATER.back.depth), dir: 1 });
      this.layers.push({ sprite: tile(x, top, w, height, 'body').setDepth(WATER.front.depth).setAlpha(WATER.front.alpha), dir: 1 });
      this.layers.push({ sprite: tile(x, this.surfaceY - CREST_MIDDLE, w, 28, 'crest').setDepth(WATER.front.depth + 0.1), dir: -1 });
    }
    // The splash: drops thrown up, falling back.
    this.drops = scene.add.particles(0, 0, 'fx-dot', {
      emitting: false, lifespan: { min: 450, max: 800 }, speed: { min: 180, max: 420 }, angle: { min: 245, max: 295 },
      gravityY: 950, scale: { start: 0.55, end: 0.1 }, tint: DROP_TINTS, alpha: { start: 1, end: 0.4 },
    }).setDepth(WATER.front.depth + 0.2);
  }

  get any() {
    return this.runs.length > 0;
  }

  // Whether this x (px) is over water.
  over(x) {
    return overWater(this.runs, x / TILE);
  }

  // Each frame: the waves move.
  update(ms) {
    const step = (WATER.waveSpeed * ms) / 1000;
    for (const { sprite, dir } of this.layers) sprite.tilePositionX += step * dir;
  }

  // Something hits the water at x: drops fly up, a ring spreads on the surface, and it sounds.
  splash(x) {
    const { splash } = WATER;
    this.drops.explode(splash.drops, x, this.surfaceY);
    const ring = this.scene.add.ellipse(x, this.surfaceY, 50, 12, 0xffffff, 0).setStrokeStyle(3, 0xffffff, 0.9).setDepth(WATER.front.depth + 0.2);
    this.scene.tweens.add({ targets: ring, scaleX: 3.2, scaleY: 2, alpha: 0, duration: splash.ringMs, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    this.scene.audio.playSfx('splash');
  }
}
