import Phaser from 'phaser';
import { GAME } from '../config/gameConfig.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { arcHeight } from '../systems/obstacleMotion.js';

const BELOW_FEET = 12; // how much room the frames leave under his feet. See tools/cut-boss.mjs
const STANDING = { w: 110, h: 150 }; // lower than his art, so one jump can land on his head
const LEAPING = { w: 190, h: 105 };
const CHARGING = { w: 170, h: 120 };

// A boss on screen: it plays what the BossDirector decides, and moves itself to carry it out. Its
// art changes size between animations, so a separate invisible zone is its body.
export class Boss extends Phaser.GameObjects.Sprite {
  constructor(scene, x, definition, director) {
    const { character } = definition;
    super(scene, x, GAME.GROUND_Y, frameKey(character, CHARACTERS[character].anims.idle.file, 1));
    scene.add.existing(this);
    this.character = character;
    this.definition = definition;
    this.director = director;
    this.setScale(CHARACTERS[character].scale).setDepth(5).setFlipX(true);
    this.leapFromX = x;
    this.leapToX = x;
    this.chargeDirection = 0;
    this.shadow = scene.add.ellipse(x, GAME.GROUND_Y + 4, 140, 20, 0x1d1a44, 0.35).setDepth(3);
    this.hitZone = scene.add.zone(x, GAME.GROUND_Y, STANDING.w, STANDING.h);
    scene.physics.add.existing(this.hitZone);
    this.hitZone.body.setAllowGravity(false);
    this.hitZone.body.moves = false;
    this.pose('idle');
    this.placeHitZone(STANDING);
  }

  // The frames are different heights, so this keeps his feet on the same line.
  pose(role) {
    this.play(animKey(this.character, role), true);
    this.setOrigin(0.5, 1 - BELOW_FEET / this.height);
  }

  face(x) {
    this.setFlipX(x < this.x); // his art faces right
  }

  placeHitZone({ w, h }, lift = 0) {
    this.hitZone.body.setSize(w, h);
    this.hitZone.setPosition(this.x, this.y - h / 2 - lift);
  }

  // Runs what the director decided.
  handleEvent(event, cat) {
    const { attack } = this.director;
    if (event === 'ready') {
      this.y = GAME.GROUND_Y;
      this.pose('idle');
      this.face(cat.x);
    } else if (event === 'attackWindup') {
      this.face(cat.x);
      this.pose(attack === 'claw' ? 'clawReady' : 'crouch');
    } else if (event === 'attackActive') {
      this.face(cat.x);
      if (attack === 'lunge') {
        // Aims where the cat is now, after the warning, so moving late still dodges it.
        this.leapFromX = this.x;
        this.leapToX = cat.x;
        this.leapMs = 0;
        this.pose('leap');
      } else if (attack === 'claw') {
        this.pose('claw');
      } else {
        this.chargeDirection = cat.x < this.x ? -1 : 1;
        this.setFlipX(this.chargeDirection < 0);
        this.pose('run');
      }
    } else if (event === 'recover') {
      this.y = GAME.GROUND_Y;
      // Tired after a leap or a swipe, and seeing stars after running into a wall.
      if (attack === 'charge') this.pose('hit');
      else if (attack === 'lunge') this.pose('land');
      else this.pose('idle');
      if (attack !== 'claw') this.chain(animKey(this.character, 'dizzy'));
      this.setOrigin(0.5, 1 - BELOW_FEET / this.height);
    } else if (event === 'hurt' || event === 'defeated') {
      this.y = GAME.GROUND_Y;
      this.pose('hit');
      this.chain(animKey(this.character, 'dizzy'));
    }
  }

  // Keeps moving through an attack. `limits` are the left and right edges he can reach. Returns
  // 'crash' on running into a wall.
  update(ms, limits) {
    const { state, attack, attackData, stateMs } = this.director;
    let zone = STANDING;
    let lift = 0;
    let outcome = null;
    if (state === 'active' && attack === 'lunge') {
      const progress = Math.min(1, stateMs / (attackData.active * 1000));
      this.x = Phaser.Math.Clamp(Phaser.Math.Linear(this.leapFromX, this.leapToX, progress), limits.left, limits.right);
      lift = arcHeight(progress, 1, attackData.height);
      zone = LEAPING;
    } else if (state === 'active' && attack === 'charge') {
      this.x += this.chargeDirection * attackData.speed * (ms / 1000);
      zone = CHARGING;
      if (this.x <= limits.left || this.x >= limits.right) {
        this.x = Phaser.Math.Clamp(this.x, limits.left, limits.right);
        outcome = 'crash';
      }
    }
    this.y = GAME.GROUND_Y - lift;
    this.placeHitZone(zone);
    this.setOrigin(0.5, 1 - BELOW_FEET / this.height);
    this.shadow.x = this.x;
    this.shadow.setScale(1 - Math.min(0.5, lift / 400));
    return outcome;
  }

  // During the swipe, the claw reaches anything on the road nearby.
  reaches(cat) {
    const { state, attack, attackData } = this.director;
    if (state !== 'active' || attack !== 'claw') return false;
    const height = GAME.GROUND_Y - cat.body.bottom;
    return Math.abs(cat.x - this.x) <= attackData.range && height <= attackData.reachHeight;
  }

  // He stands with his arms crossed, having won.
  gloat() {
    this.anims.stop();
    this.y = GAME.GROUND_Y;
    this.pose('idle');
  }
}
