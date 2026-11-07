// Decides what a boss is doing. It has no Phaser dependency, so it can be unit-tested.
// update() returns what just happened: attackWindup, attackActive, recover, ready, hurt, defeated.
//
// waiting -> intro -> idle -> windup -> active -> recover -> idle ...
// A hit sends it to hurt, then back to idle with its next pattern. At no health, it's defeated.
export class BossDirector {
  constructor(definition) {
    this.definition = definition;
    this.health = definition.health;
    this.state = 'waiting';
    this.stateMs = 0;
    this.patternStep = 0;
    this.attack = null;
    this.attacksSeen = [];
  }

  get attackData() {
    return this.definition.attacks[this.attack];
  }

  // A stomp only counts while it's recovering from an attack, and only after attacks that tire it out.
  get isVulnerable() {
    return this.state === 'recover' && this.attackData.stompable !== false;
  }

  // Touching it only hurts during an attack, and not during attacks that hurt in other ways.
  get isDangerous() {
    return this.state === 'active' && this.attackData.touchHurts !== false;
  }

  get isDefeated() {
    return this.state === 'defeated';
  }

  enter(state) {
    this.state = state;
    this.stateMs = 0;
  }

  start() {
    this.enter('intro');
  }

  // How long the current state lasts, or null when something else ends it.
  get stateSeconds() {
    switch (this.state) {
      case 'intro': return this.definition.introSeconds;
      case 'idle': return this.definition.idleSeconds[this.health];
      case 'windup': return this.attackData.windup;
      case 'active': return this.attackData.active ?? null;
      case 'recover': return this.attackData.recover;
      case 'hurt': return this.definition.hurtSeconds;
      default: return null;
    }
  }

  chooseAttack() {
    const pattern = this.definition.patterns[this.health];
    this.attack = pattern[this.patternStep % pattern.length];
    this.patternStep += 1;
    if (!this.attacksSeen.includes(this.attack)) this.attacksSeen.push(this.attack);
  }

  update(ms) {
    this.stateMs += ms;
    const seconds = this.stateSeconds;
    if (seconds === null || this.stateMs < seconds * 1000) return [];
    switch (this.state) {
      case 'windup':
        this.enter('active');
        return ['attackActive'];
      case 'active':
        this.enter('recover');
        return ['recover'];
      case 'intro':
      case 'recover':
      case 'hurt':
        this.enter('idle');
        return ['ready'];
      case 'idle':
        this.chooseAttack();
        this.enter('windup');
        return ['attackWindup'];
      default:
        return [];
    }
  }

  // For an attack with no set length, such as a charge reaching a wall.
  finishActive() {
    if (this.state !== 'active') return [];
    this.enter('recover');
    return ['recover'];
  }

  // Takes a hit. A stomp needs it to be open to one, and a Super Paw lands at any time.
  hit({ always = false } = {}) {
    if (this.state === 'hurt' || this.isDefeated || this.state === 'waiting') return [];
    if (!always && !this.isVulnerable) return [];
    this.health -= 1;
    this.patternStep = 0;
    if (this.health <= 0) {
      this.enter('defeated');
      return ['defeated'];
    }
    this.enter('hurt');
    return ['hurt'];
  }
}
