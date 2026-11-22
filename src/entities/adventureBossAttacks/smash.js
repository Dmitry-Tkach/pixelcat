// The smash: he lifts his club over his head, brings it down on the floor in front of him, and is
// stuck, bent over, while he pulls it out. The quick smash and the big one are both this; the big one
// has a longer warning (in its data) and sends a shock wave along the floor both ways.
//
// His frames (data/adventure/bosses.js, counted from 0):
//   attack 0-4  lifting the club: the warning, its last frame held until the smash
//   attack 5-6  the club comes down, and hits the floor
//   attack 6-7  bent over, the club on the floor: stuck
// liftShare: the share of the warning spent lifting; the rest he holds the club up, so it's seen.
// shake: the camera, as the club lands, for each size of smash.
export const LIFT = [0, 1, 2, 3, 4];
export const LANDS = [5, 6];
export const STUCK = [6, 7];
// landsSeconds: how quickly the club comes down.
export const SMASH = { liftShare: 0.6, landsSeconds: 0.1, stuckSeconds: 0.25 };
const SHAKE = { quick: { ms: 120, strength: 0.004 }, big: { ms: 260, strength: 0.012 } };

export const smash = {
  windup(boss, data) {
    boss.faceCat();
    boss.pose('attack', LIFT, data.windup * SMASH.liftShare);
    boss.scene.audio.playSfx('lungeWarn');
  },

  attack(boss, data) {
    boss.pose('attack', LANDS, SMASH.landsSeconds);
    const shake = data.shockWave ? SHAKE.big : SHAKE.quick;
    boss.scene.cameras.main.shake(shake.ms, shake.strength);
    const x = boss.clubLandsAt;
    boss.scene.effects.dust(x, boss.feetY, data.shockWave ? 14 : 8);
    boss.scene.audio.playSfx(data.shockWave ? 'boom' : 'thud');
    if (data.shockWave) {
      boss.waves.spawn(x, boss.feetY);
      boss.shakeTree();
    }
  },

  recover(boss) {
    boss.pose('attack', STUCK, SMASH.stuckSeconds);
  },
};
