import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  RB_ART, ROOTBREAKER, armDamage, beamEnd, beamTouches, chainBow, chainHold, chainLinks, coreDamage, fistAngle, fistBox, inReach, nextAttack, pickAttack, rbPath, stoneFlight,
  rootbreakerPhase,
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

  it('has arms that can be worn down and broken, the bolt and explosives hardest', () => {
    const { full } = ROOTBREAKER.armHealth;
    expect(full).toBeGreaterThan(armDamage('standard') * 5); // more than a few rounds
    expect(ROOTBREAKER.armHealth.regrowMs).toBeGreaterThanOrEqual(15000); // a broken arm stays gone a good while
    expect(armDamage('standard')).toBe(1);
    expect(armDamage('explosive')).toBeGreaterThan(armDamage('standard'));
    expect(armDamage('bolt')).toBeGreaterThan(armDamage('explosive'));
    expect(armDamage('claw')).toBeGreaterThan(0);
    expect(armDamage('dash')).toBeGreaterThan(0);
  });

  it('passes over a fist attack while both his arms are broken, and makes it with one', () => {
    const awakening = rootbreakerPhase(1); // smash, blast, smash
    expect(pickAttack(awakening, 0, 2)).toEqual({ kind: 'smash', steps: 1 });
    expect(pickAttack(awakening, 0, 1)).toEqual({ kind: 'smash', steps: 1 });
    expect(pickAttack(awakening, 0, 0)).toEqual({ kind: 'blast', steps: 2 });
    // Never stuck: with no fists he always finds something.
    for (const phase of ROOTBREAKER.phases) for (let n = 0; n < 8; n++) expect(['blast', 'laser', 'rockfall', 'shoulder']).toContain(pickAttack(phase, n, 0).kind);
  });

  it('strikes with a shoulder stone in phases 2 and 3, and every other attack with an arm broken', () => {
    expect(rootbreakerPhase(1).attacks).not.toContain('shoulder');
    expect(rootbreakerPhase(0.5).attacks).toContain('shoulder');
    expect(rootbreakerPhase(0.2).attacks).toContain('shoulder');
    const enraged = rootbreakerPhase(0.5);
    expect(pickAttack(enraged, 0, 2).kind).toBe('sweep');
    expect(pickAttack(enraged, 0, 1).kind).toBe('shoulder');
    expect(pickAttack(enraged, 1, 1).kind).not.toBe('shoulder');
    expect(ROOTBREAKER.shoulder.tellMs).toBeGreaterThanOrEqual(700); // a warning as long as the traps'
    expect(ROOTBREAKER.shoulderStone.scale).toBeGreaterThan(0); // the stone's own size, apart from the strike's settings
  });

  it('flies a shoulder stone in an arc, from his shoulder to where it lands', () => {
    const from = { x: 0, y: -200 }, to = { x: 300, y: -40 };
    expect(stoneFlight(from, to, 0, 150)).toEqual(from);
    expect(stoneFlight(from, to, 1, 150).x).toBeCloseTo(to.x);
    expect(stoneFlight(from, to, 1, 150).y).toBeCloseTo(to.y);
    expect(stoneFlight(from, to, 0.5, 150).y).toBeLessThan((from.y + to.y) / 2 - 100); // lifted in its middle
  });

  it('is hurt anywhere on his body, but only while his core is open', () => {
    expect(coreDamage('standard', false)).toBe(0); // shut: nothing
    expect(coreDamage('standard', true)).toBe(1);
    expect(coreDamage('explosive', true)).toBeGreaterThan(coreDamage('standard', true));
  });

  it('warns before every attack, for at least as long as the traps do', () => {
    for (const attack of ['smash', 'blast', 'sweep', 'laser', 'rockfall', 'shoulder']) expect(ROOTBREAKER[attack].tellMs).toBeGreaterThanOrEqual(700);
  });

  it('can be shot from the floor, a low ledge or a stuck fist: his body reaches up past a ledge', () => {
    const level = ADVENTURE_LEVELS.find((l) => l.id === 'wood-3');
    const def = level.bosses.find((b) => b.kind === 'rootbreaker');
    // His body's picture height, from its PNG header.
    const png = readFileSync(`public/${rbPath('rb-body')}`);
    const height = png.readUInt32BE(20) * ROOTBREAKER.scale.body - ROOTBREAKER.sinkPx;
    const ledgeUp = 3 * 64, gunUp = 40; // the low ledges, three cells up; the minigun over the paws
    expect(height).toBeGreaterThan(ledgeUp + gunUp);
    const ledge = level.map[def.floor - 3].slice(def.arena.left, def.arena.right + 1);
    expect(ledge).toMatch(/=/);
  });

  it('stands in his arena in level 3', () => {
    const level = ADVENTURE_LEVELS.find((l) => l.id === 'wood-3');
    const def = level.bosses.find((b) => b.kind === 'rootbreaker');
    expect(def.col).toBeGreaterThan(def.arena.left);
    expect(def.col).toBeLessThan(def.arena.right);
  });

  it('fires his lasers from his eyes at the cat, to the floor or the walls', () => {
    const bounds = { left: 0, right: 1280, top: 0, floor: 700 };
    const eye = { x: 640, y: 400 };
    // Down at a cat on the floor: it ends on the floor, past him.
    const end = beamEnd(eye, { x: 900, y: 650 }, bounds);
    expect(end.y).toBeCloseTo(700);
    expect(end.x).toBeGreaterThan(900);
    // Level: it ends at the wall. Up at a cat on a branch: at the top.
    expect(beamEnd(eye, { x: 100, y: 400 }, bounds).x).toBeCloseTo(0);
    expect(beamEnd(eye, { x: 700, y: 100 }, bounds).y).toBeCloseTo(0);
    // It touches the cat it's aimed at, and not one beside the line.
    const cat = { left: 870, right: 930, top: 590, bottom: 680 };
    expect(beamTouches(eye, end, 24, cat)).toBe(true);
    expect(beamTouches(eye, end, 24, { left: 1100, right: 1160, top: 590, bottom: 680 })).toBe(false);
    expect(beamTouches(eye, end, 24, { left: 870, right: 930, top: 100, bottom: 190 })).toBe(false);
    // The lines stop following before the beams fire, so he can be dodged.
    expect(ROOTBREAKER.laser.lockShare * ROOTBREAKER.laser.tellMs).toBeGreaterThanOrEqual(300);
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
