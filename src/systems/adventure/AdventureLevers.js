import { TILE } from '../adventureMap.js';

// A level's levers (systems/adventure/pools.js, levers): each stands in its cell, handle to the left;
// the cat touching it pulls it, once: its handle swings right, its lamp lights, and the water rises
// a stage (AdventurePools.raise), opening the next of the dam's gates (onPull).
export const LEVER = { reach: 40, depth: 2.2 }; // reach: px round its cell's middle he must touch

export class AdventureLevers {
  // art: the level's pictures by name. onPull(i): what pulling lever i does.
  constructor(scene, levers, { art, onPull }) {
    this.scene = scene;
    this.onPull = onPull;
    this.levers = levers.map((lever) => ({
      ...lever, pulled: false,
      look: scene.textures.exists(art('lever-off'))
        ? scene.add.image(lever.col * TILE + TILE / 2, (lever.row + 1) * TILE, art('lever-off')).setOrigin(0.5, 1).setDepth(LEVER.depth)
        : null,
      art,
    }));
  }

  update(cat) {
    const { center } = cat.body;
    this.levers.forEach((lever, i) => {
      if (lever.pulled) return;
      const mx = lever.col * TILE + TILE / 2, my = lever.row * TILE + TILE / 2;
      if (Math.abs(center.x - mx) > LEVER.reach || Math.abs(center.y - my) > LEVER.reach) return;
      lever.pulled = true;
      lever.look?.setTexture(lever.art('lever-on'));
      if (lever.look) this.scene.tweens.add({ targets: lever.look, scaleY: 0.92, duration: 90, yoyo: true });
      this.scene.audio.playSfx('creak');
      this.onPull(i);
    });
  }
}
