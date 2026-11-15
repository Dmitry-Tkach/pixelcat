import Phaser from 'phaser';
import { BIRD, PTERO_FRAMES, birdHome, diveAt, hoverY, inReach, orbitAt } from '../data/adventure/birds.js';
import { FREEZE } from '../data/adventure/freeze.js';
import { breakIce, isFrozen, updateIce } from '../systems/adventure/iceBlocks.js';
import { putOut, updateBurn } from '../systems/adventure/burning.js';
import { TILE } from '../systems/adventureMap.js';

// The pterodactyl (data/adventure/birds.js for how it behaves and its numbers). It's in the scene's
// enemy group, like the walkers and gunners, so rounds, stomps, the dash, freezing and fire all work
// on it as on them; it has no gravity, so frozen it hangs in the air, a block to stand on.
// canTarget(): whether the cat may be dived at now (on solid ground, not riding a wheel).
//
// Its frames are the owner's (data/adventure/birds.js, PTERO_FRAMES). Without them, it's drawn in
// code: an orange-red body, red-brown wings up, down or folded, a yellow beak and crest.
const STAND_IN = { key: 'adventure-ptero-standin', w: 128, h: 80 };
const SHOT_FLASH_MS = 70;
const WARN_FLASH = { tint: 0xfff27a, everyMs: 90 };

export class AdventureBird extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, { kind, col, row, wake, ...flight }, canTarget) {
    makeStandIn(scene);
    const home = birdHome({ col, row });
    super(scene, home.x, home.y, STAND_IN.key, 'up');
    // The owner's frames, by name, if they're there; else null, and the stand-in's frames.
    this.drawn = scene.textures.exists(scene.art('ptero-fly-0'))
      ? Object.fromEntries(Object.keys(PTERO_FRAMES).map((name) => [name, scene.art(`ptero-${name}`)]))
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
    this.flight = flight; // an orbit's radius, period, direction and phase
    this.state = kind === 'diver' ? 'asleep' : kind;
    if (kind === 'orbit') {
      const at = orbitAt(home, 0, flight);
      this.setPosition(at.x, at.y);
    }
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
      case 'orbit': {
        const at = orbitAt(this.home, this.clock + ms, this.flight);
        const vx = ((at.x - this.x) * 1000) / Math.max(1, ms);
        this.setVelocity(vx, ((at.y - this.y) * 1000) / Math.max(1, ms));
        this.face(Math.sign(vx) || this.direction);
        this.flap('fly');
        break;
      }
      case 'asleep':
        this.bobHome(ms);
        if (this.wakeX === null || body.center.x >= this.wakeX) this.enter('waiting');
        break;
      case 'waiting':
        this.bobHome(ms);
        this.face(toCat);
        if (this.ms >= BIRD.firstAfterMs && this.canTarget() && inReach(this.x, this.y, body.center.x, body.center.y)) {
          this.aim = diveAt(this.x, this.y, body.center.x, body.center.y);
          this.face(this.aim.dir);
          this.enter('warning');
          this.scene.audio.playSfx('shot'); // its screech, until it has a sound of its own
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
          this.enter('diving');
        }
        break;
      case 'diving': {
        this.pose('dive', `dive-${Math.min(2, Math.floor(this.ms / 90))}`);
        const flown = Math.hypot(this.x - this.from.x, this.y - this.from.y);
        if (flown >= this.aim.distance || this.body.blocked.down || this.body.blocked.left || this.body.blocked.right) this.enter('returning');
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

  enter(state, ms = 0) {
    this.state = state;
    this.ms = ms;
  }

  // At home: a gentle bob, flapping.
  bobHome(ms) {
    const y = this.home.y + Math.sin((2 * Math.PI * this.clock) / BIRD.bob.ms) * BIRD.bob.px;
    this.setVelocity(((this.home.x - this.x) * 1000) / Math.max(1, ms), ((y - this.y) * 1000) / Math.max(1, ms));
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
