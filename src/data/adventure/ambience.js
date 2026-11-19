// Each world's moving life (systems/adventure/AdventureAmbience.js draws it): small things drifting
// about where the camera looks, and the decoration swaying, so the level feels alive. Only around
// the camera, so it costs little.
//
// fireflies: glowing dots that drift slowly, fading in and out: how often one appears (ms), how long
//   each lives, how far it drifts (px a second), its size, its colours. Drawn glowing (added light),
//   in front of the backdrop and behind the level (depth).
// leaves: a leaf now and then, drifting down from the top of the view, spinning: how often, how
//   long it falls, how fast down and across, its size, its colours. In front of the level, behind
//   the cat (depth).
// sway: the decoration (data/adventure/decor.js) moving in a breeze: vines swing from where they
//   hang, plants lean from their roots; the most they turn (degrees), and how long one sway takes.
//   null for still. Turning a whole picture looked stiff and unnatural to the owner, so it's off;
//   a real sway would need the plants drawn in bending frames.
export const AMBIENCE = {
  wood: {
    fireflies: { everyMs: 320, lifeMs: [2600, 4200], drift: 22, size: [0.22, 0.38], colours: [0xeaff8a, 0xc8ff6a, 0xfff6a0], depth: -6 },
    leaves: { everyMs: 900, lifeMs: [5000, 7500], fall: [40, 70], across: [-45, -10], size: [0.7, 1.1], colours: [0x8fd14a, 0x6cbf2e, 0xd8c040], depth: 4 },
    sway: null,
  },
  // The Autumn Forest: more leaves, falling in reds and golds, and fewer, warmer fireflies.
  autumn: {
    fireflies: { everyMs: 700, lifeMs: [2600, 4200], drift: 22, size: [0.22, 0.34], colours: [0xffd27a, 0xffb84a, 0xfff0b0], depth: -6 },
    leaves: { everyMs: 420, lifeMs: [5000, 7500], fall: [45, 80], across: [-60, -15], size: [0.8, 1.2], colours: [0xe8892a, 0xd4562a, 0xf0c040, 0xb8452a], depth: 4 },
    sway: null,
  },
};
