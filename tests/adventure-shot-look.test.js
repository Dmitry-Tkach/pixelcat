import { describe, expect, it } from 'vitest';
import { AMMO } from '../src/data/adventure/ammo.js';
import { ROUNDS, SHOT_ART, roundFit } from '../src/systems/adventure/shotLook.js';

const HITBOX = { w: 30, h: 12 };

describe('how the shots look', () => {
  it('gives every kind of ammo a look, with a picture', () => {
    for (const kind of Object.keys(AMMO)) {
      expect(ROUNDS[kind], kind).toBeDefined();
      expect(SHOT_ART[ROUNDS[kind].picture], kind).toBeDefined();
    }
  });

  it('puts the hitbox on the head of a round fired right', () => {
    for (const round of Object.values(ROUNDS)) {
      const { origin, body } = roundFit(round, 1, HITBOX);
      expect(origin).toBe(round.head);
      // The hitbox's middle is where the head is in the picture.
      expect(body.x + body.w / 2).toBeCloseTo(round.head * round.w);
      expect(body.y + body.h / 2).toBeCloseTo(round.h / 2);
    }
  });

  it('puts it on the head of a round fired left, which Phaser flips about its middle', () => {
    for (const round of Object.values(ROUNDS)) {
      const { origin, body } = roundFit(round, -1, HITBOX);
      expect(origin).toBeCloseTo(1 - round.head);
      expect(body.x + body.w / 2).toBeCloseTo((1 - round.head) * round.w);
    }
  });

  it('keeps the hitbox its size on screen, whatever the picture is shrunk to', () => {
    for (const round of Object.values(ROUNDS)) {
      const { body } = roundFit(round, 1, HITBOX);
      expect(body.w * round.scale).toBeCloseTo(HITBOX.w);
      expect(body.h * round.scale).toBeCloseTo(HITBOX.h);
    }
  });
});
