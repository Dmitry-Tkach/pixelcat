import Phaser from 'phaser';
import { TILE } from './adventureMap.js';
import { landsFromAbove, staysOn } from './platformLanding.js';

// Platforms that move or fall, in an adventure level:
//   moving logs (the level's `movers`) glide to and fro along their path, pausing at each end. The
//   cat lands on them from above, rides them, and jumps up through them, as on an island.
//   crumbling leaves (map letter %) shake when he lands, fall soon after, and grow back. Leaves side
//   by side are one ledge, and go together.
// The scene calls update every frame. `canLand()` says whether the cat may land on one now (not
// while he's climbing a ladder or pulling himself up).

// speed: px a second. pauseMs: how long a log waits at each end. plank: where the planks are in the
// log's picture, from its top, and how thick, for what he stands on.
const LOG = { speed: 110, pauseMs: 700, plankTop: 13, plankHeight: 22, depth: 2.5 };
// shakeMs: how long leaves shake before they fall. fallMs: how long they take to fall away.
// backMs: how long until they grow back. shake: how far they shake.
const LEAVES = { shakeMs: 520, fallMs: 320, backMs: 3200, shake: 3, depth: 2.6 };

export class AdventurePlatforms {
  constructor(scene, cat, { art, movers = [], leaves = [], canLand }) {
    this.scene = scene;
    this.cat = cat;
    this.canLand = canLand;
    this.riding = null;
    // Leaves don't move, and keep no earlier place: theirs is where they are.
    const fromAbove = (cat_, platform) => this.canLand() && landsFromAbove({
      bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height,
      top: platform.body.top, prevTop: platform.body.prev?.y ?? platform.body.top,
      vy: cat.body.velocity.y, platformVy: platform.body.velocity.y,
    });

    // Moving logs: a strip of bridge planks, as wide as it is, with a body on its planks.
    this.logs = scene.physics.add.group({ allowGravity: false, immovable: true });
    for (const { col, row, width = 3, across = 0, up = 0, speed = LOG.speed } of movers) {
      const log = scene.add.tileSprite(col * TILE, row * TILE, width * TILE, TILE, art('bridge')).setOrigin(0, 0).setDepth(LOG.depth);
      this.logs.add(log);
      log.body.setSize(width * TILE, LOG.plankHeight).setOffset(0, LOG.plankTop);
      // The game carries him along itself (see update), so Phaser doesn't too.
      log.body.setAllowGravity(false).setImmovable(true).setFriction(0, 0);
      log.ends = [{ x: col * TILE, y: row * TILE }, { x: (col + across) * TILE, y: (row - up) * TILE }];
      log.heading = 1; // towards ends[1]
      log.speed = speed;
      log.waitMs = LOG.pauseMs;
    }
    scene.physics.add.collider(cat, this.logs, (cat_, log) => {
      if (cat.body.blocked.down || cat.body.touching.down) this.riding = log;
    }, fromAbove);

    // Crumbling leaves: one picture a cell, with a body, grouped into ledges by the cells they share.
    this.leaves = scene.physics.add.staticGroup();
    const byCell = new Map();
    for (const { col, row } of leaves) {
      // Its top where an island's would be, at the top of its cell.
      const leaf = this.leaves.create(col * TILE + TILE / 2, row * TILE, art('leaves')).setDepth(LEAVES.depth);
      leaf.setY(row * TILE + leaf.height / 2).refreshBody();
      leaf.home = { x: leaf.x, y: leaf.y };
      byCell.set(`${col},${row}`, leaf);
    }
    for (const [cell, leaf] of byCell) {
      if (leaf.ledge) continue;
      const [col, row] = cell.split(',').map(Number);
      const ledge = { leaves: [], state: 'still' };
      for (let c = col; byCell.has(`${c},${row}`); c++) {
        byCell.get(`${c},${row}`).ledge = ledge;
        ledge.leaves.push(byCell.get(`${c},${row}`));
      }
    }
    scene.physics.add.collider(cat, this.leaves, (cat_, leaf) => {
      if (cat.body.blocked.down || cat.body.touching.down) this.crumble(leaf.ledge);
    }, fromAbove);
  }

  // Each log on towards the end it's heading for, then a pause, then back. The log he's riding carries
  // him by as far as it moved this frame, across, and down when it goes down, rather than leaving him
  // to fall a little behind it every step. (Going up, it pushes him up itself.)
  update(ms) {
    const dt = ms / 1000;
    const log = this.riding, body = this.cat.body;
    if (log && staysOn({
      left: body.left, right: body.right, bottom: body.bottom, vy: body.velocity.y,
      top: log.body.top, logLeft: log.body.left, logRight: log.body.right, platformVy: log.body.velocity.y,
    })) {
      this.cat.x += log.body.deltaX();
      if (log.body.deltaY() > 0) this.cat.y += log.body.deltaY();
    } else {
      this.riding = null;
    }
    for (const log of this.logs.getChildren()) {
      if (log.waitMs > 0) {
        log.waitMs -= ms;
        log.body.setVelocity(0, 0);
        continue;
      }
      const target = log.ends[log.heading];
      const dx = target.x - log.x, dy = target.y - log.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= log.speed * dt) {
        log.body.reset(target.x, target.y);
        log.heading = 1 - log.heading;
        log.waitMs = LOG.pauseMs;
        continue;
      }
      log.body.setVelocity((dx / distance) * log.speed, (dy / distance) * log.speed);
    }
  }

  // Leaves he's landed on shake, fall away, and grow back.
  crumble(ledge) {
    if (ledge.state !== 'still') return;
    ledge.state = 'shaking';
    this.scene.audio.playSfx('creak');
    this.scene.tweens.add({
      targets: ledge.leaves, x: `+=${LEAVES.shake}`, duration: 50, yoyo: true, repeat: Math.floor(LEAVES.shakeMs / 100),
      onComplete: () => this.fall(ledge),
    });
  }

  fall(ledge) {
    ledge.state = 'fallen';
    this.scene.audio.playSfx('collapse');
    for (const leaf of ledge.leaves) {
      leaf.disableBody(false, false);
      this.scene.tweens.add({ targets: leaf, y: leaf.home.y + TILE, alpha: 0, duration: LEAVES.fallMs, ease: 'Quad.easeIn' });
    }
    this.scene.time.delayedCall(LEAVES.backMs, () => {
      for (const leaf of ledge.leaves) {
        leaf.setPosition(leaf.home.x, leaf.home.y).setAlpha(0);
        leaf.enableBody(false, 0, 0, true, true);
        leaf.refreshBody();
        this.scene.tweens.add({ targets: leaf, alpha: 1, duration: 300 });
      }
      ledge.state = 'still';
    });
  }
}
