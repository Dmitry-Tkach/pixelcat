import { GAME } from '../config/gameConfig.js';

// A boss's health bar, at the top of the screen in the middle: his name, the bar, and a mark where
// each of his parts starts. When he's hit, the bar drops at once and a pale "ghost" behind it follows
// a moment later, so the player sees how much the hit took.
//   w, h: the bar's size. y: its top. border: the dark edge round it.
//   ghostDelayMs: how long the ghost waits; ghostRate: how fast it then shrinks, in shares a second.
const BAR = { w: 560, h: 22, y: 50, border: 4, ghostDelayMs: 380, ghostRate: 0.5, fadeMs: 600 };
const COLOURS = { edge: 0x1e2a4a, empty: 0x3a2a2a, ghost: 0xffe2a0, health: 0xd9453a, shine: 0xff8a6a, mark: 0xffffff };
const NAME_STYLE = { fontFamily: 'Fredoka, sans-serif', fontSize: '24px', fontStyle: '600', color: '#ffffff', stroke: '#1e2a4a', strokeThickness: 6 };
const DEPTH = 100; // with the rest of the HUD

export class AdventureBossBar {
  // marks: the shares of his health where his parts start, after the first.
  constructor(scene, { name, marks = [] }) {
    this.scene = scene;
    this.marks = marks;
    this.share = 1;
    this.ghost = 1;
    this.ghostWaitMs = 0;
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH);
    this.label = scene.add.text(0, BAR.y - 4, name, NAME_STYLE).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH);
    this.layout();
  }

  // Keeps it in the middle of the screen when the window changes.
  layout() {
    this.left = Math.round(GAME.WIDTH / 2 - BAR.w / 2);
    this.label.setX(GAME.WIDTH / 2);
    this.draw();
  }

  // share: his health now, as a share of his full health.
  update(ms, share) {
    if (share < this.share) this.ghostWaitMs = BAR.ghostDelayMs;
    const changed = share !== this.share || this.ghost > share;
    this.share = share;
    if (this.ghostWaitMs > 0) this.ghostWaitMs -= ms;
    else if (this.ghost > share) this.ghost = Math.max(share, this.ghost - (BAR.ghostRate * ms) / 1000);
    if (changed) this.draw();
  }

  draw() {
    const g = this.graphics.clear();
    const { left } = this;
    const { y, w, h, border } = BAR;
    g.fillStyle(COLOURS.edge, 1).fillRoundedRect(left - border, y - border, w + border * 2, h + border * 2, 8);
    g.fillStyle(COLOURS.empty, 1).fillRect(left, y, w, h);
    g.fillStyle(COLOURS.ghost, 1).fillRect(left, y, w * this.ghost, h);
    g.fillStyle(COLOURS.health, 1).fillRect(left, y, w * this.share, h);
    g.fillStyle(COLOURS.shine, 1).fillRect(left, y + 3, w * this.share, 4);
    for (const mark of this.marks) {
      g.fillStyle(COLOURS.mark, 0.9).fillRect(Math.round(left + w * mark) - 1, y - 2, 3, h + 4);
    }
  }

  hide() {
    this.scene.tweens.add({ targets: [this.graphics, this.label], alpha: 0, duration: BAR.fadeMs });
  }
}
