import { describe, expect, it, vi } from 'vitest';
import { ADVENTURE_KEYS, showGameMenu } from '../src/ui/adventureGameMenu.js';

// A pretend scene: the overlay remembers the last screen, the audio its switches.
function setUp() {
  const screens = [];
  const settings = { music: true, sound: true };
  const scene = {
    level: { title: 'Into the Roots' },
    overlay: { show: (screen) => screens.push(screen) },
    audio: { settings, toggleMusic: () => { settings.music = !settings.music; }, toggleSound: () => { settings.sound = !settings.sound; } },
  };
  const on = { resume: vi.fn(), restart: vi.fn(), map: vi.fn(), home: vi.fn() };
  showGameMenu(scene, on);
  const last = () => screens[screens.length - 1];
  const press = (label) => last().actions.find((a) => a.label.startsWith(label)).onClick();
  return { screens, on, last, press, settings };
}

describe('the adventure game menu', () => {
  it('offers every choice, with Resume first', () => {
    const { last } = setUp();
    expect(last().title).toBe('Menu');
    expect(last().actions.map((a) => a.label)).toEqual(['Resume', 'Restart level', 'How to play', 'Music: On', 'Sound: On', 'Map', 'Home']);
    expect(last().actions[0].primary).toBe(true);
  });

  it('does what each choice says', () => {
    const { on, press } = setUp();
    for (const [label, action] of [['Resume', 'resume'], ['Restart', 'restart'], ['Map', 'map'], ['Home', 'home']]) {
      press(label);
      expect(on[action]).toHaveBeenCalledTimes(1);
    }
  });

  it('turns music and sound off and on, showing the menu again with the new setting', () => {
    const { press, last, settings } = setUp();
    press('Music');
    expect(settings.music).toBe(false);
    expect(last().actions.map((a) => a.label)).toContain('Music: Off');
    press('Sound');
    expect(settings.sound).toBe(false);
    expect(last().actions.map((a) => a.label)).toContain('Sound: Off');
  });

  it('shows the keys, and comes back to the menu', () => {
    const { press, last, on } = setUp();
    press('How to play');
    expect(last().message).toBe(ADVENTURE_KEYS.join('\n'));
    press('Back');
    expect(last().title).toBe('Menu');
    press('How to play');
    press('Resume');
    expect(on.resume).toHaveBeenCalled();
  });
});
