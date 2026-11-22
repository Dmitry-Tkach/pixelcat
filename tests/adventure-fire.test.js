import { describe, expect, it } from 'vitest';
import { AMMO } from '../src/data/adventure/ammo.js';
import { BURN, fireAfter } from '../src/data/adventure/fire.js';
import { WOOD_LEVEL } from '../src/data/adventure/wood.js';
import { readAdventureMap } from '../src/systems/adventureMap.js';

// Burns a fire down in steps of `ms`, counting the times it hurts.
function burnDown(ms) {
  let left = BURN.ms, ticks = 0, outs = 0;
  while (left > 0) {
    const fire = fireAfter(left, ms);
    left = fire.left;
    ticks += fire.ticks;
    if (fire.out) outs += 1;
  }
  return { ticks, outs };
}

describe('the fire round', () => {
  it('sets enemies on fire', () => {
    expect(AMMO.fire.burn).toBe(true);
  });

  it('hurts once a tick while it burns, however the frames fall', () => {
    const ticks = Math.floor(BURN.ms / BURN.tickMs);
    for (const ms of [16, 33, 50, 7]) expect(burnDown(ms), `${ms} ms frames`).toEqual({ ticks, outs: 1 });
  });

  it('does not hurt in the first moments', () => {
    expect(fireAfter(BURN.ms, BURN.tickMs - 1).ticks).toBe(0);
    expect(fireAfter(BURN.ms, BURN.tickMs).ticks).toBe(1);
  });

  it('is out and stays out', () => {
    expect(fireAfter(0, 16)).toEqual({ left: 0, ticks: 0, out: false });
  });

  it('puts a crate of fire rounds in the first level', () => {
    expect(readAdventureMap(WOOD_LEVEL.map).objects.map((o) => o.type)).toContain('ammo-fire');
  });
});
