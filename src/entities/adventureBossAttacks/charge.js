// The charge: he crouches, then runs across the arena with his club held high, and touching him on
// the way hurts. If he runs into a wall, the tree shakes and he's dizzy, stars going round his head:
// his weak moment. His brain is told how it ended (finishAttack).
//
// His frames (data/adventure/bosses.js, counted from 0):
//   jump 0-2   the crouch: the warning
//   run        the charge, the club up
//   hurt 3-5   dizzy, swaying back and forth
//   speed: px a second. dustEveryMs: dust kicked up behind him as he runs.
//   stars: how many go round his head, how wide, how high above his feet, and how fast.
const CROUCH = { frames: [0, 1, 2], seconds: 0.3 };
const CHARGE = { speed: 640, dustEveryMs: 90, shake: { ms: 320, strength: 0.014 } };
const DIZZY = { frames: [3, 4, 5, 4], seconds: 0.9 };
const STARS = { count: 3, rx: 46, ry: 12, up: 175, turnsPerSecond: 1.2, depth: 10 };

export const charge = {
  windup(boss) {
    boss.faceCat();
    boss.pose('jump', CROUCH.frames, CROUCH.seconds);
    boss.scene.audio.playSfx('lungeWarn');
    boss.scene.effects.dust(boss.x - boss.facing * 40, boss.feetY, 4);
  },

  attack(boss) {
    boss.playAnim('run');
    boss.dustMs = 0;
    boss.scene.audio.playSfx('chaserRush');
  },

  update(boss, ms) {
    const { body } = boss.sprite;
    boss.sprite.setVelocityX(boss.facing * CHARGE.speed);
    boss.dustMs += ms;
    if (boss.dustMs >= CHARGE.dustEveryMs) {
      boss.dustMs = 0;
      boss.scene.effects.dust(boss.x - boss.facing * 50, boss.feetY, 2);
    }
    if (boss.facing > 0 ? body.blocked.right : body.blocked.left) {
      boss.sprite.setVelocityX(0);
      boss.scene.cameras.main.shake(CHARGE.shake.ms, CHARGE.shake.strength);
      boss.scene.effects.impact(boss.x + boss.facing * body.halfWidth, body.center.y, 1);
      boss.scene.audio.playSfx('smash');
      boss.shakeTree();
      boss.finishAttack({ hitWall: true });
    }
  },

  recover(boss, data, kind) {
    if (kind !== 'dizzy') {
      boss.playAnim('idle');
      return;
    }
    boss.pose('hurt', DIZZY.frames, DIZZY.seconds, { loop: true });
    const stars = Array.from({ length: STARS.count }, () => boss.scene.add.image(boss.x, boss.feetY - STARS.up, 'star').setScale(0.5).setDepth(STARS.depth));
    boss.addLeftover(...stars);
    boss.dizzyStars = stars;
    boss.dizzyMs = 0;
  },

  // Turns the stars round his head.
  recoverUpdate(boss, ms) {
    if (!boss.dizzyStars) return;
    boss.dizzyMs += ms;
    const turn = (boss.dizzyMs / 1000) * STARS.turnsPerSecond * Math.PI * 2;
    boss.dizzyStars.forEach((star, i) => {
      const a = turn + (i / STARS.count) * Math.PI * 2;
      if (!star.active) return;
      star.setPosition(boss.x + Math.cos(a) * STARS.rx, boss.feetY - STARS.up + Math.sin(a) * STARS.ry);
    });
  },
};
