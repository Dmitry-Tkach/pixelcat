import Phaser from 'phaser';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';

// The battle cat's fighting moves in the adventure, from his sheet with the minigun:
//   X      shoot: a tap fires one shot, holding it fires a burst
//   Shift  dash: a quick rush forward, once in the air until he lands, that knocks enemies out
//   C      special: a beam that knocks out every enemy ahead, charged by knocking enemies out
// and his rage, from a mushroom: he glows red for a while, fires faster and knocks out anything he
// touches. The scene calls update every frame and asks it what he's doing, for when he meets enemies.

// muzzle: where the barrel's end is, from his middle and up from his feet, in the frame's pixels.
const GUN = { muzzleX: 57, muzzleY: 41 };
const BULLET = { speed: 1150, range: 640, w: 30, h: 12, depth: 5 };
// tapMs: how long a tap's shoot animation shows. holdMs: held this long, a tap becomes a burst.
const SHOOT = { tapMs: 375, holdMs: 300, cooldownMs: 260, burstEveryMs: 120, rageBurstEveryMs: 75 };
const DASH = { speed: 950, ms: 220, cooldownMs: 650 };
const RAGE = { ms: 8000, poseMs: 650, tint: 0xff9a9a, flashMs: 160 };
// charge: knockouts to fill the beam. reach and height: what the beam hits, ahead of him and up
// from his feet. The beam fires on his special's `beamFrame` (see data/characters.js).
// belowFeet: the room tools/cut-sheet.mjs leaves under his feet in each frame.
const SPECIAL = { charge: 3, reach: 380, height: 110, endMs: 375, belowFeet: 13 };
const NO_WEAPON_HINT_MS = 2500; // how often pressing fire without the minigun says so

export class AdventureMoves {
  // art(name): an adventure image's texture key. onKnockOut(enemy): called for each enemy he knocks
  // out, so the scene can count it.
  // onNoWeapon(): he pressed fire before finding the minigun.
  constructor(scene, cat, { art, groundLayer, solids, enemies, onKnockOut, onNoWeapon }) {
    this.scene = scene;
    this.cat = cat;
    this.art = art;
    this.onKnockOut = onKnockOut;
    this.onNoWeapon = onNoWeapon;
    this.noWeaponHintMs = 0;
    this.keys = scene.input.keyboard.addKeys({ fire: 'X', dash: 'SHIFT', special: 'C' });
    this.bullets = scene.physics.add.group({ allowGravity: false });
    scene.physics.add.collider(this.bullets, groundLayer, (bullet) => bullet.destroy());
    scene.physics.add.collider(this.bullets, solids, (bullet) => bullet.destroy());
    scene.physics.add.overlap(this.bullets, enemies, (bullet, enemy) => this.shotHits(bullet, enemy));
    this.enemies = enemies;

    this.fireHeldMs = 0;
    this.fireCooldownMs = 0;
    this.dashing = false;
    this.dashMs = 0;
    this.dashCooldownMs = 0;
    this.airDashUsed = false;
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
    this.updateRage(ms);
    this.updateBullets();
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
    this.updateShooting(ms, fire);
  }

  // ----- Shooting -----

  updateShooting(ms, fire) {
    this.noWeaponHintMs = Math.max(0, this.noWeaponHintMs - ms);
    if (!this.armed) {
      if (Phaser.Input.Keyboard.JustDown(fire) && this.noWeaponHintMs === 0) {
        this.noWeaponHintMs = NO_WEAPON_HINT_MS;
        this.onNoWeapon?.();
      }
      return;
    }
    if (!fire.isDown || this.cat.isSliding) {
      this.fireHeldMs = 0;
      return;
    }
    const firstPress = this.fireHeldMs === 0;
    this.fireHeldMs += ms;
    if (this.fireHeldMs < SHOOT.holdMs) {
      if (firstPress && this.fireCooldownMs === 0) {
        this.cat.pose('shoot', SHOOT.tapMs);
        this.fireBullet(SHOOT.cooldownMs);
      }
      return;
    }
    // Held: a burst, for as long as it's held.
    this.cat.pose('burst', SHOOT.burstEveryMs * 2);
    if (this.fireCooldownMs === 0) this.fireBullet(this.isRaging ? SHOOT.rageBurstEveryMs : SHOOT.burstEveryMs);
  }

  fireBullet(cooldownMs) {
    this.fireCooldownMs = cooldownMs;
    const dir = this.facing;
    const { body } = this.cat;
    const bullet = this.bullets.create(this.cat.x + dir * GUN.muzzleX * this.cat.scaleX, body.bottom - GUN.muzzleY * this.cat.scaleY, this.art('bullet'));
    bullet.setFlipX(dir < 0).setDepth(BULLET.depth);
    bullet.body.setSize(BULLET.w, BULLET.h);
    bullet.setVelocityX(dir * BULLET.speed);
    bullet.startX = bullet.x;
    this.scene.audio.playSfx('shot');
  }

  updateBullets() {
    for (const bullet of this.bullets.getChildren().slice()) {
      if (Math.abs(bullet.x - bullet.startX) > BULLET.range) bullet.destroy();
    }
  }

  shotHits(bullet, enemy) {
    if (enemy.dead || !bullet.active) return;
    this.scene.effects.impact(bullet.x, bullet.y, 0.6);
    bullet.destroy();
    if (enemy.takeShot()) this.onKnockOut(enemy);
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
    if (this.rageMs <= 0) this.cat.clearTint();
  }

  // ----- The special beam -----

  // He stands still while it plays. It needs a bigger frame than his others, for the beam, so it's
  // shown by a sprite of its own over him, with its feet where his are.
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
      if (animFrame.index === CHARACTERS[cat.character].anims.special.beamFrame) this.beamHits(dir);
    });
    this.special.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.endSpecial());
  }

  beamHits(dir) {
    const { body } = this.cat;
    this.scene.audio.playSfx('beam');
    this.scene.cameras.main.shake(220, 0.006);
    const from = body.center.x;
    const to = from + dir * SPECIAL.reach;
    const [left, right] = dir > 0 ? [from, to] : [to, from];
    for (const enemy of this.enemies.getChildren().slice()) {
      if (enemy.dead) continue;
      const e = enemy.body;
      const level = e.bottom > body.bottom - SPECIAL.height && e.top < body.bottom;
      if (level && e.right > left && e.left < right) this.onKnockOut(enemy);
    }
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
  }
}
