import { ONE_WAY, TILE } from '../adventureMap.js';
import {
  circleHitsRect, crusherAngry, crusherStart, crusherStep, floorRow, landsOnCap, maceAngle, maceHook, rectsTouch, swingPoint,
} from './trapLogic.js';

// Builds a level's moving traps (data/adventure/traps.js) and moves them each frame, while play is
// on: the swinging mace, the stone crusher, the dart idol and the bounce mushroom. The rules are in
// systems/adventure/trapLogic.js. Each trap's timing is offset by its column, so two of a kind
// don't move in step.
const SOUNDS = { slam: 'smash', dart: 'shot', bounce: 'bounce' };
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
    // A long chain swings slower: a level can give it its own periodMs.
    this.maces.push({ swing, hook, reach: chain + r.ballMiddle * r.ballHeight, ms: offset, rules: { ...r, periodMs: trap.periodMs ?? r.periodMs } });
  }

  buildCrusher(trap, x, offset) {
    const r = this.rules.crusher;
    const top = trap.row * TILE;
    const image = this.scene.add.image(x, top, this.art(r.calm)).setOrigin(0.5, 0).setDepth(r.depth);
    const floor = floorRow(this.layout.tiles, trap.col, trap.row) * TILE;
    const state = { ...crusherStart(), ms: offset % r.waitMs };
    this.crushers.push({ image, top, fall: floor - top - image.height, state, rules: r });
  }

  buildIdol(trap, x, feet, offset) {
    const r = this.rules.idol;
    const facing = trap.facing ?? 1;
    const image = this.scene.add.image(x, feet + r.sink, this.art(r.calm)).setOrigin(0.5, 1).setDepth(r.depth).setFlipX(facing < 0);
    const left = image.x - image.width / 2, top = image.y - image.height;
    const mouthX = left + (facing > 0 ? r.mouth.x : 1 - r.mouth.x) * image.width;
    this.idols.push({ image, facing, mouth: { x: mouthX, y: top + r.mouth.y * image.height }, ms: offset % r.everyMs, rules: r });
  }

  buildMushroom(x, feet) {
    const r = this.rules.mushroom;
    const image = this.scene.add.image(x, feet + r.sink, this.art(r.calm)).setOrigin(0.5, 1).setDepth(r.depth);
    // He lands on the cap's top, a little under the picture's top edge (its round dome).
    this.mushrooms.push({ image, cap: { x, top: image.y - image.height * r.capTop, half: (image.width * r.capShare) / 2 }, squashMs: 0, rules: r });
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
      const ball = swingPoint(mace.hook, mace.reach, angle);
      if (circleHitsRect(ball, mace.rules.hitShare * mace.rules.ballHeight, catRect)) this.hurt(ball.x);
    }
    for (const crusher of this.crushers) this.updateCrusher(crusher, ms, catRect);
    for (const idol of this.idols) this.updateIdol(idol, ms);
    this.updateDarts(ms, catRect);
    for (const mushroom of this.mushrooms) this.updateMushroom(mushroom, ms, cat);
    this.prevBottom = body.bottom;
  }

  updateCrusher(crusher, ms, catRect) {
    const { image, rules: r } = crusher;
    const was = crusher.state.phase;
    crusher.state = crusherStep(crusher.state, ms, r, crusher.fall);
    const { phase, drop, slam } = crusher.state;
    image.y = crusher.top + drop;
    if (crusherAngry(phase) !== crusherAngry(was)) image.setTexture(this.art(crusherAngry(phase) ? r.angry : r.calm));
    if (slam) {
      const bottom = image.y + image.height;
      this.scene.effects.dust(image.x - image.width * 0.35, bottom, 5);
      this.scene.effects.dust(image.x + image.width * 0.35, bottom, 5);
      if (this.near(image.x, bottom, r.shakeIfWithin)) this.scene.cameras.main.shake(140, 0.006);
      this.sound('slam', image.x, bottom);
    }
    const inset = r.hitInset;
    const rect = { left: image.x - image.width / 2 + inset, right: image.x + image.width / 2 - inset, top: image.y + inset, bottom: image.y + image.height };
    if (rectsTouch(rect, catRect)) this.hurt(image.x);
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
