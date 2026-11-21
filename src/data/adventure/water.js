// Water in a level's bottomless gaps (systems/adventure/water.js finds them; the scene draws them): a
// level sets `water: { row }`, the row its surface is at; every stretch of columns with no ground
// from that row down fills with water. Falling in splashes, and costs a heart, as falling out did.
//   back: the water behind the ground, so it meets the cliffs cleanly: how far (px) it reaches under
//   the ground at each side, and its depth. front: the see-through surface in front of the cat, so
//   he sinks into it: how see-through, and its depth (the cat is at 6). waveSpeed: how fast (px a
//   second) the waves move, back and front the other way. sinkPx: how far under the surface the
//   cat's head goes before he's lost. splash: drops thrown up, and the ring on the surface.
export const WATER = {
  back: { reach: 26, depth: 1.95 },
  front: { alpha: 0.55, depth: 6.5 },
  waveSpeed: 18,
  sinkPx: 40,
  splash: { drops: 18, ringMs: 420 },
};
// mud: a flood's water (systems/adventure/AdventureFlood.js), muddy brown, so it never looks like the
// water he swims in.
export const WATER_ART = { body: 'water', crest: 'water-crest', mud: 'water-mud' };
export const WATER_PATH = 'assets/adventure/fx/water';
export const waterKey = (name) => `adventure-${WATER_ART[name]}`;
