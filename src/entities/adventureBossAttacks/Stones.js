// The stones of a boss's stone burst, in flight: thrown up from where his club hit the floor, each
// flies a high arc to its landing place (systems/adventure/bosses/stoneLandings.js), with a shadow
// there that grows as it falls. A stone that touches the cat hurts him; one that's shot breaks in
// the air. They're drawn in code, and move by their own sums, not by physics, so they cost little.
//   gravity: px a second squared, gentler than the cat's, so the arcs are high and easy to follow.
//   flight: the seconds each takes, between these, so they don't all land at once.
//   w: the width that hurts (stoneLandings keeps gaps between these). radius: the round hitbox.
//   shotReach: a bullet this close to a stone's middle breaks it.
const STONE = { gravity: 1300, flight: { min: 1.0, max: 1.5 }, w: 48, radius: 22, shotReach: 30, spin: 540, depth: 6 };
const SHADOW = { w: 58, h: 14, alpha: 0.45, from: 0.25, depth: 2.5 };
const STONE_KEY = 'adventure-boss-stone';
export const STONE_W = STONE.w;

export class Stones {
  // onHit(x): a stone touched the cat. shots: the cat's bullets, `list()` and `stop(bullet)`.
  // surfaceAt(x): the top of whatever a stone falling at x lands on.
  constructor(scene, { onHit, shots, surfaceAt }) {
    this.scene = scene;
    this.onHit = onHit;
    this.shots = shots;
    this.surfaceAt = surfaceAt;
    this.stones = [];
    makeStoneTexture(scene);
  }

  // Throws a stone from (x, y) to each landing place, the first one quickest.
  throw(x, y, landings) {
    landings.forEach((toX, i) => {
      const { min, max } = STONE.flight;
      const seconds = min + ((max - min) * i) / Math.max(1, landings.length - 1);
      const toY = this.surfaceAt(toX);
      const vx = (toX - x) / seconds;
      const vy = (toY - y - 0.5 * STONE.gravity * seconds * seconds) / seconds;
      const sprite = this.scene.add.image(x, y, STONE_KEY).setDepth(STONE.depth).setRotation(Math.random() * Math.PI);
      const shadow = this.scene.add.ellipse(toX, toY, SHADOW.w, SHADOW.h, 0x000000, SHADOW.alpha).setDepth(SHADOW.depth).setScale(SHADOW.from);
      this.stones.push({ sprite, shadow, x0: x, y0: y, vx, vy, seconds, elapsed: 0 });
    });
  }

  update(ms, catBody) {
    const s = ms / 1000;
    for (const stone of this.stones.slice()) {
      stone.elapsed += s;
      const t = Math.min(stone.elapsed, stone.seconds);
      const x = stone.x0 + stone.vx * t;
      const y = stone.y0 + stone.vy * t + 0.5 * STONE.gravity * t * t;
      stone.sprite.setPosition(x, y).setAngle(stone.sprite.angle + STONE.spin * s);
      stone.shadow.setScale(SHADOW.from + (1 - SHADOW.from) * (t / stone.seconds));
      if (this.touches(catBody, x, y)) {
        this.break(stone);
        this.onHit(x);
      } else if (this.shotDown(x, y)) {
        this.break(stone);
      } else if (stone.elapsed >= stone.seconds) {
        this.break(stone);
        this.scene.effects.dust(x, y, 6);
      }
    }
  }

  touches(body, x, y) {
    const nearX = Math.max(body.left, Math.min(x, body.right));
    const nearY = Math.max(body.top, Math.min(y, body.bottom));
    return (x - nearX) ** 2 + (y - nearY) ** 2 <= STONE.radius ** 2;
  }

  // A bullet close enough breaks it; the bullet stops there, unless it goes through things.
  shotDown(x, y) {
    for (const bullet of this.shots.list()) {
      if (!bullet.active || (bullet.x - x) ** 2 + (bullet.y - y) ** 2 > STONE.shotReach ** 2) continue;
      if (!bullet.ammo.pierce) this.shots.stop(bullet);
      return true;
    }
    return false;
  }

  break(stone) {
    const { x, y } = stone.sprite;
    this.scene.effects.impact(x, y, 0.4);
    this.scene.effects.puff(x, y, 0x9a9184);
    this.remove(stone);
  }

  remove(stone) {
    stone.sprite.destroy();
    stone.shadow.destroy();
    this.stones.splice(this.stones.indexOf(stone), 1);
  }

  clear() {
    for (const stone of this.stones.slice()) this.remove(stone);
  }
}

// A grey rock with a dark edge, a lighter face and a glint, drawn once.
function makeStoneTexture(scene) {
  if (scene.textures.exists(STONE_KEY)) return;
  const size = STONE.w;
  const c = size / 2;
  const rock = (r) => [-0.9, -0.2, 0.5, 1.3, 2.1, 2.9, 3.7, 4.6, 5.4].map((a, i) => ({ x: c + Math.cos(a) * r * (i % 2 ? 0.86 : 1), y: c + Math.sin(a) * r * (i % 3 ? 0.9 : 1) }));
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x3b352f, 1).fillPoints(rock(c - 1), true);
  g.fillStyle(0x7a7268, 1).fillPoints(rock(c - 5), true);
  g.fillStyle(0xa39a8c, 1).fillEllipse(c - 4, c - 5, c * 0.9, c * 0.6);
  g.fillStyle(0xe8e0d0, 0.9).fillEllipse(c - 8, c - 9, 7, 4);
  g.generateTexture(STONE_KEY, size, size);
  g.destroy();
}
