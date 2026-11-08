import Phaser from 'phaser';
import { BIG_LAND, FREE_MOVE, GAME, MOVEMENT } from '../config/gameConfig.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { SpeedController } from '../systems/SpeedController.js';

const MANIFEST = CHARACTERS.cat;
// Momentum 0 is a standing start, and 1 is top speed. A hit drops it to this, which gives HIT_SHARE.
const HIT_MOMENTUM = (FREE_MOVE.HIT_SHARE - FREE_MOVE.START_SHARE) / (1 - FREE_MOVE.START_SHARE);

// The player character. It runs where it's told, builds momentum, and responds to jump and slide
// requests.
export class Cat extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, topSpeed) {
    super(scene, x, GAME.GROUND_Y - 120, frameKey('cat', 'idle', 1));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(MANIFEST.scale).setDepth(6);
    this.topSpeed = topSpeed;
    this.speedControl = new SpeedController(topSpeed);
    this.body.setGravityY(MOVEMENT.GRAVITY);
    this.useHitbox('run');

    this.slideLeft = 0;
    this.slideQueued = false;
    this.jumpBufferMs = 0;
    this.hurtMs = 0;
    this.running = false;
    this.airJumpsLeft = 1;
    this.onPlatform = false;
    this.dropMs = 0;
    this.treats = 0;
    this.fallSpeed = 0;
    this.moveMode = 'free'; // or 'hybrid', which always runs
    this.moveDirection = 0;
    this.moveVelocity = 0;
    this.momentum = 0;
    this.play(animKey('cat', 'idle'));
  }

  useHitbox(name) {
    if (this.hitbox === name) return;
    this.hitbox = name;
    const { x, y, w, h } = MANIFEST.hitboxes[name];
    this.body.setSize(w, h, false);
    this.body.setOffset(x, y);
  }

  // Only `blocked` means solid ground. `touching` is also set when overlapping an obstacle.
  get onGround() {
    return this.body.blocked.down;
  }

  get isSliding() {
    return this.slideLeft > 0;
  }

  startRunning() {
    this.running = true;
  }

  // Leaves the ground straight away, rather than at the next update, so a jump never feels late.
  startJump() {
    this.jumpBufferMs = 0;
    this.endSlide();
    this.setVelocityY(MOVEMENT.JUMP_VELOCITY);
    this.play(animKey('cat', 'jump'), true);
    this.emit('jump');
  }

  // On the ground this jumps. In the air it uses the double jump, if one is left.
  // With none left, the press is remembered briefly in case the cat is about to land.
  requestJump() {
    this.slideQueued = false;
    if (this.onGround) {
      this.startJump();
      return;
    }
    if (this.airJumpsLeft > 0) {
      this.airJumpsLeft -= 1;
      this.jumpBufferMs = 0;
      this.setVelocityY(MOVEMENT.AIR_JUMP_VELOCITY);
      this.play(animKey('cat', 'jump'));
      this.emit('doubleJump');
      return;
    }
    this.jumpBufferMs = MOVEMENT.JUMP_BUFFER_MS;
  }

  get isDropping() {
    return this.dropMs > 0;
  }

  requestSlide() {
    // On a floating ledge, Down drops through it, into a dive.
    if (this.onGround && this.onPlatform) {
      this.dropMs = MOVEMENT.PLATFORM_DROP_MS;
      this.onPlatform = false;
      this.body.setVelocityY(MOVEMENT.FAST_FALL_VELOCITY);
      this.slideQueued = true;
      this.emit('dive');
      return;
    }
    if (this.onGround) {
      this.beginSlide();
    } else {
      // A dive: pressing slide in the air drops the cat quickly, then slides on landing.
      this.body.setVelocityY(MOVEMENT.FAST_FALL_VELOCITY);
      this.jumpBufferMs = 0;
      this.slideQueued = true;
      this.emit('dive');
    }
  }

  beginSlide() {
    this.slideQueued = false;
    this.jumpBufferMs = 0;
    this.slideLeft = MOVEMENT.SLIDE_DISTANCE;
    this.useHitbox('slide');
    this.emit('slide');
  }

  endSlide() {
    this.slideLeft = 0;
    this.useHitbox('run');
  }

  // Launches the cat from a bouncy obstacle, and gives its double jump back.
  bounce(velocity) {
    this.setVelocityY(velocity);
    this.airJumpsLeft = 1;
    this.slideQueued = false;
    this.jumpBufferMs = 0;
    this.wasAirborne = false;
    this.fallSpeed = 0;
    this.emit('bounce');
  }

  applyBoost(boost) {
    this.speedControl.applyBoost(boost);
  }

  applyPenalty(penalty) {
    this.speedControl.applyPenalty(penalty);
    this.loseMomentum();
    this.hurtMs = penalty.durationMs * 0.5;
    this.play(animKey('cat', 'hurt'), true);
  }

  // How fast the cat runs right now, when it's running forward.
  get speed() {
    return this.running ? this.speedControl.speed : 0;
  }

  // Below zero, so the cat is slower than a standing start for a while. See FREE_MOVE.HIT_SHARE.
  loseMomentum() {
    this.momentum = HIT_MOMENTUM;
  }

  // -1 is left, 1 is right, and 0 is neither.
  move(direction) {
    this.moveDirection = direction;
  }

  updateMomentum(seconds) {
    const hybrid = this.moveMode === 'hybrid';
    if (this.moveDirection > 0) {
      // A slide coasts: it doesn't build speed, or it would end sooner, under whatever it's avoiding.
      if (!this.isSliding) this.momentum += seconds / FREE_MOVE.BUILD_SECONDS;
    } else if (hybrid && this.moveDirection === 0) {
      const change = seconds * FREE_MOVE.LOSS_RATE;
      const towardCruise = FREE_MOVE.HYBRID_MOMENTUM - this.momentum;
      this.momentum += Phaser.Math.Clamp(towardCruise, -change, change);
    } else {
      // Slows back down to a standing start, but a hit's deeper loss isn't undone by stopping.
      this.momentum = Math.max(Math.min(this.momentum, 0), this.momentum - seconds * FREE_MOVE.LOSS_RATE);
    }
    this.momentum = Phaser.Math.Clamp(this.momentum, HIT_MOMENTUM, 1);
    this.speedControl.baseSpeed = this.topSpeed * Phaser.Math.Linear(FREE_MOVE.START_SHARE, 1, this.momentum);
  }

  moveTarget() {
    const hybrid = this.moveMode === 'hybrid';
    if (this.moveDirection > 0) return this.speed;
    if (this.moveDirection < 0) return this.topSpeed * (hybrid ? FREE_MOVE.HYBRID_BRAKE_SHARE : -FREE_MOVE.BACK_SHARE);
    return hybrid ? this.speed : 0;
  }

  // A wall takes away everything the cat had built up.
  updateMovement(ms) {
    const seconds = ms / 1000;
    this.updateMomentum(seconds);
    if (this.body.blocked.right && this.moveVelocity > 0) {
      this.moveVelocity = 0;
      this.loseMomentum();
    }
    if (this.body.blocked.left && this.moveVelocity < 0) this.moveVelocity = 0;
    const control = this.onGround ? 1 : FREE_MOVE.AIR_CONTROL;
    const change = FREE_MOVE.ACCELERATION * control * seconds;
    const target = this.running ? this.moveTarget() : 0;
    this.moveVelocity = Phaser.Math.Clamp(target, this.moveVelocity - change, this.moveVelocity + change);
    this.setVelocityX(this.moveVelocity);
    if (this.moveVelocity < -FREE_MOVE.IDLE_BELOW) this.setFlipX(true);
    else if (this.moveVelocity > FREE_MOVE.IDLE_BELOW) this.setFlipX(false);
  }

  // Called once per frame while the level is being played.
  tick(ms) {
    this.speedControl.update(ms);
    this.hurtMs = Math.max(0, this.hurtMs - ms);
    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - ms);
    this.dropMs = Math.max(0, this.dropMs - ms);
    if (!this.onGround) this.onPlatform = false;

    this.updateMovement(ms);

    if (this.onGround && this.wasAirborne) {
      this.emit('land');
      if (this.fallSpeed >= BIG_LAND.FALL_SPEED) this.emit('bigLand');
    }
    this.wasAirborne = !this.onGround;
    // The body's speed is already cleared by the time the cat counts as landed.
    this.fallSpeed = this.onGround ? 0 : Math.max(this.fallSpeed, this.body.velocity.y);

    if (this.onGround) {
      this.airJumpsLeft = 1;
      if (this.jumpBufferMs > 0) {
        this.startJump();
      } else if (this.slideQueued && !this.isDropping) {
        this.beginSlide();
      }
    }

    if (this.isSliding) {
      // A cat sliding from a standstill still gets back up, however slowly it's moving.
      const slowest = this.topSpeed * FREE_MOVE.START_SHARE;
      this.slideLeft -= Math.max(Math.abs(this.moveVelocity), slowest) * (ms / 1000);
      if (this.slideLeft <= 0) this.endSlide();
    }

    this.updateAnimation();
  }

  updateAnimation() {
    if (this.hurtMs > 0) return;
    let role = 'run';
    if (this.isSliding) role = 'slide';
    else if (!this.onGround) role = this.body.velocity.y < 0 ? 'jump' : 'fall';
    else if (Math.abs(this.moveVelocity) < FREE_MOVE.IDLE_BELOW) role = 'idle';
    this.play(animKey('cat', role), true);
  }

  // Stops the cat when it's caught, and plays its defeat animation.
  beCaught() {
    this.running = false;
    this.setVelocityX(0);
    this.endSlide();
    this.play(animKey('cat', 'caught'), true);
  }
}
