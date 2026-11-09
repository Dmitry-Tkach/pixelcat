import Phaser from 'phaser';
import { BOSS, GAME } from '../config/gameConfig.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { arcHeight } from '../systems/obstacleMotion.js';
import { outline } from '../ui/Outline.js';

// Where his hand lets go of a bomb, from the middle of his feet, in screen pixels.
const HAND_AHEAD = 40;
const HAND_HEIGHT = 110;
const BOMB_ARC = 230; // how much higher than a straight line a bomb flies, at the top of its arc
const BOMB_SPIN = 540; // degrees a second, in flight
const BLAST_MS = 260; // how long an explosion can hurt, and shows
const FUSE_FLASH_MS = 110;
const WAVE = { w: 120, h: 96, hitW: 56 };
const WAVE_DUST_EVERY_MS = 60;
// His body, smaller than his art, so one jump can land on his head.
const STANDING = { w: 96, h: 120 };
const POUNCING = { w: 150, h: 70 };
const HOPPING = { w: 110, h: 100 };

// The Bomber Rat: he lobs bombs and lunges, and stops to cheer after his big punch. It plays what the
// BossDirector decides, and moves itself, its bombs and its shockwave. A separate zone is its body.
export class BomberBoss extends Phaser.GameObjects.Sprite {
  constructor(scene, x, definition, director) {
    const { character } = definition;
    super(scene, x, GAME.GROUND_Y, frameKey(character, CHARACTERS[character].anims.idle.file, 1));
    scene.add.existing(this);
    outline(this);
    this.character = character;
    this.belowFeet = CHARACTERS[character].belowFeet;
    this.definition = definition;
    this.director = director;
    this.setScale(CHARACTERS[character].scale).setDepth(5).setFlipX(true);
    this.facing = -1;
    this.bombs = [];
    this.waves = [];
    this.targetX = x;
    this.fromX = x;
    this.moveDirection = 0;
    this.thrown = 0;
    this.limits = { left: x - BOSS.ARENA_WIDTH, right: x }; // replaced by the arena's on the first update
    makeWaveTexture(scene);
    this.shadow = scene.add.ellipse(x, GAME.GROUND_Y + 4, 120, 18, 0x1d1a44, 0.35).setDepth(3);
    this.hitZone = scene.add.zone(x, GAME.GROUND_Y, STANDING.w, STANDING.h);
    scene.physics.add.existing(this.hitZone);
    this.hitZone.body.setAllowGravity(false);
    this.hitZone.body.moves = false;
    this.pose('idle');
    this.placeHitZone(STANDING);
  }

  // The frames are different sizes, so this keeps his feet on the same line.
  pose(role) {
    this.play(animKey(this.character, role), true);
    this.placeFeet();
  }

  placeFeet() {
    this.setOrigin(0.5, 1 - this.belowFeet / this.height);
  }

  face(direction) {
    this.facing = direction < 0 ? -1 : 1;
    this.setFlipX(this.facing < 0); // his art faces right
  }

  faceCat(cat) {
    this.face(cat.x - this.x);
  }

  placeHitZone({ w, h }, lift = 0) {
    this.hitZone.body.setSize(w, h);
    this.hitZone.setPosition(this.x, this.y - h / 2 - lift);
  }

  handleEvent(event, cat) {
    const { attack } = this.director;
    if (event === 'ready') {
      this.y = GAME.GROUND_Y;
      this.faceCat(cat);
      this.pose('idle');
    } else if (event === 'attackWindup') {
      this.faceCat(cat);
      const windupPose = { bombToss: 'windUp', bombRain: 'windUp', pounce: 'pounceReady', hop: 'crouch', powerHit: 'powerUp' };
      this.pose(windupPose[attack]);
    } else if (event === 'attackActive') {
      this.startAttack(attack, cat);
    } else if (event === 'recover') {
      this.y = GAME.GROUND_Y;
      if (this.director.isVulnerable) {
        // Sure he's won, he stops to cheer.
        this.pose('cheer');
        this.scene.audio.playSfx('cheer');
      } else {
        const recoverPose = { pounce: 'pounceEnd', hop: 'land' };
        this.pose(recoverPose[attack] ?? 'idle');
      }
    } else if (event === 'hurt') {
      this.clearAttacks();
      this.y = GAME.GROUND_Y;
      this.pose('hit');
    } else if (event === 'defeated') {
      this.clearAttacks();
      this.y = GAME.GROUND_Y;
      this.pose('defeated');
    }
  }

  startAttack(attack, cat) {
    this.faceCat(cat);
    this.thrown = 0;
    if (attack === 'bombToss' || attack === 'bombRain') {
      this.pose('throw');
      this.aimX = cat.x;
    } else if (attack === 'pounce') {
      this.targetX = cat.x;
      this.moveDirection = this.facing;
      this.pose('pounce');
    } else if (attack === 'hop') {
      // To whichever side of the arena is further from where he is.
      const { left, right } = this.limits;
      this.fromX = this.x;
      this.targetX = this.x - left > right - this.x ? left : right;
      this.face(this.targetX - this.x);
      this.pose('hop');
    } else if (attack === 'powerHit') {
      this.pose('powerHit');
      this.sendWave();
    }
  }

  // A bomb, from his hand to `toX`, in an arc.
  throwBomb(toX, data) {
    const { left, right } = this.limits;
    const fromX = this.x + this.facing * HAND_AHEAD;
    const landX = Phaser.Math.Clamp(toX, left - BOSS.WALL_MARGIN / 2, right + BOSS.WALL_MARGIN / 2);
    const sprite = this.scene.add.image(fromX, GAME.GROUND_Y - HAND_HEIGHT, frameKey(this.character, 'bomb', 1)).setDepth(7);
    this.bombs.push({ sprite, fromX, landX, ms: 0, state: 'flying', data });
    this.scene.audio.playSfx('lungeDash');
  }

  // A shockwave racing along the ground from his fist.
  sendWave() {
    const sprite = this.scene.add.image(this.x + this.facing * 60, GAME.GROUND_Y, 'bomber-wave').setOrigin(0.5, 1).setDepth(7);
    sprite.setFlipX(this.facing < 0).setBlendMode(Phaser.BlendModes.ADD);
    this.waves.push({ sprite, direction: this.facing, speed: this.director.attackData.waveSpeed, height: this.director.attackData.waveHeight });
    this.scene.cameras.main.shake(220, 0.01);
  }

  clearAttacks() {
    for (const bomb of this.bombs) {
      bomb.sprite.destroy();
      bomb.blast?.destroy();
    }
    for (const wave of this.waves) wave.sprite.destroy();
    this.bombs = [];
    this.waves = [];
  }

  // Keeps moving through an attack, and moves his bombs and shockwaves. Returns 'done' when an attack
  // with no set length has finished.
  update(ms, limits, cat) {
    this.limits = limits;
    const seconds = ms / 1000;
    const { state, attack, attackData, stateMs } = this.director;
    let zone = STANDING;
    let lift = 0;
    let outcome = null;
    if (state === 'active') {
      if (attack === 'bombToss' || attack === 'bombRain') {
        const due = Math.min(attackData.bombs, Math.floor(stateMs / Math.max(1, attackData.every * 1000)) + 1);
        while (this.thrown < due) {
          // The first lands on the cat, and the rest either side of it.
          const offsets = [0, -1, 1];
          this.throwBomb(this.aimX + offsets[this.thrown % 3] * attackData.spread, attackData);
          this.thrown += 1;
        }
      } else if (attack === 'pounce') {
        const step = attackData.speed * seconds;
        const target = Phaser.Math.Clamp(this.targetX, limits.left, limits.right);
        zone = POUNCING;
        if (Math.abs(target - this.x) <= step || Math.sign(target - this.x) !== this.moveDirection) {
          this.x = target;
          outcome = 'done';
        } else {
          this.x += this.moveDirection * step;
        }
      } else if (attack === 'hop') {
        const progress = Math.min(1, stateMs / (attackData.active * 1000));
        this.x = Phaser.Math.Linear(this.fromX, this.targetX, progress);
        lift = arcHeight(progress, 1, attackData.height);
        zone = HOPPING;
      }
    }
    this.y = GAME.GROUND_Y - lift;
    this.placeHitZone(zone);
    this.placeFeet();
    this.shadow.x = this.x;
    this.shadow.setScale(1 - Math.min(0.5, lift / 400));
    this.moveBombs(ms);
    this.moveWaves(seconds, limits);
    return outcome;
  }

  // A bomb flies, lands and fizzes, then goes off.
  moveBombs(ms) {
    this.bombs = this.bombs.filter((bomb) => {
      bomb.ms += ms;
      const { data, sprite } = bomb;
      if (bomb.state === 'flying') {
        const t = Math.min(1, bomb.ms / (data.flight * 1000));
        sprite.x = Phaser.Math.Linear(bomb.fromX, bomb.landX, t);
        const straight = Phaser.Math.Linear(GAME.GROUND_Y - HAND_HEIGHT, GAME.GROUND_Y - sprite.height / 2, t);
        sprite.y = straight - arcHeight(t, 1, BOMB_ARC);
        sprite.angle += BOMB_SPIN * (ms / 1000) * Math.sign(bomb.landX - bomb.fromX || 1);
        if (t >= 1) {
          bomb.state = 'fuse';
          bomb.ms = 0;
          sprite.angle = 0;
          this.scene.audio.playSfx('fuse');
        }
      } else if (bomb.state === 'fuse') {
        sprite.setTint(Math.floor(bomb.ms / FUSE_FLASH_MS) % 2 ? 0xff6a5a : 0xffffff);
        if (bomb.ms >= data.fuse * 1000) {
          bomb.state = 'blast';
          bomb.ms = 0;
          sprite.setVisible(false);
          // As wide as the ground it hurts, so the player can see how far to keep away.
          bomb.blast = this.scene.add.image(sprite.x, GAME.GROUND_Y + 6, frameKey(this.character, 'blast', 1))
            .setOrigin(0.5, 1).setDepth(8);
          bomb.blast.setScale((data.blastRadius * 2) / bomb.blast.width);
          this.scene.audio.playSfx('boom');
          this.scene.cameras.main.shake(160, 0.008);
          this.scene.effects.dust(sprite.x, GAME.GROUND_Y, 10);
        }
      } else if (bomb.ms >= BLAST_MS) {
        sprite.destroy();
        bomb.blast.destroy();
        return false;
      } else {
        bomb.blast.setAlpha(1 - bomb.ms / BLAST_MS);
      }
      return true;
    });
  }

  moveWaves(seconds, limits) {
    const leftWall = limits.left - BOSS.WALL_MARGIN;
    const rightWall = limits.right + BOSS.WALL_MARGIN;
    this.waves = this.waves.filter((wave) => {
      wave.sprite.x += wave.direction * wave.speed * seconds;
      wave.dustMs = (wave.dustMs ?? 0) - seconds * 1000;
      if (wave.dustMs <= 0) {
        wave.dustMs = WAVE_DUST_EVERY_MS;
        this.scene.effects.dust(wave.sprite.x - wave.direction * WAVE.w * 0.4, GAME.GROUND_Y, 2);
      }
      if (wave.sprite.x > leftWall && wave.sprite.x < rightWall) return true;
      wave.sprite.destroy();
      return false;
    });
  }

  // Whether an explosion or a shockwave touches the cat. A shockwave that hits is used up.
  reaches(cat) {
    const { body } = cat;
    const height = GAME.GROUND_Y - body.bottom;
    for (const bomb of this.bombs) {
      if (bomb.state !== 'blast') continue;
      if (Math.abs(body.center.x - bomb.sprite.x) <= bomb.data.blastRadius && height <= bomb.data.blastHeight) return true;
    }
    for (const wave of this.waves) {
      if (Math.abs(body.center.x - wave.sprite.x) < (WAVE.hitW + body.width) / 2 && height < wave.height) {
        wave.sprite.destroy();
        this.waves = this.waves.filter((other) => other !== wave);
        return true;
      }
    }
    return false;
  }

  // He cheers, having won.
  gloat() {
    this.clearAttacks();
    this.y = GAME.GROUND_Y;
    this.pose('cheer');
  }
}

// A crest of energy rolling along the ground, its bright edge at the front, made once.
function makeWaveTexture(scene) {
  if (scene.textures.exists('bomber-wave')) return;
  const g = scene.make.graphics({ add: false });
  const layers = [[0xff8a1e, 0.35, 1], [0xffb020, 0.55, 0.8], [0xffe066, 0.85, 0.58], [0xffffff, 1, 0.3]];
  for (const [color, alpha, size] of layers) {
    // Each layer is a curved crest, leaning forward, and smaller toward the front edge.
    const w = WAVE.w * size;
    const h = WAVE.h * (0.45 + size * 0.55);
    g.fillStyle(color, alpha);
    g.fillEllipse(WAVE.w - w / 2 - 2, WAVE.h - h / 2, w, h);
  }
  g.fillStyle(0xffffff, 0.9).fillRect(WAVE.w * 0.15, WAVE.h - 6, WAVE.w * 0.85, 6);
  g.generateTexture('bomber-wave', WAVE.w, WAVE.h);
  g.destroy();
}
