import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RB_ART, ROOTBREAKER, chainBow, chainHold, chainLinks, coreDamage, fistAngle, fistBox, inReach, nextAttack, rbPath, rootbreakerPhase,
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
  const length = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const fist = { w: 134, h: 138 }; // the fist's stone, as drawn
  const mount = { x: 181, y: -172 }; // his right shoulder's ring, from the middle of his feet

  it('hold each fist on its edge toward the shoulder', () => {
    const goal = { x: 420, y: -100 };
    const hold = chainHold(goal, mount, fist);
    const r = (Math.min(fist.w, fist.h) * ROOTBREAKER.arm.scale * ROOTBREAKER.arm.hold) / 2;
    expect(length(hold, goal)).toBeCloseTo(r);
    expect(length(hold, mount)).toBeLessThan(length(goal, mount));
  });

  it('chain each fist to its shoulder: links between, smaller toward the fist', () => {
    const cuff = { x: 380, y: -330 };
    const links = chainLinks(mount, cuff, chainBow(mount, cuff, 1));
    expect(links).toHaveLength(ROOTBREAKER.chain.links);
    for (const link of links) expect(link.x).toBeGreaterThan(mount.x - 50);
    expect(links[0].size).toBeGreaterThan(links.at(-1).size);
    // In order from the shoulder to the fist.
    expect(length(mount, links[0])).toBeLessThan(length(mount, links.at(-1)));
  });

  it('bow the chain like a rope: up and out when slack, nearly straight when taut', () => {
    const { length: full, bowMost } = ROOTBREAKER.chain;
    const near = chainBow(mount, { x: mount.x + 120, y: mount.y }, 1);
    expect(near.y).toBeLessThan(0); // up
    const far = chainBow(mount, { x: mount.x + full + 50, y: mount.y }, 1);
    expect(Math.hypot(far.x, far.y)).toBeLessThan(Math.hypot(near.x, near.y));
    expect(Math.hypot(near.x, near.y)).toBeLessThanOrEqual(bowMost);
    // The left arm's chain is its mirror.
    const left = chainBow({ x: -mount.x, y: mount.y }, { x: -mount.x - 120, y: mount.y }, -1);
    expect(left.y).toBeCloseTo(near.y);
  });

  it('work each on its own side of the arena, out of his way', () => {
    const arena = { left: -640, right: 640 };
    const { inner, edge } = ROOTBREAKER.reachZone;
    expect(inReach(50, 1, 0, arena)).toBe(inner);
    expect(inReach(900, 1, 0, arena)).toBe(640 - edge);
    expect(inReach(-50, -1, 0, arena)).toBe(-inner);
    expect(inReach(-450, -1, 0, arena)).toBe(-450);
  });

  it('land on the floor, the fist a stone to stand on', () => {
    const across = (ROOTBREAKER.arm.box * fist.h * ROOTBREAKER.arm.scale) / 2;
    const box = fistBox({ x: 400, y: -across }, fist);
    expect(box.bottom).toBeCloseTo(0);
    expect(box.bottom - box.top).toBeGreaterThan(60);
    expect(box.bottom - box.top).toBeLessThan(180); // low enough to jump onto
  });
});
