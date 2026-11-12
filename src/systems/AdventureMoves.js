import Phaser from 'phaser';
import { AMMO, EXPLOSION_KEY, LOADED } from '../data/adventure/ammo.js';
import { BEAMS, BEAM_HIT, BOLT, BOLT_KEY, BOLT_LAYERS } from '../data/adventure/beams.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';
import { ONE_WAY, TILE } from './adventureMap.js';

// The battle cat's fighting moves in the adventure, from his sheet with the minigun:
//   X      shoot: a tap fires one shot, holding it fires a burst, while he has rounds
//   Q      switch to the next kind of ammunition he has (see data/adventure/ammo.js)
//   Shift  dash: a quick rush forward, once in the air until he lands, that knocks enemies out
//   C      special: a beam that knocks out every enemy ahead, charged by knocking enemies out
// and his rage, from a mushroom: he glows red for a while, fires faster and knocks out anything he
// touches. The scene calls update every frame and asks it what he's doing, for when he meets enemies.

// muzzle: where the barrel's end is, from his middle and up from his feet, in the frame's pixels.
const GUN = { muzzleX: 57, muzzleY: 41 };
// Every bullet's hitbox. The rest (speed, range and so on) depends on its ammunition.
const BULLET = { w: 30, h: 12, depth: 5 };
// tapMs: how long a tap's shoot animation shows. holdMs: held this long, a tap becomes a burst.
// cooldownMs: the least time between taps. rageShare: in a rage, bursts come this much quicker.
// emptyHintMs: how often an empty minigun says so.
const SHOOT = { tapMs: 375, holdMs: 300, cooldownMs: 260, rageShare: 0.6, emptyHintMs: 2500 };
const BLAST_SHAKE = { ms: 180, strength: 0.006 };
const DASH = { speed: 950, ms: 220, cooldownMs: 650 };
const RAGE = { ms: 8000, poseMs: 650, tint: 0xff9a9a, flashMs: 160 };
// charge: knockouts to fill the beam. height: how far up from his feet the beam hits; ahead, it hits
// as far as it's drawn, the half of his special's frame in front of him. The beam fires on his
// special's `beamFrame` (see data/adventure/heroes.js).
// belowFeet: the room tools/cut-sheet.mjs leaves under his feet in each frame.
const SPECIAL = { charge: 3, endMs: 375, belowFeet: 13 };
const NO_WEAPON_HINT_MS = 2500; // how often pressing fire without the minigun says so

export class AdventureMoves {
  // art(name): an adventure image's texture key. onKnockOut(enemy): called for each enemy he knocks
  // out, so the scene can count it.
  // onNoWeapon(): he pressed fire before finding the minigun.
  // onAmmo(message): the rounds changed, with something to tell the player, or null.
  constructor(scene, cat, { art, groundLayer, solids, enemies, onKnockOut, onNoWeapon, onAmmo }) {
    this.scene = scene;
    this.groundLayer = groundLayer;
    this.beam = null; // the magic bolt, while it flies
    this.makeBoltTexture();
    this.cat = cat;
    this.art = art;
    this.onKnockOut = onKnockOut;
    this.onNoWeapon = onNoWeapon;
    this.onAmmo = onAmmo;
    this.noWeaponHintMs = 0;
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
    this.emptyHintMs = Math.max(0, this.emptyHintMs - ms);
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
    const { body } = this.cat;
    const bullet = this.bullets.create(this.cat.x + dir * GUN.muzzleX * this.cat.scaleX, body.bottom - GUN.muzzleY * this.cat.scaleY, this.art(ammo.bullet));
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

  updateBullets() {
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
