import { GAME, SPRINT } from '../config/gameConfig.js';
import { CHARACTERS, idleFrameKey } from '../data/characters.js';

const FONT = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
const INK = 0x1e2a4a;
const SAFE = 0x37c871;
const WARN = 0xffc531;
const DANGER = 0xf0455f;
const TRACK = 0x0f1730;
const PILL_ALPHA = 0.55;
const HINT_MS = 2400;
const HINT_WIDTH = 900;
const EDGE_PULSE_MS = 160;

// Top left: how far through the level the cat is.
const JOURNEY = { x: 24, y: 18, w: 300, h: 62, trackX: 18, trackY: 44, trackW: 236, trackH: 10 };
// Top middle: the chaser's face slides along toward the cat's as they close in.
const CHASE = { w: 420, h: 56, trackW: 300, trackH: 14, face: 44 };
const PIP_RADIUS = 7;
const PIP_GAP = 20;
const BUMP_MS = 110;

// The in-game display: progress, chase distance, sprint streak, treats, hints and pause. It's kept
// small and in the corners, so the level gets the screen.
export class Hud {
  constructor(scene, level, onPause) {
    this.scene = scene;
    this.level = level;
    const { WIDTH } = GAME;
    const text = {
      fontFamily: FONT,
      fontStyle: '600',
      color: '#FFFFFF',
      stroke: '#1E2A4A',
      strokeThickness: 5,
    };
    this.text = text;
    // Each item remembers which side of the screen it's attached to, for when the window changes.
    const widthAtStart = GAME.WIDTH;
    this.widthAtStart = widthAtStart;
    this.placed = [];
    const attached = (anchor) => (item) => {
      const from = anchor === 'right' ? widthAtStart : anchor === 'center' ? widthAtStart / 2 : 0;
      const record = { item, anchor, offsetX: item.x - from, y: item.y };
      this.placed.push(record);
      item.hudRecord = record;
      return item.setScale(1 / GAME.CAMERA_ZOOM).setScrollFactor(0).setDepth(20);
    };
    const fixed = attached('left');
    const centered = attached('center');
    const right = attached('right');
    this.attachLeft = fixed;
    this.attachCenter = centered;

    // The journey: the level's name over a track, with checkpoints, the boss and the gate on it.
    const j = JOURNEY;
    fixed(scene.add.graphics({ x: j.x, y: j.y })).fillStyle(INK, PILL_ALPHA).fillRoundedRect(0, 0, j.w, j.h, 18);
    fixed(scene.add.text(j.x + 18, j.y + 6, level.name, { ...text, fontSize: '22px', strokeThickness: 4 }));
    this.journey = fixed(scene.add.graphics({ x: j.x + j.trackX, y: j.y + j.trackY }));
    this.journeyProgress = -1;
    const trackEnd = j.x + j.trackX + j.trackW;
    fixed(scene.add.text(trackEnd + 16, j.y + j.trackY, '⚑', { ...text, fontSize: '26px', strokeThickness: 4 }).setOrigin(0.5));
    this.markers = this.journeyMarkers(level);
    for (const { share, kind } of this.markers) {
      const x = j.x + j.trackX + share * j.trackW;
      if (kind === 'boss') {
        fixed(scene.add.text(x, j.y + j.trackY - 2, '♛', { ...text, fontSize: '22px', color: '#FFC531', strokeThickness: 4 }).setOrigin(0.5));
      }
    }
    this.catMarker = fixed(this.face('cat', 34, 0xffffff));
    this.catMarker.y = j.y + j.trackY + j.trackH / 2;
    this.catMarker.hudRecord.y = this.catMarker.y;
    this.catMarkerStartX = j.x + j.trackX;

    // One pip per clean pass toward the next sprint.
    this.pips = Array.from({ length: SPRINT.STREAK }, (_, i) => (
      fixed(scene.add.circle(j.x + 22 + i * PIP_GAP, j.y + j.h + 16, PIP_RADIUS, INK, 0.7).setStrokeStyle(2, 0xffffff, 0.8))
    ));

    // Shown while the cat is holding a Super Paw.
    this.pawIcon = fixed(scene.add.image(50, 146, 'paw-icon')).setVisible(false);
    this.pawLabel = fixed(scene.add.text(86, 128, 'Press E', { ...text, fontSize: '24px' })).setVisible(false);

    // The chase meter.
    const c = CHASE;
    const left = WIDTH / 2 - c.w / 2;
    this.chaseLeft = WIDTH / 2 - c.trackW / 2;
    centered(scene.add.graphics({ x: left, y: 16 })).fillStyle(INK, PILL_ALPHA).fillRoundedRect(0, 0, c.w, c.h, c.h / 2);
    this.chaseBar = centered(scene.add.graphics({ x: this.chaseLeft, y: 16 + c.h / 2 - c.trackH / 2 }));
    this.chaseShare = -1;
    this.chaseColor = SAFE;
    this.catFace = centered(this.face('cat', c.face, 0xffffff));
    this.catFace.setPosition(this.chaseLeft + c.trackW + c.face / 2 + 10, 16 + c.h / 2);
    this.catFace.hudRecord.offsetX = this.catFace.x - widthAtStart / 2;
    this.catFace.hudRecord.y = this.catFace.y;
    this.chaserFace = null;
    this.chaserFaceY = 16 + c.h / 2;
    this.meterLabel = centered(scene.add.text(WIDTH / 2, 16 + c.h + 14, '', { ...text, fontSize: '22px', strokeThickness: 4 }).setOrigin(0.5));

    // Long hints wrap onto a second line rather than run off the screen.
    this.hint = centered(scene.add.text(WIDTH / 2, 150, '', { ...text, fontSize: '32px', align: 'center', wordWrap: { width: HINT_WIDTH } }).setOrigin(0.5));
    this.hint.setAlpha(0);

    // Warns that a chaser is about to land from a shortcut, on the side they'll come from.
    this.edgeWarning = fixed(scene.add.text(70, 400, '!', { ...text, fontSize: '110px', color: '#F0455F', strokeThickness: 10 }).setOrigin(0.5));
    this.edgeWarning.setVisible(false);
    this.edgePulse = scene.tweens.add({ targets: this.edgeWarning, alpha: 0.25, duration: EDGE_PULSE_MS, yoyo: true, repeat: -1, paused: true });

    // Treats, in a pill to the left of the pause button.
    right(scene.add.graphics({ x: WIDTH - 214, y: 22 })).fillStyle(INK, PILL_ALPHA).fillRoundedRect(0, 0, 124, 48, 24);
    this.treatIcon = right(scene.add.image(WIDTH - 186, 46, 'fish'));
    this.treatIconScale = 0.62;
    this.treatIcon.setScale(this.treatIconScale / GAME.CAMERA_ZOOM);
    this.treatLabel = right(scene.add.text(WIDTH - 160, 46, '0', { ...text, fontSize: '28px', strokeThickness: 4 }).setOrigin(0, 0.5));

    this.pauseButton = right(scene.add.circle(WIDTH - 50, 46, 26, INK, 0.75).setStrokeStyle(3, 0xffffff, 0.9));
    this.pauseButton.setInteractive({ useHandCursor: true }).on('pointerdown', onPause);
    right(scene.add.rectangle(WIDTH - 57, 46, 6, 20, 0xffffff));
    right(scene.add.rectangle(WIDTH - 43, 46, 6, 20, 0xffffff));
    this.layout();
  }

  // Where checkpoints and a boss sit along the level, as shares of its length.
  journeyMarkers(level) {
    const markers = (level.checkpoints ?? []).map((x) => ({ share: x / level.length, kind: 'checkpoint' }));
    if (level.boss) markers.push({ share: level.boss.at / level.length, kind: 'boss' });
    return markers;
  }

  // A round portrait of a character, cut from their idle frame. Its middle is at its position.
  face(character, size, ring) {
    const { scene } = this;
    const { x, y, size: faceSize } = CHARACTERS[character].face;
    const portrait = scene.add.image(0, 0, idleFrameKey(character)).setCrop(x, y, faceSize, faceSize);
    const frame = portrait.frame;
    portrait.setOrigin((x + faceSize / 2) / frame.width, (y + faceSize / 2) / frame.height);
    portrait.setScale((size * 0.92) / faceSize);
    const back = scene.add.circle(0, 0, size / 2, 0xf3f6ff).setStrokeStyle(3, ring);
    return scene.add.container(0, 0, [back, portrait]);
  }

  // Shows whoever is chasing on the meter.
  setChaser(character) {
    if (this.chaserCharacter === character) return;
    this.chaserCharacter = character;
    this.chaserFace?.destroy();
    this.placed = this.placed.filter((record) => record.item !== this.chaserFace);
    this.chaserFace = this.attachCenter(this.face(character, CHASE.face, DANGER));
    this.chaserFace.y = this.chaserFaceY;
    this.chaserFace.hudRecord.y = this.chaserFaceY;
    this.chaseShare = -1;
  }

  // Places everything for the current window. The camera zooms around the screen's center,
  // so positions are adjusted to cancel that out and keep the HUD at its normal size.
  layout() {
    for (const record of this.placed) this.place(record);
  }

  place({ item, anchor, offsetX, y }) {
    const { WIDTH, HEIGHT, CAMERA_ZOOM: zoom } = GAME;
    const from = anchor === 'right' ? WIDTH : anchor === 'center' ? WIDTH / 2 : 0;
    item.setPosition(WIDTH / 2 + (from + offsetX - WIDTH / 2) / zoom, HEIGHT / 2 + (y - HEIGHT / 2) / zoom);
  }

  // Moves an item to `x`, in the HUD's own coordinates.
  moveTo(item, x) {
    const { anchor } = item.hudRecord;
    const from = anchor === 'right' ? this.widthAtStart : anchor === 'center' ? this.widthAtStart / 2 : 0;
    item.hudRecord.offsetX = x - from;
    this.place(item.hudRecord);
  }

  // In a boss fight, the meter shows the boss's health, and the pips show the cat's lives.
  showBoss(name, character) {
    this.bossMode = true;
    this.meterLabel.setText(name);
    if (character) this.setChaser(character);
    this.chaseShare = -1;
  }

  hideBoss() {
    this.bossMode = false;
    this.meterLabel.setText('');
    this.chaseShare = -1;
    this.chaserFace?.setVisible(false);
  }

  // `safety` is 1 with the chaser far behind, and 0 when they're about to grab. In a boss fight
  // it's the boss's health instead.
  update(safety, progress) {
    this.drawJourney(Math.min(1, Math.max(0, progress)));
    this.drawChase(Math.min(1, Math.max(0, safety)));
  }

  drawJourney(progress) {
    const j = JOURNEY;
    if (Math.abs(progress - this.journeyProgress) < 0.002) return;
    this.journeyProgress = progress;
    const g = this.journey;
    g.clear();
    g.fillStyle(TRACK, 0.85).fillRoundedRect(0, 0, j.trackW, j.trackH, j.trackH / 2);
    const filled = Math.max(j.trackH, j.trackW * progress);
    g.fillStyle(0xffffff, 1).fillRoundedRect(0, 0, filled, j.trackH, j.trackH / 2);
    for (const { share, kind } of this.markers) {
      if (kind !== 'checkpoint') continue;
      const x = share * j.trackW;
      g.fillStyle(share <= progress ? 0x37c871 : 0xffc531, 1).fillCircle(x, j.trackH / 2, 6);
      g.lineStyle(2, INK, 1).strokeCircle(x, j.trackH / 2, 6);
    }
    this.moveTo(this.catMarker, this.catMarkerStartX + progress * j.trackW);
  }

  drawChase(share) {
    const c = CHASE;
    if (Math.abs(share - this.chaseShare) < 0.002) return;
    this.chaseShare = share;
    const color = this.bossMode ? DANGER : share > 0.5 ? SAFE : share > 0.25 ? WARN : DANGER;
    const g = this.chaseBar;
    g.clear();
    g.fillStyle(TRACK, 0.85).fillRoundedRect(0, 0, c.trackW, c.trackH, c.trackH / 2);
    if (this.bossMode) {
      // His health, from his face on the left.
      g.fillStyle(color, 1).fillRoundedRect(0, 0, Math.max(c.trackH, c.trackW * share), c.trackH, c.trackH / 2);
      if (this.chaserFace) {
        this.chaserFace.setVisible(true);
        this.moveTo(this.chaserFace, this.chaseLeft - c.face / 2 - 10);
      }
      this.catFace.setVisible(false);
      return;
    }
    // The gap between the chaser and the cat, shrinking toward the cat as they close in.
    const chaserX = (1 - share) * c.trackW;
    g.fillStyle(color, 1).fillRoundedRect(chaserX, 0, Math.max(c.trackH, c.trackW - chaserX), c.trackH, c.trackH / 2);
    this.catFace.setVisible(true);
    if (this.chaserFace) {
      this.chaserFace.setVisible(true);
      this.moveTo(this.chaserFace, this.chaseLeft + chaserX);
    }
  }

  setTreats(count) {
    const changed = this.treatLabel.text !== String(count);
    this.treatLabel.setText(String(count));
    if (!changed) return;
    // A little bump, so each treat feels collected.
    const zoom = GAME.CAMERA_ZOOM;
    this.scene.tweens.killTweensOf([this.treatIcon, this.treatLabel]);
    this.treatIcon.setScale(this.treatIconScale / zoom);
    this.treatLabel.setScale(1 / zoom);
    this.scene.tweens.add({ targets: this.treatIcon, scale: (this.treatIconScale * 1.35) / zoom, duration: BUMP_MS, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.treatLabel, scale: 1.25 / zoom, duration: BUMP_MS, yoyo: true, ease: 'Quad.easeOut' });
  }

  setPawReady(ready) {
    this.pawIcon.setVisible(ready);
    this.pawLabel.setVisible(ready);
  }

  setStreak(count) {
    this.pips.forEach((pip, i) => {
      pip.setFillStyle(i < count ? WARN : INK, i < count ? 1 : 0.7);
    });
  }

  showEdgeWarning(visible) {
    this.edgeWarning.setVisible(visible).setAlpha(1);
    if (visible) this.edgePulse.restart();
    else this.edgePulse.pause();
  }

  // Pops in, then fades away.
  showHint(message) {
    const zoom = GAME.CAMERA_ZOOM;
    this.hint.setText(message).setAlpha(1).setScale(0.8 / zoom);
    this.scene.tweens.killTweensOf(this.hint);
    this.scene.tweens.add({ targets: this.hint, scale: 1 / zoom, duration: 220, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: this.hint, alpha: 0, delay: HINT_MS, duration: 300 });
  }
}
