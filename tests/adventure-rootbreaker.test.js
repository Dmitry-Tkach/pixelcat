import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RB_ART, ROOTBREAKER, armPose, coreDamage, fistAngle, fistBox, inReach, layArm, nextAttack, pieceSide, rbPath, rootbreakerPhase,
} from '../src/data/adventure/rootbreaker.js';
import { ADVENTURE_LEVELS } from '../src/data/adventure/index.js';

describe('the Rootbreaker', () => {
  it('has every part of his picture', () => {
    for (const name of RB_ART) expect(existsSync(`public/${rbPath(name)}`), name).toBe(true);
  });

  it('goes through his three phases as his health falls', () => {
    expect(rootbreakerPhase(1).name).toBe('Awakening');
    expect(rootbreakerPhase(0.7).index).toBe(0);
    expect(rootbreakerPhase(0.66).name).toBe('Enraged');
    expect(rootbreakerPhase(0.2).name).toBe('Overload');
    expect(rootbreakerPhase(0.2).speed).toBeGreaterThan(rootbreakerPhase(1).speed);
  });

  it('takes his attacks in turn, and smashes in every phase (a missed smash is the way in)', () => {
    const awakening = rootbreakerPhase(1);
    expect([0, 1, 2, 3].map((n) => nextAttack(awakening, n))).toEqual(['smash', 'blast', 'smash', 'smash']);
    for (const phase of ROOTBREAKER.phases) expect(phase.attacks).toContain('smash');
  });

  it('is hurt only in his open core', () => {
    expect(coreDamage('standard', false)).toBe(0);
    expect(coreDamage('standard', true)).toBe(1);
    expect(coreDamage('explosive', true)).toBeGreaterThan(coreDamage('standard', true));
  });

  it('warns before every attack, for at least as long as the traps do', () => {
    for (const attack of ['smash', 'blast', 'sweep', 'laser', 'rockfall']) expect(ROOTBREAKER[attack].tellMs).toBeGreaterThanOrEqual(700);
  });

  it('stands in his arena in level 3, his laser passing under a cat on a ledge or over one on the floor', () => {
    const level = ADVENTURE_LEVELS.find((l) => l.id === 'wood-3');
    const def = level.bosses.find((b) => b.kind === 'rootbreaker');
    expect(def.col).toBeGreaterThan(def.arena.left);
    expect(def.col).toBeLessThan(def.arena.right);
    const [low, high] = ROOTBREAKER.laser.heights;
    expect(low).toBeLessThan(90); // a standing cat is 90 px tall: the low one must be jumped
    expect(high).toBeGreaterThan(90 + ROOTBREAKER.laser.thick); // and the high one passes over him
  });
});


describe("the Rootbreaker's arms", () => {
  const bones = { upper: 270, fore: 270 };
  const shoulder = { x: 0, y: 0 };
  const length = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

  it('bend at the elbow, the bones their own lengths', () => {
    const { elbow, wrist } = armPose(shoulder, { x: -200, y: 150 }, bones, -1);
    expect(length(shoulder, elbow)).toBeCloseTo(270);
    expect(length(elbow, wrist)).toBeCloseTo(270);
    expect(wrist).toEqual({ x: -200, y: 150 });
  });

  it('bend one way only, like an elbow: out when the arm reaches up, tucked in when it reaches down', () => {
    // The right arm (out 1): reaching up, the elbow is out to the right of the line; reaching down,
    // it's in, to the left.
    const up = armPose(shoulder, { x: 0, y: -300 }, bones, 1);
    expect(up.elbow.x).toBeGreaterThan(0);
    const down = armPose(shoulder, { x: 0, y: 300 }, bones, 1);
    expect(down.elbow.x).toBeLessThan(0);
    // The left arm is its mirror.
    expect(armPose(shoulder, { x: 0, y: -300 }, bones, -1).elbow.x).toBeCloseTo(-up.elbow.x);
  });

  it('pull a wrist beyond reach in, the arm straight', () => {
    const { elbow, wrist } = armPose(shoulder, { x: 1000, y: 0 }, bones, 1);
    expect(wrist.x).toBeCloseTo(540, 1);
    expect(elbow.x).toBeCloseTo(270, 1);
    expect(Math.abs(elbow.y)).toBeLessThan(2); // straight, but for a hair
  });

  // The pieces' sizes, as the owner drew them (the right-pointing pictures).
  const sizes = { shoulder: { w: 247, h: 225 }, upper: { w: 205, h: 207 }, fore: { w: 447, h: 169 }, fist: { w: 503, h: 261 } };
  const mount = { x: 272, y: -258 }; // his right shoulder, from the middle of his feet

  it('lay their pieces end to end, from the shoulder to a fist that gets where its move wants it', () => {
    for (const goal of [{ x: 540, y: -140 }, { x: 400, y: -560 }, { x: 330, y: -106 }, { x: 530, y: -85 }]) {
      const lay = layArm({ mount, side: 1, goal, angle: fistAngle(0, 1), sizes });
      expect(length(lay.fistAt, goal), JSON.stringify(goal)).toBeLessThan(1);
      // Each piece starts where the one before it ends.
      const { lengths } = lay;
      expect(length(lay.shoulder, lay.upper)).toBeCloseTo(lengths.shoulder);
      expect(length(lay.shoulder, lay.fore)).toBeCloseTo(lengths.upper);
      expect(length(lay.fore, lay.fist)).toBeCloseTo(lengths.fore);
      expect(length(lay.fist, lay.fistAt)).toBeCloseTo(lengths.fist);
    }
  });

  it('bend the wrist only so far when the fist has room', () => {
    const lay = layArm({ mount, side: 1, goal: { x: 560, y: -140 }, angle: fistAngle(80, 1), sizes });
    const forearm = Math.atan2(lay.fist.y - lay.fore.y, lay.fist.x - lay.fore.x);
    const bend = Math.abs(Math.atan2(Math.sin(lay.angle - forearm), Math.cos(lay.angle - forearm)));
    expect(bend).toBeLessThanOrEqual((ROOTBREAKER.arm.wristBend * Math.PI) / 180 + 1e-6);
  });

  it('keep the moss on top: a piece pointing left uses the left drawing, without flickering at straight down', () => {
    expect(pieceSide(Math.PI, 1, 0.25)).toBe(-1);
    expect(pieceSide(0, -1, 0.25)).toBe(1);
    expect(pieceSide(Math.PI / 2 + 0.1, 1, 0.25)).toBe(1); // just past straight down: it keeps its drawing
    expect(pieceSide(Math.PI / 2 - 0.1, -1, 0.25)).toBe(-1);
  });

  it('work each on its own side of the arena, out of his way', () => {
    const arena = { left: -640, right: 640 };
    const { inner, edge } = ROOTBREAKER.reachZone;
    expect(inReach(50, 1, 0, arena)).toBe(inner);
    expect(inReach(900, 1, 0, arena)).toBe(640 - edge);
    expect(inReach(-50, -1, 0, arena)).toBe(-inner);
    expect(inReach(-450, -1, 0, arena)).toBe(-450);
  });

  it('land flat, the fist a step on the floor, and every fist landing reachable', () => {
    const across = (sizes.fist.h * ROOTBREAKER.arm.scale * 0.9) / 2;
    const box = fistBox({ x: 400, y: -across }, fistAngle(0, 1), sizes.fist);
    expect(box.bottom).toBeCloseTo(0);
    expect(box.bottom - box.top).toBeGreaterThan(60); // a block to stand on
    const { inner, edge } = ROOTBREAKER.reachZone;
    for (const x of [inner, 640 - edge]) {
      const lay = layArm({ mount, side: 1, goal: { x, y: -across }, angle: fistAngle(0, 1), sizes });
      expect(lay.fistAt.x, `${x}`).toBeCloseTo(x, 0);
    }
  });
});
