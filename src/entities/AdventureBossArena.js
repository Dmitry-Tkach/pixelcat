import { TILE } from '../systems/adventureMap.js';

// What a boss's arena does around the fight, apart from him (docs/adventure-boss-troll.md):
// - in the parts that say so (`goblins` in data/adventure/bossFights.js), small enemies drop in now
//   and then, a few at a time, so the cat can knock them out and earn the magic bolt;
// - when the boss shakes the tree (a big smash, a landing, the charge into a wall), from his second
//   part on, an ammunition crate falls if the cat is running low and none is lying about.
//   goblin: which enemy (data/adventure/enemies.js), and how far from the cat, across, it may drop.
//   crate: which pickup, when the cat has fewer rounds than this, and from which part (counted from 0).
const GOBLIN = { kind: 'goon', awayFromCat: 4 * TILE, dropFromY: TILE * 1.5 };
const CRATE = { kind: 'ammo-standard', lowRounds: 30, fromPhase: 1 };

export class AdventureBossArena {
  // boss: the AdventureBoss. cat: the battle cat. left, right: the arena's open floor.
  // spawnEnemy(kind, x, y): adds an enemy, falling in from there, and returns it.
  // dropPickup(kind, x): drops a pickup from above to land at x, and returns it.
  // roundsLeft(): the cat's rounds, of every kind.
  constructor({ boss, cat, left, right, spawnEnemy, dropPickup, roundsLeft }) {
    this.boss = boss;
    this.cat = cat;
    this.left = left;
    this.right = right;
    this.spawnEnemy = spawnEnemy;
    this.dropPickup = dropPickup;
    this.roundsLeft = roundsLeft;
    this.goblins = [];
    this.goblinMs = 0;
    this.crate = null;
  }

  get phase() {
    return this.boss.fight.phases[this.boss.brain.phase];
  }

  get fighting() {
    const { brain } = this.boss;
    return !brain.isDefeated && !this.boss.halted && brain.state !== 'waiting' && brain.state !== 'intro';
  }

  update(ms) {
    const { goblins } = this.phase;
    if (!goblins || !this.fighting) return;
    this.goblinMs += ms;
    if (this.goblinMs < goblins.everySeconds * 1000) return;
    this.goblinMs = 0;
    this.goblins = this.goblins.filter((goblin) => goblin.active && !goblin.dead);
    if (this.goblins.length >= goblins.max) return;
    this.goblins.push(this.spawnEnemy(GOBLIN.kind, this.dropX(), GOBLIN.dropFromY));
  }

  // Somewhere on the floor, not too close to the cat.
  dropX() {
    const catX = this.cat.body.center.x;
    for (let tries = 0; tries < 20; tries++) {
      const x = this.left + TILE + Math.random() * (this.right - this.left - 2 * TILE);
      if (Math.abs(x - catX) >= GOBLIN.awayFromCat) return x;
    }
    return catX < (this.left + this.right) / 2 ? this.right - TILE : this.left + TILE;
  }

  // The boss shook the tree.
  shake() {
    if (!this.fighting || this.boss.brain.phase < CRATE.fromPhase) return;
    if (this.crate?.active || this.roundsLeft() >= CRATE.lowRounds) return;
    this.crate = this.dropPickup(CRATE.kind, this.dropX());
  }
}
