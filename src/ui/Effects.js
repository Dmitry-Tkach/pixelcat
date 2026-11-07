const PUFF_MS = 260;
const LINE_MS = 260;
const LINE_SPACING_MS = 80;
const PUNCH_OUT_MS = 130;
const PUNCH_BACK_MS = 220;
const STAR_COUNT = 8;
const STAR_MS = 480;
const DUST_COLOR = 0xf2ecf8;
const RUN_DUST_EVERY_MS = 110;
const CONFETTI_COLORS = [0xffc531, 0xf0455f, 0x37c871, 0x2fa4f2, 0xb79ceb, 0xffffff];

// Soft shapes for particles, drawn once: a dot, a leaf, a sparkle, a ring and a scrap of confetti.
export function makeEffectTextures(scene) {
  if (scene.textures.exists('fx-dot')) return;
  const draw = (key, w, h, paint) => {
    const g = scene.make.graphics({ add: false });
    paint(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  draw('fx-dot', 32, 32, (g) => {
    for (let r = 16; r > 0; r -= 2) g.fillStyle(0xffffff, 0.12 + (1 - r / 16) * 0.5).fillCircle(16, 16, r);
  });
  draw('fx-leaf', 22, 12, (g) => {
    g.fillStyle(0xffffff, 1).fillEllipse(11, 6, 20, 10);
    g.fillStyle(0x000000, 0.18).fillRect(2, 5.5, 18, 1);
  });
  draw('fx-spark', 24, 24, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(12, 0, 14.5, 12, 9.5, 12).fillTriangle(12, 24, 14.5, 12, 9.5, 12);
    g.fillTriangle(0, 12, 12, 9.5, 12, 14.5).fillTriangle(24, 12, 12, 9.5, 12, 14.5);
    g.fillCircle(12, 12, 3);
  });
  draw('fx-ring', 64, 64, (g) => {
    g.lineStyle(6, 0xffffff, 1).strokeCircle(32, 32, 28);
  });
  draw('fx-confetti', 12, 7, (g) => {
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 12, 7);
  });
}

// Small visual effects that give moves more impact. They don't affect gameplay.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.sprintLines = null;
    this.runDustMs = 0;
    makeEffectTextures(scene);
    const burst = (texture, config, depth) => scene.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(depth);
    // Dust kicked up by feet, under the characters' feet but over the road.
    this.dustEmitter = burst('fx-dot', {
      lifespan: { min: 300, max: 520 }, speed: { min: 30, max: 120 }, angle: { min: 190, max: 350 },
      scale: { start: 0.7, end: 1.4 }, alpha: { start: 0.7, end: 0 }, gravityY: -40, tint: DUST_COLOR,
    }, 5.5);
    this.sparkEmitter = burst('fx-spark', {
      lifespan: { min: 280, max: 460 }, speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 }, rotate: { min: 0, max: 180 }, tint: [0xfff3a6, 0xffffff, 0xffc531], blendMode: 'ADD',
    }, 9);
    this.confettiEmitter = burst('fx-confetti', {
      lifespan: { min: 1400, max: 2200 }, speed: { min: 260, max: 620 }, angle: { min: 200, max: 340 },
      gravityY: 700, rotate: { start: 0, end: 720 }, scale: { min: 0.8, max: 1.3 }, alpha: { start: 1, end: 0.6 },
      tint: CONFETTI_COLORS,
    }, 9);
  }

  // A cloud of dust at someone's feet: small for a landing, big for a crash.
  dust(x, y, count = 6) {
    this.dustEmitter.explode(count, x, y - 4);
  }

  // A little dust behind a running cat's feet, every so often.
  runDust(cat, ms) {
    this.runDustMs -= ms;
    if (this.runDustMs > 0) return;
    this.runDustMs = RUN_DUST_EVERY_MS;
    this.dustEmitter.explode(1, cat.x - Math.sign(cat.moveVelocity || 1) * 30, cat.body.bottom - 4);
  }

  // A bump: a ring and a few sparks where something hit.
  impact(x, y, size = 1) {
    const ring = this.scene.add.image(x, y, 'fx-ring').setDepth(9).setScale(0.3 * size).setAlpha(0.9);
    this.scene.tweens.add({ targets: ring, scale: 1.4 * size, alpha: 0, duration: 260, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });
    this.sparkEmitter.explode(Math.round(5 * size), x, y);
  }

  // A treat collected.
  sparkle(x, y) {
    this.sparkEmitter.explode(5, x, y);
  }

  // A shower of confetti, for getting away.
  confetti(x, y) {
    this.confettiEmitter.explode(70, x, y);
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
