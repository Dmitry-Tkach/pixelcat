import Phaser from 'phaser';
import { ONE_WAY, TILE } from '../adventureMap.js';
import { landsFromAbove, staysOn } from '../adventurePlatformLanding.js';
import {
  circleHitsRect, crusherAngry, crusherContact, crusherCrushes, crusherStart, crusherStep, floorRow, guardianBall,
  guardianFireColumn, guardianFirePhase, guardianGeometry, guardianPhase, guardianSolid, guardianSwing, landsOnCap, maceAngle, maceHook, rectsTouch, swingPoint,
} from './trapLogic.js';
import { TRAP_FREEZE, canFreezeTrap, frostAfterHit, frozenBallBlock } from '../../data/adventure/freeze.js';
import { freezeTrap, updateTrapIce } from './trapIce.js';

// Builds a level's moving traps (data/adventure/traps.js) and moves them each frame, while play is
// on: the swinging mace, the stone crusher, the dart idol and the bounce mushroom. The rules are in
// systems/adventure/trapLogic.js. Each trap's timing is offset by its column, so two of a kind
// don't move in step.
// The crusher and the idol are solid: he can stand on them (addColliders). The crusher carries him
// as it moves, as a moving log does, and hurts only by falling on him; waiting or lifting, it's
// stone he bumps his head on.
// Freeze rounds freeze a mace, a crusher or an idol for a while, a few of them close together
// (TRAP_FREEZE.shots, adventure/trapIce.js): it stops still and can't hurt, and a frozen mace's ball is ice he can stand on (iceBodies).
const SOUNDS = { slam: 'smash', dart: 'shot', bounce: 'bounce', pour: 'ignite' };
const SHADOW_KEY = 'trap-shadow'; // a soft dark ellipse, drawn once
const TRAIL_HISTORY = 8; // frames of the ball's places kept, for its fading copies
const ENEMY_NEAR = 300; // px across: enemies further than this from a mace's ball aren't checked
const HEARD_WITHIN = 900; // px from the camera's middle: further off, a trap makes no sound
const SHOT_HALF = 12; // px: half a round's size, when checking whether it hits a trap

export class AdventureTraps {
  // traps: the level's list. hurt(fromX): the cat is hit, from that side. knockOut(enemy): an enemy
  // is knocked out by a trap.
  constructor(scene, rules, traps, layout, hurt, knockOut) {
    this.scene = scene;
    this.rules = rules;
    this.layout = layout;
    this.hurt = hurt;
    this.knockOut = knockOut;
    this.maces = [];
    this.crushers = [];
    this.idols = [];
    this.darts = [];
    this.mushrooms = [];
    this.guardians = [];
    this.prevBottom = null;
    this.riding = null; // the crusher he's standing on
    this.crusherBodies = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.idolBodies = scene.physics.add.staticGroup();
    this.iceBodies = scene.physics.add.staticGroup(); // frozen maces' balls, to stand on
    this.shotList = null; // the cat's rounds in flight (watchShots)
    if (!rules) return;
    for (const trap of traps) {
      const x = trap.col * TILE + TILE / 2, feet = (trap.row + 1) * TILE;
      const offset = (trap.col * 397) % 10000; // ms: so traps of a kind don't move in step
      if (trap.kind === 'mace') this.buildMace(trap, x, feet, offset);
      if (trap.kind === 'crusher') this.buildCrusher(trap, x, offset);
      if (trap.kind === 'idol') this.buildIdol(trap, x, feet, offset);
      if (trap.kind === 'mushroom') this.buildMushroom(x, feet);
      if (trap.kind === 'guardian') this.buildGuardian(trap);
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
    const look = this.makeBallLook(this.art(r.ball), hook.x, groundY, r.depth + 0.04, r);
    const crate = trap.crate ? Array.from({ length: r.crate.stack }, (_, i) => {
      const box = this.scene.add.image(hook.x, groundY, this.art(r.crate.picture)).setOrigin(0.5, 1).setDepth(r.depth + 0.03);
      return box.setY(groundY - i * box.height);
    }) : null;
    // A long chain swings slower and less wide: a level can give it its own periodMs and swingDeg.
    this.maces.push({
      ...look, swing, hook, chain, crate, angle: 0, turning: 0,
      reach: chain + r.ballMiddle * r.ballHeight, ms: trap.phaseMs ?? offset, rules: { ...r, periodMs: trap.periodMs ?? r.periodMs, swingDeg: trap.swingDeg ?? r.swingDeg },
    });
  }

  // An enemy the ball swings into is knocked out, as if the cat had done it: he can lure them in.
  maceHitsEnemies(ball, reach) {
    if (!this.enemies) return;
    for (const enemy of this.enemies.getChildren()) {
      if (enemy.dead || !enemy.body || Math.abs(enemy.x - ball.x) > ENEMY_NEAR) continue;
      const { body } = enemy;
      if (circleHitsRect(ball, reach, { left: body.left, top: body.top, right: body.right, bottom: body.bottom })) this.knockOut(enemy);
    }
  }

  // A swinging ball's shadow and fading copies (the mace's, and the guardian's): look.shadow, a
  // picture of SHADOW_KEY; look.ghosts, copies of the ball; look.history, where it's just been.
  makeBallLook(ballKey, x, groundY, depth, { shadow, trail }) {
    this.makeShadowTexture();
    return {
      groundY,
      shadow: this.scene.add.image(x, groundY, SHADOW_KEY).setDepth(shadow.depth).setAlpha(0),
      ghosts: Array.from({ length: trail.ghosts }, () => this.scene.add.image(0, 0, ballKey).setDepth(depth).setAlpha(0)),
      history: [],
    };
  }

  // The shadow under the ball, darker and tighter the lower it swings, and fading copies along where
  // it just was, when it swings fast (speed: radians a ms). rotation: the ball's turn.
  showBallLook(look, ball, rotation, speed, ballHeight, { shadow, trail }) {
    const high = Math.min(1, Math.max(0, (look.groundY - (ball.y + ballHeight / 2)) / shadow.fadeOver));
    look.shadow.setPosition(ball.x, look.groundY).setAlpha(shadow.alpha.low + (shadow.alpha.high - shadow.alpha.low) * high)
      .setScale((shadow.width / 64) * (1 - 0.4 * high), 1 - 0.3 * high);
    look.history.unshift({ x: ball.x, y: ball.y, rotation });
    if (look.history.length > TRAIL_HISTORY) look.history.pop();
    const fast = Math.max(0, Math.min(1, speed / trail.minSpeed - 0.5));
    look.ghosts.forEach((ghost, i) => {
      const at = look.history[Math.min(look.history.length - 1, (i + 1) * 2)];
      ghost.setPosition(at.x, at.y).setRotation(at.rotation).setAlpha(fast * trail.alpha * (1 - i / trail.ghosts));
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
    this.showBallLook(mace, ball, angle, ms > 0 ? Math.abs(angle - mace.angle) / ms : 0, r.ballHeight, r);
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

  // The stone guardian (systems/adventure/trapLogic.js, guardianGeometry): his body asleep, his awake
  // body over it, hidden until he wakes, and each arm in a container turning at its socket. In the
  // arm's own picture, the chain runs on from the chain end in his fist, the way the arm points; the
  // container's rest turn hangs it straight down.
  buildGuardian(trap) {
    const r = this.rules.guardian;
    const geo = guardianGeometry(trap, r);
    const body = this.scene.add.image(geo.x, geo.feet, this.art(r.body)).setOrigin(0.5, 1).setDepth(r.depth);
    const awake = this.scene.add.image(geo.x, geo.feet, this.art(r.awake)).setOrigin(0.5, 1).setDepth(r.depth + 0.01).setAlpha(0);
    const linkH = this.scene.textures.get(this.art(r.link)).getSourceImage().height;
    const arms = geo.arms.map((arm, i) => {
      const { shoulder, chainEnd } = r.armJoints[i];
      const end = { x: (chainEnd.x - shoulder.x) * r.armSize.w, y: (chainEnd.y - shoulder.y) * r.armSize.h };
      const along = { x: end.x / arm.armLength, y: end.y / arm.armLength };
      const container = this.scene.add.container(arm.socket.x, arm.socket.y).setDepth(r.depth + 0.05).setRotation(arm.restTurn);
      const at = (d, key, origin) => this.scene.add.image(end.x + along.x * d, end.y + along.y * d, this.art(key)).setOrigin(0.5, origin).setRotation(-arm.restTurn);
      for (let d = 0; d < geo.chain; d += linkH * 0.9) container.add(at(d, r.link, 0));
      container.add(at(geo.chain, r.ball, 0));
      container.add(this.scene.add.image(0, 0, this.art(r.arms[i])).setOrigin(shoulder.x, shoulder.y));
      const rest = guardianBall(arm, 0);
      const ground = floorRow(this.layout.tiles, Math.floor(rest.x / TILE), Math.floor(rest.y / TILE) + 1);
      const look = this.makeBallLook(this.art(r.ball), rest.x, (ground ?? this.layout.rows) * TILE, r.depth + 0.04, this.rules.mace);
      // The second arm is half a swing behind the first: they strike in turn.
      return { ...look, arm, container, ms: (i * r.periodMs) / 2, swing: 0, phase: 'rest' };
    });
    // His stone is solid: he can't be passed through, stood beside, or got over.
    const solid = guardianSolid(trap, r);
    this.idolBodies.add(this.scene.add.zone((solid.left + solid.right) / 2, (solid.top + solid.bottom) / 2, solid.right - solid.left, solid.bottom - solid.top));
    this.guardians.push({ body, awake, arms, woke: false, rules: r, fire: this.buildGuardianFire(trap, r), firePhase: 'idle' });
  }

  // His mouth fire: a glow at his mouth and on the path where it will land, then a pouring stream of
  // flame, splashing sparks where it hits the path.
  buildGuardianFire(trap, r) {
    const f = r.fire;
    const platformRow = trap.row + 1;
    const mouthX = guardianGeometry(trap, r).left + f.mouth.x * r.bodySize.w;
    const pathY = (floorRow(this.layout.tiles, Math.floor(mouthX / TILE), platformRow + 1) ?? this.layout.rows) * TILE;
    const column = guardianFireColumn(trap, r, pathY);
    const mouthGlow = this.scene.add.image(mouthX, column.top, 'fx-dot').setTint(f.colours[1]).setBlendMode(Phaser.BlendModes.ADD).setDepth(r.depth + 0.2).setScale(0);
    this.makeShadowTexture();
    const groundGlow = this.scene.add.image(mouthX, pathY, SHADOW_KEY).setTint(f.colours[2]).setBlendMode(Phaser.BlendModes.ADD).setDepth(3.4)
      .setScale(f.width / 64 * 1.2, 1.4).setAlpha(0);
    const fall = pathY - column.top;
    const stream = this.scene.add.particles(mouthX, column.top, 'fx-dot', {
      emitting: false, frequency: 16, quantity: 3, speedY: { min: 760, max: 900 }, speedX: { min: -f.width / 3, max: f.width / 3 },
      gravityY: 500, lifespan: Math.round((1000 * fall) / 900), scale: { start: 1.15, end: 0.55 }, alpha: { start: 1, end: 0.6 },
      tint: f.colours, blendMode: 'ADD',
    }).setDepth(3.6);
    const sparks = this.scene.add.particles(mouthX, pathY - 6, 'fx-dot', {
      emitting: false, lifespan: 420, speed: { min: 120, max: 300 }, angle: { min: 200, max: 340 }, gravityY: 700,
      scale: { start: 0.5, end: 0 }, tint: f.colours, blendMode: 'ADD',
    }).setDepth(3.6);
    return { column, mouthGlow, groundGlow, stream, sparks, sparkMs: 0 };
  }

  updateGuardianFire(guardian, ms, catRect) {
    const { fire, rules: r } = guardian;
    const phase = guardianFirePhase(guardian.arms[0].ms, r.fire);
    const warn = phase === 'warn', pour = phase === 'pour';
    // The glows grow as the warning goes on, and flicker while it pours.
    const target = warn ? 0.9 : pour ? 0.8 + Math.random() * 0.3 : 0;
    fire.mouthGlow.setScale(fire.mouthGlow.scale + (target - fire.mouthGlow.scale) * Math.min(1, ms / 120));
    fire.groundGlow.setAlpha(fire.groundGlow.alpha + ((warn ? 0.55 : pour ? 0.8 : 0) - fire.groundGlow.alpha) * Math.min(1, ms / 150));
    if (pour !== (guardian.firePhase === 'pour')) {
      if (pour) {
        fire.stream.start();
        this.sound('pour', fire.column.x, fire.column.bottom);
      } else {
        fire.stream.stop();
      }
    }
    guardian.firePhase = phase;
    if (!pour) return;
    fire.sparkMs -= ms;
    if (fire.sparkMs <= 0) {
      fire.sparkMs = 90;
      fire.sparks.explode(4);
    }
    if (rectsTouch(fire.column, catRect)) this.hurt(fire.column.x);
  }

  // He wakes the first time he's well in view: he lights up and roars, the ground shakes, and his
  // arms start swinging.
  updateGuardian(guardian, ms, cat, catRect) {
    const { body, awake, rules: r } = guardian;
    if (!guardian.woke) {
      if (!this.inView(body, r.wakeInset)) return;
      guardian.woke = true;
      this.scene.tweens.add({ targets: awake, alpha: 1, duration: r.wakeMs });
      this.scene.cameras.main.shake(500, 0.008);
      this.scene.audio.playSfx(r.sounds.roar);
      this.scene.effects.dust(body.x - body.width * 0.3, body.y, 8);
      this.scene.effects.dust(body.x + body.width * 0.3, body.y, 8);
    }
    this.updateGuardianFire(guardian, ms, catRect);
    for (const a of guardian.arms) {
      a.ms += ms;
      const swing = guardianSwing(a.ms, r);
      a.container.setRotation(a.arm.restTurn + a.arm.outward * swing);
      const ball = guardianBall(a.arm, swing);
      this.showBallLook(a, ball, a.arm.outward * swing, ms > 0 ? Math.abs(swing - a.swing) / ms : 0, r.ballHeight, this.rules.mace);
      a.swing = swing;
      // A creak as it starts to wind up, a whoosh as it strikes, louder the nearer he is.
      const phase = guardianPhase(a.ms, r);
      if (phase !== a.phase) {
        const near = 1 - Math.hypot(ball.x - cat.x, ball.y - cat.y) / r.sounds.heardWithin;
        if (near > 0.05 && phase === 'rise') this.scene.audio.playSfx(r.sounds.creak, near);
        if (near > 0.05 && phase === 'strike') this.scene.audio.playSfx(r.sounds.whoosh, Math.min(1, near * 1.3));
        a.phase = phase;
      }
      const reach = r.hitShare * r.ballHeight;
      if (circleHitsRect(ball, reach, catRect)) this.hurt(ball.x);
      this.maceHitsEnemies(ball, reach);
    }
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
    this.idols.push({
      image, facing, mouth: { x: mouthX, y: top + r.mouth.y * image.height }, ms: offset % r.everyMs, rules: r,
      stone: { left: from, right: to, top: stoneTop, bottom: feet },
    });
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
    this.enemies = enemies;
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
      // Frozen, it's still stone, even mid-fall.
      if (contact === 'beneath') return Boolean(image.crusher.frozen) || !crusherCrushes(body, block, image.crusher.state);
      return true;
    });
    // A frozen mace's ball: he lands on top, and jumps up through it, as on an island.
    this.scene.physics.add.collider(cat, this.iceBodies, null, (cat_, ledge) => canLand() && landsFromAbove({
      bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height, top: ledge.body.top, vy: cat.body.velocity.y,
    }));
  }

  // The cat's rounds in flight: list() gives them, landed(round) spends one that froze a trap.
  watchShots(list, landed) {
    this.shotList = list;
    this.shotLanded = landed;
  }

  // A freeze round that reaches a small trap frosts it, freezing it once it has had enough, and is
  // spent. Into one already frozen, it makes the ice last again.
  freezeShots() {
    if (!this.shotList) return;
    for (const shot of this.shotList().slice()) {
      if (!shot.active || !shot.ammo?.freeze) continue;
      const at = { left: shot.x - SHOT_HALF, right: shot.x + SHOT_HALF, top: shot.y - SHOT_HALF, bottom: shot.y + SHOT_HALF };
      const hit = this.freezableTraps().find(({ rect }) => rectsTouch(rect, at));
      if (!hit) continue;
      this.freeze(hit);
      this.shotLanded(shot);
    }
  }

  // Frost that wasn't topped up in time melts away.
  meltFrost(ms) {
    for (const { kind, trap } of this.freezableTraps()) {
      if (!trap.frost || trap.frozen) continue;
      trap.frostMs -= ms;
      if (trap.frostMs > 0) continue;
      trap.frost = 0;
      for (const look of this.looksOf(kind, trap)) look.clearTint();
    }
  }

  // The traps a freeze round can freeze, each with where its ice goes.
  freezableTraps() {
    const list = [];
    if (canFreezeTrap('mace')) for (const mace of this.maces) list.push({ kind: 'mace', trap: mace, rect: this.maceBlock(mace) });
    if (canFreezeTrap('crusher')) for (const crusher of this.crushers) list.push({ kind: 'crusher', trap: crusher, rect: this.crusherRect(crusher) });
    if (canFreezeTrap('idol')) for (const idol of this.idols) list.push({ kind: 'idol', trap: idol, rect: idol.stone });
    return list;
  }

  // The ice round a mace's ball, where it is now.
  maceBlock(mace) {
    return frozenBallBlock(swingPoint(mace.hook, mace.reach, mace.angle), mace.rules.ballHeight);
  }

  // The pictures that turn icy: the mace's chain and ball, or the stone.
  looksOf(kind, trap) {
    return kind === 'mace' ? trap.swing.list : [trap.image];
  }

  freeze({ kind, trap, rect }) {
    if (!trap.frozen) {
      const { frost, freezes } = frostAfterHit(trap.frost ?? 0);
      trap.frost = frost;
      trap.frostMs = TRAP_FREEZE.frostFadeMs;
      if (!freezes) {
        for (const look of this.looksOf(kind, trap)) look.setTint(TRAP_FREEZE.frostTints[frost - 1] ?? TRAP_FREEZE.frostTints.at(-1));
        return;
      }
    }
    const { depth } = trap.rules;
    if (kind === 'mace') {
      for (const ghost of trap.ghosts) ghost.setAlpha(0);
      const looks = this.looksOf(kind, trap);
      if (trap.frozen) return freezeTrap(this.scene, trap, { looks, rect, depth: depth + 0.1 });
      // His ledge of ice: one-way, like an island (addColliders).
      const ledge = this.scene.add.zone((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2, rect.right - rect.left, rect.bottom - rect.top);
      this.iceBodies.add(ledge);
      freezeTrap(this.scene, trap, { looks, rect, depth: depth + 0.1, onThaw: () => ledge.destroy() });
    } else {
      freezeTrap(this.scene, trap, { looks: this.looksOf(kind, trap), rect, depth: depth + 0.1 });
    }
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
    this.freezeShots();
    this.meltFrost(ms);
    for (const mace of this.maces) {
      if (updateTrapIce(this.scene, mace, ms, this.maceBlock(mace))) continue; // frozen: still, and harmless
      mace.ms += ms;
      const angle = maceAngle(mace.ms, mace.rules);
      mace.swing.setRotation(angle);
      this.updateMaceLook(mace, angle, ms, cat);
      const ball = swingPoint(mace.hook, mace.reach, angle);
      const reach = mace.rules.hitShare * mace.rules.ballHeight;
      if (circleHitsRect(ball, reach, catRect)) this.hurt(ball.x);
      this.maceHitsEnemies(ball, reach);
    }
    for (const crusher of this.crushers) this.updateCrusher(crusher, ms, catRect, cat);
    for (const idol of this.idols) this.updateIdol(idol, ms);
    this.updateDarts(ms, catRect);
    for (const mushroom of this.mushrooms) this.updateMushroom(mushroom, ms, cat);
    for (const guardian of this.guardians) this.updateGuardian(guardian, ms, cat, catRect);
    this.prevBottom = body.bottom;
  }

  updateCrusher(crusher, ms, catRect, cat) {
    const { image, rules: r } = crusher;
    if (updateTrapIce(this.scene, crusher, ms, this.crusherRect(crusher))) {
      crusher.vy = 0; // frozen where it is: stone to stand on, and it can't fall on him
      return;
    }
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
    if (updateTrapIce(this.scene, idol, ms, idol.stone)) return; // frozen: it doesn't shoot
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
