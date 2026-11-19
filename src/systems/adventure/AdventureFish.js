import { TILE } from '../adventureMap.js';
import { FISH, fishAt, touchesFish } from '../../data/adventure/fish.js';

// A level's leaping fish (data/adventure/fish.js): each leaps out of the water and dives back in,
// splashing, its tail flicking. Touching one hurts the cat; a round knocks it out, spinning back into
// the water, until its next leap. The scene calls update every frame.
export class AdventureFish {
  // water: the level's AdventureWater (its surface, and its splash). hurt(fromX): the cat is hurt.
  // spend(round): uses up a round that hit a fish.
  constructor(scene, fish, { art, water, hurt, spend }) {
    this.scene = scene;
    this.water = water;
    this.hurt = hurt;
    this.spend = spend;
    this.frames = [art('fish-1'), art('fish-2')];
    this.ms = 0;
    this.fish = fish.map((def) => ({
      def,
      look: scene.add.image(0, 0, this.frames[0]).setScale(FISH.scale).setDepth(FISH.depth).setVisible(false),
      out: -1, // the leap it was knocked out in
      wasUp: false,
    }));
  }

  update(ms, cat, shots) {
    this.ms += ms;
    if (!this.fish.length) return;
    const view = this.scene.cameras.main.worldView;
    const frame = this.frames[Math.floor(this.ms / FISH.flapMs) % 2];
    for (const f of this.fish) {
      const place = fishAt(f.def, this.ms, this.water.surfaceY, TILE);
      const up = Boolean(place);
      // Leaving the water or diving back in, it splashes, if it's where the camera can see.
      if (up !== f.wasUp) {
        const x = place?.x ?? f.look.x;
        if (x > view.left && x < view.right) this.water.splash(x);
        f.wasUp = up;
      }
      if (!place || f.out === place.leap) {
        if (!f.falling) f.look.setVisible(false);
        continue;
      }
      // The art faces left: flipped when it leaps right, and tilted along its arc.
      f.look.setVisible(true).setPosition(place.x, place.y).setTexture(frame)
        .setFlipX(place.right).setAngle(place.right ? place.angle : -place.angle);
      if (this.overlapsCat(place, cat)) this.hurt(place.x);
      const shot = shots.find((round) => round.active && touchesFish(place, round.x, round.y));
      if (shot) {
        this.spend(shot);
        this.knockOut(f, place);
      }
    }
  }

  // Whether the fish's box touches the cat's body.
  overlapsCat(place, cat) {
    const b = cat.body;
    return place.x + FISH.hit.w / 2 > b.left && place.x - FISH.hit.w / 2 < b.right
      && place.y + FISH.hit.h / 2 > b.top && place.y - FISH.hit.h / 2 < b.bottom;
  }

  // Hit: it spins and drops back into the water, and stays out of sight until its next leap.
  knockOut(f, place) {
    f.out = place.leap;
    f.falling = true;
    this.scene.audio.playSfx('bump');
    this.scene.tweens.add({
      targets: f.look, y: this.water.surfaceY + TILE, angle: f.look.angle + 540, duration: 600, ease: 'Quad.easeIn',
      onComplete: () => { f.falling = false; f.look.setVisible(false); },
    });
  }
}
