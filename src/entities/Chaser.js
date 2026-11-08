import Phaser from 'phaser';
import { GAME } from '../config/gameConfig.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';

const HOP_HEIGHT = 120;
const HOP_MS = 280;
const HOP_LOOKAHEAD = 130;
const WARNING_ABOVE = 265;
const WARNING_PULSE_MS = 150;
const FLY_OFF_MS = 700;
const HUG_DISTANCE = 40;
const DROP_HEIGHT = 420;
const DROP_MS = 420;
const HUG_DROP_MS = 350;

// The character chasing the cat. Their position comes from the ChaseDirector, so they have no
// physics of their own. Their art and poses come from data, so any character can fill the role.
export class Chaser extends Phaser.GameObjects.Sprite {
  constructor(scene, x, character) {
    const { file } = CHARACTERS[character].anims.idle;
    super(scene, x, GAME.GROUND_Y, frameKey(character, file, 1));
    scene.add.existing(this);
    this.setDepth(7);
    this.hopping = false;
    this.waddleMs = 0;
    this.warning = scene.add.image(x, GAME.GROUND_Y - WARNING_ABOVE, 'warn-jump').setDepth(15).setVisible(false);
    this.useCharacter(character);
    this.pose('idle');
  }

  useCharacter(character) {
    this.character = character;
    this.manifest = CHARACTERS[character];
    this.setScale(this.manifest.scale).setOrigin(0.5, this.manifest.originY);
  }

  // Plays a role's animation. Characters without a matching drawing lean instead, using poseAngles.
  pose(role, ignoreIfPlaying = true) {
    const anim = this.manifest.anims[role];
    this.setScale(anim.scale ?? this.manifest.scale);
    this.setOrigin(0.5, anim.originY ?? this.manifest.originY);
    this.setAngle(this.manifest.poseAngles?.[role] ?? 0);
    this.y = GAME.GROUND_Y - (this.manifest.poseLifts?.[role] ?? 0);
    this.play(animKey(this.character, role), ignoreIfPlaying);
  }

  // Warns that a lunge is coming: they brace, and the icon shows the move that dodges it.
  windUp() {
    this.stopHop();
    this.pose('idle');
    this.warning.setVisible(true);
    this.warningPulse = this.scene.tweens.add({
      targets: this.warning,
      scale: 1.25,
      duration: WARNING_PULSE_MS,
      yoyo: true,
      repeat: -1,
    });
  }

  hideWarning() {
    this.warningPulse?.remove();
    this.warning.setVisible(false).setScale(1);
  }

  dash() {
    this.hideWarning();
    this.pose('catch');
  }

  stumble() {
    this.pose('stumble');
  }

  fallDown() {
    this.pose('lose');
  }

  // Launched off-screen by the Super Paw, spinning.
  flyOff() {
    this.stopHop();
    this.hideWarning();
    this.pose('stumble');
    this.scene.tweens.add({
      targets: this,
      x: this.x - 800,
      y: GAME.GROUND_Y - 520,
      angle: -900,
      duration: FLY_OFF_MS,
      ease: 'Quad.easeOut',
    });
    this.scene.time.delayedCall(FLY_OFF_MS, () => this.setVisible(false));
  }

  // Runs back in as whichever character is next.
  comeBack(character) {
    this.scene.tweens.killTweensOf(this);
    this.useCharacter(character);
    this.setVisible(true);
    this.y = GAME.GROUND_Y;
    this.startRunning();
  }

  startRunning() {
    this.pose('run', false);
  }

  // Places them behind the cat and, when simply chasing, hops them over ground obstacles.
  follow(catX, distance, obstacles, simplyChasing, ms = 0) {
    this.x = catX - distance;
    this.warning.x = this.x;
    if (!simplyChasing) return;
    this.applyWaddle(ms);
    for (const obstacle of obstacles) {
      const ahead = obstacle.x - this.x;
      const hops = obstacle.avoid === 'jump' || obstacle.ditch;
      if (hops && !obstacle.hoppedByOwner && ahead > 0 && ahead < HOP_LOOKAHEAD) {
        obstacle.hoppedByOwner = true;
        this.hop();
      }
    }
  }

  // A bounce and sway for characters whose run frames barely change.
  applyWaddle(ms) {
    const { waddle } = this.manifest;
    if (!waddle || this.hopping) return;
    this.waddleMs += ms;
    const wave = Math.sin((this.waddleMs / waddle.periodMs) * Math.PI * 2);
    this.y = GAME.GROUND_Y - Math.abs(wave) * waddle.height;
    this.setAngle(wave * waddle.tilt);
  }

  hop() {
    if (this.hopping) return;
    this.hopping = true;
    this.pose('hop');
    this.hopTween = this.scene.tweens.add({
      targets: this,
      y: GAME.GROUND_Y - HOP_HEIGHT,
      duration: HOP_MS,
      ease: 'Sine.easeOut',
      yoyo: true,
      onComplete: () => {
        this.hopping = false;
        this.pose('run');
      },
    });
  }

  // Lands from a shortcut, over a fence or off a roof, then runs on.
  dropIn(onLanded) {
    this.stopHop();
    this.setVisible(true);
    this.hopping = true;
    this.pose('hop');
    this.y = GAME.GROUND_Y - DROP_HEIGHT;
    this.scene.tweens.add({
      targets: this,
      y: GAME.GROUND_Y,
      duration: DROP_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.hopping = false;
        this.pose('run');
        onLanded();
      },
    });
  }

  stopHop() {
    this.hopTween?.remove();
    this.hopping = false;
    this.y = GAME.GROUND_Y;
  }

  // `feetY` is how high to leap, for a cat that's up on a ledge.
  lungeAt(catX, feetY = GAME.GROUND_Y) {
    this.stopHop();
    this.hideWarning();
    this.pose('catch');
    this.scene.tweens.add({
      targets: this,
      x: catX - 70,
      y: feetY,
      duration: 260,
      ease: 'Quad.easeOut',
      // A looping lunge holds its pose on arrival, rather than running on the spot.
      onComplete: () => {
        if (this.anims.getName() === animKey(this.character, 'catch')) this.anims.stop();
      },
    });
  }

  get canHug() {
    return Boolean(this.manifest.anims.hug);
  }

  // Holds the caught cat. Only for characters with hug frames. Starting from `feetY`, they drop
  // back down to the road with it.
  hug(catX, feetY = GAME.GROUND_Y) {
    this.scene.tweens.killTweensOf(this);
    this.x = catX - HUG_DISTANCE;
    this.y = GAME.GROUND_Y;
    this.pose('hug');
    if (this.manifest.anims.hugLoop) this.chain(animKey(this.character, 'hugLoop'));
    if (feetY === GAME.GROUND_Y) return;
    const landedY = this.y;
    this.y = feetY;
    this.scene.tweens.add({ targets: this, y: landedY, duration: HUG_DROP_MS, ease: 'Quad.easeIn' });
  }

  remove() {
    this.warning.destroy();
    this.destroy();
  }

  giveUp() {
    this.stopHop();
    this.hideWarning();
    this.pose('lose');
  }
}
