import Phaser from 'phaser';
import { BOSS, GAME } from '../config/gameConfig.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { arcHeight } from '../systems/obstacleMotion.js';
import { outline } from '../ui/Outline.js';

// Where his gun's barrel ends, from the middle of his feet, in screen pixels. He's shown at the size
// his sheet is drawn, so these, his body and his beam are three-quarters of what they first were.
const MUZZLE_AHEAD = 66;
const MUZZLE_HEIGHT = 33;
// The heights shots fly at, measured to their middle. Low ones are jumped, and high ones are slid
// under: a running cat is about 113 tall, and a sliding one about 73.
const LANE_HEIGHT = { low: MUZZLE_HEIGHT, high: 98 };
const SHOT = { w: 30, h: 12, hitW: 22, hitH: 12 };
const RISE_DISTANCE = 140; // high shots climb from his gun to their lane over this distance
const AIM_UP_ANGLE = 8;
const BEAM = { height: 62, hitBottom: 5, hitTop: 61, fadeMs: 180 };
// His body, smaller than his art, so one jump can land on his head.
const STANDING = { w: 81, h: 96 };
const DASHING = { w: 111, h: 59 };
const SLIDING = { w: 96, h: 46 };
const LEAPING = { w: 89, h: 74 }; // tucked up, so a cat can run under him at the top of his leap
const STEAM_EVERY_MS = 300;
const STEAM_HEIGHT = 111;

// The Ginger Gunner: he keeps his distance and shoots. It plays what the BossDirector decides, and
// moves itself, its shots and its beam to carry it out. A separate invisible zone is its body.
export class GunnerBoss extends Phaser.GameObjects.Sprite {
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
    this.shots = [];
    this.beam = null;
    this.moveDirection = 0;
    this.targetX = x;
    this.leapFromX = x;
    this.steamMs = 0;
    makeTextures(scene);
    this.shadow = scene.add.ellipse(x, GAME.GROUND_Y + 4, 96, 15, 0x1d1a44, 0.35).setDepth(3);
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

  get muzzleX() {
    return this.x + this.facing * MUZZLE_AHEAD;
  }

  // Runs what the director decided.
  handleEvent(event, cat) {
    const { attack } = this.director;
    this.setAngle(0);
    if (event === 'ready') {
      this.y = GAME.GROUND_Y;
      this.faceCat(cat);
      this.pose('idle');
    } else if (event === 'attackWindup') {
      this.faceCat(cat);
      const windupPose = { burst: 'aim', spray: 'aim', beam: 'charge', rage: 'rageUp', leap: 'crouch', dash: 'run', slideKick: 'run' };
      this.pose(windupPose[attack]);
    } else if (event === 'attackActive') {
      this.startAttack(attack, cat);
    } else if (event === 'recover') {
      this.y = GAME.GROUND_Y;
      this.endBeam();
      if (this.director.isVulnerable) {
        // His gun is too hot to hold up, and steam rises from his head.
        this.pose('overheat');
        this.steamMs = 0;
        this.scene.audio.playSfx('overheat');
      } else {
        const recoverPose = { dash: 'slide', leap: 'land' };
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
    this.shotsFired = 0;
    if (attack === 'burst') {
      this.pose('fire');
    } else if (attack === 'spray') {
      this.pose('spray');
    } else if (attack === 'beam') {
      this.pose('beam');
      this.fireBeam();
    } else if (attack === 'rage') {
      this.pose('rageBlast');
      this.scene.cameras.main.shake(300, 0.01);
    } else if (attack === 'leap') {
      // Aims where the cat is now, after the warning, so moving late still dodges it.
      this.leapFromX = this.x;
      this.targetX = cat.x;
      this.pose('leap');
    } else if (attack === 'dash') {
      this.moveDirection = this.facing;
      this.pose('dash');
    } else if (attack === 'slideKick') {
      this.targetX = cat.x;
      this.moveDirection = this.facing;
      this.pose('slide');
    }
  }

  fireShot(lane, speed) {
    const sprite = this.scene.add.image(this.muzzleX, GAME.GROUND_Y - MUZZLE_HEIGHT, 'gunner-shot').setDepth(7);
    sprite.setFlipX(this.facing < 0);
    this.shots.push({ sprite, fromX: this.muzzleX, direction: this.facing, speed, lane });
    this.scene.audio.playSfx('shot');
  }

  // The beam reaches from his gun to the wall he's facing.
  fireBeam() {
    const { scene } = this;
    const fromX = this.muzzleX;
    const y = GAME.GROUND_Y - MUZZLE_HEIGHT;
    const core = scene.add.image(fromX, y, 'gunner-beam').setDepth(7).setOrigin(this.facing < 0 ? 1 : 0, 0.5);
    const blast = scene.add.image(fromX, y, frameKey(this.character, 'beam', 1)).setDepth(8)
      .setOrigin(this.facing < 0 ? 1 : 0, 0.5).setFlipX(this.facing < 0);
    const { left, right } = this.limits;
    const wallX = this.facing > 0 ? right + BOSS.WALL_MARGIN : left - BOSS.WALL_MARGIN;
    core.displayWidth = Math.max(1, Math.abs(wallX - fromX));
    this.beam = { core, blast, fromX, direction: this.facing };
    scene.cameras.main.shake(this.director.attackData.active * 1000, 0.006);
  }

  endBeam() {
    if (!this.beam) return;
    const { core, blast } = this.beam;
    this.scene.tweens.add({ targets: [core, blast], alpha: 0, duration: BEAM.fadeMs, onComplete: () => { core.destroy(); blast.destroy(); } });
    this.beam = null;
  }

  clearAttacks() {
    this.shots.forEach((shot) => shot.sprite.destroy());
    this.shots = [];
    this.endBeam();
  }

  // Keeps moving through an attack, and moves his shots. `limits` are the left and right edges he can
  // reach. Returns 'done' when an attack with no set length has finished.
  update(ms, limits, cat) {
    this.limits = limits;
    const seconds = ms / 1000;
    const { state, attack, attackData, stateMs } = this.director;
    let zone = STANDING;
    let lift = 0;
    let outcome = null;
    if (state === 'idle') {
      this.keepAway(seconds, limits, cat);
    } else if (state === 'active') {
      if (attack === 'burst') {
        const due = Math.min(attackData.shots, Math.floor(stateMs / (attackData.every * 1000)) + 1);
        while (this.shotsFired < due) {
          this.fireShot(attackData.lane, attackData.shotSpeed);
          this.shotsFired += 1;
        }
      } else if (attack === 'spray') {
        const laneSeconds = attackData.laneSeconds * 1000;
        const segment = Math.floor(stateMs / laneSeconds);
        const lane = segment % 2 === 0 ? 'low' : 'high';
        this.setAngle(lane === 'high' ? -AIM_UP_ANGLE * this.facing : 0);
        const intoSegment = stateMs - segment * laneSeconds;
        const due = Math.floor(stateMs / (attackData.every * 1000)) + 1;
        if (this.shotsFired < due) {
          this.shotsFired = due;
          if (intoSegment >= attackData.laneGap * 1000) this.fireShot(lane, attackData.shotSpeed);
        }
      } else if (attack === 'leap') {
        const progress = Math.min(1, stateMs / (attackData.active * 1000));
        this.x = Phaser.Math.Clamp(Phaser.Math.Linear(this.leapFromX, this.targetX, progress), limits.left, limits.right);
        lift = arcHeight(progress, 1, attackData.height);
        zone = LEAPING;
      } else if (attack === 'dash') {
        this.x += this.moveDirection * attackData.speed * seconds;
        zone = DASHING;
        if (this.x <= limits.left || this.x >= limits.right) {
          this.x = Phaser.Math.Clamp(this.x, limits.left, limits.right);
          outcome = 'done';
        }
      } else if (attack === 'slideKick') {
        const step = attackData.speed * seconds;
        const target = Phaser.Math.Clamp(this.targetX, limits.left, limits.right);
        zone = SLIDING;
        if (Math.abs(target - this.x) <= step || Math.sign(target - this.x) !== this.moveDirection) {
          this.x = target;
          outcome = 'done';
        } else {
          this.x += this.moveDirection * step;
        }
      }
    } else if (state === 'recover' && this.director.isVulnerable) {
      this.steamMs -= ms;
      if (this.steamMs <= 0) {
        this.steamMs = STEAM_EVERY_MS;
        this.scene.effects.puff(this.x + Phaser.Math.Between(-20, 20), GAME.GROUND_Y - STEAM_HEIGHT, 0xdde4ee);
      }
    }
    if (state === 'recover' && attack === 'dash') zone = SLIDING;
    this.y = GAME.GROUND_Y - lift;
    this.placeHitZone(zone);
    this.placeFeet();
    this.shadow.x = this.x;
    this.shadow.setScale(1 - Math.min(0.5, lift / 400));
    this.moveShots(seconds, limits);
    return outcome;
  }

  // Between attacks, he backs away from a cat that comes too close, until a wall stops him.
  keepAway(seconds, limits, cat) {
    const { keepAway, retreatSpeed } = this.definition;
    const away = this.x >= cat.x ? 1 : -1;
    const room = away > 0 ? limits.right - this.x : this.x - limits.left;
    if (Math.abs(cat.x - this.x) < keepAway && room > 1) {
      this.x = Phaser.Math.Clamp(this.x + away * retreatSpeed[this.director.health] * seconds, limits.left, limits.right);
      this.face(away);
      this.play(animKey(this.character, 'run'), true);
    } else {
      this.faceCat(cat);
      this.play(animKey(this.character, 'idle'), true);
    }
  }

  moveShots(seconds, limits) {
    const leftWall = limits.left - BOSS.WALL_MARGIN;
    const rightWall = limits.right + BOSS.WALL_MARGIN;
    this.shots = this.shots.filter((shot) => {
      const { sprite } = shot;
      sprite.x += shot.direction * shot.speed * seconds;
      sprite.y = GAME.GROUND_Y - shotHeight(shot);
      if (sprite.x > leftWall && sprite.x < rightWall) return true;
      sprite.destroy();
      return false;
    });
  }

  // Whether a shot, his beam or his flames touch the cat. A shot that hits is used up.
  reaches(cat) {
    const { body } = cat;
    for (const shot of this.shots) {
      const { x, y } = shot.sprite;
      if (Math.abs(x - body.center.x) < (SHOT.hitW + body.width) / 2 && Math.abs(y - body.center.y) < (SHOT.hitH + body.height) / 2) {
        shot.sprite.destroy();
        this.shots = this.shots.filter((other) => other !== shot);
        return true;
      }
    }
    const { state, attack, attackData } = this.director;
    if (this.beam) {
      const { fromX, direction } = this.beam;
      const ahead = direction > 0 ? body.right >= fromX : body.left <= fromX;
      if (ahead && body.bottom >= GAME.GROUND_Y - BEAM.hitTop && body.top <= GAME.GROUND_Y - BEAM.hitBottom) return true;
    }
    if (state === 'active' && attack === 'rage') {
      const height = GAME.GROUND_Y - body.bottom;
      return Math.abs(cat.x - this.x) <= attackData.range && height <= attackData.reachHeight;
    }
    return false;
  }

  // He stands with his gun up, having won.
  gloat() {
    this.clearAttacks();
    this.anims.stop();
    this.setAngle(0);
    this.y = GAME.GROUND_Y;
    this.pose('idle');
  }
}

// How high a shot is: low ones stay at his gun's height, and high ones climb to their lane.
function shotHeight({ sprite, fromX, lane }) {
  const travelled = Math.abs(sprite.x - fromX);
  return Phaser.Math.Linear(MUZZLE_HEIGHT, LANE_HEIGHT[lane], Math.min(1, travelled / RISE_DISTANCE));
}

// A glowing bullet and a strip of beam, made once.
function makeTextures(scene) {
  if (!scene.textures.exists('gunner-shot')) {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffb020, 0.45).fillEllipse(SHOT.w / 2, SHOT.h / 2, SHOT.w, SHOT.h);
    g.fillStyle(0xffe066, 1).fillEllipse(SHOT.w / 2 + 3, SHOT.h / 2, SHOT.w - 10, SHOT.h - 5);
    g.fillStyle(0xffffff, 1).fillEllipse(SHOT.w / 2 + 6, SHOT.h / 2, 8, 3);
    g.generateTexture('gunner-shot', SHOT.w, SHOT.h);
    g.destroy();
  }
  if (!scene.textures.exists('gunner-beam')) {
    const g = scene.make.graphics({ add: false });
    const half = BEAM.height / 2;
    for (let y = 0; y < BEAM.height; y++) {
      const fromMiddle = Math.abs(y + 0.5 - half) / half;
      const color = fromMiddle < 0.25 ? 0xffffff : fromMiddle < 0.6 ? 0x9fe3ff : 0x3d8bff;
      g.fillStyle(color, Math.min(1, 1.35 - fromMiddle)).fillRect(0, y, 16, 1);
    }
    g.generateTexture('gunner-beam', 16, BEAM.height);
    g.destroy();
  }
}

