import { MOVEMENT } from '../config/gameConfig.js';
import { BOSSES, bossAnimKey, bossKey, bossLayout } from '../data/adventure/bosses.js';
import { BOSS_FIGHTS } from '../data/adventure/bossFights.js';
import { MAX_FALL_SPEED, TILE } from '../systems/adventureMap.js';
import { BossBrain } from '../systems/adventure/bosses/bossBrain.js';
import { BOSS_ATTACKS } from './adventureBossAttacks/index.js';
import { ShockWaves } from './adventureBossAttacks/ShockWaves.js';

// stopAt: walking to the cat, he stops this close, across, from his middle to the cat's.
// turnDeadzone: he doesn't turn round for a cat almost straight above or below him.
const WALK = { stopAt: 150, turnDeadzone: 24 };
const DEPTH = 4.5; // in front of the scenery and ladders, behind the cat
const HIT_FLASH_MS = 70;
// The burst where he's hit: bigger for full damage, in his weak moments, than for half, and small
// where nothing gets through.
const HIT_BURST = { weak: 0.8, half: 0.5, none: 0.3 };
// Each part's colour on him: none in part 1, then redder as he gets angrier.
const PART_TINTS = [null, 0xffa898, 0xff7a6a];
// The roar at a new part: jump frames 3-5, ending with his arms out wide, held, the camera shaking.
const ROAR = { frames: [3, 4, 5], seconds: 0.35, shake: { ms: 700, strength: 0.01 } };
// Beaten: how long after he falls the level ends.
const DEFEAT = { endMs: 1600, shake: { ms: 400, strength: 0.012 } };

// An adventure boss on screen: his sprite, his animations, his hitboxes and the way he faces. His
// brain (systems/adventure/bosses/bossBrain.js) decides what he does; this shows it and carries it
// out, with the code for each attack in entities/adventureBossAttacks. The scene hits him with
// takeHit, and hears from him through onHurtCat and onDefeated.
export class AdventureBoss {
  // x, feetY: where he stands. cat: the battle cat, to watch and hurt. arena: its walls' inner
  // faces, `left` and `right`, where his shock waves stop. onHurtCat(fromX): he hurt the cat.
  // onDefeated(): he's beaten and has fallen. assisted: the easier try.
  constructor(scene, { kind, x, feetY, cat, arena, onHurtCat, onDefeated, assisted = false }) {
    this.scene = scene;
    this.kind = kind;
    this.cat = cat;
    this.info = BOSSES[kind];
    this.fight = BOSS_FIGHTS[kind];
    this.layout = bossLayout(kind);
    this.onHurtCat = onHurtCat;
    this.onDefeated = onDefeated;
    this.brain = new BossBrain(this.fight, { assisted, only: Object.keys(BOSS_ATTACKS) });
    this.floorY = feetY;
    this.posing = null; // frames he's holding or stepping through, outside his animations
    this.flashMs = 0;
    this.hurtThisAttack = false; // each attack can hurt the cat once
    this.halted = false;

    this.sprite = scene.physics.add.sprite(x, feetY, bossKey(kind), 'idle-0').setDepth(DEPTH);
    const { body } = this.layout;
    this.sprite.body.setSize(body.w, body.h);
    this.sprite.body.setGravityY(MOVEMENT.GRAVITY).setMaxVelocityY(MAX_FALL_SPEED);
    scene.physics.add.collider(this.sprite, scene.groundLayer);
    this.waves = new ShockWaves(scene, { left: arena.left, right: arena.right, onHit: (fromX) => this.hurtCat(fromX) });
    this.setFacing(Math.sign(cat.x - x) || -1);
  }

  get x() {
    return this.sprite.x;
  }

  get feetY() {
    return this.sprite.body.bottom;
  }

  get name() {
    return this.fight.name;
  }

  get canBeHit() {
    return !this.brain.isInvulnerable;
  }

  // Where his club hits the floor, in front of him.
  get clubLandsAt() {
    return this.sprite.x + this.facing * this.layout.club.lands;
  }

  start() {
    this.brain.start();
    this.playAnim('idle');
  }

  // 1 is right. The art faces `facing` in data/adventure/bosses.js. His feet stay where they are
  // when he turns: the picture flips round them, and his body with it.
  setFacing(dir) {
    this.facing = dir;
    const flip = dir !== this.info.facing;
    const { frameW, frameH, feetX, feetY, body } = this.layout;
    this.sprite.setFlipX(flip);
    this.sprite.setOrigin((flip ? frameW - feetX : feetX) / frameW, feetY / frameH);
    this.sprite.body.setOffset(flip ? frameW - body.x - body.w : body.x, body.y);
  }

  faceCat() {
    const dx = this.cat.body.center.x - this.sprite.x;
    if (Math.abs(dx) > WALK.turnDeadzone) this.setFacing(Math.sign(dx));
  }

  // Steps evenly through `frames` of an animation over `seconds`, then holds the last one.
  pose(anim, frames, seconds) {
    this.sprite.anims.stop();
    this.posing = { anim, frames, seconds, elapsed: 0 };
    this.sprite.setFrame(`${anim}-${frames[0]}`);
  }

  playAnim(anim) {
    this.posing = null;
    this.sprite.play(bossAnimKey(this.kind, anim), true);
  }

  updatePose(ms) {
    const { posing } = this;
    if (!posing) return;
    posing.elapsed += ms / 1000;
    const { frames, seconds, elapsed, anim } = posing;
    const i = seconds > 0 ? Math.min(frames.length - 1, Math.floor((elapsed / seconds) * frames.length)) : frames.length - 1;
    this.sprite.setFrame(`${anim}-${frames[i]}`);
  }

  // The cat hits him with `kind` (an ammo kind, bolt, stomp, dash or rage), at x, y. Returns the
  // damage done: none while he can't be hurt.
  takeHit(kind, x, y) {
    const weak = this.brain.isWeak;
    const dealt = this.brain.takeHit(kind);
    this.scene.effects.impact(x, y, dealt === 0 ? HIT_BURST.none : weak ? HIT_BURST.weak : HIT_BURST.half);
    return dealt;
  }

  hurtCat(fromX) {
    if (this.halted || this.brain.isDefeated) return;
    this.onHurtCat(fromX);
  }

  // The level ended another way (the cat lost): he stops where he is.
  halt() {
    this.halted = true;
    this.waves.clear();
    this.sprite.setVelocityX(0);
    if (!this.brain.isDefeated) this.playAnim('idle');
  }

  update(ms) {
    if (this.halted) return;
    const { body: catBody } = this.cat;
    const distance = Math.abs(catBody.center.x - this.sprite.x);
    // Up on an island: standing, and well above the arena's floor. Jumping doesn't count.
    const catHigh = this.cat.onGround && catBody.bottom < this.floorY - TILE / 2;
    for (const event of this.brain.update(ms / 1000, { distance, catHigh })) this.show(event);
    if (this.halted) return;

    const { brain } = this;
    if (brain.state === 'idle') {
      if (distance > WALK.stopAt) {
        this.faceCat();
        this.sprite.setVelocityX(this.facing * brain.walkSpeed);
        this.playAnim('walk');
      } else {
        this.faceCat();
        this.sprite.setVelocityX(0);
        this.playAnim('idle');
      }
    } else if (brain.state === 'attack' && BOSS_ATTACKS[brain.attack]?.update) {
      BOSS_ATTACKS[brain.attack].update(this, ms, brain.attackData);
    } else {
      this.sprite.setVelocityX(0);
    }

    // His club hurts only while it lands, and touching him only during the attacks that say so.
    if (!this.hurtThisAttack && ((brain.clubHurts && this.clubTouches(catBody)) || (brain.touchHurts && this.bodyTouches(catBody)))) {
      this.hurtThisAttack = true;
      this.hurtCat(this.sprite.x);
    }
    this.waves.update(ms, catBody);
    this.updatePose(ms);
    if (this.flashMs > 0) {
      this.flashMs -= ms;
      if (this.flashMs <= 0) this.showPartColour();
    }
  }

  // His attack's end, for the attacks his body moves; `result` says what happened.
  finishAttack(result) {
    this.brain.finishAttack(result);
  }

  clubTouches(catBody) {
    const { club } = this.layout;
    const a = this.sprite.x + this.facing * club.from;
    const b = this.sprite.x + this.facing * club.to;
    const top = this.feetY - club.up;
    return catBody.right > Math.min(a, b) && catBody.left < Math.max(a, b) && catBody.bottom > top && catBody.top < this.feetY;
  }

  bodyTouches(catBody) {
    const body = this.sprite.body;
    return catBody.right > body.left && catBody.left < body.right && catBody.bottom > body.top && catBody.top < body.bottom;
  }

  showPartColour() {
    const tint = PART_TINTS[this.brain.phase];
    if (tint) this.sprite.setTint(tint);
    else this.sprite.clearTint();
  }

  // Shows what his brain just decided.
  show(event) {
    const attackCode = BOSS_ATTACKS[event.attack];
    const data = this.fight.attacks[event.attack];
    switch (event.type) {
      case 'intro':
      case 'idle':
        this.playAnim('idle');
        break;
      case 'windup':
        this.hurtThisAttack = false;
        attackCode.windup(this, data);
        break;
      case 'attack':
        attackCode.attack(this, data);
        break;
      case 'recover':
        attackCode.recover(this, data, event.kind);
        break;
      case 'roar':
        this.showPartColour();
        this.pose('jump', ROAR.frames, ROAR.seconds);
        this.scene.cameras.main.shake(ROAR.shake.ms, ROAR.shake.strength);
        this.scene.audio.playSfx('boom');
        break;
      case 'hurt':
        this.playAnim('hurt');
        break;
      case 'hit':
        this.sprite.setTintFill(0xffffff);
        this.flashMs = HIT_FLASH_MS;
        break;
      case 'defeated':
        this.halted = true;
        this.waves.clear();
        this.sprite.setVelocityX(0);
        this.sprite.clearTint();
        this.flashMs = 0;
        this.playAnim('dead');
        this.scene.cameras.main.shake(DEFEAT.shake.ms, DEFEAT.shake.strength);
        this.scene.audio.playSfx('collapse');
        this.scene.time.delayedCall(DEFEAT.endMs, () => this.onDefeated());
        break;
      default:
        break;
    }
  }
}
