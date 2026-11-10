import Phaser from 'phaser';
import { ENEMIES, enemyAnimKey, enemyKey, enemyLayout } from '../data/adventure/enemies.js';
import { TILE } from '../systems/adventureMap.js';

// patrolTiles: how far it walks each way from where it starts. sees: how close the cat must be,
// in front of it, for it to swipe; reach: how close for the swipe to land. Both in px from its
// middle. levelWithin: how far the cat's feet can be above or below its own and still count.
const PATROL_TILES = 3;
const SWIPE = { sees: 120, reach: 95, levelWithin: 60, cooldownMs: 550 };
// It spots the cat this close, on either side, with his feet about at its level, hops in alarm and
// chases him. It forgets him once he's been out of sight this long, and goes back to its beat.
const CHASE = { sees: 5 * TILE, levelWithin: 90, hop: -280, forgetMs: 1500 };
const LOOK_DOWN = 4; // how far below its feet it checks for ground ahead, so it turns at edges
const FADE_MS = 500;
const SHOT_FLASH_MS = 70;

// One of the adventure's enemies: it walks to and fro on its island or stretch of ground, turning at
// edges, walls and the end of its beat. When it spots the cat it hops, chases him as far as its
// ground goes, and swipes at him when he's close in front. The scene
// decides what touching it does (see AdventureScene.meetEnemy).
export class AdventureEnemy extends Phaser.Physics.Arcade.Sprite {
  // groundLayer: the level's tiles, to find edges. isSpike(x, y): whether there are spikes at a point,
  // which it won't walk onto.
  constructor(scene, x, feetY, kind, { groundLayer, isSpike }) {
    super(scene, x, feetY, enemyKey(kind), 'idle-0');
    this.kind = kind;
    this.info = ENEMIES[kind];
    this.layout = enemyLayout(kind);
    this.groundLayer = groundLayer;
    this.isSpike = isSpike;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, this.layout.feet / this.layout.frameH).setDepth(5);
    this.body.setSize(this.layout.body.w, this.layout.body.h);
    this.homeX = x;
    this.hp = this.info.hp;
    this.dead = false;
    this.attacking = false;
    this.cooldownMs = 0;
    this.alerted = false;
    this.unseenMs = 0;
    this.face(-1);
    this.play(enemyAnimKey(kind, 'walk'));

    const swipeFrame = `attack-${this.info.anims.attack.hitFrame}`;
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (this.attacking && frame.textureFrame === swipeFrame) this.emit('swipe', this);
    });
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
      if (anim.key !== enemyAnimKey(kind, 'attack')) return;
      this.attacking = false;
      this.cooldownMs = SWIPE.cooldownMs;
      if (!this.dead) this.play(enemyAnimKey(kind, 'walk'));
    });
  }

  // -1 is left, as the art is drawn; 1 is right. The body is mirrored with the picture.
  face(direction) {
    this.direction = direction;
    this.setFlipX(direction > 0);
    const { frameW, body } = this.layout;
    this.body.setOffset(direction > 0 ? frameW - body.x - body.w : body.x, body.y);
  }

  // Whether the cat is in front of it, at about its level, and within this distance.
  catInFront(cat, distance) {
    const dx = cat.body.center.x - this.body.center.x;
    const level = Math.abs(cat.body.bottom - this.body.bottom) < SWIPE.levelWithin;
    return level && Math.abs(dx) < distance && (Math.sign(dx) === this.direction || Math.abs(dx) < this.body.width / 2);
  }

  swipeLands(cat) {
    return !this.dead && this.catInFront(cat, SWIPE.reach);
  }

  // Whether it can see the cat: close by, on either side, at about its level.
  seesCat(cat) {
    return Math.abs(cat.body.center.x - this.body.center.x) < CHASE.sees
      && Math.abs(cat.body.bottom - this.body.bottom) < CHASE.levelWithin;
  }

  update(cat, ms) {
    if (this.dead) return;
    this.cooldownMs = Math.max(0, this.cooldownMs - ms);
    if (this.attacking) {
      this.setVelocityX(0);
      return;
    }
    const onGround = this.body.blocked.down;
    const sees = this.seesCat(cat);
    this.unseenMs = sees ? 0 : this.unseenMs + ms;
    if (this.alerted && this.unseenMs > CHASE.forgetMs) this.alerted = false;
    // The cat close by, in front, at its level: it swipes.
    if (this.cooldownMs === 0 && onGround && this.catInFront(cat, SWIPE.sees)) {
      this.attacking = true;
      this.setVelocityX(0);
      this.anims.timeScale = 1;
      this.play(enemyAnimKey(this.kind, 'attack'));
      return;
    }
    if (!onGround) return; // mid-hop, it keeps going as it was
    if (sees) {
      this.face(Math.sign(cat.body.center.x - this.body.center.x) || this.direction);
      if (!this.alerted) {
        this.alerted = true;
        this.setVelocityY(CHASE.hop);
      }
      this.chase();
      return;
    }
    if (this.wayBlocked() || this.pastBeat()) this.face(-this.direction);
    this.walk(this.info.speed);
  }

  // Runs at the cat, as far as the edge of its island or a wall, where it waits facing him.
  chase() {
    if (this.wayBlocked()) {
      this.setVelocityX(0);
      this.anims.timeScale = 1;
      this.play(enemyAnimKey(this.kind, 'idle'), true);
      return;
    }
    this.walk(this.info.chaseSpeed);
  }

  // Its walk plays faster the faster it goes.
  walk(speed) {
    this.setVelocityX(this.direction * speed);
    this.play(enemyAnimKey(this.kind, 'walk'), true);
    this.anims.timeScale = speed / this.info.speed;
  }

  // A wall, spikes or no ground just ahead of its front foot.
  wayBlocked() {
    const { body, direction } = this;
    if ((direction < 0 && body.blocked.left) || (direction > 0 && body.blocked.right)) return true;
    const frontX = direction < 0 ? body.left - LOOK_DOWN : body.right + LOOK_DOWN;
    return this.isSpike(frontX, body.bottom - LOOK_DOWN) || !this.groundLayer.getTileAtWorldXY(frontX, body.bottom + LOOK_DOWN);
  }

  // Past the end of its beat, still going away from home.
  pastBeat() {
    const beat = PATROL_TILES * TILE;
    return (this.direction < 0 && this.x < this.homeX - beat) || (this.direction > 0 && this.x > this.homeX + beat);
  }

  // Stands still, for when the level ends.
  halt() {
    if (this.dead) return;
    this.attacking = false;
    this.setVelocityX(0);
    this.anims.timeScale = 1;
    this.play(enemyAnimKey(this.kind, 'idle'), true);
  }

  // A bullet hit: it flashes. Returns whether that was its last.
  takeShot() {
    this.hp -= 1;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(SHOT_FLASH_MS, () => this.clearTint());
    return this.hp <= 0;
  }

  knockOut() {
    this.dead = true;
    this.attacking = false;
    this.body.enable = false;
    this.anims.timeScale = 1;
    this.play(enemyAnimKey(this.kind, 'dead'));
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.scene.tweens.add({ targets: this, alpha: 0, duration: FADE_MS, onComplete: () => this.destroy() });
    });
  }
}
