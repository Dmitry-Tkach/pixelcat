import { describe, expect, it } from 'vitest';
import { bossTouch } from '../src/systems/adventure/bosses/bossTouch.js';

const CAT = { fromAbove: false, onTop: false, dashing: false, sliding: false, raging: false };
const BOSS = { defeated: false, weak: false, invulnerable: false, touchHurts: false };
const touch = (cat = {}, boss = {}) => bossTouch({ ...CAT, ...cat }, { ...BOSS, ...boss });

describe('touching a boss', () => {
  it('hurts him with a jump on his head only in a weak moment', () => {
    expect(touch({ fromAbove: true }, { weak: true })).toBe('stomp');
    expect(touch({ fromAbove: true })).toBe('bounceHead');
  });

  it('never counts a jump on his head while he can\'t be hurt', () => {
    expect(touch({ fromAbove: true }, { weak: true, invulnerable: true })).toBe('bounceHead');
  });

  it('lets the cat land on his head even while touching him hurts', () => {
    expect(touch({ fromAbove: true }, { touchHurts: true })).toBe('bounceHead');
  });

  it('knocks the cat back from a dash, a slide or rage, hurting nobody', () => {
    for (const move of ['dashing', 'sliding', 'raging']) {
      expect(touch({ [move]: true }), move).toBe('bounceOff');
      expect(touch({ [move]: true }, { touchHurts: true }), move).toBe('bounceOff');
    }
  });

  it('hurts the cat during an attack that hurts on touch, and is solid otherwise', () => {
    expect(touch({}, { touchHurts: true })).toBe('hurt');
    expect(touch()).toBe('push');
  });

  it('does nothing while the cat rises off his head, or once he\'s beaten', () => {
    expect(touch({ onTop: true })).toBe('none');
    expect(touch({ onTop: true }, { touchHurts: true })).toBe('none');
    expect(touch({ fromAbove: true }, { defeated: true, weak: true })).toBe('none');
    expect(touch({}, { defeated: true, touchHurts: true })).toBe('none');
  });
});
