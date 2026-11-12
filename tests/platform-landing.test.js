import { describe, expect, it } from 'vitest';
import { LAND_MARGIN, RIDE_GAP, landsFromAbove, staysOn } from '../src/systems/platformLanding.js';
import { MAX_FALL_SPEED, PHYSICS_STEPS_PER_SECOND } from '../src/systems/adventureMap.js';

describe('landing on a moving log or leaves', () => {
  const top = 500;

  it('lands when falling at full speed, though one step takes him past the margin', () => {
    // After a double jump he can reach the fastest fall: more than the margin in one step.
    const step = MAX_FALL_SPEED / PHYSICS_STEPS_PER_SECOND;
    expect(step).toBeGreaterThan(LAND_MARGIN);
    expect(landsFromAbove({ bottom: top - 2 + step, prevBottom: top - 2, top, vy: MAX_FALL_SPEED })).toBe(true);
  });

  it('lands on a log rising to meet him', () => {
    expect(landsFromAbove({ bottom: top + 30, prevBottom: top - 4, top: top - 2, prevTop: top, vy: 900, platformVy: -110 })).toBe(true);
  });

  it('stands on it while riding', () => {
    expect(landsFromAbove({ bottom: top, prevBottom: top, top, vy: 0 })).toBe(true);
  });

  it('lets him jump up through it from below', () => {
    expect(landsFromAbove({ bottom: top + 40, prevBottom: top + 60, top, vy: -600 })).toBe(false);
  });

  it("doesn't snap him up onto it when he falls past it from below its top", () => {
    // Started the frame well under its top, at the top of a jump: he goes on falling.
    expect(landsFromAbove({ bottom: top + 50, prevBottom: top + 48, top, vy: 60 })).toBe(false);
  });
});

describe('riding a moving log', () => {
  const log = { top: 500, logLeft: 1000, logRight: 1192 };
  const cat = (over) => ({ left: 1060, right: 1120, bottom: 500, vy: 0, ...log, ...over });

  it('stays on it while he stands on it', () => {
    expect(staysOn(cat())).toBe(true);
  });

  it('stays on a log going down that has dropped a little away from his feet', () => {
    // At 110 px a second it drops almost 2 px a step, faster than he falls after it at first.
    expect(staysOn(cat({ bottom: 500 - RIDE_GAP + 1, vy: 12, platformVy: 110 }))).toBe(true);
  });

  it('rides a log going up, and jumps off it', () => {
    expect(staysOn(cat({ vy: -110, platformVy: -110 }))).toBe(true);
    expect(staysOn(cat({ vy: -900, platformVy: -110 }))).toBe(false);
  });

  it('gets off when he jumps', () => {
    expect(staysOn(cat({ vy: -900 }))).toBe(false);
  });

  it('gets off when he walks past its end', () => {
    expect(staysOn(cat({ left: 1195, right: 1255 }))).toBe(false);
  });

  it('gets off when the log is no longer under his feet', () => {
    expect(staysOn(cat({ bottom: 500 - RIDE_GAP - 10 }))).toBe(false);
    expect(staysOn(cat({ bottom: 500 + LAND_MARGIN + 10 }))).toBe(false);
  });
});
