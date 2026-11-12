// The menus' sound, the same on every page: the home tune, and the music and sound switches. Plain
// code with no Phaser, so the first page (the choice of games), which has no game in it, uses it
// too. `audio` is the AudioManager, `overlay` the menu overlay.

export const HOME_MUSIC = { track: 'home', bpm: 120 };

// The home screen's tune. Browsers only allow sound after a click or a key press, so before the
// first one it waits, and starts then if a home screen (or a screen of its own, like the choice of
// games or the adventure's home) is still showing.
export function playHomeMusic(audio, overlay) {
  if (audio.track === HOME_MUSIC.track) return;
  if (audio.ctx) {
    audio.startMusic(HOME_MUSIC);
    return;
  }
  const start = () => {
    window.removeEventListener('pointerdown', start);
    window.removeEventListener('keydown', start);
    audio.unlock();
    const onHome = overlay.root.classList.contains('home') || overlay.content.childElementCount > 0;
    if (onHome && audio.track === null) audio.startMusic(HOME_MUSIC);
  };
  window.addEventListener('pointerdown', start);
  window.addEventListener('keydown', start);
}

// The two switches, as menu buttons. `redraw` shows the menu again, with the new setting.
export function soundToggles(audio, redraw) {
  const { music, sound } = audio.settings;
  return [
    { label: `Music: ${music ? 'On' : 'Off'}`, onClick: () => { audio.toggleMusic(); redraw(); } },
    { label: `Sound: ${sound ? 'On' : 'Off'}`, onClick: () => { audio.toggleSound(); redraw(); } },
  ];
}
