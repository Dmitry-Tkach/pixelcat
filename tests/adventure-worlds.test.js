import { describe, expect, it } from 'vitest';
import { ADVENTURE_MAP_WORLDS, ADVENTURE_ROADMAP, ADVENTURE_WORLDS, worldEnds } from '../src/data/adventure/roadmap.js';
import { mapArt } from '../src/ui/mapArt.js';

describe('the adventure\'s worlds', () => {
  it('goes through 8 worlds in order, 3 levels each', () => {
    expect(ADVENTURE_WORLDS).toEqual(['Wood', 'Autumn Forest', 'Graveyard', 'Crystal Caves', 'Ancient', 'Sky Ruins', 'Execution Grounds', 'Medieval']);
    for (const world of ADVENTURE_WORLDS) expect(ADVENTURE_ROADMAP.filter((stop) => stop.world === world), world).toHaveLength(3);
    expect(ADVENTURE_ROADMAP).toHaveLength(24);
  });

  it('keeps each world\'s levels together, so its page of the map holds all of them', () => {
    const order = ADVENTURE_ROADMAP.map((stop) => stop.world).filter((world, i, all) => i === 0 || world !== all[i - 1]);
    expect(order).toEqual(ADVENTURE_WORLDS);
  });

  it('starts the road at the portal and ends it at the castle, with nothing at the ends between', () => {
    expect(worldEnds(0)).toEqual({ start: 'portal', end: 'none' });
    expect(worldEnds(3)).toEqual({ start: 'none', end: 'none' });
    expect(worldEnds(ADVENTURE_WORLDS.length - 1)).toEqual({ start: 'none', end: 'castle' });
  });

  it.each(ADVENTURE_WORLDS.map((world, i) => [world, i]))('draws %s\'s page of the map, with its 3 levels', (world, i) => {
    const stops = ADVENTURE_ROADMAP.map((stop, index) => ({ ...stop, number: index + 1, locked: false, stars: 0 }))
      .filter((stop) => stop.world === world);
    const svg = mapArt(stops, { worlds: ADVENTURE_MAP_WORLDS, ...worldEnds(i) });
    for (const { number } of stops) expect(svg).toContain(`>${number}</text>`);
    expect(svg).toContain(`>${world}<`); // its name on its sign
  });
});
