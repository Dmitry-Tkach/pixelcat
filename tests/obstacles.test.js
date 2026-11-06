import { describe, expect, it } from 'vitest';
import { GAME, MOVEMENT, SINGLE_JUMP_HEIGHT } from '../src/config/gameConfig.js';
import { CHARACTERS } from '../src/data/characters.js';
import { OBSTACLES } from '../src/data/obstacles.js';
import { LEVELS } from '../src/data/levels/index.js';
import { jumpWindowSeconds } from '../src/systems/levelValidation.js';
import { activationCatX, arcHeight, crossingProgress, shouldStartLeap, startX, swingHeight, wagonRearX } from '../src/systems/obstacleMotion.js';

describe('moving obstacle motion', () => {
  it('reaches the meeting point at the same moment as a full-speed cat', () => {
    const meetAt = 5000;
    const catSpeed = 400;
    const speed = 150;
    const lead = 1.6;
    const catAt = activationCatX(meetAt, catSpeed, lead) + catSpeed * lead;
    const obstacleAt = startX(meetAt, speed, lead) - speed * lead;
    expect(catAt).toBeCloseTo(meetAt);
    expect(obstacleAt).toBeCloseTo(meetAt);
  });

  it('follows an arc that peaks at the midpoint', () => {
    expect(arcHeight(0, 1, 100)).toBe(0);
    expect(arcHeight(0.5, 1, 100)).toBeCloseTo(100);
    expect(arcHeight(1, 1, 100)).toBe(0);
    expect(arcHeight(0.25, 1, 100)).toBeCloseTo(75);
  });

  it('times a leap so its peak arrives over the cat', () => {
    expect(shouldStartLeap(200, 400, 200, 0.7)).toBe(true); // closes 210px in half the leap
    expect(shouldStartLeap(220, 400, 200, 0.7)).toBe(false);
  });
});

describe('swinging obstacle', () => {
  const { period, maxHeight } = OBSTACLES.crate.motion;
  const CAT = CHARACTERS.cat;

  it('is at the requested position when a full-speed cat arrives', () => {
    expect(swingHeight(5, 5, period, maxHeight, 'low')).toBeCloseTo(0);
    expect(swingHeight(5, 5, period, maxHeight, 'high')).toBeCloseTo(maxHeight);
  });

  it('is at the opposite position half a swing earlier, so the player sees it move', () => {
    expect(swingHeight(5 - period / 2, 5, period, maxHeight, 'low')).toBeCloseTo(maxHeight);
  });

  it('when high, fits a sliding cat underneath but not a standing one', () => {
    expect(maxHeight).toBeGreaterThan(CAT.hitboxes.slide.h * CAT.scale);
    expect(maxHeight).toBeLessThan(CAT.hitboxes.run.h * CAT.scale);
  });
});

describe('double jump and tall obstacles', () => {
  const airJumpHeight = MOVEMENT.AIR_JUMP_VELOCITY ** 2 / (2 * MOVEMENT.GRAVITY);
  const vanHeight = OBSTACLES.van.hitbox.h - GAME.GROUND_OVERLAP;

  it('makes the van too tall for one jump', () => {
    expect(vanHeight).toBeGreaterThan(SINGLE_JUMP_HEIGHT);
  });

  it('lets a double jump reach the roof', () => {
    expect(SINGLE_JUMP_HEIGHT + airJumpHeight).toBeGreaterThan(vanHeight + 60);
  });

  it('lets a bin bounce reach the roof', () => {
    const bounceHeight = OBSTACLES.bin.bounce ** 2 / (2 * MOVEMENT.GRAVITY);
    expect(bounceHeight + OBSTACLES.bin.hitbox.h).toBeGreaterThan(vanHeight);
  });
});

describe('bird heights', () => {
  const CAT = CHARACTERS.cat;
  const standingTop = CAT.hitboxes.run.h * CAT.scale;
  const slidingTop = CAT.hitboxes.slide.h * CAT.scale;
  const FRAME_HEIGHT = 98;
  const FEET_ORIGIN = 0.97;
  // How far above the ground the bird's hitbox starts, at the lowest point of its bob.
  const lowestEdge = ({ motion, hitbox }) => (
    motion.flyHeight - motion.bob.height + FRAME_HEIGHT * FEET_ORIGIN - hitbox.y - hitbox.h
  );

  it('flies the low bird between sliding and standing height', () => {
    expect(lowestEdge(OBSTACLES.bird)).toBeGreaterThan(slidingTop);
    expect(lowestEdge(OBSTACLES.bird)).toBeLessThan(standingTop);
  });

  it('flies the high bird clear of a standing cat', () => {
    expect(lowestEdge(OBSTACLES.highBird)).toBeGreaterThan(standingTop);
  });
});

describe('leapingDog fairness', () => {
  const { leap, speed } = OBSTACLES.leapingDog.motion;
  const CAT = CHARACTERS.cat;
  const standingTop = CAT.hitboxes.run.h * CAT.scale;
  const slidingTop = CAT.hitboxes.slide.h * CAT.scale;

  it('peaks low enough to hit a standing cat', () => {
    expect(leap.height).toBeLessThan(standingTop);
  });

  it.each(LEVELS.map((level) => [level.id, level.cat.speed]))('clears a sliding cat at full speed in %s', (_id, catSpeed) => {
    const closing = catSpeed + speed;
    const widths = OBSTACLES.leapingDog.hitbox.w + CAT.hitboxes.slide.w * CAT.scale;
    const crossingSeconds = widths / closing;
    // The height at the moment the two hitboxes start and stop overlapping horizontally.
    const edge = leap.seconds / 2 - crossingSeconds / 2;
    const safetyMargin = 12; // frame timing can move the crossing slightly
    expect(arcHeight(edge, leap.seconds, leap.height)).toBeGreaterThan(slidingTop + safetyMargin);
  });
});

describe('obstacle data', () => {
  it.each(Object.entries(OBSTACLES))('%s can be drawn and avoided', (_name, type) => {
    expect(['jump', 'slide', 'doubleJump', 'read', 'stay', 'terrain']).toContain(type.avoid);
    expect((type.penalty ?? type.zone).speedMultiplier).toBeLessThan(1);
    if (type.character) expect(CHARACTERS[type.character].anims[type.motion.anim]).toBeDefined();
    else expect(type.texture).toBeTruthy();
  });

  it('gives overhead obstacles a low edge between sliding and standing height', () => {
    const CAT = CHARACTERS.cat;
    const standingTop = CAT.hitboxes.run.h * CAT.scale;
    const slidingTop = CAT.hitboxes.slide.h * CAT.scale;
    const TEXTURE_HEIGHT = 290;
    for (const type of [OBSTACLES.scaffold, OBSTACLES.banner, OBSTACLES.washingLine]) {
      const lowEdge = TEXTURE_HEIGHT - GAME.GROUND_OVERLAP - (type.hitbox.y + type.hitbox.h);
      expect(lowEdge).toBeGreaterThan(slidingTop);
      expect(lowEdge).toBeLessThan(standingTop);
    }
  });

  it('leaves a fair moment to jump every jump obstacle at the slowest and fastest level speeds', () => {
    const speeds = LEVELS.map((level) => level.cat.speed);
    for (const type of Object.values(OBSTACLES).filter((t) => t.avoid === 'jump')) {
      for (const speed of [Math.min(...speeds), Math.max(...speeds)]) {
        expect(jumpWindowSeconds(type, speed)).toBeGreaterThan(0.15);
      }
    }
  });
});

describe('hay wagon', () => {
  it('reaches the meeting point exactly when the cat does', () => {
    expect(wagonRearX(2000, 2000, 0.6)).toBe(2000);
  });

  it('stays ahead of the cat before then, and falls behind after', () => {
    expect(wagonRearX(1000, 2000, 0.6)).toBeGreaterThan(1000);
    expect(wagonRearX(3000, 2000, 0.6)).toBeLessThan(3000);
  });
});

describe('crossing car', () => {
  const { crossSeconds, passBehindSeconds, hitSeconds } = OBSTACLES.crossingCar.motion;

  it('is in the cat\'s lane on red when the cat arrives', () => {
    expect(crossingProgress(10, 10, crossSeconds)).toBe(0);
  });

  it('starts crossing soon enough to be seen before it can hit', () => {
    expect(crossingProgress(10 - crossSeconds / 2, 10, crossSeconds)).toBeCloseTo(-1);
    expect(crossSeconds / 2).toBeGreaterThan(hitSeconds);
  });

  it('on green, only reaches the lane after the cat has passed', () => {
    expect(crossingProgress(10, 10, crossSeconds, passBehindSeconds)).toBeLessThan(0);
    expect(passBehindSeconds).toBeGreaterThan(hitSeconds);
  });
});
