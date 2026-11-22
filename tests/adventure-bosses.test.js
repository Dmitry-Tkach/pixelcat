import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOSSES, BOSS_PAGE, bossFrameCount, bossLayout, bossPath } from '../src/data/adventure/bosses.js';
import { TILE } from '../src/systems/adventureMap.js';

// Every frame the atlas lists, by name, across all its pages.
const atlasFrames = (kind) => {
  const { textures } = JSON.parse(readFileSync(`public/${bossPath(kind)}.json`, 'utf8'));
  return { textures, frames: new Map(textures.flatMap((t) => t.frames.map((f) => [f.filename, { ...f, page: t }]))) };
};

describe('adventure bosses', () => {
  it.each(Object.keys(BOSSES))('the %s atlas has every frame of every animation, on pages under 2048px', (kind) => {
    const { textures, frames } = atlasFrames(kind);
    for (const [anim, info] of Object.entries(BOSSES[kind].anims)) {
      for (let i = 0; i < bossFrameCount(info); i++) expect(frames.has(`${anim}-${i}`), `${anim}-${i}`).toBe(true);
    }
    for (const { size } of textures) {
      expect(size.w).toBeLessThanOrEqual(2048);
      expect(size.h).toBeLessThanOrEqual(2048);
    }
    expect(BOSS_PAGE.cols * bossLayout(kind).frameW).toBeLessThanOrEqual(2048);
  });

  it.each(Object.keys(BOSSES))('the %s has every frame the same size, his body inside it, on his feet', (kind) => {
    const { frameW, frameH, feetY, body } = bossLayout(kind);
    for (const { frame } of atlasFrames(kind).frames.values()) expect([frame.w, frame.h]).toEqual([frameW, frameH]);
    expect(body.x).toBeGreaterThanOrEqual(0);
    expect(body.x + body.w).toBeLessThanOrEqual(frameW);
    expect(body.y).toBeGreaterThanOrEqual(0);
    expect(body.y + body.h).toBe(feetY);
  });

  it.each(Object.keys(BOSSES))('the %s is about three tiles tall standing, and his club lands within his attack', (kind) => {
    const { scale, anims } = BOSSES[kind];
    const standing = 700 * scale; // the pack draws him about 700px tall, standing
    expect(standing / TILE).toBeGreaterThan(2.6);
    expect(standing / TILE).toBeLessThan(3.4);
    expect(anims.attack.hitFrame).toBeLessThan(anims.attack.frames);
  });
});
