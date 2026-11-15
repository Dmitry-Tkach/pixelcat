import { GAME } from '../../config/gameConfig.js';
import { TILE } from '../adventureMap.js';

// The camera's own moments in a level (the level's `camera`), like a film's:
//   shots: when the cat first stands in a shot's `when` cells, the camera glides over to show what's
//     ahead (`look`, a cell, fractions allowed), holds there, and glides back as slowly. Black bars close in at
//     the top and bottom, and he waits, as in a film. Each plays once (not again after a fall).
//     { when: { cols: [from, to], rows: [from, to] }, look: { col, row }, panMs, holdMs }
//   zones: while the cat is in a zone's cells, the camera holds its middle at `middleRow` (a row,
//     fractions allowed), instead of looking below him, to show a whole set piece.
//     { cols: [from, to], rows: [from, to], middleRow }
// The scene asks update() each frame whether a shot is playing (then he can't move), and frameY()
// where the camera should keep its middle. Jump or slide during a shot skips it (skip()): the camera
// glides back quickly.
const BARS = { share: 0.09, alpha: 0.5, ms: 700, depth: 95 }; // alpha: see-through, so the level shows behind them
// Skipping: not in the shot's first SKIP_AFTER_MS (a key still held from before doesn't skip it), and
// the camera glides back in SKIP_BACK_MS.
const SKIP_AFTER_MS = 300;
const SKIP_BACK_MS = 600;

const inside = ({ cols, rows }, col, row) => col >= cols[0] && col <= cols[1] && row >= rows[0] && row <= rows[1];
const cellOf = (cat) => ({ col: Math.floor(cat.x / TILE), row: Math.floor((cat.body.bottom - 1) / TILE) });

export class AdventureCameraShots {
  // camera: the level's camera moments, or undefined. follow(): the scene starts following the cat
  // again. home(): where the camera's middle is when it follows him, to glide back to.
  constructor(scene, camera = {}, follow, home) {
    this.home = home;
    this.scene = scene;
    this.shots = (camera.shots ?? []).map((shot) => ({ ...shot, done: false }));
    this.zones = camera.zones ?? [];
    this.follow = follow;
    this.playing = null;
    const bar = () => scene.add.rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT * BARS.share, 0x000000, BARS.alpha)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(BARS.depth).setVisible(false);
    this.bars = [bar(), bar()];
  }

  // Each frame: starts a shot when he stands where one begins. Returns whether a shot is playing.
  update(cat) {
    if (this.playing) return true;
    if (!cat.onGround) return false;
    const { col, row } = cellOf(cat);
    const shot = this.shots.find((s) => !s.done && inside(s.when, col, row));
    if (shot) this.play(shot);
    return Boolean(this.playing);
  }

  play(shot) {
    shot.done = true;
    this.playing = shot;
    this.returning = false;
    this.startedAt = this.scene.time.now;
    const cam = this.scene.cameras.main;
    cam.stopFollow();
    cam.pan(shot.look.col * TILE, shot.look.row * TILE, shot.panMs, 'Sine.easeInOut');
    this.showBars(true);
    this.timers = [this.scene.time.delayedCall(shot.panMs + shot.holdMs, () => this.goBack(shot.panMs))];
  }

  // Back to him, on the same slow curve, the bars opening as it arrives. He moves again, and the
  // camera follows him again, only once it's there, so nothing jumps.
  goBack(ms) {
    this.returning = true;
    const cam = this.scene.cameras.main;
    const { x, y } = this.home();
    cam.pan(x, y, ms, 'Sine.easeInOut', true);
    this.timers = [
      this.scene.time.delayedCall(Math.max(0, ms - BARS.ms), () => this.showBars(false)),
      this.scene.time.delayedCall(ms, () => {
        this.playing = null;
        this.follow();
      }),
    ];
  }

  // Jump or slide during a shot: it ends, gliding back quickly.
  skip() {
    if (!this.playing || this.returning || this.scene.time.now - this.startedAt < SKIP_AFTER_MS) return;
    for (const timer of this.timers) timer.remove();
    this.goBack(SKIP_BACK_MS);
  }

  // The bars slide in from the top and bottom of the screen, and out again.
  showBars(show) {
    const h = GAME.HEIGHT * BARS.share;
    const [top, bottom] = this.bars;
    top.setSize(GAME.WIDTH, h).setVisible(true);
    bottom.setSize(GAME.WIDTH, h).setVisible(true);
    const out = { top: -h, bottom: GAME.HEIGHT }, inn = { top: 0, bottom: GAME.HEIGHT - h };
    top.y = show ? out.top : inn.top;
    bottom.y = show ? out.bottom : inn.bottom;
    this.scene.tweens.add({ targets: top, y: show ? inn.top : out.top, duration: BARS.ms, ease: 'Sine.easeOut' });
    this.scene.tweens.add({
      targets: bottom, y: show ? inn.bottom : out.bottom, duration: BARS.ms, ease: 'Sine.easeOut',
      onComplete: () => { if (!show) this.bars.forEach((b) => b.setVisible(false)); },
    });
  }

  // Where the camera keeps its middle up and down (px), in the zone he's in, or null outside zones.
  frameY(cat) {
    const { col, row } = cellOf(cat);
    const zone = this.zones.find((z) => inside(z, col, row));
    return zone ? zone.middleRow * TILE : null;
  }
}
