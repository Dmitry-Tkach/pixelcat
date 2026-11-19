import { describe, expect, it } from 'vitest';
import { AMMO } from '../src/data/adventure/ammo.js';
import { ADVENTURE_ART, adventureArtWorld } from '../src/data/adventure/index.js';
import { SOUNDS } from '../src/data/sounds.js';

describe('ammunition crates', () => {
  it('gives every kind of round a crate sound that exists', () => {
    for (const [kind, { sound }] of Object.entries(AMMO)) {
      expect(sound, kind).toBeTruthy();
      expect(SOUNDS[sound], `${kind}: ${sound}`).toBeDefined();
    }
  });

  it('gives every crate sound different notes', () => {
    const sounds = Object.values(AMMO).map(({ sound }) => JSON.stringify(SOUNDS[sound]));
    expect(new Set(sounds).size).toBe(sounds.length);
  });

  it('loads every kind of crate in every world', () => {
    for (const world of Object.keys(ADVENTURE_ART)) {
      for (const { crate } of Object.values(AMMO)) expect(ADVENTURE_ART[adventureArtWorld(world, crate)], `${world}: ${crate}`).toContain(crate);
    }
  });
});
