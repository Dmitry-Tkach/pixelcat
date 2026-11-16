import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RB_ART, ROOTBREAKER, coreDamage, nextAttack, rbPath, rootbreakerPhase } from '../src/data/adventure/rootbreaker.js';
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
