import { ONE_WAY, TILE } from '../adventureMap.js';
import { landsFromAbove, staysOn } from '../adventurePlatformLanding.js';
import {
  circleHitsRect, crusherAngry, crusherContact, crusherCrushes, crusherStart, crusherStep, floorRow, landsOnCap, maceAngle,
  maceHook, rectsTouch, swingPoint,
} from './trapLogic.js';

// Builds a level's moving traps (data/adventure/traps.js) and moves them each frame, while play is
// on: the swinging mace, the stone crusher, the dart idol and the bounce mushroom. The rules are in
// systems/adventure/trapLogic.js. Each trap's timing is offset by its column, so two of a kind
// don't move in step.
// The crusher and the idol are solid: he can stand on them (addColliders). The crusher carries him
// as it moves, as a moving log does, and hurts only by falling on him; waiting or lifting, it's
// stone he bumps his head on.
const SOUNDS = { slam: 'smash', dart: 'shot', bounce: 'bounce' };
const SHADOW_KEY = 'trap-shadow'; // a soft dark ellipse, drawn once
const TRAIL_HISTORY = 8; // frames of the ball's places kept, for its fading copies
const HEARD_WITHIN = 900; // px from the camera's middle: further off, a trap makes no sound

export class AdventureTraps {
  // traps: the level's list. hurt(fromX): the cat is hit, from that side.
  constructor(scene, rules, traps, layout, hurt) {
    this.scene = scene;
    this.rules = rules;
    this.layout = layout;
    this.hurt = hurt;
    this.maces = [];
    this.crushers = [];
    this.idols = [];
    this.darts = [];
    this.mushrooms = [];
    this.prevBottom = null;
    this.riding = null; // the crusher he's standing on
    this.crusherBodies = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.idolBodies = scene.physics.add.staticGroup();
    if (!rules) return;
    for (const trap of traps) {
      const x = trap.col * TILE + TILE / 2, feet = (trap.row + 1) * TILE;
      const offset = (trap.col * 397) % 10000; // ms: so traps of a kind don't move in step
      if (trap.kind === 'mace') this.buildMace(trap, x, feet, offset);
      if (trap.kind === 'crusher') this.buildCrusher(trap, x, offset);
      if (trap.kind === 'idol') this.buildIdol(trap, x, feet, offset);
      if (trap.kind === 'mushroom') this.buildMushroom(x, feet);
    }
  }

  art(name) {
    return this.scene.art(name);
  }

  buildMace(trap, x, feet, offset) {
    const r = this.rules.mace;
    const facing = trap.facing ?? 1;
    if (!trap.hanging) {
      this.scene.add.image(x, feet, this.art(r.gallows)).setOrigin(0.5, 1).setDepth(r.depth).setFlipX(facing < 0);
    }
    const hook = maceHook(trap, r);
    const chain = trap.chain ?? r.chain;
    // The chain and ball hang in a container turning round the hook.
    const swing = this.scene.add.container(hook.x, hook.y).setDepth(r.depth + 0.05);
    const linkH = this.scene.textures.get(this.art(r.link)).getSourceImage().height;
    const step = linkH * 0.9;
    for (let y = 0; y < chain; y += step) swing.add(this.scene.add.image(0, y, this.art(r.link)).setOrigin(0.5, 0));
    swing.add(this.scene.add.image(0, chain, this.art(r.ball)).setOrigin(0.5, 0));
    // The ground under it, for its shadow (and a crate).
    const hookCol = Math.floor(hook.x / TILE);
    const groundY = trap.hanging ? (floorRow(this.layout.tiles, hookCol, Math.floor(hook.y / TILE) + 1) ?? this.layout.rows) * TILE : feet;
    this.makeShadowTexture();
    const shadow = this.scene.add.image(hook.x, groundY, SHADOW_KEY).setDepth(r.shadow.depth).setAlpha(0);
    const ghosts = Array.from({ length: r.trail.ghosts }, () => this.scene.add.image(0, 0, this.art(r.ball)).setDepth(r.depth + 0.04).setAlpha(0));
    const crate = trap.crate ? Array.from({ length: r.crate.stack }, (_, i) => {
      const box = this.scene.add.image(hook.x, groundY, this.art(r.crate.picture)).setOrigin(0.5, 1).setDepth(r.depth + 0.03);
      return box.setY(groundY - i * box.height);
    }) : null;
    // A long chain swings slower and less wide: a level can give it its own periodMs and swingDeg.
    this.maces.push({
      swing, hook, chain, groundY, shadow, ghosts, crate, history: [], angle: 0, turning: 0,
      reach: chain + r.ballMiddle * r.ballHeight, ms: trap.phaseMs ?? offset, rules: { ...r, periodMs: trap.periodMs ?? r.periodMs, swingDeg: trap.swingDeg ?? r.swingDeg },
    });
  }

  makeShadowTexture() {
    if (this.scene.textures.exists(SHADOW_KEY)) return;
    const g = this.scene.make.graphics({ add: false });
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x000000, 0.18).fillEllipse(32, 9, 64 - i * 9, 18 - i * 2.5);
    }
    g.generateTexture(SHADOW_KEY, 64, 18);
    g.destroy();
  }

  // How the mace shows its weight, each frame: its shadow, its fading copies when fast, its whoosh
  // and creak, and the crate it smashes.
  updateMaceLook(mace, angle, ms, cat) {
    const r = mace.rules;
    const ball = swingPoint(mace.hook, mace.chain + r.ballHeight / 2, angle);
    // The shadow: under the ball, darker and tighter the lower it swings.
    const high = Math.min(1, Math.max(0, (mace.groundY - (ball.y + r.ballHeight / 2)) / r.shadow.fadeOver));
    mace.shadow.setPosition(ball.x, mace.groundY).setAlpha(r.shadow.alpha.low + (r.shadow.alpha.high - r.shadow.alpha.low) * high)
      .setScale((r.shadow.width / 64) * (1 - 0.4 * high), 1 - 0.3 * high);
    // Fading copies along where the ball just was, when it swings fast.
    const speed = ms > 0 ? Math.abs(angle - mace.angle) / ms : 0;
    mace.history.unshift({ x: ball.x, y: ball.y, angle });
    if (mace.history.length > TRAIL_HISTORY) mace.history.pop();
    const fast = Math.min(1, speed / r.trail.minSpeed - 0.5);
    mace.ghosts.forEach((ghost, i) => {
      const at = mace.history[Math.min(mace.history.length - 1, (i + 1) * 2)];
      ghost.setPosition(at.x, at.y).setRotation(at.angle).setAlpha(Math.max(0, fast) * r.trail.alpha * (1 - i / r.trail.ghosts));
    });
    // The whoosh through the bottom of the swing, and the creak at each end, louder the nearer.
    const turning = Math.sign(angle - mace.angle);
    const near = 1 - Math.hypot(ball.x - cat.x, ball.y - cat.y) / r.sounds.heardWithin;
    if (near > 0.05) {
      if (Math.sign(angle) !== Math.sign(mace.angle) && mace.angle !== 0) this.scene.audio.playSfx(r.sounds.whoosh, near);
      if (turning !== 0 && mace.turning !== 0 && turning !== mace.turning) this.scene.audio.playSfx(r.sounds.creak, near);
    }
    if (turning !== 0) mace.turning = turning;
    mace.angle = angle;
    // The crates, smashed by the first swing that hits them while the player can see them.
    if (mace.crate && this.inView(mace.crate[0], 80)) {
      const [bottom] = mace.crate, top = mace.crate.at(-1);
      const box = { left: bottom.x - bottom.width / 2, right: bottom.x + bottom.width / 2, top: top.y - top.height, bottom: bottom.y };
      if (circleHitsRect(ball, r.ballHeight * r.crate.smashReach, box)) this.smashCrate(mace);
    }
  }

  inView(image, inset) {
    const view = this.scene.cameras.main.worldView;
    return image.x > view.left + inset && image.x < view.right - inset && image.y > view.top && image.y - image.height < view.bottom;
  }

  smashCrate(mace) {
    const { crate: crates, rules: r } = mace;
    const [crate] = crates;
    const x = crate.x, y = crate.y - (crate.height * crates.length) / 2;
    mace.crate = null;
    for (const box of crates) box.destroy();
    const pieces = this.scene.add.particles(x, y, this.art(r.crate.picture), {
      emitting: false, lifespan: 900, speed: { min: 160, max: 420 }, angle: { min: 200, max: 340 }, gravityY: 1100,
      scale: { start: 0.32, end: 0.22 }, rotate: { start: 0, end: 540 }, alpha: { start: 1, end: 0 },
    }).setDepth(r.depth + 0.1);
    pieces.explode(r.crate.pieces);
    this.scene.time.delayedCall(1000, () => pieces.destroy());
    this.scene.effects.dust(x, crate.y, 8);
    this.scene.effects.impact(x, y, 1.2);
    this.scene.cameras.main.shake(120, 0.005);
    this.scene.audio.playSfx('smash');
  }

  // Its body is the stone without its soft moss edges (hitInset), which he stands on and is blocked by.
  buildCrusher(trap, x, offset) {
    const r = this.rules.crusher;
    const top = trap.row * TILE;
    const image = this.crusherBodies.create(x, top, this.art(r.calm)).setDepth(r.depth);
    image.setY(top + image.height / 2);
    image.body.setSize(image.width - r.hitInset * 2, image.height - r.hitInset, false).setOffset(r.hitInset, r.hitInset);
    image.body.setAllowGravity(false).setImmovable(true);
    const floor = floorRow(this.layout.tiles, trap.col, trap.row) * TILE;
    const state = { ...crusherStart(), ms: offset % r.waitMs };
    const crusher = { image, top, fall: floor - top - image.height, state, vy: 0, rules: r };
    image.crusher = crusher;
    this.crushers.push(crusher);
  }

  // Its stone, where he stands or is blocked (left, right, top), in px: from its picture's top left.
  crusherRect({ image, rules: r }) {
    const left = image.x - image.width / 2, top = image.y - image.height / 2;
    return { left: left + r.hitInset, right: left + image.width - r.hitInset, top: top + r.hitInset, bottom: top + image.height };
  }

  buildIdol(trap, x, feet, offset) {
    const r = this.rules.idol;
    const facing = trap.facing ?? 1;
    const image = this.scene.add.image(x, feet + r.sink, this.art(r.calm)).setOrigin(0.5, 1).setDepth(r.depth).setFlipX(facing < 0);
    const left = image.x - image.width / 2, top = image.y - image.height;
    const mouthX = left + (facing > 0 ? r.mouth.x : 1 - r.mouth.x) * image.width;
    // Its stone is solid, from its head down to the ground (not its sink, or its grass).
    const from = left + (facing > 0 ? r.body.left : 1 - r.body.right) * image.width;
    const to = left + (facing > 0 ? r.body.right : 1 - r.body.left) * image.width;
    const stoneTop = top + r.body.top * image.height;
    const stone = this.scene.add.zone((from + to) / 2, (stoneTop + feet) / 2, to - from, feet - stoneTop);
    this.idolBodies.add(stone);
    this.idols.push({ image, facing, mouth: { x: mouthX, y: top + r.mouth.y * image.height }, ms: offset % r.everyMs, rules: r });
  }

  buildMushroom(x, feet) {
    const r = this.rules.mushroom;
    const image = this.scene.add.image(x, feet + r.sink, this.art(r.calm)).setOrigin(0.5, 1).setDepth(r.depth);
    // He lands on the cap's top, a little under the picture's top edge (its round dome).
    this.mushrooms.push({ image, cap: { x, top: image.y - image.height * r.capTop, half: (image.width * r.capShare) / 2 }, squashMs: 0, rules: r });
  }

  // The cat stands on the crushers and idols, and enemies walk into the idols. canLand(): whether he
  // may land now (not while climbing or pulling himself up). Phaser only counts standing on tiles and
  // still bodies, so on a crusher he's told he's standing, to jump.
  addColliders(cat, enemies, canLand) {
    this.scene.physics.add.collider(cat, this.idolBodies);
    this.scene.physics.add.collider(enemies, this.idolBodies);
    this.scene.physics.add.collider(cat, this.crusherBodies, (cat_, image) => {
      if (cat.body.touching.down) {
        cat.body.blocked.down = true;
        this.riding = image.crusher;
      }
    }, (cat_, image) => {
      const { body } = cat;
      const block = this.crusherRect(image.crusher);
      const contact = crusherContact(body, block);
      if (contact === 'top') {
        return canLand() && landsFromAbove({
          bottom: body.bottom, prevBottom: body.prev.y + body.height, top: block.top, vy: body.velocity.y, platformVy: image.crusher.vy,
        });
      }
      // Under it, he bumps his head on it, unless it's coming down on him (then it hurts instead).
      if (contact === 'beneath') return !crusherCrushes(body, block, image.crusher.state);
      return true;
    });
  }

  near(x, y, within) {
    const view = this.scene.cameras.main.worldView;
    return Math.abs(x - view.centerX) < within && Math.abs(y - view.centerY) < within;
  }

  sound(key, x, y) {
    if (this.near(x, y, HEARD_WITHIN)) this.scene.audio.playSfx(SOUNDS[key]);
  }

  // Each frame, while play is on.
  update(ms, cat) {
    const { body } = cat;
    const catRect = { left: body.left, top: body.top, right: body.right, bottom: body.bottom };
    for (const mace of this.maces) {
      mace.ms += ms;
      const angle = maceAngle(mace.ms, mace.rules);
      mace.swing.setRotation(angle);
      this.updateMaceLook(mace, angle, ms, cat);
      const ball = swingPoint(mace.hook, mace.reach, angle);
      if (circleHitsRect(ball, mace.rules.hitShare * mace.rules.ballHeight, catRect)) this.hurt(ball.x);
    }
    for (const crusher of this.crushers) this.updateCrusher(crusher, ms, catRect, cat);
    for (const idol of this.idols) this.updateIdol(idol, ms);
    this.updateDarts(ms, catRect);
    for (const mushroom of this.mushrooms) this.updateMushroom(mushroom, ms, cat);
    this.prevBottom = body.bottom;
  }

  updateCrusher(crusher, ms, catRect, cat) {
    const { image, rules: r } = crusher;
    const was = crusher.state.phase;
    const wasDrop = crusher.state.drop;
    crusher.state = crusherStep(crusher.state, ms, r, crusher.fall);
    const { phase, drop, slam } = crusher.state;
    image.setY(crusher.top + drop + image.height / 2);
    crusher.vy = ms > 0 ? ((drop - wasDrop) * 1000) / ms : 0;
    const block = this.crusherRect(crusher);
    // Riding it: his feet kept on its top as it moves, as on a moving log.
    if (this.riding === crusher) {
      const { body } = cat;
      if (staysOn({ left: body.left, right: body.right, bottom: body.bottom, vy: body.velocity.y, top: block.top, logLeft: block.left, logRight: block.right, platformVy: crusher.vy })) {
        cat.y += block.top - body.bottom;
        body.velocity.y = crusher.vy;
      } else {
        this.riding = null;
      }
    }
    if (crusherAngry(phase) !== crusherAngry(was)) image.setTexture(this.art(crusherAngry(phase) ? r.angry : r.calm));
    if (slam) {
      const bottom = image.y + image.height / 2;
      this.scene.effects.dust(image.x - image.width * 0.35, bottom, 5);
      this.scene.effects.dust(image.x + image.width * 0.35, bottom, 5);
      if (this.near(image.x, bottom, r.shakeIfWithin)) this.scene.cameras.main.shake(140, 0.006);
      this.sound('slam', image.x, bottom);
    }
    if (this.riding !== crusher && crusherCrushes(catRect, block, crusher.state)) this.hurt(image.x);
  }

  updateIdol(idol, ms) {
    const { image, rules: r } = idol;
    idol.ms += ms;
    const warning = idol.ms >= r.everyMs - r.warnMs;
    if (warning !== idol.warning) {
      idol.warning = warning;
      image.setTexture(this.art(warning ? r.angry : r.calm));
    }
    if (idol.ms < r.everyMs) return;
    idol.ms = 0;
    if (!this.near(image.x, image.y, r.wakeWithin)) return;
    const dart = this.scene.add.image(idol.mouth.x, idol.mouth.y, this.art(r.dart)).setDepth(r.depth + 0.1).setFlipX(idol.facing < 0);
    this.darts.push({ image: dart, vx: idol.facing * r.dartSpeed, from: dart.x, rules: r });
    this.sound('dart', dart.x, dart.y);
  }

  updateDarts(ms, catRect) {
    const { tiles } = this.layout;
    this.darts = this.darts.filter((dart) => {
      const { image, rules: r } = dart;
      image.x += (dart.vx * ms) / 1000;
      const tip = image.x + Math.sign(dart.vx) * (image.width / 2);
      const tile = tiles[Math.floor(image.y / TILE)]?.[Math.floor(tip / TILE)] ?? -1;
      const rect = { left: image.x - r.dartHit.w / 2, right: image.x + r.dartHit.w / 2, top: image.y - r.dartHit.h / 2, bottom: image.y + r.dartHit.h / 2 };
      const hitWall = tile >= 0 && !ONE_WAY.has(tile);
      const hitCat = rectsTouch(rect, catRect);
      if (hitCat) this.hurt(image.x);
      if (hitWall || hitCat) {
        this.scene.effects.impact(tip, image.y, 0.5);
        image.destroy();
        return false;
      }
      if (Math.abs(image.x - dart.from) > r.dartRange) {
        // Out of steam: it fades as it drops away.
        this.scene.tweens.add({ targets: image, y: image.y + 60, alpha: 0, angle: Math.sign(dart.vx) * 40, duration: 300, onComplete: () => image.destroy() });
        return false;
      }
      return true;
    });
  }

  updateMushroom(mushroom, ms, cat) {
    const { image, cap, rules: r } = mushroom;
    if (mushroom.squashMs > 0) {
      mushroom.squashMs -= ms;
      if (mushroom.squashMs <= 0) image.setTexture(this.art(r.calm));
    }
    const { body } = cat;
    if (this.prevBottom === null || !landsOnCap({ prevBottom: this.prevBottom, bottom: body.bottom, vy: body.velocity.y, x: cat.x }, cap)) return;
    cat.bounce(r.bounce);
    image.setTexture(this.art(r.squashed));
    mushroom.squashMs = r.squashMs;
    this.sound('bounce', image.x, image.y);
  }
}
