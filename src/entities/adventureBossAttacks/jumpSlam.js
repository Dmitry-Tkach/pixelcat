import { MOVEMENT } from '../../config/gameConfig.js';

// The jump slam: he crouches while a shadow grows where he'll land, the cat's spot, even up on an
// island. Then he leaps there in an arc and lands with a slam that shakes the tree, and touching him
// on the way hurts. After landing he's crouched for a moment: his weak moment.
//
// His frames (data/adventure/bosses.js, counted from 0):
//   jump 0-2   the crouch: the warning
//   jump 3-5   rising, arms out. jump 6: coming down. jump 7-9: landing.
//   seconds: his time in the air, from take-off to landing.
//   landsAfterMs: after take-off, he can't land again for this long (he's still leaving the floor).
const CROUCH = { frames: [0, 1, 2], seconds: 0.35 };
const LEAP = { seconds: 0.85, rising: [3, 4, 5], risingSeconds: 0.3, falling: [6], landsAfterMs: 120, shake: { ms: 380, strength: 0.016 } };
const LANDING = { frames: [7, 8, 9], seconds: 0.4 };
const SHADOW = { w: 150, h: 26, alpha: 0.4, from: 0.3, depth: 2.5 };

export const jumpSlam = {
  windup(boss, data) {
    boss.faceCat();
    boss.pose('jump', CROUCH.frames, CROUCH.seconds);
    boss.scene.audio.playSfx('lungeWarn');
    // Where he'll land: where the cat stands, kept inside the arena's walls.
    const half = boss.sprite.body.halfWidth;
    const x = Math.max(boss.arena.left + half, Math.min(boss.arena.right - half, boss.cat.body.center.x));
    const y = boss.cat.onGround ? boss.cat.body.bottom : boss.surfaceAt(x);
    boss.jumpTarget = { x, y };
    const shadow = boss.scene.add.ellipse(x, y, SHADOW.w, SHADOW.h, 0x000000, SHADOW.alpha).setDepth(SHADOW.depth).setScale(SHADOW.from);
    boss.scene.tweens.add({ targets: shadow, scale: 1, duration: (data.windup + LEAP.seconds) * 1000 });
    boss.addLeftover(shadow);
  },

  // An arc that lands on the target after LEAP.seconds, under his own gravity.
  attack(boss) {
    const { x, y } = boss.jumpTarget;
    const t = LEAP.seconds;
    const vx = (x - boss.x) / t;
    const vy = (y - boss.feetY - 0.5 * MOVEMENT.GRAVITY * t * t) / t;
    boss.sprite.setVelocity(vx, vy);
    boss.airMs = 0;
    boss.pose('jump', LEAP.rising, LEAP.risingSeconds);
    boss.scene.audio.playSfx('lungeDash');
  },

  update(boss, ms) {
    const { body } = boss.sprite;
    boss.airMs += ms;
    if (body.velocity.y > 0 && boss.posing?.frames !== LEAP.falling) boss.pose('jump', LEAP.falling, 0);
    // Keep heading for the target across, unless a wall stops him.
    if (Math.abs(boss.x - boss.jumpTarget.x) < 8) boss.sprite.setVelocityX(0);
    if (boss.airMs < LEAP.landsAfterMs || !body.blocked.down) return;
    boss.sprite.setVelocityX(0);
    boss.scene.cameras.main.shake(LEAP.shake.ms, LEAP.shake.strength);
    boss.scene.effects.dust(boss.x, boss.feetY, 18);
    boss.scene.audio.playSfx('boom');
    boss.shakeTree();
    boss.finishAttack({});
  },

  recover(boss) {
    boss.pose('jump', LANDING.frames, LANDING.seconds);
  },
};
