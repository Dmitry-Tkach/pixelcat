import Phaser from 'phaser';
import { GAME } from '../config/gameConfig.js';
import { animKey, frameKey } from '../data/characters.js';

// The crow. It's the bird's art, darkened. See CROW in data/pickups.js for its timing.
const TINT = 0x3a3346;
const FLY_HEIGHT = 330;
const BOB = { height: 10, seconds: 0.6 };
const ENTER_FROM = 700; // it flies in from up here, ahead of the cat
const LEAVE_SPEED = 520;
const ACORN_SCALE = 1.4;
const ACORN_HIT = { w: 34, h: 40 };
const SHADOW = { w: 70, h: 14 };
const LANDED_SINK = 2; // a landed acorn sits a little into the road
const BEHIND_CAT = 400;

// A crow that flies along above the cat for a stretch, dropping acorns onto the road ahead of it. A
// shadow shows where each will land, and it lands a moment before the cat gets there: jump it.
export class Crows {
  constructor(scene, level, crow) {
    this.scene = scene;
    this.crow = crow;
    this.dropped = () => {};
    this.hitCat = () => {};
    this.flights = (level.crows ?? []).map((flight) => ({ ...flight, state: 'waiting', sprite: null, dropMs: 0 }));
    this.acorns = [];
  }

  // `onDrop` runs when an acorn is let go, and `onHit` when one hits the cat.
  onEvents(onDrop, onHit) {
    this.dropped = onDrop;
    this.hitCat = onHit;
  }

  get active() {
    return this.flights.some((flight) => flight.state === 'flying');
  }

  update(ms, cat, safe) {
    const seconds = ms / 1000;
    for (const flight of this.flights) this.fly(flight, seconds, cat);
    this.moveAcorns(seconds, cat, safe);
  }

  fly(flight, seconds, cat) {
    const { crow } = this;
    if (flight.state === 'waiting') {
      if (cat.x < flight.at) return;
      flight.state = 'flying';
      flight.elapsed = 0;
      flight.dropMs = crow.firstDrop * 1000;
      flight.sprite = this.scene.add.sprite(cat.x + ENTER_FROM, GAME.GROUND_Y - FLY_HEIGHT - 200, frameKey('bird', 'fly', 1))
        .setDepth(9).setTint(TINT).setScale(crow.scale).setFlipX(false);
      flight.sprite.play(animKey('bird', 'fly'));
      this.scene.audio.playSfx('caw');
    }
    if (flight.state === 'done') return;
    const { sprite } = flight;
    flight.elapsed += seconds;
    if (flight.state === 'leaving') {
      sprite.x += LEAVE_SPEED * seconds;
      sprite.y -= LEAVE_SPEED * 0.6 * seconds;
      if (sprite.y < GAME.GROUND_Y - 1400) {
        sprite.destroy();
        flight.state = 'done';
      }
      return;
    }
    // It keeps above where an acorn should land, ahead of the cat, swooping in at the start.
    const ahead = cat.speed * (crow.fallSeconds + crow.landAhead);
    const goalX = cat.x + ahead;
    const goalY = GAME.GROUND_Y - FLY_HEIGHT + Math.sin((flight.elapsed * Math.PI * 2) / BOB.seconds) * BOB.height;
    const blend = 1 - Math.exp(-crow.follow * seconds);
    sprite.x += (goalX - sprite.x) * blend;
    sprite.y += (goalY - sprite.y) * blend;
    if (cat.x >= flight.until) {
      flight.state = 'leaving';
      this.scene.audio.playSfx('caw');
      return;
    }
    flight.dropMs -= seconds * 1000;
    // Only acorns that land within its own stretch, so none falls among what comes after.
    if (flight.dropMs <= 0 && goalX <= flight.until) {
      flight.dropMs = crow.every * 1000;
      this.drop(sprite.x, sprite.y + 20);
    }
  }

  drop(x, y) {
    const sprite = this.scene.add.image(x, y, 'acorn').setDepth(8).setScale(ACORN_SCALE);
    const shadow = this.scene.add.ellipse(x, GAME.GROUND_Y + 4, SHADOW.w, SHADOW.h, 0x1d1a44, 0.6).setDepth(3).setScale(0.3);
    this.acorns.push({ sprite, shadow, fromY: y, ms: 0 });
    this.dropped(x);
  }

  // Acorns fall, with their shadows growing, and lie on the road until they're behind the cat.
  // `safe` says the cat can't be hurt.
  moveAcorns(seconds, cat, safe) {
    const { crow } = this;
    const { body } = cat;
    this.acorns = this.acorns.filter((acorn) => {
      acorn.ms += seconds * 1000;
      const { sprite, shadow } = acorn;
      if (!acorn.landed) {
        const t = Math.min(1, acorn.ms / (crow.fallSeconds * 1000));
        sprite.y = Phaser.Math.Linear(acorn.fromY, GAME.GROUND_Y - ACORN_HIT.h / 2 + LANDED_SINK, t * t);
        sprite.angle += 400 * seconds;
        shadow.setScale(0.3 + 0.7 * t);
        if (t === 1) {
          acorn.landed = true;
          sprite.angle = 0;
          shadow.setScale(1);
        }
      }
      const touching = Math.abs(sprite.x - body.center.x) < (ACORN_HIT.w + body.width) / 2
        && Math.abs(sprite.y - body.center.y) < (ACORN_HIT.h + body.height) / 2;
      if (touching && !acorn.used && cat.visible) {
        acorn.used = true;
        // Knocked away, whether it hurt the cat or not.
        shadow.destroy();
        this.scene.tweens.add({ targets: sprite, x: sprite.x + 160, y: sprite.y - 80, angle: 540, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => sprite.destroy() });
        if (!safe) this.hitCat();
        return false;
      }
      if (sprite.x < cat.x - BEHIND_CAT) {
        this.remove(acorn);
        return false;
      }
      return true;
    });
  }

  remove(acorn) {
    acorn.sprite.destroy();
    acorn.shadow.destroy();
  }

  stop() {
    for (const acorn of this.acorns) this.remove(acorn);
    this.acorns = [];
  }
}
