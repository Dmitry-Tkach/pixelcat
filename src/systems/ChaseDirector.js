import { LUNGE, PAW } from '../config/gameConfig.js';
import { CHASERS } from '../data/chasers.js';
import { DistanceTracker } from './DistanceTracker.js';

const CONTACT_DISTANCE = 80; // how far behind the cat the chaser stands when her lunge lands
const WIND_UP_PULLBACK = 0.05; // she leans back a little before dashing
export const PACK_SPACING = 85; // how far apart the family runs when they're all on screen

// Decides what the chaser is doing: following, lunging, recovering or knocked out.
// It has no Phaser dependency, so it can be unit-tested. update() returns what just happened:
//   warn, dash, grabbed, dodged, recovered, returned, shortcutWarn, shortcutArrive,
//   climbWarn, climbCancel, climbCatch
export class ChaseDirector {
  // `startX` and `rosterIndex` are for restarting from a checkpoint.
  constructor(level, { startX = 0, rosterIndex = 0 } = {}) {
    this.baseSpeed = level.chase.ownerSpeed;
    this.roster = level.chasers ?? ['girl'];
    this.rosterIndex = rosterIndex;
    this.tracker = new DistanceTracker(level.chase);
    this.applyChaser();
    this.attacks = (level.attacks ?? []).filter((attack) => attack.at > startX).map((attack) => ({ ...attack }));
    this.phase = 'chasing';
    this.phaseMs = 0;
    this.koMs = 0;
    this.warningMs = 0;
    this.returningMs = 0;
    this.returnFrom = PAW.RETURN_FROM_BEHIND;
    this.pack = Boolean(level.pack);
    // Lunges that depend on how close the chaser is, in place of the ones the level plans.
    this.lungeRule = level.lunges ?? null;
    if (this.lungeRule) this.attacks = [];
    this.lungeMs = 0;
    this.shortcutRule = level.shortcut ?? null;
    this.offscreenMs = 0;
    this.shortcutWarnMs = 0;
    this.shortcutCooldownMs = 0;
    this.graceMs = 0;
    this.highGround = level.highGround ?? null;
    this.climbMs = 0;
    this.climbedUp = false;
    this.isBeneathCat = false;
  }

  // A chaser on the road can't reach a cat high above it, so they wait right beneath. If the cat
  // hangs around up there for too long, they climb up after it. Running on calls that off, even
  // before the cat is back up to the chaser's speed.
  updateHighGround(ms, catHeight, catRunning, events) {
    const rule = this.highGround;
    if (!rule) return;
    const { tracker } = this;
    const closest = tracker.catchGap + rule.holdMargin;
    const high = catHeight >= rule.safeHeight;
    if (high) tracker.gap = Math.max(tracker.gap, closest);
    this.isBeneathCat = high && tracker.gap <= closest + rule.beneathRange && this.phase === 'chasing';
    if (!this.isBeneathCat || catRunning) {
      if (this.climbMs > 0) events.push('climbCancel');
      this.climbMs = 0;
      return;
    }
    if (this.climbMs === 0) events.push('climbWarn');
    this.climbMs += ms;
    if (this.climbMs >= rule.climbSeconds * 1000) {
      this.climbedUp = true;
      tracker.gap = tracker.catchGap;
      events.push('climbCatch');
    }
  }

  // How often she lunges at this distance, in seconds, or null when she's too far away.
  lungeInterval() {
    const { farGap, nearGap, farEverySeconds, nearEverySeconds } = this.lungeRule;
    if (this.tracker.gap >= farGap) return null;
    return this.tracker.gap < nearGap ? nearEverySeconds : farEverySeconds;
  }

  // A cat already high enough to be out of reach isn't worth lunging at.
  updateDistanceLunge(ms, catX, catHeight) {
    const interval = this.lungeInterval();
    if (interval === null) {
      this.lungeMs = 0;
      return;
    }
    this.lungeMs += ms;
    if (this.lungeMs < interval * 1000 || this.graceMs > 0 || catHeight >= LUNGE.DODGE_HEIGHT) return;
    this.lungeMs = 0;
    this.attacks.unshift({ at: catX, warningSeconds: this.lungeRule.warningSeconds });
  }

  // A chaser who's been left far behind takes a shortcut, with a warning, and lands in view.
  updateShortcut(ms, ownerOffscreen, safeForShortcut, events) {
    const rule = this.shortcutRule;
    if (!rule) return;
    this.shortcutCooldownMs = Math.max(0, this.shortcutCooldownMs - ms);
    this.graceMs = Math.max(0, this.graceMs - ms);
    if (this.shortcutWarnMs > 0) {
      this.shortcutWarnMs -= ms;
      if (this.shortcutWarnMs > 0) return;
      this.tracker.gap = Math.min(this.tracker.gap, rule.landGap);
      this.graceMs = rule.graceSeconds * 1000;
      this.shortcutCooldownMs = rule.cooldownSeconds * 1000;
      this.offscreenMs = 0;
      events.push('shortcutArrive');
      return;
    }
    this.offscreenMs = ownerOffscreen ? this.offscreenMs + ms : 0;
    if (this.offscreenMs >= rule.offscreenSeconds * 1000 && this.shortcutCooldownMs === 0 && safeForShortcut && this.phase === 'chasing') {
      this.shortcutWarnMs = rule.warningSeconds * 1000;
      events.push('shortcutWarn');
    }
  }

  // Who's waiting behind the front chaser, when the whole family is on screen at once.
  get followers() {
    return this.pack ? this.roster.slice(this.rosterIndex + 1) : [];
  }

  get chaserId() {
    return this.roster[this.rosterIndex];
  }

  get chaser() {
    return CHASERS[this.chaserId];
  }

  applyChaser() {
    this.tracker.ownerSpeed = this.baseSpeed + this.chaser.speedDelta;
  }

  get isKnockedOut() {
    return this.phase === 'knockedOut';
  }

  get isAttacking() {
    return ['warning', 'dashing', 'striking'].includes(this.phase);
  }

  // Seconds until her lunge lands, or null when no lunge is coming.
  get secondsToStrike() {
    if (this.phase === 'warning') return (this.warningMs - this.phaseMs + LUNGE.DASH_MS) / 1000;
    if (this.phase === 'dashing') return (LUNGE.DASH_MS - this.phaseMs) / 1000;
    return null;
  }

  // How far along her reach toward the cat she is: 0 is following, 1 is at the cat.
  get reach() {
    switch (this.phase) {
      case 'warning':
        return -WIND_UP_PULLBACK * (this.phaseMs / this.warningMs);
      case 'dashing': {
        const t = this.phaseMs / LUNGE.DASH_MS;
        return -WIND_UP_PULLBACK + (1 + WIND_UP_PULLBACK) * t * t;
      }
      case 'striking':
        return 1;
      case 'recovering':
        return 1 - this.phaseMs / LUNGE.RECOVER_MS;
      default:
        return 0;
    }
  }

  // How far behind the cat she appears, including lunges and running back in after a knockout.
  get visibleDistance() {
    const { gap } = this.tracker;
    const returning = this.returningMs > 0 ? (this.returningMs / PAW.RETURN_MS) * this.returnFrom : 0;
    return gap + (CONTACT_DISTANCE - gap) * this.reach + returning;
  }

  enter(phase) {
    this.phase = phase;
    this.phaseMs = 0;
  }

  update(ms, { catX, catSpeed, catHeight, catRunning = false, ownerOffscreen = false, safeForShortcut = false }) {
    const events = [];
    this.phaseMs += ms;

    if (this.isKnockedOut) {
      this.koMs -= ms;
      this.tracker.gap = this.tracker.maxGap;
      this.skipPassedAttacks(catX);
      if (this.koMs <= 0) {
        this.returningMs = PAW.RETURN_MS;
        // In a pack, the next chaser is already in view, so they run forward from where they are.
        this.returnFrom = this.followers.length > 0 ? PACK_SPACING : PAW.RETURN_FROM_BEHIND;
        this.rosterIndex = Math.min(this.rosterIndex + 1, this.roster.length - 1);
        this.applyChaser();
        this.enter('chasing');
        events.push('returned');
      }
      return events;
    }

    this.returningMs = Math.max(0, this.returningMs - ms);
    this.tracker.update(ms / 1000, catSpeed);
    this.updateShortcut(ms, ownerOffscreen, safeForShortcut, events);
    this.updateHighGround(ms, catHeight, catRunning, events);
    if (this.lungeRule && this.phase === 'chasing') this.updateDistanceLunge(ms, catX, catHeight);

    switch (this.phase) {
      case 'chasing':
        if (this.returningMs === 0) this.maybeStartAttack(catX, events);
        break;
      case 'warning':
        if (this.phaseMs >= this.warningMs) {
          this.enter('dashing');
          events.push('dash');
        }
        break;
      case 'dashing':
        if (this.phaseMs >= LUNGE.DASH_MS) this.enter('striking');
        break;
      case 'striking':
        // The cat must stay clear for the whole strike, so a jump can't be too early.
        if (catHeight < LUNGE.DODGE_HEIGHT) {
          this.tracker.adjust(-LUNGE.GRAB_DISTANCE_LOSS);
          this.enter('recovering');
          events.push('grabbed');
        } else if (this.phaseMs >= LUNGE.STRIKE_MS) {
          this.tracker.adjust(this.lungeRule?.dodgeBonus ?? LUNGE.MISS_DISTANCE_BONUS);
          this.enter('recovering');
          events.push('dodged');
        }
        break;
      case 'recovering':
        if (this.phaseMs >= LUNGE.RECOVER_MS) {
          this.enter('chasing');
          events.push('recovered');
        }
        break;
      default:
        break;
    }
    return events;
  }

  maybeStartAttack(catX, events) {
    const next = this.attacks[0];
    if (!next || catX < next.at) return;
    this.attacks.shift();
    this.warningMs = (next.warningSeconds ?? LUNGE.WARNING_SECONDS) * 1000;
    this.warningStart = catX;
    this.enter('warning');
    events.push('warn');
  }

  // Lunges planned for while she's away are skipped, not saved up.
  skipPassedAttacks(catX) {
    while (this.attacks[0] && this.attacks[0].at <= catX) this.attacks.shift();
  }

  // Returns true for a counter: hitting her during a lunge knocks her out for longer.
  knockOut() {
    const counter = this.phase === 'dashing' || this.phase === 'striking' || this.phase === 'warning';
    this.koMs = counter ? PAW.COUNTER_KO_MS : PAW.KO_MS;
    this.returningMs = 0;
    this.climbMs = 0;
    this.isBeneathCat = false;
    this.tracker.gap = this.tracker.maxGap;
    this.enter('knockedOut');
    return counter;
  }
}
