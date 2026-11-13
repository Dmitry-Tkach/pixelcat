import { describe, expect, it } from 'vitest';
import { CLAW, clawArea, overlaps } from '../src/systems/adventure/clawSwipe.js';
import { BOSS_FIGHTS } from '../src/data/adventure/bossFights.js';
import { ADVENTURE_HERO } from '../src/data/adventure/index.js';
import { CHARACTERS } from '../src/data/characters.js';

const cat = { left: 100, right: 140, top: 50, bottom: 140 };

describe("the cat's claw swipe", () => {
  it('strikes in front of him, the way he faces', () => {
    expect(clawArea(cat, 1)).toEqual({ left: 140, right: 140 + CLAW.reach, top: 50 - CLAW.above, bottom: 140 });
    expect(clawArea(cat, -1)).toEqual({ left: 100 - CLAW.reach, right: 100, top: 50 - CLAW.above, bottom: 140 });
  });

  it('hits an enemy within reach, and not one behind him or out of reach', () => {
    const area = clawArea(cat, 1);
    const enemy = (left) => ({ left, right: left + 40, top: 60, bottom: 140 });
    expect(overlaps(area, enemy(150))).toBe(true); // right in front
    expect(overlaps(area, enemy(140 + CLAW.reach - 5))).toBe(true); // at the end of his reach
    expect(overlaps(area, enemy(140 + CLAW.reach + 5))).toBe(false); // too far
    expect(overlaps(area, enemy(40))).toBe(false); // behind him
  });

  it('misses an enemy well above or below him', () => {
    const area = clawArea(cat, 1);
    expect(overlaps(area, { left: 150, right: 190, top: -100, bottom: 50 - CLAW.above - 1 })).toBe(false);
    expect(overlaps(area, { left: 150, right: 190, top: 141, bottom: 220 })).toBe(false);
  });

  it('strikes before his swipe animation ends, and comes round only after it', () => {
    expect(CLAW.hitMs).toBeLessThan(CLAW.ms);
    expect(CLAW.cooldownMs).toBeGreaterThanOrEqual(CLAW.ms);
  });

  it('is a swipe both looks of the hero can play', () => {
    for (const name of [ADVENTURE_HERO.character, ADVENTURE_HERO.armed]) {
      expect(CHARACTERS[name].anims.swipe, name).toBeDefined();
    }
  });

  it('hurts every boss only a little', () => {
    for (const [kind, { damage }] of Object.entries(BOSS_FIGHTS)) {
      expect(damage[CLAW.boss], kind).toBeGreaterThan(0);
      expect(damage[CLAW.boss], kind).toBeLessThanOrEqual(damage.standard);
    }
  });
});

describe("every look of the adventure's hero", () => {
  it('has every frame of every move prepared', async () => {
    const { existsSync } = await import('node:fs');
    const { BATTLE_CATS } = await import('../src/data/adventure/heroes.js');
    for (const { folder, anims } of Object.values(BATTLE_CATS)) {
      for (const { file, frames } of Object.values(anims)) {
        for (let n = 1; n <= frames; n++) {
          const path = `public/assets/sprites/${folder}/${file}-${n}.png`;
          expect(existsSync(path), path).toBe(true);
        }
      }
    }
  });
});

describe('the hero with the minigun', () => {
  it("fires from the barrel's end, inside his frame and in front of him", async () => {
    const { PAWS_FRAME } = await import('../src/data/adventure/heroes.js');
    const { muzzle } = CHARACTERS[ADVENTURE_HERO.armed];
    expect(muzzle.x).toBeGreaterThan(0);
    expect(PAWS_FRAME.middle + muzzle.x).toBeLessThan(PAWS_FRAME.w);
    expect(muzzle.y).toBeGreaterThan(0);
    expect(muzzle.y).toBeLessThan(PAWS_FRAME.feet);
  });
});

describe('the hero firing on the run', () => {
  it("fires from the barrel's end as he runs, inside his frame", async () => {
    const { PAWS_FRAME } = await import('../src/data/adventure/heroes.js');
    const { runMuzzle, anims } = CHARACTERS[ADVENTURE_HERO.armed];
    expect(anims.runShoot).toBeDefined();
    expect(PAWS_FRAME.middle + runMuzzle.x).toBeLessThan(PAWS_FRAME.w);
    expect(runMuzzle.y).toBeGreaterThan(0);
  });
});
