// The adventure's home screen, "Adventure Paws": what's in it and where (ui/adventureHome.js draws
// it). The art is cut from the owner's ChatGPT pictures by tools/adventure-paws-home-art.mjs, into
// public/assets/ui/adventure-home.

// The adventure's name, on its home screen and its card on the first screen. Chosen by the owner
// "for now": changing it here changes it everywhere.
export const ADVENTURE_NAME = 'Adventure Paws';

export const HOME_ART = 'assets/ui/adventure-home';

// The landscape, in its own pixels. Everything on it is placed in these pixels.
//   keep: the stretch across that's always shown, edge to edge, so nobody standing near the sides is
//         cut off on a narrower screen; there, the picture shrinks a little and sky fills the top.
//   sky:  the colour at the top of its sky, which fills the window above it.
export const HOME_SCENE = { w: 1672, h: 941, keep: { left: 40, right: 1640 }, sky: '#0078fc' };

// The characters, standing where the owner's example has them (found by matching each cut-out
// against the example picture). x, y: the top left of the picture; w, h: its size there.
// shadow: a soft shadow under the feet, for those standing on the ground. glow: a light round him.
// In this order, back to front: the knight stands in front of the wizard.
// Each has a small effect of his own, chosen with the owner (ui/adventure-home.css draws them):
//   run      the cat, bobbing and leaning as if running on the spot, his glow pulsing
//   breathe  swelling a little and settling, from his feet up
//   orb      the wizard: breathing, and the orb on his staff glowing, with sparks floating up from
//            it; `orb` is where it is in his picture, as shares of its width and height
// seconds: how long one round of it takes; each has his own, so nobody moves together.
export const HOME_CHARACTERS = [
  { name: 'troll', x: 49, y: 326, w: 257, h: 244, shadow: true, effect: 'breathe', seconds: 3.2 },
  { name: 'cat', x: 143, y: 581, w: 228, h: 207, glow: true, effect: 'run', seconds: 0.6 },
  { name: 'gunCat', x: 1510, y: 283, w: 105, h: 84, shadow: true, effect: 'breathe', seconds: 2.6 },
  { name: 'wizard', x: 1459, y: 483, w: 177, h: 188, effect: 'orb', seconds: 3.6, orb: { x: 0.775, y: 0.204 } },
  { name: 'goblin', x: 1305, y: 587, w: 166, h: 151, shadow: true, effect: 'breathe', seconds: 2.9 },
  { name: 'knight', x: 1461, y: 626, w: 166, h: 172, shadow: true, effect: 'breathe', seconds: 3.4 },
];

// Leaves drifting down from the trees at the sides, in the landscape's pixels: where each starts,
// how far it falls and drifts across, how long it takes, and when it first sets off.
export const HOME_LEAVES = [
  { x: 70, y: 60, fall: 430, drift: 120, seconds: 11, delay: 0 },
  { x: 1590, y: 40, fall: 380, drift: -140, seconds: 12.5, delay: 4 },
  { x: 230, y: 170, fall: 360, drift: 90, seconds: 10, delay: 7.5 },
];

// The menu's buttons, top to bottom: each picture's name and what it opens (see ui/adventureHome.js).
export const HOME_BUTTONS = [
  { name: 'play', action: 'play', label: 'Play', big: true },
  { name: 'levels', action: 'levels', label: 'Level select' },
  { name: 'settings', action: 'settings', label: 'Settings' },
  { name: 'achievements', action: 'achievements', label: 'Achievements' },
  { name: 'credits', action: 'credits', label: 'Credits' },
  { name: 'exit', action: 'exit', label: 'Exit' },
];

// The credits page, a line each.
export const CREDITS = [
  'Game and art direction: Dmitry Tkach',
  'Characters and home screen art: drawn with ChatGPT',
  'Levels: the World Tree Roots tileset, by CraftPix.net',
  'Enemies and gunners: the Gangsta Cats pack, by CraftPix.net',
  'The troll: the Troll Bosses pack, by CraftPix.net',
  'Code: written with Claude Code',
  'Made with Phaser',
];
