// The battle cat's beam, his special attack. He charges it up with his special's own frames, then
// fires a beam the game draws itself (systems/AdventureMoves.js), as long as it needs to be, rather
// than the short one drawn on his sheet: layers of blue flame round a white-hot core, their ragged
// edges running along it, swelling out of a flash at his gun or paws and rounding off in a glow.
// While it fires, his last special frame is shown cut off where its own beam starts.
//
// In his special frame's pixels: frame, the one with the drawn beam; start, where the beam leaves his
// gun or paws; middle, the height of its centre.
export const BEAMS = {
  battleCat: { frame: 'battle-cat/Special (4).png', start: 395, middle: 88 },
  battleCatPaws: { frame: 'battle-cat-paws/Special (3).png', start: 318, middle: 86 },
};

// The flame's layers, outside in, in his frame's pixels: half its thickness, and the two waves that
// make its edges ragged ([height, how many along one `wavelength`, where they start]). Each is
// partly see-through, so the level shows through the beam's edges.
export const BEAM_LAYERS = [
  { half: 54, waves: [[7, 2, 0], [4, 5, 1.1]], colour: 0x1f6fff, alpha: 0.28 },
  { half: 42, waves: [[6, 3, 0.7], [3, 7, 2.3]], colour: 0x3d9bff, alpha: 0.5 },
  { half: 27, waves: [[4, 4, 1.9], [2, 9, 0.4]], colour: 0xa6e0ff, alpha: 0.72 },
  { half: 11, waves: [[1.5, 6, 0.3], [1, 11, 1.7]], colour: 0xffffff, alpha: 0.88 },
];
// What it does where it hits: a blue-tinted explosion and a ring on each enemy it knocks out, and a
// glow that pulses at its tip where the ground stops it.
export const BEAM_HIT = { tint: 0x8fd3ff, scale: 0.9, ring: 1.6, wallGlow: 46, wallPulseMs: 70 };

// reachTiles: how far it reaches, unless the ground stops it first. growMs: how long it takes to
// shoot out to its full length. fadeMs: how long it takes to fade when it ends. wavelength: how long
// one ripple of its edges is. flow: how fast they run along it, in px a second. swell and taper: how
// long it takes to grow from the muzzle to full thickness, and to round off at its tip. step: how
// finely its edges are drawn. sparks: how many specks run along it, and sparkFlow how fast.
// flicker: how much its thickness pulses.
export const BEAM = {
  reachTiles: 10, growMs: 160, fadeMs: 200, wavelength: 128, flow: 900, swell: 70, taper: 90,
  step: 4, sparks: 26, sparkFlow: 1500, flicker: 0.06,
};
