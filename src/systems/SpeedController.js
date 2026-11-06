// The cat's current speed, including any collision penalty or sprint boost.
export class SpeedController {
  constructor(baseSpeed) {
    this.baseSpeed = baseSpeed;
    this.multiplier = 1;
    this.remainingMs = 0;
    this.boostMultiplier = 1;
    this.boostMs = 0;
    this.terrainMultiplier = 1;
  }

  // What the cat is standing on, such as mud or a wagon. It lasts until the terrain changes.
  setTerrain(multiplier) {
    this.terrainMultiplier = multiplier;
  }

  // A hit also ends any sprint.
  applyPenalty({ speedMultiplier, durationMs }) {
    this.multiplier = speedMultiplier;
    this.remainingMs = durationMs;
    this.boostMs = 0;
    this.boostMultiplier = 1;
  }

  applyBoost({ multiplier, durationMs }) {
    this.boostMultiplier = multiplier;
    this.boostMs = durationMs;
  }

  update(ms) {
    if (this.remainingMs > 0) {
      this.remainingMs -= ms;
      if (this.remainingMs <= 0) {
        this.remainingMs = 0;
        this.multiplier = 1;
      }
    }
    if (this.boostMs > 0) {
      this.boostMs -= ms;
      if (this.boostMs <= 0) {
        this.boostMs = 0;
        this.boostMultiplier = 1;
      }
    }
  }

  get isSlowed() {
    return this.remainingMs > 0;
  }

  get isSprinting() {
    return this.boostMs > 0;
  }

  get speed() {
    return this.baseSpeed * this.multiplier * this.boostMultiplier * this.terrainMultiplier;
  }
}
