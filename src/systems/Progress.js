const STORAGE_KEY = 'cat-escape-progress';

// Which levels are finished, and the best result on each. Saved in the browser.
export class Progress {
  // `storage` can be replaced in tests, and `unlockAll` opens every level. `key` is where in the
  // browser it's kept: the runner and the adventure keep their progress apart.
  constructor({ levelIds, storage = globalThis.localStorage, unlockAll = false, key = STORAGE_KEY }) {
    this.levelIds = levelIds;
    this.key = key;
    this.storage = storage;
    this.unlockAll = unlockAll;
    this.results = this.load();
  }

  load() {
    try {
      const saved = JSON.parse(this.storage.getItem(this.key));
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {}; // storage can be blocked, as in private browsing, or hold damaged data
    }
  }

  save() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.results));
    } catch {
      // Progress still counts for this session.
    }
  }

  // A toy mouse stays found, even if a later run misses it.
  record(levelId, stars, coins, foundMouse = false) {
    const best = this.results[levelId] ?? { stars: 0, coins: 0 };
    this.results[levelId] = { stars: Math.max(best.stars, stars), coins: Math.max(best.coins, coins) };
    if (foundMouse || best.mouse) this.results[levelId].mouse = true;
    this.save();
  }

  resultFor(levelId) {
    return this.results[levelId] ?? null;
  }

  isUnlocked(index) {
    if (this.unlockAll || index === 0) return true;
    return Boolean(this.results[this.levelIds[index - 1]]);
  }

  // The first unfinished level, which is where "Continue" goes.
  get nextIndex() {
    const index = this.levelIds.findIndex((id) => !this.results[id]);
    return index === -1 ? 0 : index;
  }

  get hasStarted() {
    return Object.keys(this.results).length > 0;
  }

  get totalMice() {
    return Object.values(this.results).filter(({ mouse }) => mouse).length;
  }

  get totalStars() {
    return Object.values(this.results).reduce((sum, { stars }) => sum + stars, 0);
  }
}
