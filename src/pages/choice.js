import '../ui/ui.css';
import { AudioManager } from '../audio/AudioManager.js';
import { ADVENTURE_NAME } from '../data/adventure/home.js';
import { gameChoice } from '../ui/GameChoice.js';
import { playHomeMusic, soundToggles } from '../ui/menuSound.js';
import { Overlay } from '../ui/Overlay.js';
import { PAGES, goToPage } from '../ui/pages.js';
import { ScreenFx } from '../ui/ScreenFx.js';

// The first page, index.html: the two games, side by side, filling the window. It has no game in
// it, only this HTML menu, so it opens at once. Each card opens its game's own page, which loads
// only that game.
const audio = new AudioManager();
const overlay = new Overlay();
overlay.onAction = () => {
  audio.unlock(); // browsers only allow audio to start from a user action
  audio.playSfx('click');
};
const screenFx = new ScreenFx();

function showChoice() {
  playHomeMusic(audio, overlay);
  overlay.show({
    layout: 'choose',
    title: 'Cat Escape',
    content: gameChoice([
      {
        id: 'runner',
        kicker: 'Runner',
        title: 'Bath Day Escape',
        text: "It's bath day, and the whole family wants to catch you. Run, jump and slide all the way to the park!",
        keys: 'Arrows: run · Space: jump, twice in the air · Down: slide · E: Super Paw',
        still: 'assets/ui/home-runner-still.webp',
        moving: 'assets/ui/home-runner.webp',
        alt: 'The girl reads in a beanbag while the cat dozes on the rug.',
        actions: [{ label: 'Play', primary: true, onClick: () => open(PAGES.runner) }],
      },
      {
        id: 'adventure',
        kicker: 'Adventure',
        title: ADVENTURE_NAME,
        text: 'Climb the World Tree with the battle cat: find the minigun, take on zombies and gunners, and reach the portal.',
        keys: 'X: shoot · Shift: dash · C: magic bolt · Up and Down: climb',
        still: 'assets/ui/home-adventure-still.webp',
        moving: 'assets/ui/home-adventure.webp',
        alt: 'A party: the battle cat with the gun cats, a wizard, warriors and an orc.',
        actions: [{ label: 'Play', primary: true, onClick: () => open(PAGES.adventure) }],
      },
    ]),
    actions: soundToggles(audio, showChoice),
  });
}

// The music stops as the page goes; the next page starts its own.
function open(page) {
  audio.stopMusic();
  goToPage(page, screenFx);
}

showChoice();
