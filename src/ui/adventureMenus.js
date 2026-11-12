import { ADVENTURE_HERO, ADVENTURE_LEVELS } from '../data/adventure/index.js';
import { ADVENTURE_NAME, CREDITS, HOME_ART } from '../data/adventure/home.js';
import { ADVENTURE_MAP_LOOK, ADVENTURE_MAP_WORLDS, ADVENTURE_ROADMAP } from '../data/adventure/roadmap.js';
import { ADVENTURE_KEYS } from './adventureGameMenu.js';
import { adventureHome } from './adventureHome.js';
import { journeyMap } from './JourneyMap.js';

// Behind the home screen's own pages (settings, credits...), its landscape. The pages are wooden
// boards (layout 'paws-page', styled in adventure-home.css).
const PAGE_BACKDROP = `${HOME_ART}/landscape.webp`;

// The adventure's menus: its home screen and its road map. They show over the adventure's menu
// scene (scenes/AdventureMenuScene.js), which lends them its overlay, sound buttons, home tune and
// the way back to the first page, the choice of games.

// The adventure's home screen, "Adventure Paws" (ui/adventureHome.js): the landscape and its
// characters, the logo and six wooden buttons.
export function showAdventureHome(scene) {
  const progress = scene.registry.get('adventureProgress');
  scene.playHomeMusic();
  scene.overlay.show({
    layout: 'paws',
    title: ADVENTURE_NAME,
    actions: [],
    content: adventureHome({
      overlay: scene.overlay,
      on: {
        // The next level not yet finished, so Play is also "carry on".
        play: () => openAdventure(scene, nextAdventureLevel(progress)),
        levels: () => showAdventureMap(scene),
        settings: () => showSettings(scene),
        achievements: () => showAchievements(scene),
        credits: () => showCredits(scene),
        exit: () => scene.showChoiceScreen(),
      },
    }),
  });
  scene.overlay.content.querySelector('button')?.focus();
}

// Music and sound on or off, and the keys.
function showSettings(scene) {
  scene.overlay.show({
    title: 'Settings',
    layout: 'paws-page',
    backdrop: PAGE_BACKDROP,
    actions: [
      ...scene.soundToggles(() => showSettings(scene)),
      { label: 'How to play', onClick: () => showKeys(scene) },
      { label: 'Back', primary: true, onClick: () => showAdventureHome(scene) },
    ],
  });
}

function showKeys(scene) {
  scene.overlay.show({
    title: 'How to play',
    message: ADVENTURE_KEYS.join('\n'),
    layout: 'paws-page',
    backdrop: PAGE_BACKDROP,
    actions: [{ label: 'Back', primary: true, onClick: () => showSettings(scene) }],
  });
}

// None yet: the page says they're coming.
function showAchievements(scene) {
  scene.overlay.show({
    title: 'Achievements',
    message: 'Coming soon! Crystals found and bosses beaten will be kept here.',
    layout: 'paws-page',
    backdrop: PAGE_BACKDROP,
    actions: [{ label: 'Back', primary: true, onClick: () => showAdventureHome(scene) }],
  });
}

function showCredits(scene) {
  scene.overlay.show({
    title: 'Credits',
    message: CREDITS.join('\n'),
    layout: 'paws-page',
    backdrop: PAGE_BACKDROP,
    actions: [{ label: 'Back', primary: true, onClick: () => showAdventureHome(scene) }],
  });
}

// The adventure level the player is up to: the first built one not yet finished, or the first.
export function nextAdventureLevel(progress) {
  const built = ADVENTURE_ROADMAP.filter((stop) => ADVENTURE_LEVELS.some((level) => level.id === stop.level));
  const stop = built.find((s) => !progress.resultFor(s.id)) ?? built[0];
  return ADVENTURE_LEVELS.findIndex((level) => level.id === stop.level);
}

// The adventure's own road map: every level planned, world by world, the built ones open as each
// is reached, their stars the crystals found in them.
export function showAdventureMap(scene) {
  const progress = scene.registry.get('adventureProgress');
  const playable = (stop) => ADVENTURE_LEVELS.some((level) => level.id === stop.level);
  const stops = ADVENTURE_ROADMAP.map((stop, index) => {
    const result = progress.resultFor(stop.id);
    return {
      number: index + 1,
      title: playable(stop) ? stop.title : `${stop.title} (coming soon)`,
      world: stop.world,
      locked: !playable(stop) || !progress.isUnlocked(index),
      current: index === progress.nextIndex,
      stars: result?.stars ?? 0,
      onPick: () => openAdventure(scene, ADVENTURE_LEVELS.findIndex((level) => level.id === stop.level)),
    };
  });
  const built = ADVENTURE_ROADMAP.filter(playable).length;
  scene.overlay.show({
    title: 'Adventure',
    backdrop: PAGE_BACKDROP,
    message: `${progress.totalStars} of ${built * 3} crystals. More of the battle cat's road opens as it's built.`,
    content: journeyMap({ stops, instant: scene.screenFx.instant, character: ADVENTURE_HERO.character, look: { worlds: ADVENTURE_MAP_WORLDS, ...ADVENTURE_MAP_LOOK } }),
    actions: [{ label: 'Back', primary: true, onClick: () => showAdventureHome(scene) }],
  });
}

// Leaves the menus for one of the battle cat's adventure levels.
export function openAdventure(scene, levelIndex) {
  scene.screenFx.cover(() => {
    scene.time.paused = false;
    scene.audio.stopMusic();
    scene.anims.resumeAll();
    scene.overlay.hide();
    scene.scene.start('Adventure', { levelIndex });
  });
}
