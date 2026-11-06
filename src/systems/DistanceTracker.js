// Tracks the gap between the cat and the owner. It has no Phaser dependency, so it can be unit-tested.
// The gap grows when the cat outruns the owner and shrinks when the cat is slowed.
export class DistanceTracker {
  constructor({ ownerSpeed, startGap, maxGap, catchGap }) {
    this.ownerSpeed = ownerSpeed;
    this.maxGap = maxGap;
    this.catchGap = catchGap;
    this.gap = startGap;
  }

  update(seconds, catSpeed) {
    this.gap += (catSpeed - this.ownerSpeed) * seconds;
    this.gap = Math.min(this.gap, this.maxGap);
    return this.gap;
  }

  // A direct change, such as being grabbed by a lunge or dodging one.
  adjust(amount) {
    this.gap = Math.min(this.gap + amount, this.maxGap);
  }

  get isCaught() {
    return this.gap <= this.catchGap;
  }

  // 0 means caught, 1 means the largest possible lead.
  get safety() {
    const ratio = (this.gap - this.catchGap) / (this.maxGap - this.catchGap);
    return Math.max(0, Math.min(1, ratio));
  }
}
