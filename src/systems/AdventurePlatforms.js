import Phaser from 'phaser';
import { TILE } from './adventureMap.js';
import { landsFromAbove, staysOn } from './adventurePlatformLanding.js';
import { BROKEN_SEAT, HUB, hitsHub, reversed, seatPlace, wheelHub, wheelWith } from './adventure/wheels.js';
import { TRAP_FREEZE, frostAfterHit } from '../data/adventure/freeze.js';
import { freezeTrap, updateTrapIce } from './adventure/trapIce.js';
import { drawWheel } from './adventure/wheelLook.js';
import { ARROW_STONE, arrowAngle, hitsStone, stoneTextures } from './adventure/arrowStones.js';
import { MILL_SEAT } from '../data/adventure/millArt.js';

// Platforms that move or fall, in an adventure level:
//   moving logs (the level's `movers`) glide to and fro along their path, pausing at each end. The
//   cat lands on them from above, rides them, and jumps up through them, as on an island.
//   water wheels (the level's `wheels`, adventure/wheels.js) turn, carrying seats round that stay
//   level. A seat is ridden like a log: it's one, moving round a circle instead of to and fro. A
//   round into a wheel's green hub turns it the other way; three freeze rounds stop it for a while,
//   its seats still steps (watchShots).
//   arrow stones (a log with { arrow: true }, adventure/arrowStones.js) are logs of stone with a green
//   arrow showing which way they go next: a round turns one back; three freeze rounds stop it.
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
  constructor(scene, cat, { art, movers = [], wheels = [], leaves = [], canLand }) {
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
    this.stones = [];
    for (const { col, row, width = 3, across = 0, up = 0, speed = LOG.speed, arrow = false, parks = false } of movers) {
      const look = arrow ? stoneTextures(scene, width) : null;
      const log = arrow
        ? scene.add.image(col * TILE, row * TILE, look.stone).setOrigin(0, 0).setDepth(LOG.depth)
        : scene.add.tileSprite(col * TILE, row * TILE, width * TILE, TILE, art('bridge')).setOrigin(0, 0).setDepth(LOG.depth);
      this.logs.add(log);
      log.body.setSize(width * TILE, LOG.plankHeight).setOffset(0, LOG.plankTop);
      // The game carries him along itself (see update), so Phaser doesn't too.
      log.body.setAllowGravity(false).setImmovable(true).setFriction(0, 0);
      log.ends = [{ x: col * TILE, y: row * TILE }, { x: (col + across) * TILE, y: (row - up) * TILE }];
      log.heading = 1; // towards ends[1]
      log.speed = speed;
      log.parks = parks;
      if (arrow) {
        log.mark = scene.add.image(0, 0, look.mark).setDepth(LOG.depth + 0.05);
        Object.assign(log, { reverseMs: 0, frost: 0, frostMs: 0, rules: { depth: LOG.depth + 0.1 } });
        this.stones.push(log);
      }
      log.waitMs = parks ? Infinity : LOG.pauseMs; // a parking stone waits to be called
    }
    // Water wheels: the wheel drawn behind, and its seats, logs as wide as seatWidth.
    this.wheels = wheels.map((options) => {
      const wheel = wheelWith(options);
      const seats = Array.from({ length: wheel.seats }, (_, i) => {
        const at = seatPlace(wheel, i, 0);
        const width = wheel.seatWidth * TILE;
        // The owner's seat picture, when it's there and the seat is its width; else bridge planks.
        const drawn = width === MILL_SEAT.width && scene.textures.exists(art('mill-seat'));
        const top = drawn ? MILL_SEAT.top : LOG.plankTop;
        const seat = drawn
          ? scene.add.image(at.x - width / 2, at.y - top, art('mill-seat')).setOrigin(0, 0).setDepth(LOG.depth)
          : scene.add.tileSprite(at.x - width / 2, at.y - top, width, TILE, art('bridge')).setOrigin(0, 0).setDepth(LOG.depth);
        this.logs.add(seat);
        seat.body.setSize(width, LOG.plankHeight).setOffset(0, top);
        seat.body.setAllowGravity(false).setImmovable(true).setFriction(0, 0);
        seat.seatIndex = i;
        seat.top = top;
        if (wheel.broken.includes(i)) seat.rotten = 'still'; // looks like the others (BROKEN_SEAT)
        return seat;
      });
      return { wheel, seats, look: drawWheel(scene, wheel, art, scene.level), ms: 0, rules: { depth: 2.55 }, reverseMs: 0, frost: 0, frostMs: 0 };
    });
    scene.physics.add.collider(cat, this.logs, (cat_, log) => {
      if (!(cat.body.blocked.down || cat.body.touching.down)) return;
      this.riding = log;
      if (log.rotten === 'still') this.breakSeat(log);
      if (log.parks && log.waitMs === Infinity) log.waitMs = ARROW_STONE.setOffMs; // landed on: it goes
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
  // him across by as far as it moved this frame, and keeps his feet on its top.
  // "This frame" is from where it was when the frame began (Phaser's prevFrame), not its last physics
  // step (deltaX): a slow computer takes two steps in some frames, a fast screen none in some, and
  // carrying him by one step's worth made him drift along the log, backwards or forwards.
  // Up and down, his feet are put on its top and he's given its speed, rather than carried by how far
  // it moved: carried down while he also fell by his own weight, he moved down twice, sank into the
  // log further than Phaser separates in one step (on a slow computer), and dropped through.
  update(ms) {
    const dt = ms / 1000;
    const log = this.riding, body = this.cat.body;
    if (log && log.body.enable && this.canLand() && staysOn({
      left: body.left, right: body.right, bottom: body.bottom, vy: body.velocity.y,
      top: log.body.top, logLeft: log.body.left, logRight: log.body.right, platformVy: log.body.velocity.y,
    })) {
      const { position, prevFrame } = log.body;
      this.cat.x += position.x - prevFrame.x;
      this.cat.y += log.body.top - body.bottom;
      body.velocity.y = log.body.velocity.y;
    } else {
      this.riding = null;
    }
    this.turnWheels(ms);
    for (const log of this.logs.getChildren()) {
      if (log.seatIndex !== undefined) continue; // a wheel's seat (turnWheels)
      if (log.mark && updateTrapIce(this.scene, log, ms, this.stoneBox(log))) {
        log.body.setVelocity(0, 0); // a frozen arrow stone: still
        continue;
      }
      if (log.waitMs > 0) {
        log.waitMs -= ms;
        log.body.setVelocity(0, 0);
        continue;
      }
      const target = log.ends[log.heading];
      const dx = target.x - log.x, dy = target.y - log.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= log.speed * dt) {
        // It snaps the last bit to its end: the cat on it goes with it, so he doesn't slip. That's
        // from where its body is now, as its picture only catches up after this update.
        if (log === this.riding) {
          const snapX = target.x - log.body.position.x;
          const snapY = target.y + LOG.plankTop - log.body.position.y;
          this.cat.x += snapX;
          this.cat.y += snapY;
        }
        log.body.reset(target.x, target.y);
        log.heading = 1 - log.heading;
        log.waitMs = log.parks ? Infinity : LOG.pauseMs;
        continue;
      }
      log.body.setVelocity((dx / distance) * log.speed, (dy / distance) * log.speed);
    }
    this.showArrows();
  }

  // Each arrow stone's arrow, on its face, pointing the way it's going next.
  showArrows() {
    for (const stone of this.stones) {
      const from = stone.ends[1 - stone.heading], to = stone.ends[stone.heading];
      const { body } = stone;
      stone.mark.setPosition(body.center.x, body.top + ARROW_STONE.slab.height / 2 - 2)
        .setRotation(arrowAngle(from, to));
    }
  }

  // Where a stone's ice goes: its slab.
  stoneBox(stone) {
    const { body } = stone;
    return { left: body.left, right: body.right, top: body.top, bottom: body.top + ARROW_STONE.slab.height };
  }

  // A round turned it: it heads back the other way at once, its arrow flashing. A parked one, its
  // arrow already pointing the way back, just sets off.
  reverseStone(stone) {
    if (stone.waitMs !== Infinity) stone.heading = 1 - stone.heading;
    stone.waitMs = 0;
    stone.reverseMs = ARROW_STONE.reverseCooldownMs;
    stone.mark.setTintFill(0xffffff);
    this.scene.time.delayedCall(ARROW_STONE.flashMs, () => stone.mark.clearTint());
    this.scene.audio.playSfx('creak');
  }

  // Each wheel turns, and each seat is sent on towards where it'll be next frame, by its speed: the
  // log riding above carries him by how far it really moved. Aiming at where it should be, rather
  // than turning it by a step, keeps it on its circle however the frames fall.
  turnWheels(ms) {
    if (ms <= 0) return;
    this.shootHubs(ms);
    for (const w of this.wheels) {
      if (updateTrapIce(this.scene, w, ms, this.hubBox(w))) {
        for (const seat of w.seats) seat.body.setVelocity(0, 0); // frozen: the seats are still steps
        continue;
      }
      w.ms += ms;
      w.look.setRotation((w.wheel.dir * 2 * Math.PI * w.ms) / w.wheel.periodMs);
      for (const seat of w.seats) {
        if (seat.rotten === 'fallen') continue; // broken off: a new one grows back (breakSeat)
        const at = seatPlace(w.wheel, seat.seatIndex, w.ms + ms);
        const { position, width } = seat.body;
        seat.body.setVelocity(((at.x - width / 2 - position.x) * 1000) / ms, ((at.y - position.y) * 1000) / ms);
      }
    }
  }

  // A rotten seat he's landed on: it rocks and creaks, then breaks and falls into the river, gone
  // for good.
  breakSeat(seat) {
    seat.rotten = 'shaking';
    this.scene.audio.playSfx('creak');
    const { wobbleDeg, shakeMs, fallMs, fallPx } = BROKEN_SEAT;
    this.scene.tweens.add({ targets: seat, angle: { from: -wobbleDeg, to: wobbleDeg }, duration: 70, yoyo: true, repeat: Math.floor(shakeMs / 140) });
    this.scene.time.delayedCall(shakeMs, () => {
      seat.rotten = 'fallen';
      this.scene.tweens.killTweensOf(seat);
      seat.setAngle(0);
      // A seat is a plain picture given a body (not a physics sprite), so its body is switched off
      // itself: it has no disableBody.
      seat.body.setVelocity(0, 0);
      seat.body.enable = false;
      if (this.riding === seat) this.riding = null;
      this.scene.audio.playSfx('collapse');
      this.scene.tweens.add({ targets: seat, y: seat.y + fallPx, angle: 25, alpha: 0, duration: fallMs, ease: 'Quad.easeIn', onComplete: () => seat.setVisible(false) });
    });
  }

  // The cat's rounds in flight: list() gives them, landed(round) spends one that hit a hub.
  watchShots(list, landed) {
    this.shotList = list;
    this.shotLanded = landed;
  }

  // Rounds into a hub: a freeze round frosts it (three freeze it); any other turns it the other way.
  // And rounds into an arrow stone: a freeze round frosts it; any other turns it back.
  shootHubs(ms) {
    for (const w of [...this.wheels, ...this.stones]) {
      w.reverseMs = Math.max(0, w.reverseMs - ms);
      if (w.frost && !w.frozen && (w.frostMs -= ms) <= 0) {
        w.frost = 0;
        for (const look of this.iceLooks(w)) look.clearTint();
      }
    }
    if (!this.shotList) return;
    for (const shot of this.shotList().slice()) {
      if (!shot.active) continue;
      const stone = this.stones.find((s) => s !== this.riding && hitsStone(this.stoneBox(s), shot.x, shot.y));
      if (stone) {
        this.shotLanded(shot);
        if (shot.ammo?.freeze) this.frostWheel(stone);
        else if (!stone.frozen && stone.reverseMs === 0) this.reverseStone(stone);
        continue;
      }
      const w = this.wheels.find((wheel) => hitsHub(wheel.wheel, shot.x, shot.y));
      if (!w) continue;
      this.shotLanded(shot);
      if (shot.ammo?.freeze) this.frostWheel(w);
      else if (!w.frozen && w.reverseMs === 0) this.reverseWheel(w);
    }
  }

  reverseWheel(w) {
    const turned = reversed({ dir: w.wheel.dir, ms: w.ms });
    w.wheel = { ...w.wheel, dir: turned.dir };
    w.ms = turned.ms;
    w.reverseMs = HUB.reverseCooldownMs;
    this.scene.audio.playSfx('creak');
    this.scene.cameras.main.shake(120, 0.003);
  }

  // What turns icy on a frosted or frozen wheel (its picture and its seats) or arrow stone (it and
  // its arrow).
  iceLooks(w) {
    const looks = w.mark ? [w, w.mark] : [w.look, ...w.seats];
    return looks.filter((look) => typeof look.setTint === 'function');
  }

  frostWheel(w) {
    if (!w.frozen) {
      const { frost, freezes } = frostAfterHit(w.frost);
      w.frost = frost;
      w.frostMs = TRAP_FREEZE.frostFadeMs;
      if (!freezes) {
        for (const look of this.iceLooks(w)) look.setTint(TRAP_FREEZE.frostTints[frost - 1] ?? TRAP_FREEZE.frostTints.at(-1));
        return;
      }
    }
    freezeTrap(this.scene, w, { looks: this.iceLooks(w), rect: w.mark ? this.stoneBox(w) : this.hubBox(w), depth: w.rules.depth });
  }

  // The ice over a frozen wheel's hub.
  hubBox(w) {
    const hub = wheelHub(w.wheel);
    const r = w.wheel.radius * TILE * HUB.hubShare;
    return { left: hub.x - r, right: hub.x + r, top: hub.y - r, bottom: hub.y + r };
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
