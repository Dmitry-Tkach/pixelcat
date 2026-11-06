import Phaser from 'phaser';
import { BIG_LAND, GAME, MOVEMENT, STEER } from '../config/gameConfig.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { SpeedController } from '../systems/SpeedController.js';

const MANIFEST = CHARACTERS.cat;

// The player character: runs automatically and responds to jump and slide requests.
export class Cat extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, baseSpeed) {
    super(scene, x, GAME.GROUND_Y - 120, frameKey('cat', 'idle', 1));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(MANIFEST.scale).setDepth(6);
    this.speedControl = new SpeedController(baseSpeed);
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
    this.steerDirection = 0;
    this.steerVelocity = 0;
    this.screenShift = 0;
    this.fallSpeed = 0;
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

  // On the ground this jumps. In the air it uses the double jump, if one is left.
  // With none left, the press is remembered briefly in case the cat is about to land.
  requestJump() {
    this.slideQueued = false;
    if (!this.onGround && this.airJumpsLeft > 0) {
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
    this.hurtMs = penalty.durationMs * 0.5;
    this.play(animKey('cat', 'hurt'), true);
  }

  get speed() {
    return this.running ? this.speedControl.speed : 0;
  }

  // -1 brakes, 1 surges, and 0 lets go. It only has an effect in the air.
  steer(direction) {
    this.steerDirection = direction;
  }

  updateSteering(ms) {
    const seconds = ms / 1000;
    if (this.onGround || !this.running) {
      this.steerVelocity = 0;
      this.screenShift *= Math.exp(-STEER.RETURN_RATE * seconds);
      return;
    }
    const target = this.steerDirection * STEER.SPEED;
    const change = STEER.ACCELERATION * seconds;
    this.steerVelocity = Phaser.Math.Clamp(target, this.steerVelocity - change, this.steerVelocity + change);
    if (this.body.blocked.right) return;
    const shift = this.screenShift + this.steerVelocity * seconds;
    this.screenShift = Phaser.Math.Clamp(shift, -STEER.MAX_SCREEN_SHIFT, STEER.MAX_SCREEN_SHIFT);
  }

  // Called once per frame while the level is being played.
  tick(ms) {
    this.speedControl.update(ms);
    this.hurtMs = Math.max(0, this.hurtMs - ms);
    this.jumpBufferMs = Math.max(0, this.jumpBufferMs - ms);
    this.dropMs = Math.max(0, this.dropMs - ms);
    if (!this.onGround) this.onPlatform = false;

    this.updateSteering(ms);
    this.setVelocityX(this.speed + this.steerVelocity);

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
        this.jumpBufferMs = 0;
        this.endSlide();
        this.setVelocityY(MOVEMENT.JUMP_VELOCITY);
        this.emit('jump');
      } else if (this.slideQueued && !this.isDropping) {
        this.beginSlide();
      }
    }

    if (this.isSliding) {
      this.slideLeft -= this.speed * (ms / 1000);
      if (this.slideLeft <= 0) this.endSlide();
    }

    this.updateAnimation();
  }

  updateAnimation() {
    if (this.hurtMs > 0) return;
    let role = 'run';
    if (this.isSliding) role = 'slide';
    else if (!this.onGround) role = this.body.velocity.y < 0 ? 'jump' : 'fall';
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
