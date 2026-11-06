import { GAME, SPRINT } from '../config/gameConfig.js';

const FONT = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
const INK = 0x1e2a4a;
const SAFE = 0x37c871;
const WARN = 0xffc531;
const DANGER = 0xf0455f;
const METER_W = 400;
const PROGRESS_W = 180;
const PIP_RADIUS = 9;
const PIP_GAP = 26;
const HINT_MS = 2400;
const EDGE_PULSE_MS = 160;

// The in-game display: level name, progress, chase distance, sprint streak, hints and pause.
export class Hud {
  constructor(scene, levelName, onPause) {
    this.scene = scene;
    const { WIDTH } = GAME;
    const text = {
      fontFamily: FONT,
      fontStyle: '600',
      color: '#FFFFFF',
      stroke: '#1E2A4A',
      strokeThickness: 5,
    };
    // Each item remembers which side of the screen it's attached to, for when the window changes.
    const widthAtStart = GAME.WIDTH;
    this.placed = [];
    const attached = (anchor) => (item) => {
      const from = anchor === 'right' ? widthAtStart : anchor === 'center' ? widthAtStart / 2 : 0;
      this.placed.push({ item, anchor, offsetX: item.x - from, y: item.y });
      return item.setScale(1 / GAME.CAMERA_ZOOM).setScrollFactor(0).setDepth(20);
    };
    const fixed = attached('left');
    const centered = attached('center');
    const right = attached('right');

    fixed(scene.add.text(28, 18, levelName, { ...text, fontSize: '32px' }));
    fixed(scene.add.rectangle(28, 72, PROGRESS_W, 14, INK, 0.75).setOrigin(0, 0.5));
    this.progressFill = fixed(scene.add.rectangle(30, 72, 1, 10, 0xffffff).setOrigin(0, 0.5));

    // One pip per clean pass toward the next sprint.
    this.pips = Array.from({ length: SPRINT.STREAK }, (_, i) => (
      fixed(scene.add.circle(38 + i * PIP_GAP, 100, PIP_RADIUS, INK, 0.75))
    ));

    // Shown while the cat is holding a Super Paw.
    this.pawIcon = fixed(scene.add.image(50, 146, 'paw-icon')).setVisible(false);
    this.pawLabel = fixed(scene.add.text(86, 128, 'Press E', { ...text, fontSize: '26px' })).setVisible(false);

    const meterX = WIDTH / 2 - METER_W / 2;
    centered(scene.add.rectangle(meterX, 42, METER_W, 26, INK, 0.75).setOrigin(0, 0.5));
    this.meterFill = centered(scene.add.rectangle(meterX + 4, 42, 1, 18, SAFE).setOrigin(0, 0.5));
    centered(scene.add.text(WIDTH / 2, 78, 'Distance from chaser', { ...text, fontSize: '24px' }).setOrigin(0.5));

    this.hint = centered(scene.add.text(WIDTH / 2, 150, '', { ...text, fontSize: '34px', align: 'center' }).setOrigin(0.5));
    this.hint.setAlpha(0);

    // Warns that a chaser is about to land from a shortcut, on the side they'll come from.
    this.edgeWarning = fixed(scene.add.text(70, 400, '!', { ...text, fontSize: '110px', color: '#F0455F', strokeThickness: 10 }).setOrigin(0.5));
    this.edgeWarning.setVisible(false);
    this.edgePulse = scene.tweens.add({ targets: this.edgeWarning, alpha: 0.25, duration: EDGE_PULSE_MS, yoyo: true, repeat: -1, paused: true });

    // The treat counter, to the left of the pause button.
    right(scene.add.image(WIDTH - 190, 50, 'fish'));
    this.treatLabel = right(scene.add.text(WIDTH - 156, 32, '0', { ...text, fontSize: '32px' }));

    this.pauseButton = right(scene.add.circle(WIDTH - 56, 50, 34, INK, 0.75));
    this.pauseButton.setInteractive({ useHandCursor: true }).on('pointerdown', onPause);
    right(scene.add.rectangle(WIDTH - 65, 50, 9, 28, 0xffffff));
    right(scene.add.rectangle(WIDTH - 47, 50, 9, 28, 0xffffff));
    this.layout();
  }

  // Places everything for the current window. The camera zooms around the screen's center,
  // so positions are adjusted to cancel that out and keep the HUD at its normal size.
  layout() {
    const { WIDTH, HEIGHT, CAMERA_ZOOM: zoom } = GAME;
    for (const { item, anchor, offsetX, y } of this.placed) {
      const from = anchor === 'right' ? WIDTH : anchor === 'center' ? WIDTH / 2 : 0;
      item.setPosition(WIDTH / 2 + (from + offsetX - WIDTH / 2) / zoom, HEIGHT / 2 + (y - HEIGHT / 2) / zoom);
    }
  }

  update(safety, progress) {
    this.meterFill.width = Math.max(1, (METER_W - 8) * safety);
    this.meterFill.fillColor = safety > 0.5 ? SAFE : safety > 0.25 ? WARN : DANGER;
    this.progressFill.width = Math.max(1, (PROGRESS_W - 4) * Math.min(1, progress));
  }

  setTreats(count) {
    this.treatLabel.setText(String(count));
  }

  setPawReady(ready) {
    this.pawIcon.setVisible(ready);
    this.pawLabel.setVisible(ready);
  }

  setStreak(count) {
    this.pips.forEach((pip, i) => {
      pip.setFillStyle(i < count ? WARN : INK, i < count ? 1 : 0.75);
    });
  }

  showEdgeWarning(visible) {
    this.edgeWarning.setVisible(visible).setAlpha(1);
    if (visible) this.edgePulse.restart();
    else this.edgePulse.pause();
  }

  showHint(message) {
    this.hint.setText(message).setAlpha(1);
    this.scene.tweens.killTweensOf(this.hint);
    this.scene.tweens.add({ targets: this.hint, alpha: 0, delay: HINT_MS, duration: 300 });
  }
}
