import Phaser from 'phaser';
import { AMMO, EXPLOSION_KEY, LOADED } from '../data/adventure/ammo.js';
import { FLASH, FLASH_KEY } from '../data/adventure/gunners.js';
import { BEAMS, BEAM_HIT, BOLT, BOLT_KEY, BOLT_LAYERS } from '../data/adventure/beams.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { ONE_WAY, TILE } from './adventureMap.js';
import { CLAW, CLAW_SLASH, clawArea, crescentPath, overlaps } from './adventure/clawSwipe.js';
import { DASH_LOOK } from './adventure/dashLook.js';

// The battle cat's fighting moves in the adventure, from his sheet with the minigun:
//   X      shoot: a tap fires one shot, holding it fires a burst, while he has rounds; with bare
//          paws, or the minigun out of rounds, a claw swipe at whatever's in front of him
//   Q      switch to the next kind of ammunition he has (see data/adventure/ammo.js)
//   Shift  dash: a quick rush forward, once in the air until he lands, that knocks enemies out
//   C      special: a beam that knocks out every enemy ahead, charged by knocking enemies out
// and his rage, from a mushroom: he glows red for a while, fires faster and knocks out anything he
// touches. The scene calls update every frame and asks it what he's doing, for when he meets enemies.

// muzzle: where the barrel's end is, from his middle and up from his feet, in the frame's pixels.
// The look's own `muzzle` (data/adventure/heroes.js) wins over this. flashScale: the size of his
// muzzle flash (the gunners' flash, data/adventure/gunners.js).
const GUN = { muzzleX: 57, muzzleY: 41, flashScale: 0.75 };
// Every bullet's hitbox. The rest (speed, range and so on) depends on its ammunition.
const BULLET = { w: 30, h: 12, depth: 5 };
// tapMs: how long a tap's shoot animation shows. holdMs: held this long, a tap becomes a burst.
// cooldownMs: the least time between taps. rageShare: in a rage, bursts come this much quicker.
// emptyHintMs: how often an empty minigun says so.
const SHOOT = { tapMs: 375, holdMs: 300, cooldownMs: 260, rageShare: 0.6, emptyHintMs: 2500 };
const BLAST_SHAKE = { ms: 180, strength: 0.006 };
const DASH = { speed: 950, ms: 220, cooldownMs: 650 };
// The rage, from the mushroom: how long it lasts, his pose as it flares up, the red he glows.
// speedShare: how much faster he runs in it. endingMs: in its last moments his glow flickers, every
// flickerMs, so the player knows it's ending.
const RAGE = { ms: 12000, poseMs: 650, tint: 0xff9a9a, flashMs: 160, speedShare: 1.25, endingMs: 2000, flickerMs: 120 };
// charge: knockouts to fill the beam. height: how far up from his feet the beam hits; ahead, it hits
// as far as it's drawn, the half of his special's frame in front of him. The beam fires on his
// special's `beamFrame` (see data/adventure/heroes.js).
// belowFeet: the room tools/cut-sheet.mjs leaves under his feet in each frame.
const SPECIAL = { charge: 3, endMs: 375, belowFeet: 13 };

export class AdventureMoves {
  // art(name): an adventure image's texture key. onKnockOut(enemy): called for each enemy he knocks
  // out, so the scene can count it.
  // onAmmo(message): the rounds changed, with something to tell the player, or null.
  constructor(scene, cat, { art, groundLayer, solids, enemies, onKnockOut, onAmmo }) {
    this.scene = scene;
    this.groundLayer = groundLayer;
    this.beam = null; // the magic bolt, while it flies
    this.makeBoltTexture();
    this.makeSlashTexture();
    this.cat = cat;
    this.art = art;
    this.onKnockOut = onKnockOut;
    this.onAmmo = onAmmo;
    this.emptyHintMs = 0;
    this.rounds = Object.fromEntries(Object.keys(AMMO).map((kind) => [kind, 0]));
    this.ammo = 'standard';
    this.keys = scene.input.keyboard.addKeys({ fire: 'X', dash: 'SHIFT', special: 'C', swap: 'Q' });
    this.bullets = scene.physics.add.group({ allowGravity: false });
    scene.physics.add.collider(this.bullets, groundLayer, (bullet) => this.bulletStops(bullet));
    // Against a list of blocks, Phaser passes the block first and the bullet second, so the bullet is
    // whichever of the two is in the group.
    scene.physics.add.collider(this.bullets, solids, (a, b) => this.bulletStops(this.bullets.contains(a) ? a : b));
    scene.physics.add.overlap(this.bullets, enemies, (bullet, enemy) => this.shotHits(bullet, enemy));
    this.enemies = enemies;
    this.boss = null; // a boss to fight, if the level has one (see setBoss)

    this.fireHeldMs = 0;
    this.fireCooldownMs = 0;
    this.dashing = false;
    this.dashMs = 0;
    this.dashCooldownMs = 0;
    this.airDashUsed = false;
    this.swipeMs = 0; // how long his claw swipe has left to show
    this.swipeStruck = false; // whether this swipe has struck yet
    this.swipeCooldownMs = 0;
    this.rageMs = 0;
    this.charge = 0;
    this.special = null; // the beam sprite while he fires it
  }

  get facing() {
    return this.cat.flipX ? -1 : 1;
  }

  get isDashing() {
    return this.dashing;
  }

  get isRaging() {
    return this.rageMs > 0;
  }

  get isFiringSpecial() {
    return this.special !== null;
  }

  // Whether he has the minigun: only that character can shoot.
  get armed() {
    return Boolean(CHARACTERS[this.cat.character].anims.shoot);
  }

  // ----- Ammunition -----

  // The minigun comes loaded.
  arm() {
    for (const [kind, n] of Object.entries(LOADED)) this.rounds[kind] += n;
    this.ammo = 'standard';
    this.onAmmo?.(null);
  }

  // A crate: its rounds, ready to fire. Found before the minigun, they're kept for it.
  addAmmo(kind) {
    this.rounds[kind] += AMMO[kind].rounds;
    this.ammo = kind;
    this.onAmmo?.(`+${AMMO[kind].rounds} ${kind} rounds${this.armed ? '' : ' for the minigun'}`);
  }

  // The next kind after this one that he has rounds for, or null if he has none at all.
  nextAmmo(after = this.ammo) {
    const kinds = Object.keys(AMMO);
    const start = kinds.indexOf(after);
    for (let i = 1; i <= kinds.length; i++) {
      const kind = kinds[(start + i) % kinds.length];
      if (this.rounds[kind] > 0) return kind;
    }
    return null;
  }

  swapAmmo() {
    const next = this.nextAmmo();
    if (!next || next === this.ammo) return;
    this.ammo = next;
    this.onAmmo?.(`${next} rounds`);
  }

  get chargeNeeded() {
    return SPECIAL.charge;
  }

  get specialReady() {
    return this.charge >= SPECIAL.charge;
  }

  // Each enemy knocked out charges the beam a little.
  addCharge() {
    const wasReady = this.specialReady;
    this.charge = Math.min(SPECIAL.charge, this.charge + 1);
    return !wasReady && this.specialReady;
  }

  // canAct: false while he climbs, so he only fights with his paws free.
  update(ms, { canAct }) {
    this.fireCooldownMs = Math.max(0, this.fireCooldownMs - ms);
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - ms);
    this.swipeCooldownMs = Math.max(0, this.swipeCooldownMs - ms);
    this.emptyHintMs = Math.max(0, this.emptyHintMs - ms);
    this.updateSwipe(ms);
    this.updateRage(ms);
    this.updateBullets();
    if (this.beam) this.updateBeam(ms);
    if (this.cat.onGround) this.airDashUsed = false;
    if (this.isDashing) this.updateDash(ms);
    if (!canAct || this.isFiringSpecial) {
      this.fireHeldMs = 0;
      return;
    }
    const { fire, dash, special } = this.keys;
    if (Phaser.Input.Keyboard.JustDown(special) && this.specialReady && this.cat.onGround) {
      this.fireSpecial();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(dash)) this.startDash();
    if (Phaser.Input.Keyboard.JustDown(this.keys.swap) && this.armed) this.swapAmmo();
    this.updateShooting(ms, fire);
  }

  // ----- Shooting -----

  updateShooting(ms, fire) {
    // No minigun, or no rounds left for it: X swipes instead.
    if (!this.armed || this.nextAmmo() === null) {
      this.fireHeldMs = 0;
      if (Phaser.Input.Keyboard.JustDown(fire)) this.startSwipe();
      return;
    }
    if (!fire.isDown || this.cat.isSliding) {
      this.fireHeldMs = 0;
      return;
    }
    const firstPress = this.fireHeldMs === 0;
    this.fireHeldMs += ms;
    const everyMs = AMMO[this.ammo].everyMs * (this.isRaging ? SHOOT.rageShare : 1);
    if (this.fireHeldMs < SHOOT.holdMs) {
      if (firstPress && this.fireCooldownMs === 0) {
        this.cat.pose('shoot', SHOOT.tapMs);
        this.fireBullet(Math.max(SHOOT.cooldownMs, everyMs));
      }
      return;
    }
    // Held: a burst, for as long as it's held.
    this.cat.pose('burst', everyMs * 2);
    if (this.fireCooldownMs === 0) this.fireBullet(everyMs);
  }

  fireBullet(cooldownMs) {
    this.fireCooldownMs = cooldownMs;
    if (this.rounds[this.ammo] <= 0) {
      const next = this.nextAmmo();
      if (!next) {
        this.scene.audio.playSfx('click');
        if (this.emptyHintMs === 0) {
          this.emptyHintMs = SHOOT.emptyHintMs;
          this.onAmmo?.('Out of ammo: find a crate!');
        }
        return;
      }
      this.ammo = next;
    }
    const kind = this.ammo;
    const ammo = AMMO[kind];
    this.rounds[kind] -= 1;
    const dir = this.facing;
    const muzzle = this.muzzleAt();
    const bullet = this.bullets.create(muzzle.x, muzzle.y, this.art(ammo.bullet));
    this.showMuzzleFlash();
    bullet.setFlipX(dir < 0).setDepth(BULLET.depth);
    bullet.body.setSize(BULLET.w, BULLET.h);
    bullet.setVelocityX(dir * ammo.speed);
    bullet.startX = bullet.x;
    bullet.ammo = ammo;
    bullet.kind = kind; // its ammo's name, which is also what a boss's damage is listed by
    bullet.hit = new Set(); // the enemies a piercing bolt has gone through
    this.scene.audio.playSfx('shot');
    // Out of this kind: on to the next he has.
    if (this.rounds[kind] === 0) this.ammo = this.nextAmmo() ?? kind;
    this.onAmmo?.(null);
  }

  // Where the barrel's end is now, in the world.
  muzzleAt() {
    const { cat } = this;
    const { x, y } = CHARACTERS[cat.character].muzzle ?? { x: GUN.muzzleX, y: GUN.muzzleY };
    return { x: cat.x + this.facing * x * cat.scaleX, y: cat.body.bottom - y * cat.scaleY };
  }

  // The flash at the barrel's end, kept there as he moves, until it's played.
  showMuzzleFlash() {
    this.muzzleFlash?.destroy();
    const { x, y } = this.muzzleAt();
    const dir = this.facing;
    const flash = this.scene.add.sprite(x, y, FLASH_KEY, 'flash-0').setDepth(this.cat.depth + 1)
      .setOrigin(FLASH.origin.x / FLASH.size.w, FLASH.origin.y / FLASH.size.h)
      .setScale(dir * GUN.flashScale, GUN.flashScale);
    flash.play(FLASH_KEY).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      flash.destroy();
      if (this.muzzleFlash === flash) this.muzzleFlash = null;
    });
    this.muzzleFlash = flash;
  }

  updateBullets() {
    if (this.muzzleFlash?.active) {
      const { x, y } = this.muzzleAt();
      this.muzzleFlash.setPosition(x, y).setScale(this.facing * GUN.flashScale, GUN.flashScale);
    }
    for (const bullet of this.bullets.getChildren().slice()) {
      if (Math.abs(bullet.x - bullet.startX) > bullet.ammo.range) bullet.destroy();
    }
  }

  // Into the ground or a block: an explosive round bursts there.
  bulletStops(bullet) {
    if (!bullet.active) return;
    if (bullet.ammo.blast) this.explode(bullet.x, bullet.y, bullet.ammo.blast);
    bullet.destroy();
  }

  shotHits(bullet, enemy) {
    if (enemy.dead || !bullet.active) return;
    const { ammo } = bullet;
    if (ammo.pierce) {
      if (bullet.hit.has(enemy)) return;
      bullet.hit.add(enemy);
    } else {
      bullet.destroy();
    }
    if (ammo.blast) {
      this.explode(bullet.x, bullet.y, ammo.blast);
      return;
    }
    this.scene.effects.impact(bullet.x, bullet.y, 0.6);
    if (enemy.takeShot()) this.onKnockOut(enemy);
  }

  // A boss to fight (entities/AdventureBoss.js). He isn't one of the enemies: his shots, blasts and
  // bolt don't knock him out, but hurt him by his own damage table, through boss.takeHit.
  setBoss(boss) {
    this.boss = boss;
    // Against one sprite, Phaser may pass it first, so the bullet is whichever is in the group.
    this.scene.physics.add.overlap(this.bullets, boss.sprite, (a, b) => this.shotHitsBoss(this.bullets.contains(a) ? a : b));
  }

  // A shot into the boss. It stops in him even while he can't be hurt, so he feels solid; a
  // piercing one goes through, hitting him once.
  shotHitsBoss(bullet) {
    if (!bullet.active || this.boss.brain.isDefeated) return;
    if (bullet.ammo.pierce) {
      if (bullet.hit.has(this.boss)) return;
      bullet.hit.add(this.boss);
    } else {
      bullet.destroy();
    }
    if (bullet.ammo.blast) {
      this.explode(bullet.x, bullet.y, bullet.ammo.blast);
      return;
    }
    this.boss.takeHit(bullet.kind, bullet.x, bullet.y);
  }

  // Whether a point is within `radius` of a body's nearest edge.
  static near(body, x, y, radius) {
    const nearestX = Phaser.Math.Clamp(x, body.left, body.right);
    const nearestY = Phaser.Math.Clamp(y, body.top, body.bottom);
    return Phaser.Math.Distance.Between(x, y, nearestX, nearestY) <= radius;
  }

  // Knocks out every enemy whose body is within `radius` of the blast, and hurts a boss in it.
  explode(x, y, radius) {
    const blast = this.scene.add.sprite(x, y, EXPLOSION_KEY, 'explosion-0').setDepth(BULLET.depth + 1);
    blast.play(EXPLOSION_KEY).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => blast.destroy());
    this.scene.audio.playSfx('boom');
    this.scene.cameras.main.shake(BLAST_SHAKE.ms, BLAST_SHAKE.strength);
    for (const enemy of this.enemies.getChildren().slice()) {
      if (enemy.dead) continue;
      const e = enemy.body;
      const nearestX = Phaser.Math.Clamp(x, e.left, e.right);
      const nearestY = Phaser.Math.Clamp(y, e.top, e.bottom);
      if (Phaser.Math.Distance.Between(x, y, nearestX, nearestY) <= radius) this.onKnockOut(enemy);
    }
    const { boss } = this;
    if (boss && !boss.brain.isDefeated && AdventureMoves.near(boss.sprite.body, x, y, radius)) boss.takeHit('explosive', x, y);
  }

  // ----- The claw swipe (systems/adventure/clawSwipe.js) -----

  startSwipe() {
    if (this.swipeCooldownMs > 0 || this.cat.isSliding || this.isDashing) return;
    this.swipeMs = CLAW.ms;
    this.swipeStruck = false;
    this.swipeCooldownMs = CLAW.cooldownMs;
    this.cat.pose('swipe', CLAW.ms);
    // With the minigun empty, a reminder now and then where rounds come from.
    if (this.armed && this.emptyHintMs === 0) {
      this.emptyHintMs = SHOOT.emptyHintMs;
      this.onAmmo?.('Out of ammo: find a crate!');
    }
  }

  // Strikes once, part way through, as his paw sweeps through.
  updateSwipe(ms) {
    if (this.swipeMs <= 0) return;
    this.swipeMs = Math.max(0, this.swipeMs - ms);
    if (!this.swipeStruck && CLAW.ms - this.swipeMs >= CLAW.hitMs) {
      this.swipeStruck = true;
      this.swipeStrikes();
    }
  }

  // Knocks out every enemy in reach in front of him, and hurts a boss there, a little.
  swipeStrikes() {
    const dir = this.facing;
    const share = this.isRaging ? CLAW.rageReachShare : 1;
    const area = clawArea(this.cat.body, dir, { reach: CLAW.reach * share, above: CLAW.above });
    this.showSlash(area, dir, share);
    let struck = false;
    for (const enemy of this.enemies.getChildren().slice()) {
      if (enemy.dead || !overlaps(area, enemy.body)) continue;
      this.onKnockOut(enemy);
      struck = true;
    }
    const { boss } = this;
    if (boss && !boss.brain.isDefeated && overlaps(area, boss.sprite.body)) {
      boss.takeHit(CLAW.boss, (area.left + area.right) / 2, (area.top + area.bottom) / 2);
      struck = true;
    }
    this.scene.audio.playSfx(struck ? 'punch' : 'lungeMiss');
  }

  // The slash: the glowing crescent swung down through the area in front of him, growing and
  // fading, and sparks flying off forward. Its centre is his front edge, so it curves out to his reach.
  // size: how much bigger than usual (in a rage).
  showSlash(area, dir, size = 1) {
    const { swing, fadeMs, sparks } = CLAW_SLASH;
    const grow = CLAW_SLASH.grow.map((g) => g * size);
    const x = dir > 0 ? area.left : area.right;
    const y = (area.top + area.bottom) / 2;
    const slash = this.scene.add.image(x, y, CLAW_SLASH.key).setOrigin(...this.slashOrigin)
      .setDepth(this.cat.depth + 1).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(dir * grow[0], grow[0]).setRotation(dir * swing[0]);
    this.scene.tweens.add({
      targets: slash, rotation: dir * swing[1], scaleX: dir * grow[1], scaleY: grow[1], alpha: 0,
      duration: fadeMs, ease: 'Cubic.easeOut', onComplete: () => slash.destroy(),
    });
    const tip = CLAW_SLASH.radius * size * 0.8;
    const burst = this.scene.add.particles(x + dir * tip, y, 'fx-spark', {
      speed: { min: sparks.speed[0], max: sparks.speed[1] },
      angle: dir > 0 ? { min: -50, max: 60 } : { min: 120, max: 230 },
      lifespan: sparks.lifespan, scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 },
      tint: sparks.tint, blendMode: 'ADD', emitting: false,
    }).setDepth(this.cat.depth + 1);
    burst.explode(sparks.count);
    this.scene.time.delayedCall(sparks.lifespan + 50, () => burst.destroy());
  }

  // The slash's crescent, drawn once: a soft gold glow, and a bright white core along its outer edge.
  makeSlashTexture() {
    const { radius, thickness, from, to, core, glow, coreColour, blur, tail, key } = CLAW_SLASH;
    const pad = blur * 2;
    const w = radius + pad * 2;
    const h = radius * 2 + pad * 2;
    const cx = pad;
    const cy = h / 2;
    // Where the crescent's circle centre is in it, for placing it at his front edge.
    this.slashOrigin = [cx / w, cy / h];
    if (this.scene.textures.exists(key)) return;
    const canvas = this.scene.textures.createCanvas(key, w, h);
    const ctx = canvas.getContext();
    ctx.shadowColor = glow;
    ctx.shadowBlur = blur;
    ctx.fillStyle = glow;
    crescentPath(ctx, cx, cy, radius, thickness, from, to);
    ctx.fill();
    ctx.shadowBlur = blur / 2;
    ctx.shadowColor = coreColour;
    ctx.fillStyle = coreColour;
    crescentPath(ctx, cx, cy, radius - 1, thickness * core, from + 0.08, to - 0.08);
    ctx.fill();
    const fade = ctx.createLinearGradient(0, cy + radius * Math.sin(from), 0, cy + radius * Math.sin(to));
    fade.addColorStop(0, `rgba(0, 0, 0, ${1 - tail})`);
    fade.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    canvas.refresh();
  }

  // ----- Dashing -----

  startDash() {
    if (this.dashCooldownMs > 0 || this.isDashing) return;
    if (!this.cat.onGround) {
      if (this.airDashUsed) return;
      this.airDashUsed = true;
    }
    this.dashing = true;
    this.dashDir = this.facing;
    this.dashMs = DASH.ms;
    this.dashCooldownMs = DASH.cooldownMs;
    this.cat.endSlide();
    this.cat.body.setAllowGravity(false);
    this.cat.setVelocityY(0);
    this.cat.pose('dash', DASH.ms);
    this.scene.audio.playSfx('lungeDash');
    this.ghostMs = 0;
    if (this.cat.onGround) this.scene.effects.dust(this.cat.x - this.dashDir * 20, this.cat.body.bottom, DASH_LOOK.dust);
  }

  // Runs after the cat's own movement each frame, so the dash's speed wins.
  updateDash(ms) {
    this.dashMs -= ms;
    const blocked = this.dashDir > 0 ? this.cat.body.blocked.right : this.cat.body.blocked.left;
    if (this.dashMs <= 0 || blocked) {
      this.endDash();
      return;
    }
    this.cat.moveVelocity = this.dashDir * DASH.speed;
    this.cat.setVelocity(this.dashDir * DASH.speed, 0);
    this.ghostMs -= ms;
    if (this.ghostMs <= 0) {
      this.ghostMs = DASH_LOOK.ghosts.everyMs;
      this.leaveGhost();
    }
  }

  // A glowing copy of him, as he is this moment, left behind to fade, with wind streaks behind it.
  leaveGhost() {
    const { cat, scene } = this;
    const { ghosts, streaks, depthBehind } = DASH_LOOK;
    const ghost = scene.add.image(cat.x, cat.y, cat.texture.key, cat.frame.name)
      .setOrigin(cat.originX, cat.originY).setScale(cat.scaleX, cat.scaleY).setFlipX(cat.flipX)
      .setTintFill(ghosts.tint).setAlpha(ghosts.alpha).setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(cat.depth - depthBehind);
    scene.tweens.add({ targets: ghost, alpha: 0, duration: ghosts.fadeMs, onComplete: () => ghost.destroy() });
    const { top, bottom } = cat.body;
    const middle = (top + bottom) / 2;
    const back = cat.x - this.dashDir * cat.body.width * 0.6;
    for (let i = 0; i < streaks.count; i++) {
      const length = Phaser.Math.Between(...streaks.length);
      const y = middle + Phaser.Math.FloatBetween(-0.5, 0.5) * streaks.spread * (bottom - top);
      const line = scene.add.rectangle(back, y, length, streaks.width, streaks.colour, streaks.alpha)
        .setOrigin(this.dashDir > 0 ? 1 : 0, 0.5).setDepth(cat.depth - depthBehind);
      scene.tweens.add({
        targets: line, x: back - this.dashDir * streaks.drift, scaleX: 0.3, alpha: 0, duration: streaks.ms,
        onComplete: () => line.destroy(),
      });
    }
  }

  endDash() {
    if (!this.dashing) return;
    this.dashing = false;
    this.dashMs = 0;
    this.cat.body.setAllowGravity(true);
    this.cat.moveVelocity = this.dashDir * this.cat.topSpeed;
  }

  // ----- Rage -----

  // He stops for a moment as the rage flares up around him, then goes on.
  startRage() {
    if (!this.isRaging) this.cat.topSpeed *= RAGE.speedShare;
    this.rageMs = RAGE.ms;
    this.endDash();
    this.cat.running = false;
    this.cat.pose('rage', RAGE.poseMs);
    this.scene.time.delayedCall(RAGE.poseMs, () => {
      if (!this.special) this.cat.running = true;
    });
    this.cat.setTint(RAGE.tint);
    this.scene.audio.playSfx('flameBurst');
    this.scene.cameras.main.flash(RAGE.flashMs, 255, 90, 60);
  }

  updateRage(ms) {
    if (this.rageMs <= 0) return;
    this.rageMs -= ms;
    if (this.rageMs <= 0) {
      this.cat.clearTint();
      this.cat.topSpeed /= RAGE.speedShare;
      return;
    }
    // Ending: the glow flickers on and off.
    if (this.rageMs < RAGE.endingMs) {
      const on = Math.floor(this.rageMs / RAGE.flickerMs) % 2 === 0;
      if (on) this.cat.setTint(RAGE.tint);
      else this.cat.clearTint();
    }
  }

  // ----- The special beam -----

  // He stands still while it plays. It needs a bigger frame than his others, so it's shown by a
  // sprite of its own over him, with its feet where his are. He charges up with its first frames;
  // on its beam frame, the beam the game draws takes over from the short one on his sheet.
  fireSpecial() {
    this.charge = 0;
    const dir = this.facing;
    const { cat } = this;
    cat.running = false;
    cat.moveVelocity = 0;
    cat.setVelocityX(0);
    cat.setVisible(false);
    const key = frameKey(cat.character, 'special', 1);
    const { height } = this.scene.textures.get(key).getSourceImage();
    this.special = this.scene.add.sprite(cat.body.center.x, cat.body.bottom, key)
      .setOrigin(0.5, 1 - SPECIAL.belowFeet / height).setScale(cat.scaleX).setFlipX(dir < 0).setDepth(cat.depth);
    if (cat.isTinted) this.special.setTint(RAGE.tint);
    this.special.play(animKey(cat.character, 'special'));
    this.scene.audio.playSfx('beamCharge');
    this.special.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim, animFrame) => {
      if (animFrame.index === CHARACTERS[cat.character].anims.special.beamFrame && !this.beam) this.startBeam(dir);
    });
    this.special.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.endSpecial());
  }

  // Releases the magic bolt from his gun or paws, with his frame cut off where its own ray starts.
  startBeam(dir) {
    const { special } = this;
    const { start, middle } = BEAMS[this.cat.character];
    const { width, height } = special.frame;
    const scale = special.scaleX;
    special.setCrop(0, 0, start, height);
    const x = special.x + dir * (start - width / 2) * scale;
    const y = special.y - special.originY * height * scale + middle * scale;
    const sprite = this.scene.add.image(x, y, BOLT_KEY).setDepth(special.depth + 1).setFlipX(dir < 0)
      .setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
    const trail = this.scene.add.particles(0, 0, 'fx-spark', {
      follow: sprite, frequency: BOLT.trail.everyMs, lifespan: BOLT.trail.lifespan,
      speedX: { min: -dir * 40, max: -dir * 160 }, speedY: { min: -BOLT.trail.spread, max: BOLT.trail.spread },
      scale: { start: 0.7 * scale, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xa6e0ff, 0x3d9bff], blendMode: 'ADD',
    }).setDepth(special.depth);
    this.beam = { sprite, trail, x0: x, y0: y, dir, scale, flown: 0, ageMs: 0, hit: new Set() };
    this.scene.audio.playSfx('beam');
    this.scene.cameras.main.shake(140, 0.004);
  }

  // Flies it on, weaving and pulsing, knocks out every enemy it passes, and bursts where it stops.
  updateBeam(ms) {
    const bolt = this.beam;
    bolt.ageMs += ms;
    bolt.flown += (BOLT.speed * ms) / 1000;
    const x = bolt.x0 + bolt.dir * bolt.flown;
    const y = bolt.y0 + Math.sin(bolt.ageMs * BOLT.wobble.rate) * BOLT.wobble.px;
    const pulse = 1 + BOLT.pulse * Math.sin(bolt.ageMs / 40);
    bolt.sprite.setPosition(x, y).setScale(bolt.scale * pulse, bolt.scale / pulse);
    const reach = BOLT.reachTiles * TILE;
    const tile = this.groundLayer.getTileAtWorldXY(x + bolt.dir * 20 * bolt.scale, y);
    const radius = BOLT.hitRadius * bolt.scale;
    for (const enemy of this.enemies.getChildren().slice()) {
      if (enemy.dead || bolt.hit.has(enemy)) continue;
      const e = enemy.body;
      const nearX = Phaser.Math.Clamp(x, e.left, e.right), nearY = Phaser.Math.Clamp(y, e.top, e.bottom);
      if (Phaser.Math.Distance.Between(x, y, nearX, nearY) <= radius) {
        bolt.hit.add(enemy);
        this.beamBoom(e.center.x, e.center.y, BEAM_HIT.scale, BEAM_HIT.ring);
        this.onKnockOut(enemy);
      }
    }
    // A boss isn't knocked out: the bolt hurts him once, and flies on.
    const { boss } = this;
    if (boss && !bolt.hit.has(boss) && !boss.brain.isDefeated && AdventureMoves.near(boss.sprite.body, x, y, radius)) {
      bolt.hit.add(boss);
      const b = boss.sprite.body;
      this.beamBoom(b.center.x, b.center.y, BEAM_HIT.scale, BEAM_HIT.ring);
      boss.takeHit('bolt', b.center.x, b.center.y);
    }
    if (bolt.flown >= reach || (tile && !ONE_WAY.has(tile.index))) this.endBolt(true);
  }

  // It's gone: with a burst where it stopped, or quietly when the level ends.
  endBolt(burst) {
    const bolt = this.beam;
    if (!bolt) return;
    this.beam = null;
    if (burst) this.beamBoom(bolt.sprite.x, bolt.sprite.y, BEAM_HIT.endScale, BEAM_HIT.endRing);
    bolt.sprite.destroy();
    bolt.trail.stop();
    this.scene.time.delayedCall(BOLT.trail.lifespan, () => bolt.trail.destroy());
  }

  // A blue burst, with a ring and a boom.
  beamBoom(x, y, scale, ring) {
    const blast = this.scene.add.sprite(x, y, EXPLOSION_KEY, 'explosion-0').setDepth(BULLET.depth + 2)
      .setTint(BEAM_HIT.tint).setScale(scale).setBlendMode(Phaser.BlendModes.ADD);
    blast.play(EXPLOSION_KEY).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => blast.destroy());
    this.scene.effects.impact(x, y, ring);
    this.scene.audio.playSfx('boom');
  }

  // The bolt, drawn once: glowing ovals, outside in, a little behind its nose.
  makeBoltTexture() {
    if (this.scene.textures.exists(BOLT_KEY)) return;
    const [w, h] = BOLT_LAYERS[0];
    const g = this.scene.make.graphics({ add: false });
    for (const [length, height, colour, alpha] of BOLT_LAYERS) {
      g.fillStyle(colour, alpha).fillEllipse(w - length / 2 - (w - length) * 0.15, h / 2, length, height);
    }
    g.generateTexture(BOLT_KEY, w, h);
    g.destroy();
  }

  endSpecial() {
    this.special?.destroy();
    this.special = null;
    this.cat.setVisible(true);
    this.cat.running = true;
    this.cat.pose('specialEnd', SPECIAL.endMs);
  }

  // When the level ends: no dash left going, and no beam.
  stop() {
    this.endDash();
    if (this.special) {
      this.special.destroy();
      this.special = null;
      this.cat.setVisible(true);
    }
    this.cat.clearTint();
    this.rageMs = 0;
    this.bullets.clear(true, true);
    this.endBolt(false);
  }
}
