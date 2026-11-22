import { TILE } from '../../systems/adventureMap.js';
import { stoneLandings } from '../../systems/adventure/bosses/stoneLandings.js';
import { LANDS, LIFT, SMASH, STUCK } from './smash.js';
import { STONE_W } from './Stones.js';

// The stone burst: the smash's pose, but first the floor cracks and glows around him, so the player
// knows stones are coming, not a shock wave. Then the club comes down, and stones fly up out of the
// floor in high arcs (Stones.js), one at the cat and the rest spread out, always with a gap.
//   cracks: how far they reach each side of where the club lands, how many, and how they pulse.
//   launchUp: how far above the floor the stones start.
const CRACKS = { reach: 210, count: 4, pulseMs: 160, depth: 2.5, glow: 0xff8a2a, core: 0xffe08a };
const BURST = { launchUp: 30, shake: { ms: 300, strength: 0.012 } };

export const stoneBurst = {
  windup(boss, data) {
    boss.faceCat();
    boss.pose('attack', LIFT, data.windup * SMASH.liftShare);
    boss.addLeftover(drawCracks(boss.scene, boss.clubLandsAt, boss.feetY));
    boss.scene.audio.playSfx('lungeWarn');
  },

  attack(boss, data) {
    boss.clearLeftovers();
    boss.pose('attack', LANDS, SMASH.landsSeconds);
    const x = boss.clubLandsAt;
    boss.scene.cameras.main.shake(BURST.shake.ms, BURST.shake.strength);
    boss.scene.effects.dust(x, boss.feetY, 16);
    boss.scene.audio.playSfx('boom');
    const { min, max, gapTiles } = data.stones;
    const landings = stoneLandings({
      left: boss.arena.left,
      right: boss.arena.right,
      catX: boss.cat.body.center.x,
      count: min + Math.floor(Math.random() * (max - min + 1)),
      stoneW: STONE_W,
      gap: gapTiles * TILE,
    });
    boss.stones.throw(x, boss.feetY - BURST.launchUp, landings);
    boss.shakeTree();
  },

  recover(boss) {
    boss.pose('attack', STUCK, SMASH.stuckSeconds);
  },
};

// Jagged glowing cracks running out along the floor both ways from x, pulsing.
function drawCracks(scene, x, floorY) {
  const g = scene.add.graphics().setDepth(CRACKS.depth);
  for (const dir of [-1, 1]) {
    for (let i = 0; i < CRACKS.count / 2; i++) {
      const points = [{ x, y: floorY }];
      const length = CRACKS.reach * (0.6 + 0.4 * Math.random());
      for (let step = 1; step <= 5; step++) {
        points.push({ x: x + dir * (length * step) / 5, y: floorY - 2 - Math.random() * 8 + i * 3 });
      }
      g.lineStyle(8, CRACKS.glow, 0.45).strokePoints(points);
      g.lineStyle(3, CRACKS.core, 1).strokePoints(points);
    }
  }
  scene.tweens.add({ targets: g, alpha: 0.35, duration: CRACKS.pulseMs, yoyo: true, repeat: -1 });
  return g;
}
