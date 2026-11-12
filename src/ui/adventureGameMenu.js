import { GAME } from '../config/gameConfig.js';

// The adventure's game menu, opened in a level with Esc (or P), or the menu button in the top
// right corner of the screen. The game pauses behind it. It offers: carry on, start the level again,
// how to play (the keys), music and sound on or off, the road map, and the adventure's home screen.
// The scene pauses and resumes the game (AdventureScene.togglePause); this draws the button and
// the menu's screens, in the HTML overlay like every other menu.

// The button: its size, how far in from the screen's top right corner its middle is, and how much
// it grows under the pointer.
const BUTTON = { size: 56, inset: 44, hoverScale: 1.1, depth: 101 };
const BUTTON_KEY = 'adventure-menu-button';
const COLOURS = { back: 0x1e2a4a, rim: 0xffffff, bars: 0xffffff };

// The keys, for the "How to play" screen.
export const ADVENTURE_KEYS = [
  'Left and Right (or A and D): run',
  'Space (or Up): jump, and again in the air',
  'Up and Down (or W and S): climb ladders',
  'Down: slide, or dive in the air',
  'X: shoot, hold for a burst (once you have the minigun)',
  'Q: change ammo',
  'Shift: dash',
  'C: magic bolt, after 3 knockouts',
  'Esc or P: this menu',
];

// The round button with three bars, fixed to the screen. onPress(): it was pressed.
export function addMenuButton(scene, onPress) {
  makeButtonTexture(scene);
  const button = scene.add.image(0, 0, BUTTON_KEY).setScrollFactor(0).setDepth(BUTTON.depth)
    .setInteractive({ useHandCursor: true });
  button.on('pointerover', () => button.setScale(BUTTON.hoverScale));
  button.on('pointerout', () => button.setScale(1));
  button.on('pointerdown', () => onPress());
  // Kept in the corner when the window changes shape.
  button.layout = () => button.setPosition(GAME.WIDTH - BUTTON.inset, BUTTON.inset);
  button.layout();
  return button;
}

// The menu itself. `scene` gives the overlay and the sound; `on` says what each choice does:
// resume, restart, map, home.
export function showGameMenu(scene, on) {
  const { music, sound } = scene.audio.settings;
  scene.overlay.show({
    title: 'Menu',
    message: scene.level.title,
    actions: [
      { label: 'Resume', primary: true, onClick: () => on.resume() },
      { label: 'Restart level', onClick: () => on.restart() },
      { label: 'How to play', onClick: () => showKeys(scene, on) },
      { label: `Music: ${music ? 'On' : 'Off'}`, onClick: () => { scene.audio.toggleMusic(); showGameMenu(scene, on); } },
      { label: `Sound: ${sound ? 'On' : 'Off'}`, onClick: () => { scene.audio.toggleSound(); showGameMenu(scene, on); } },
      { label: 'Map', onClick: () => on.map() },
      { label: 'Home', onClick: () => on.home() },
    ],
  });
}

function showKeys(scene, on) {
  scene.overlay.show({
    title: 'How to play',
    message: ADVENTURE_KEYS.join('\n'),
    actions: [
      { label: 'Back', primary: true, onClick: () => showGameMenu(scene, on) },
      { label: 'Resume', onClick: () => on.resume() },
    ],
  });
}

// Drawn once: a dark round button with a white rim and three white bars.
function makeButtonTexture(scene) {
  if (scene.textures.exists(BUTTON_KEY)) return;
  const { size } = BUTTON;
  const c = size / 2;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(COLOURS.back, 0.85).fillCircle(c, c, c - 2);
  g.lineStyle(3, COLOURS.rim, 0.9).strokeCircle(c, c, c - 3);
  for (const dy of [-9, 0, 9]) g.fillStyle(COLOURS.bars, 1).fillRoundedRect(c - 13, c + dy - 2.5, 26, 5, 2.5);
  g.generateTexture(BUTTON_KEY, size, size);
  g.destroy();
}
