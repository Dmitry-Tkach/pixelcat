import { ADVENTURE_HERO, ADVENTURE_LEVELS } from '../data/adventure/index.js';
import { ADVENTURE_MAP_LOOK, ADVENTURE_MAP_WORLDS, ADVENTURE_ROADMAP } from '../data/adventure/roadmap.js';
import { journeyMap } from './JourneyMap.js';

// The adventure's menus: its home screen and its road map. They show over the menu scene, which is
// the runner's GameScene, since the first screen (the choice of two games) is shared. `scene` lends
// them its overlay, sound buttons, home tune and the way back to that first screen.

// The adventure's home screen: the party of its characters behind, and its menu.
export function showAdventureHome(scene) {
  const progress = scene.registry.get('adventureProgress');
  scene.playHomeMusic();
  scene.overlay.show({
    layout: 'adventure',
    backdrop: 'assets/ui/adventure-home.webp', // painted by tools/adventure-home-art.mjs
    title: 'The Battle Cat',
    message: 'Climb the World Tree: find the minigun, take on zombies and gunners, and reach the portal.\nArrows: run. Space: jump. Up and Down: climb. X: shoot. Shift: dash. C: magic bolt.',
    actions: [
      { label: progress.hasStarted ? 'Continue' : 'Play', primary: true, onClick: () => openAdventure(scene, nextAdventureLevel(progress)) },
      { label: 'Map', onClick: () => showAdventureMap(scene) },
      { label: 'Back', onClick: () => scene.showChoiceScreen() },
      ...scene.soundToggles(() => showAdventureHome(scene)),
    ],
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
