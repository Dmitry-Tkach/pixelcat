const PUFF_MS = 260;
const LINE_MS = 260;
const LINE_SPACING_MS = 80;
const PUNCH_OUT_MS = 130;
const PUNCH_BACK_MS = 220;
const STAR_COUNT = 8;
const STAR_MS = 480;

// Small visual effects that give moves more impact. They don't affect gameplay.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.sprintLines = null;
  }

  // A ring of air under the cat, for a double jump or bounce.
  puff(x, y, color = 0xffffff) {
    const ring = this.scene.add.ellipse(x, y, 40, 12, color, 0.8).setDepth(5);
    this.scene.tweens.add({
      targets: ring,
      scaleX: 2.6,
      scaleY: 1.6,
      alpha: 0,
      duration: PUFF_MS,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  // Fires the springy paw from the cat toward a target, and calls onContact when it lands.
  punch(cat, getTargetX, targetY, onContact) {
    const startX = cat.x - 40;
    const y = targetY;
    const spring = this.scene.add.tileSprite(startX, y, 32, 48, 'paw-spring').setOrigin(1, 0.5).setDepth(8);
    const head = this.scene.add.image(startX, y, 'paw-head').setDepth(9);
    const progress = { value: 0 };
    const place = () => {
      const from = cat.x - 40;
      head.x = from + (getTargetX() - from) * progress.value;
      spring.x = from;
      spring.width = Math.max(1, from - head.x);
      spring.y = cat.y;
      head.y = cat.y + (y - cat.y) * progress.value;
    };
    this.scene.tweens.add({
      targets: progress,
      value: 1,
      duration: PUNCH_OUT_MS,
      ease: 'Quad.easeIn',
      onUpdate: place,
    });
    // On the game clock rather than the tween, because tweens run on real time and this affects
    // gameplay. The tween above only draws the paw.
    this.scene.time.delayedCall(PUNCH_OUT_MS, () => {
      onContact();
      this.scene.tweens.killTweensOf(progress);
      this.scene.tweens.add({
        targets: progress,
        value: 0,
        delay: 60,
        duration: PUNCH_BACK_MS,
        ease: 'Quad.easeOut',
        onUpdate: place,
        onComplete: () => {
          head.destroy();
          spring.destroy();
        },
      });
    });
  }

  stars(x, y) {
    for (let i = 0; i < STAR_COUNT; i++) {
      const angle = (i / STAR_COUNT) * Math.PI * 2;
      const star = this.scene.add.image(x, y, 'star').setDepth(10);
      this.scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * 170,
        y: y + Math.sin(angle) * 170,
        angle: 240,
        alpha: 0,
        duration: STAR_MS,
        ease: 'Quad.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  // Streaks trailing the cat while it sprints.
  startSprint(cat, durationMs) {
    this.stopSprint();
    this.sprintLines = this.scene.time.addEvent({
      delay: LINE_SPACING_MS,
      repeat: Math.floor(durationMs / LINE_SPACING_MS),
      callback: () => this.sprintLine(cat),
    });
  }

  sprintLine(cat) {
    const y = cat.y + (Math.random() - 0.5) * 110;
    const line = this.scene.add.rectangle(cat.x - 70, y, 90, 6, 0xffffff, 0.85).setDepth(5);
    this.scene.tweens.add({
      targets: line,
      x: cat.x - 240,
      alpha: 0,
      duration: LINE_MS,
      onComplete: () => line.destroy(),
    });
  }

  stopSprint() {
    this.sprintLines?.remove();
    this.sprintLines = null;
  }
}
