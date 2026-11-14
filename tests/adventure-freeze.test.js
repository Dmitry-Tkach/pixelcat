import { describe, expect, it } from 'vitest';
import { AMMO } from '../src/data/adventure/ammo.js';
import { FREEZE, iceAfter } from '../src/data/adventure/freeze.js';
import { WOOD_LEVEL } from '../src/data/adventure/wood.js';
import { readAdventureMap } from '../src/systems/adventureMap.js';

describe('the freeze round', () => {
  it('freezes, rather than hurting', () => {
    expect(AMMO.freeze.freeze).toBe(true);
    expect(AMMO.freeze.blast).toBeUndefined();
    expect(AMMO.freeze.pierce).toBeUndefined();
  });

  it('keeps the ice, not cracking, for most of its time', () => {
    const ice = iceAfter(FREEZE.ms, 1000);
    expect(ice).toEqual({ left: FREEZE.ms - 1000, cracking: false, thawed: false });
  });

  it('cracks in its last moments', () => {
    const ice = iceAfter(FREEZE.crackMs + 100, 200);
    expect(ice.cracking).toBe(true);
    expect(ice.thawed).toBe(false);
  });

  it('thaws once, at the end, and stays thawed', () => {
    const end = iceAfter(50, 16);
    expect(iceAfter(end.left, 100)).toEqual({ left: 0, cracking: false, thawed: true });
    expect(iceAfter(0, 16).thawed).toBe(false);
  });

  it('puts a crate of freeze rounds in the first level', () => {
    const types = readAdventureMap(WOOD_LEVEL.map).objects.map((o) => o.type);
    expect(types).toContain('ammo-freeze');
  });
});
