import Phaser from 'phaser';
import { GUNNERS, gunnerAnimKey, gunnerKey, gunnerLayout } from '../data/adventure/gunners.js';
import { ONE_WAY, TILE } from '../systems/adventureMap.js';

const LINE_STEP = 16; // how finely the line to the cat is checked for ground in the way
const FIRST_SHOT = { minShare: 0.4, maxShare: 1 }; // its first shot comes after this share of everyMs
const SHOT_FLASH_MS = 70;
const KNOCKOUT = { ms: 600, spin: 100, drop: 18 };

// A gunner: a cat with a gun who stands in one place. When the battle cat is in sight, it turns to
// face him and shoots at where he is at that moment, so a cat on the move has to keep moving. It has
// the same knock-out rules as the walking enemies (see AdventureScene.meetEnemy), and lives in the
// same group, so the cat's bullets, stomps, slides, dashes and beam all work on it.
export class AdventureGunner extends Phaser.Physics.Arcade.Sprite {
  // groundLayer: the level's tiles, which block its view. fire(gunner, x, y, angle): the scene makes
  // the bullet and the flash.
  constructor(scene, x, feetY, kind, { groundLayer, fire }) {
    super(scene, x, feetY, gunnerKey(kind), 'idle-0');
    this.kind = kind;
    this.info = GUNNERS[kind];
    this.layout = gunnerLayout(kind);
    this.groundLayer = groundLayer;
    this.fire = fire;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, this.layout.feet / this.layout.frameH).setDepth(5);
    this.body.setSize(this.layout.body.w, this.layout.body.h);
    this.hp = this.info.hp;
    this.dead = false;
    this.shooting = false;
    this.cooldownMs = this.info.everyMs * Phaser.Math.FloatBetween(FIRST_SHOT.minShare, FIRST_SHOT.maxShare);
    this.face(1);
    this.play(gunnerAnimKey(kind, 'idle'));

    const fireFrame = `shoot-${this.info.anims.shoot.fireFrame}`;
    this.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, frame) => {
      if (this.shooting && frame.textureFrame === fireFrame) this.shoot();
    });
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
      if (anim.key !== gunnerAnimKey(kind, 'shoot')) return;
      this.shooting = false;
      if (!this.dead) this.play(gunnerAnimKey(kind, 'idle'));
    });
  }

  // 1 is right, as the art is drawn; -1 is left. The body is mirrored with the picture.
  face(direction) {
    this.direction = direction;
    this.setFlipX(direction < 0);
    const { frameW, body } = this.layout;
    this.body.setOffset(direction < 0 ? frameW - body.x - body.w : body.x, body.y);
  }

  // Where the gun's end is in the world, facing the way it faces.
  get muzzle() {
    const { frameW, feet, muzzle } = this.layout;
    return { x: this.x + this.direction * (muzzle.x - frameW / 2), y: this.y - (feet - muzzle.y) };
  }

  // Whether the cat is close enough, with no ground between them. Islands don't block the view.
  seesCat(cat) {
    const { across, up } = this.info.sees;
    const target = cat.body.center;
    if (Math.abs(target.x - this.x) > across * TILE || Math.abs(target.y - this.body.center.y) > up * TILE) return false;
    const from = this.muzzle;
    const steps = Math.ceil(Phaser.Math.Distance.Between(from.x, from.y, target.x, target.y) / LINE_STEP);
    for (let i = 1; i < steps; i++) {
      const tile = this.groundLayer.getTileAtWorldXY(
        Phaser.Math.Linear(from.x, target.x, i / steps),
        Phaser.Math.Linear(from.y, target.y, i / steps),
      );
      if (tile && !ONE_WAY.has(tile.index)) return false;
    }
    return true;
  }

  update(cat, ms) {
    if (this.dead) return;
    this.setVelocityX(0);
    this.cooldownMs = Math.max(0, this.cooldownMs - ms);
    if (this.shooting || !this.seesCat(cat)) return;
    this.face(cat.body.center.x < this.x ? -1 : 1);
    if (this.cooldownMs > 0) return;
    this.cat = cat;
    this.shooting = true;
    this.cooldownMs = this.info.everyMs;
    this.play(gunnerAnimKey(this.kind, 'shoot'));
  }

  // Aims at the cat as he is right now.
  shoot() {
    if (!this.cat?.active) return;
    const from = this.muzzle;
    const angle = Phaser.Math.Angle.Between(from.x, from.y, this.cat.body.center.x, this.cat.body.center.y);
    this.fire(this, from.x, from.y, angle);
  }

  // Stands still, for when the level ends.
  halt() {
    if (this.dead) return;
    this.shooting = false;
    this.cooldownMs = Infinity;
    this.play(gunnerAnimKey(this.kind, 'idle'), true);
  }

  // A bullet hit: it flashes. Returns whether that was its last.
  takeShot() {
    this.hp -= 1;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(SHOT_FLASH_MS, () => this.clearTint());
    return this.hp <= 0;
  }

  // The pack draws no knock-out for them, so it topples over and fades away.
  knockOut() {
    this.dead = true;
    this.shooting = false;
    this.body.enable = false;
    this.anims.stop();
    this.scene.tweens.add({
      targets: this,
      angle: -this.direction * KNOCKOUT.spin,
      y: this.y + KNOCKOUT.drop,
      alpha: 0,
      duration: KNOCKOUT.ms,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}
