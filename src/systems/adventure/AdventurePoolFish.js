import { TILE } from '../adventureMap.js';
import { FISH, poolFishAt, touchesFish } from '../../data/adventure/fish.js';

// A level's pool fish (data/adventure/fish.js, poolFish): each swims to and fro under the water,
// its tail flicking, facing the way it goes. Touching one hurts the cat; a round knocks it out for
// good: it spins and sinks away.
export class AdventurePoolFish {
  // art: the level's pictures by name. hurt(fromX): the cat is hurt. spend(round): uses up a round.
  constructor(scene, fish, { art, hurt, spend }) {
    this.scene = scene;
    this.hurt = hurt;
    this.spend = spend;
    this.ms = 0;
    this.frames = [art('fish-1'), art('fish-2')];
    this.fish = scene.textures.exists(this.frames[0])
      ? fish.map((def) => ({ def, gone: false, look: scene.add.image(0, 0, this.frames[0]).setScale(FISH.scale).setDepth(FISH.depth) }))
      : [];
  }

  update(ms, cat, shots) {
    this.ms += ms;
    const frame = this.frames[Math.floor(this.ms / FISH.flapMs) % 2];
    const b = cat.body;
    for (const f of this.fish) {
      if (f.gone) continue;
      const place = poolFishAt(f.def, this.ms, TILE);
      // The art faces left: flipped when it swims right.
      f.look.setPosition(place.x, place.y).setTexture(frame).setFlipX(place.right);
      const { w, h } = FISH.hit;
      if (place.x + w / 2 > b.left && place.x - w / 2 < b.right && place.y + h / 2 > b.top && place.y - h / 2 < b.bottom) this.hurt(place.x);
      const shot = shots.find((round) => round.active && touchesFish(place, round.x, round.y));
      if (shot) {
        this.spend(shot);
        f.gone = true;
        this.scene.audio.playSfx('bump');
        this.scene.tweens.add({ targets: f.look, y: place.y + 2 * TILE, angle: 540, alpha: 0, duration: 900, ease: 'Quad.easeIn', onComplete: () => f.look.destroy() });
      }
    }
  }
}

