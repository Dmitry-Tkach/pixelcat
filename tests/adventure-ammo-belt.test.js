import { describe, expect, it } from 'vitest';
import { AMMO } from '../src/data/adventure/ammo.js';
import { BELT_ORDER, beltKinds, heldKinds, kindAfterEmpty, kindForSlot, slotKey } from '../src/systems/adventure/ammoBelt.js';

const none = () => Object.fromEntries(Object.keys(AMMO).map((kind) => [kind, 0]));

describe('the ammo belt', () => {
  it('has every kind of round, standard first, each with its own key', () => {
    expect(BELT_ORDER).toEqual(Object.keys(AMMO));
    expect(BELT_ORDER[0]).toBe('standard');
    for (const kind of BELT_ORDER) expect(kindForSlot(slotKey(kind))).toBe(kind);
    expect(kindForSlot(BELT_ORDER.length + 1)).toBeNull();
  });

  it('carries only the kinds he has rounds for, in order', () => {
    const rounds = { ...none(), fire: 5, standard: 10 };
    expect(heldKinds(rounds)).toEqual(['standard', 'fire']);
  });

  it('shows the kind he is on even when it has run out', () => {
    const rounds = { ...none(), laser: 3 };
    expect(beltKinds(rounds, 'freeze')).toEqual(['laser', 'freeze']);
  });

  it('goes back to standard rounds when a special kind runs out', () => {
    expect(kindAfterEmpty({ ...none(), standard: 4, laser: 9 }, 'fire')).toBe('standard');
  });

  it('goes on to the next kind he has when standard rounds run out too', () => {
    expect(kindAfterEmpty({ ...none(), explosive: 2, fire: 1 }, 'laser')).toBe('fire');
    expect(kindAfterEmpty({ ...none(), explosive: 2 }, 'standard')).toBe('explosive');
  });

  it('has nothing to go on with when every kind is empty', () => {
    expect(kindAfterEmpty(none(), 'standard')).toBeNull();
  });
});
