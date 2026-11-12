import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADVENTURE_NAME, CREDITS, HOME_BUTTONS, HOME_CHARACTERS, HOME_SCENE } from '../src/data/adventure/home.js';
import { adventureHomePictures } from '../src/ui/adventureHome.js';

describe('the adventure home screen', () => {
  it('has every picture it shows', () => {
    for (const src of adventureHomePictures()) expect(existsSync(`public/${src}`), src).toBe(true);
  });

  it('stands every character inside the landscape, and inside the stretch always shown', () => {
    const { w, h, keep } = HOME_SCENE;
    for (const { name, x, y, w: cw, h: ch } of HOME_CHARACTERS) {
      expect(x, name).toBeGreaterThanOrEqual(keep.left);
      expect(x + cw, name).toBeLessThanOrEqual(keep.right);
      expect(y, name).toBeGreaterThanOrEqual(0);
      expect(y + ch, name).toBeLessThanOrEqual(h);
    }
    expect(keep.left).toBeGreaterThanOrEqual(0);
    expect(keep.right).toBeLessThanOrEqual(w);
  });

  it('has the six buttons of the example, Play first and Exit last, each doing something', () => {
    expect(HOME_BUTTONS.map((b) => b.action)).toEqual(['play', 'levels', 'settings', 'achievements', 'credits', 'exit']);
    expect(HOME_BUTTONS.filter((b) => b.big).map((b) => b.name)).toEqual(['play']);
    for (const { label } of HOME_BUTTONS) expect(label.length).toBeGreaterThan(0);
  });

  it('has a name and credits', () => {
    expect(ADVENTURE_NAME).toBe('Adventure Paws');
    expect(CREDITS.some((line) => line.includes('CraftPix'))).toBe(true);
  });
});

describe('the adventure home screen\'s fit', () => {
  it('fades the top of the landscape exactly on the screens where the sky shows above it', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/ui/adventure-home.css', 'utf8');
    const { h, keep } = HOME_SCENE;
    expect(css).toContain(`@media (max-aspect-ratio: ${keep.right - keep.left} / ${h})`);
  });
});
