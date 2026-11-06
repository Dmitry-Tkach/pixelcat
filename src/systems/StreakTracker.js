// Counts obstacles avoided in a row. Reaching the target earns a sprint and starts the count again.
export class StreakTracker {
  constructor(target) {
    this.target = target;
    this.count = 0;
  }

  // Returns true when this avoided obstacle completes the streak.
  recordAvoided() {
    this.count += 1;
    if (this.count < this.target) return false;
    this.count = 0;
    return true;
  }

  recordHit() {
    this.count = 0;
  }
}
