import Phaser from 'phaser';
import { GAME, VIEW } from '../config/gameConfig.js';
import { animKey, frameKey, CHARACTERS } from '../data/characters.js';
import { activationCatX, arcHeight, crossingProgress, pulseStrength, shouldStartLeap, startX, swingHeight, wrapToCycle } from '../systems/obstacleMotion.js';

const FEET_ORIGIN_Y = 0.97;
const HIDEOUT_BACK = 80; // a hiding place stands this far back from where the cat runs, on the pavement
const HIDEOUT_SCALE = 0.85;
const ICON_ABOVE = 165;
const ICON_ABOVE_FLYER = 110;
const ICON_SCREEN_MARGIN = 65;
const OFF_SCREEN_BEHIND = 300;
const HIT_TINT = 0xff9a9a;
const HIT_TINT_MS = 180;
const PULSE_DANGER_STRENGTH = 0.5;
const LIGHT_WARNING_SECONDS = 0.7; // how long the light is red before a car starts across
const LIGHT_BEFORE_CROSSING = 170;
const LIGHT_BASE_Y = GAME.GROUND_Y - 50; // on the far pavement
const STRIPES_BELOW_FEET = 58;
const BEHIND_CAT_DEPTH = 5;
const IN_FRONT_OF_CAT_DEPTH = 7;
// Where a crossing car is drawn, and how big, across the road: far side, cat's lane, near side.
const CAR_FAR = { rise: 60, scale: 0.55 };
const CAR_NEAR = { rise: -170, scale: 1.4 };

// What all moving obstacles share. Each kind below supplies its own movement in tick().
class MovingObstacle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, type) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.motion = type.motion;
    this.avoid = type.avoid;
    this.penalty = type.penalty;
    this.wasHit = false;
    this.phase = 'waiting';
    this.position = undefined;

    this.body.setAllowGravity(false);
    this.body.moves = false; // tick() places it directly
    this.setHitbox(type.motion.fallingHitbox ?? type.hitbox);
  }

  setHitbox({ x, y, w, h }) {
    this.body.setSize(w, h, false);
    this.body.setOffset(x, y);
  }

  retireIfBehindCamera() {
    if (this.x < this.scene.cameras.main.scrollX - OFF_SCREEN_BEHIND) this.retire();
  }

  reactToHit() {
    this.setTint(HIT_TINT);
    this.scene.time.delayedCall(HIT_TINT_MS, () => this.clearTint());
  }

  stop() {
    this.anims.stop();
    this.phase = 'done';
  }

  retire() {
    this.stop();
    this.setVisible(false);
    this.body.enable = false;
  }
}

// Runs at the cat from off-screen, with a warning, and may hop and leap on the way.
class ChargingObstacle extends MovingObstacle {
  constructor(scene, meetAt, type, catSpeed) {
    const { motion, character, texture } = type;
    const key = character ? frameKey(character, CHARACTERS[character].anims[motion.anim].file, 1) : texture;
    super(scene, startX(meetAt, motion.speed, motion.leadSeconds), GAME.GROUND_Y, key, type);

    this.character = character;
    this.activateAtCatX = activationCatX(meetAt, catSpeed, motion.leadSeconds);
    this.hopElapsed = 0;
    this.flightElapsed = 0;
    this.leapElapsed = 0;
    this.hasLeapt = false;

    // Rolling obstacles spin around their middle, and others stand on their feet.
    this.setOrigin(0.5, motion.rollRadius ? 0.5 : FEET_ORIGIN_Y).setFlipX(Boolean(character)).setDepth(5).setVisible(false);
    this.body.enable = false;
    this.icon = scene.add.image(0, 0, motion.warnIcon).setDepth(15).setVisible(false);
    // It waits in plain sight, in its hiding place on the pavement, and springs out onto the road.
    if (motion.hideIn) {
      this.hideout = scene.add.image(this.x, GAME.GROUND_Y - HIDEOUT_BACK, motion.hideIn).setOrigin(0.5, 1).setDepth(2.5).setScale(HIDEOUT_SCALE);
    }
  }

  tick(ms, cat, onAlert) {
    if (this.phase === 'done') return;
    if (this.phase === 'waiting') {
      if (cat.x < this.activateAtCatX) return;
      this.phase = 'running';
      this.setVisible(true);
      this.body.enable = true;
      this.icon.setVisible(true);
      if (this.character) this.play(animKey(this.character, this.motion.anim));
      onAlert(this.motion.sound);
      if (this.hideout) this.springOut();
    }

    const seconds = ms / 1000;
    this.x -= this.motion.speed * seconds;
    this.y = GAME.GROUND_Y - this.currentHeight(seconds, cat) - (this.motion.rollRadius ?? 0);
    if (this.motion.spin) this.angle += this.motion.spin * seconds;
    this.updateIcon(cat);
    this.retireIfBehindCamera();
  }

  currentHeight(seconds, cat) {
    const { hop, leap, speed, flyHeight, bob } = this.motion;
    if (flyHeight) {
      this.flightElapsed += seconds;
      const wave = bob ? Math.sin((2 * Math.PI * this.flightElapsed) / bob.seconds) * bob.height : 0;
      return flyHeight + wave;
    }
    if (leap && !this.hasLeapt && this.leapElapsed === 0
      && shouldStartLeap(this.x - cat.body.center.x, cat.speed, speed, leap.seconds)) {
      this.leapElapsed = 0.0001;
    }
    if (this.leapElapsed > 0) {
      this.leapElapsed += seconds;
      if (this.leapElapsed < leap.seconds) return arcHeight(this.leapElapsed, leap.seconds, leap.height);
      this.leapElapsed = 0;
      this.hasLeapt = true;
    }
    if (!hop) return 0;
    this.hopElapsed = (this.hopElapsed + seconds) % hop.seconds;
    return arcHeight(this.hopElapsed, hop.seconds, hop.height);
  }

  // The hiding place shakes as the dog bursts out of it.
  springOut() {
    this.scene.effects.puff(this.hideout.x, GAME.GROUND_Y - HIDEOUT_BACK);
    this.scene.tweens.add({ targets: this.hideout, angle: 8, duration: 60, yoyo: true, repeat: 2, onComplete: () => this.hideout.setAngle(0) });
  }

  // The icon stays on the screen's edge until the dog arrives, then rides above it.
  updateIcon(cat) {
    if (this.x < cat.x) {
      this.icon.setVisible(false);
      return;
    }
    const rightEdge = this.scene.cameras.main.scrollX + VIEW.RIGHT_OFFSET - ICON_SCREEN_MARGIN;
    const iconY = this.motion.flyHeight ? this.y - ICON_ABOVE_FLYER : GAME.GROUND_Y - ICON_ABOVE;
    this.icon.setPosition(Math.min(this.x, rightEdge), iconY);
  }

  reactToHit() {
    super.reactToHit();
    this.icon.setVisible(false);
  }

  stop() {
    super.stop();
    this.icon.setVisible(false);
  }
}

// Drops from above with a growing shadow, and leaves broken pieces on the road to jump over.
class FallingObstacle extends MovingObstacle {
  constructor(scene, at, type, catSpeed) {
    super(scene, at, GAME.GROUND_Y + GAME.GROUND_OVERLAP, type.motion.fallingTexture, type);
    this.landedHitbox = type.hitbox;
    this.landedTexture = type.texture;
    this.activateAtCatX = activationCatX(at, catSpeed, type.motion.leadSeconds);
    this.elapsed = 0;

    this.setOrigin(0.5, 1).setDepth(5).setVisible(false);
    this.body.enable = false;
    this.shadow = scene.add.ellipse(at, GAME.GROUND_Y + 4, 90, 16, 0x1d1a44, 0.4).setDepth(3).setVisible(false);
  }

  tick(ms, cat, onAlert) {
    if (this.phase === 'done' || this.phase === 'landed') {
      this.retireIfBehindCamera();
      return;
    }
    if (this.phase === 'waiting') {
      if (cat.x < this.activateAtCatX) return;
      this.phase = 'falling';
      this.setVisible(true);
      this.shadow.setVisible(true);
      this.body.enable = true;
      onAlert(this.motion.sound);
    }

    this.elapsed += ms / 1000;
    const progress = Math.min(1, this.elapsed / this.motion.fallSeconds);
    const landedY = GAME.GROUND_Y + GAME.GROUND_OVERLAP;
    this.y = landedY - this.motion.fallFrom * (1 - progress * progress);
    this.shadow.setScale(0.35 + 0.65 * progress);
    if (progress === 1) this.land(onAlert);
  }

  land(onAlert) {
    this.phase = 'landed';
    this.y = GAME.GROUND_Y + GAME.GROUND_OVERLAP;
    this.setTexture(this.landedTexture);
    this.setHitbox(this.landedHitbox);
    this.shadow.setVisible(false);
    onAlert(this.motion.landSound);
  }

  stop() {
    this.anims.stop();
    if (this.phase === 'waiting' || this.phase === 'falling') this.phase = 'done';
  }
}

// Swings up and down on a rope. Low means jump over it, high means slide under it.
class SwingingObstacle extends MovingObstacle {
  constructor(scene, at, type, catSpeed, position) {
    super(scene, at, GAME.GROUND_Y, type.texture, type);
    this.at = at;
    this.catSpeed = catSpeed;
    this.position = position;
    this.phase = 'running';
    this.keepsTime = true;
    this.setOrigin(0.5, 1).setDepth(5);
    this.rope = scene.add.rectangle(at, VIEW.TOP, 8, 10, 0x3f4c73).setOrigin(0.5, 0).setDepth(3);
    this.place(0);
  }

  heightAt(clockX) {
    return swingHeight(clockX / this.catSpeed, this.at / this.catSpeed, this.motion.period, this.motion.maxHeight, this.position);
  }

  // The move that clears it `seconds` from now, for simulated players.
  moveIn(seconds, clockX) {
    const height = this.heightAt(clockX + seconds * this.catSpeed);
    return height > this.motion.maxHeight / 2 ? 'slide' : 'jump';
  }

  // It keeps time on its own, so the player can watch it and pick a moment.
  place(clockX) {
    const height = this.heightAt(clockX);
    this.y = GAME.GROUND_Y - height;
    this.rope.y = VIEW.TOP;
    this.rope.setScale(1, (this.y - this.height - VIEW.TOP) / 10);
  }

  tick(_ms, cat) {
    if (this.phase === 'done') return;
    this.place(cat.x);
    this.retireIfBehindCamera();
  }
}

// Switches on and off, keeping time like the swing does.
class PulsingObstacle extends MovingObstacle {
  constructor(scene, at, type, catSpeed, position) {
    super(scene, at, GAME.GROUND_Y + GAME.GROUND_OVERLAP, type.texture, type);
    this.at = at;
    this.catSpeed = catSpeed;
    this.position = position;
    this.phase = 'running';
    this.keepsTime = true;
    this.setOrigin(0.5, 1).setDepth(5);
    this.water = scene.add.image(at, this.y - 30, type.motion.waterTexture).setOrigin(0.5, 1).setDepth(5);
    this.place(0);
  }

  strengthAt(clockX) {
    return pulseStrength(clockX / this.catSpeed, this.at / this.catSpeed, this.motion.period, this.position);
  }

  moveIn(seconds, clockX) {
    return this.strengthAt(clockX + seconds * this.catSpeed) > PULSE_DANGER_STRENGTH ? 'jump' : 'none';
  }

  place(clockX) {
    const strength = this.strengthAt(clockX);
    this.water.setScale(1, Math.max(0.02, strength));
    this.water.setAlpha(strength > 0.05 ? 1 : 0);
    this.body.enable = strength > PULSE_DANGER_STRENGTH;
  }

  tick(_ms, cat) {
    if (this.phase === 'done') return;
    this.place(cat.x);
    this.retireIfBehindCamera();
  }

  retire() {
    super.retire();
    this.water.setVisible(false);
  }
}

// Cars keep crossing the road at a traffic light. `this` stays still and invisible as the hitbox,
// and a separate image is the car, because the car's size changes as it comes toward the camera.
// The light turns red before each car. Wait for it to pass, jump it, or time your run on green.
class CrossingCar extends MovingObstacle {
  constructor(scene, at, type, catSpeed, position) {
    super(scene, at, GAME.GROUND_Y + GAME.GROUND_OVERLAP, type.texture, type);
    this.at = at;
    this.catSpeed = catSpeed;
    this.position = position;
    this.phase = 'running';
    this.keepsTime = true;
    this.honkedCycle = null;
    this.setOrigin(0.5, 1).setVisible(false);
    const { motion } = this;
    scene.add.image(at, GAME.GROUND_Y + STRIPES_BELOW_FEET, motion.stripesTexture).setOrigin(0.5, 1).setDepth(2);
    this.light = scene.add.image(at - LIGHT_BEFORE_CROSSING, LIGHT_BASE_Y, motion.greenLight).setOrigin(0.5, 1).setDepth(3);
    const car = motion.cars[Math.floor(at / 7) % motion.cars.length];
    this.car = scene.add.image(at, GAME.GROUND_Y, car).setOrigin(0.5, 1).setVisible(false);
    this.place(0);
  }

  // Seconds from the middle of the nearest car's crossing. `position` is what a cat running at top
  // speed finds on arriving: a car in the lane on red, and the gap between two cars on green.
  secondsFromCar(clockX) {
    const { cycleSeconds } = this.motion;
    const delay = this.position === 'red' ? 0 : cycleSeconds / 2;
    return wrapToCycle(clockX / this.catSpeed - this.at / this.catSpeed - delay, cycleSeconds);
  }

  moveIn(seconds, clockX) {
    const delta = this.secondsFromCar(clockX + seconds * this.catSpeed);
    return Math.abs(delta) <= this.motion.hitSeconds ? 'jump' : 'none';
  }

  place(clockX, onAlert, cat) {
    const { crossSeconds, hitSeconds, redLight, greenLight, sound, cycleSeconds } = this.motion;
    const delta = this.secondsFromCar(clockX);
    const u = crossingProgress(delta, 0, crossSeconds);
    const carNear = u >= -1 - LIGHT_WARNING_SECONDS * (2 / crossSeconds) && u <= 1;

    this.light.setTexture(carNear ? redLight : greenLight);
    this.body.enable = Math.abs(delta) <= hitSeconds;
    // Only honks where it can be seen, or a street of cars would never be quiet.
    const cycle = Math.round(clockX / this.catSpeed / cycleSeconds);
    if (u >= -1 && u <= 1 && this.honkedCycle !== cycle && onAlert && cat && Math.abs(this.at - cat.x) < VIEW.AHEAD) {
      this.honkedCycle = cycle;
      onAlert(sound);
    }
    this.car.setVisible(u >= -1 && u <= 1);
    const end = u < 0 ? CAR_FAR : CAR_NEAR;
    const distance = Math.min(1, Math.abs(u));
    this.car.y = GAME.GROUND_Y + GAME.GROUND_OVERLAP - end.rise * distance;
    this.car.setScale(1 + (end.scale - 1) * distance);
    this.car.setDepth(u < 0.1 ? BEHIND_CAT_DEPTH : IN_FRONT_OF_CAT_DEPTH);
  }

  tick(_ms, clock, onAlert, cat) {
    if (this.phase === 'done') return;
    this.place(clock.x, onAlert, cat);
    this.retireIfBehindCamera();
  }

  reactToHit() {
    this.car.setTint(HIT_TINT);
    this.scene.time.delayedCall(HIT_TINT_MS, () => this.car.clearTint());
  }

  retire() {
    super.retire();
    this.car.setVisible(false);
    this.light.setVisible(false);
  }
}

// Builds the right kind of moving obstacle for a level's entry.
export function createMovingObstacle(scene, entry, type, catSpeed) {
  switch (type.motion.kind) {
    case 'fall':
      return new FallingObstacle(scene, entry.at, type, catSpeed);
    case 'swing':
      return new SwingingObstacle(scene, entry.at, type, catSpeed, entry.position);
    case 'pulse':
      return new PulsingObstacle(scene, entry.at, type, catSpeed, entry.position);
    case 'crossing':
      return new CrossingCar(scene, entry.at, type, catSpeed, entry.position);
    default:
      return new ChargingObstacle(scene, entry.at, type, catSpeed);
  }
}
