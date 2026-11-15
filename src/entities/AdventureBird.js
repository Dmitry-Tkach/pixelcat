import Phaser from 'phaser';
import { BIRD, PTERO_FRAMES, PTERO_LOOKS, birdHome, diveAt, hoverY, inReach, waitingAt } from '../data/adventure/birds.js';
import { FREEZE } from '../data/adventure/freeze.js';
import { breakIce, isFrozen, updateIce } from '../systems/adventure/iceBlocks.js';
import { putOut, updateBurn } from '../systems/adventure/burning.js';
import { TILE } from '../systems/adventureMap.js';

// The pterodactyl (data/adventure/birds.js for how it behaves and its numbers). It's in the scene's
// enemy group, like the walkers and gunners, so rounds, stomps, the dash, freezing and fire all work
// on it as on them; it has no gravity, so frozen it hangs in the air, a block to stand on.
// canTarget(riders): whether the cat may be dived at now: on solid ground, or, if riders, on a seat.
//
// Its frames are the owner's (data/adventure/birds.js, PTERO_FRAMES). Without them, it's drawn in
// code: an orange-red body, red-brown wings up, down or folded, a yellow beak and crest.
const STAND_IN = { key: 'adventure-ptero-standin', w: 128, h: 80 };
const SHOT_FLASH_MS = 70;
const WARN_FLASH = { tint: 0xfff27a, everyMs: 90 };

export class AdventureBird extends Phaser.Physics.Arcade.Sprite {
  // flock: every bird in the level, so divers take turns.
  constructor(scene, { kind, col, row, wake, patrol = 0, riders = false, look = 'orange' }, canTarget, flock = []) {
    makeStandIn(scene);
    const home = birdHome({ col, row });
    super(scene, home.x, home.y, STAND_IN.key, 'up');
    // The owner's frames, by name, if they're there; else null, and the stand-in's frames.
    const prefix = PTERO_LOOKS[look] ?? PTERO_LOOKS.orange;
    this.drawn = scene.textures.exists(scene.art(`${prefix}-fly-0`))
      ? Object.fromEntries(Object.keys(PTERO_FRAMES).map((name) => [name, scene.art(`${prefix}-${name}`)]))
      : null;
    if (this.drawn) this.setTexture(this.drawn['fly-0']); // before its body is sized, so it's centred on it
    this.kind = kind;
    this.info = BIRD;
    this.home = home;
    this.wakeX = wake !== undefined ? wake * TILE : null;
    this.canTarget = canTarget;
    this.softHit = BIRD.softHit;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5.5);
    this.hp = BIRD.hp;
    this.dead = false;
    this.patrol = patrol;
    this.flock = flock;
    this.diveEndMs = -Infinity;
    this.riders = riders;
    this.state = kind === 'hover' ? 'hover' : 'asleep';
    this.ms = 0; // in its current state
    this.clock = 0; // for its bob, its hover and its flap
    this.face(-1);
  }

  // Called once it's in the enemy group, which would give it gravity.
  ready() {
    this.body.setAllowGravity(false).setSize(BIRD.body.w, BIRD.body.h);
    return this;
  }

  // -1 is left, as it's drawn.
  face(direction) {
    this.direction = direction;
    this.setFlipX(direction > 0);
  }

  update(cat, ms) {
    if (this.dead) return;
    if (updateIce(this, ms) || updateBurn(this, ms)) {
      this.setVelocity(0, 0); // frozen, it hangs where it was; burning, it flounders
      return;
    }
    this.ms += ms;
    this.clock += ms;
    const { body } = cat;
    const toCat = Math.sign(body.center.x - this.x) || this.direction;
    switch (this.state) {
      case 'hover': {
        const y = hoverY(this.home.y, this.clock);
        this.setVelocity(0, ((y - this.y) * 1000) / Math.max(1, ms));
        this.face(toCat);
        this.flap('glide');
        break;
      }
      case 'asleep':
        this.bobHome(ms);
        if (this.wakeX === null || body.center.x >= this.wakeX) this.enter('waiting');
        break;
      case 'waiting':
        this.bobHome(ms);
        this.face(toCat);
        if (this.ms >= BIRD.firstAfterMs && !this.othersBusy() && this.canTarget(this.riders) && inReach(this.x, this.y, body.center.x, body.center.y)) {
          this.aim = diveAt(this.x, this.y, body.center.x, body.center.y);
          this.face(this.aim.dir);
          this.enter('warning');
          this.scene.audio.playSfx(BIRD.sounds.screech); // its screech, until it has a sound of its own
        }
        break;
      case 'warning':
        this.setVelocity(0, 0);
        this.pose('spread', `screech-${Math.min(2, Math.floor((3 * this.ms) / BIRD.warnMs))}`);
        if (Math.floor(this.ms / WARN_FLASH.everyMs) % 2) this.setTintFill(WARN_FLASH.tint);
        else this.clearTint();
        if (this.ms >= BIRD.warnMs) {
          this.clearTint();
          this.from = { x: this.x, y: this.y };
          this.setVelocity(this.aim.vx, this.aim.vy);
          this.scene.audio.playSfx(BIRD.sounds.dive); // the moment to jump
          this.enter('diving');
        }
        break;
      case 'diving': {
        this.pose('dive', `dive-${Math.min(2, Math.floor(this.ms / 90))}`);
        const flown = Math.hypot(this.x - this.from.x, this.y - this.from.y);
        if (flown >= this.aim.distance || this.body.blocked.down || this.body.blocked.left || this.body.blocked.right) {
          this.diveEndMs = this.scene.time.now;
          this.enter('returning');
        }
        break;
      }
      case 'returning': {
        this.flap('fly');
        const dx = this.home.x - this.x, dy = this.home.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d < 8) {
          this.setVelocity(0, 0);
          this.enter('resting');
        } else {
          this.face(Math.sign(dx) || this.direction);
          this.setVelocity((dx / d) * BIRD.returnSpeed, (dy / d) * BIRD.returnSpeed);
        }
        break;
      }
      case 'resting':
        this.bobHome(ms);
        this.face(toCat);
        if (this.ms >= BIRD.restMs) this.enter('waiting', BIRD.firstAfterMs); // ready at once
        break;
      default:
        break;
    }
  }

  // Whether another bird is warning or diving, or ended a dive less than apartMs ago.
  othersBusy() {
    const now = this.scene.time.now;
    return this.flock.some((bird) => bird !== this && !bird.dead
      && (bird.state === 'warning' || bird.state === 'diving' || now - bird.diveEndMs < BIRD.apartMs));
  }

  // He's back at a checkpoint at x: a diver he hasn't reached from there goes home and back to
  // sleep, so none is waiting, awake, over where he comes back.
  sleepAgain(x) {
    if (this.dead || this.kind !== 'diver' || this.wakeX === null || this.wakeX <= x || this.frozenMs > 0) return;
    this.clearTint();
    this.body.reset(this.home.x, this.home.y);
    this.enter('asleep');
  }

  enter(state, ms = 0) {
    this.state = state;
    this.ms = ms;
  }

  // Waiting: a gentle bob at home, or flying to and fro on its beat, flapping. It flies onto its
  // beat no faster than homeSpeed, so coming back from a dive it doesn't jump.
  bobHome(ms) {
    const at = waitingAt(this.home, this.clock, this.patrol);
    let vx = ((at.x - this.x) * 1000) / Math.max(1, ms), vy = ((at.y - this.y) * 1000) / Math.max(1, ms);
    const speed = Math.hypot(vx, vy);
    if (speed > BIRD.homeSpeed) {
      vx *= BIRD.homeSpeed / speed;
      vy *= BIRD.homeSpeed / speed;
    }
    this.setVelocity(vx, vy);
    this.flap('fly');
  }

  flap(how) {
    if (how === 'glide') this.pose('spread', `glide-${Math.floor(this.clock / (BIRD.flapMs * 4)) % 2}`);
    else this.pose(Math.floor(this.clock / BIRD.flapMs) % 2 ? 'down' : 'up', `fly-${Math.floor(this.clock / BIRD.flapMs) % 6}`);
  }

  // Shows a pose: the owner's frame `name` if it has its art, else the stand-in's frame.
  pose(standIn, name) {
    if (this.drawn) this.setTexture(this.drawn[name]);
    else this.setFrame(standIn);
  }

  // Stands still, for when the level ends.
  halt() {
    if (!this.dead) this.setVelocity(0, 0);
  }

  // A round: it flashes. Returns whether that was its last.
  takeShot() {
    this.hp -= 1;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(SHOT_FLASH_MS, () => this.clearTint());
    return this.hp <= 0;
  }

  // Knocked out: it tumbles out of the sky, turning, and fades.
  knockOut() {
    if (isFrozen(this)) breakIce(this, FREEZE.shards);
    putOut(this);
    this.dead = true;
    this.body.enable = false;
    this.clearTint();
    this.pose('spread', 'hit-0');
    this.scene.time.delayedCall(120, () => this.pose('spread', 'hit-1'));
    this.scene.time.delayedCall(260, () => this.pose('spread', 'fall-0'));
    this.scene.time.delayedCall(520, () => this.pose('spread', 'fall-1'));
    this.scene.tweens.add({
      targets: this, y: this.y + 420, angle: 200 * this.direction, alpha: 0, duration: 900, ease: 'Quad.easeIn',
      onComplete: () => this.destroy(),
    });
  }
}

// The stand-in picture, drawn once: frames up, down (wings), spread (warning, gliding) and dive.
// Returns its texture's key (the scenery's harmless fly-bys use it too).
export function makeStandIn(scene) {
  if (scene.textures.exists(STAND_IN.key)) return STAND_IN.key;
  const { w, h } = STAND_IN;
  const poses = { up: -1, down: 1, spread: 0, dive: 2 };
  const canvas = scene.textures.createCanvas(STAND_IN.key, w * 4, h);
  const ctx = canvas.getContext();
  Object.entries(poses).forEach(([name, wing], i) => {
    const ox = i * w, cx = ox + w / 2, cy = h / 2 + 6;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#7a2a12';
    // The wings: a leathery triangle each side, raised, lowered, spread level or folded back.
    ctx.fillStyle = '#a8401f';
    const tip = wing === 2 ? { x: cx + 26, y: cy - 4 } : { x: cx + 54, y: cy + wing * 26 - 6 };
    const tip2 = wing === 2 ? { x: cx + 18, y: cy + 6 } : { x: cx - 4, y: cy + wing * 30 - 4 };
    ctx.beginPath(); ctx.moveTo(cx - 6, cy - 4); ctx.lineTo(tip.x, tip.y); ctx.lineTo(cx + 18, cy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 2); ctx.lineTo(tip2.x, tip2.y); ctx.lineTo(cx + 8, cy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    // The body, the head, the crest and the beak, facing left.
    ctx.fillStyle = '#e8622c';
    ctx.beginPath(); ctx.ellipse(cx + 4, cy + 2, 22, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx - 20, cy - 6, 11, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2c230';
    const down = wing === 2 ? 8 : 0;
    ctx.beginPath(); ctx.moveTo(cx - 28, cy - 8); ctx.lineTo(cx - 56, cy - 2 + down); ctx.lineTo(cx - 28, cy - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 16, cy - 12); ctx.lineTo(cx + 4, cy - 24); ctx.lineTo(cx - 10, cy - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6c0';
    ctx.beginPath(); ctx.arc(cx - 22, cy - 8, 3, 0, Math.PI * 2); ctx.fill();
    canvas.add(name, 0, ox, 0, w, h);
  });
  canvas.refresh();
  return STAND_IN.key;
}
