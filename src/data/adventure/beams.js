// The battle cat's special attack: he charges it up with his special's own frames, then releases a
// magic bolt (systems/AdventureMoves.js), rather than the short ray drawn on his sheet: a glowing
// blue comet with a white-hot core, trailing sparkles. It flies through every enemy in its way,
// each going up in a blue burst, and bursts where it stops. While he releases it, his last special
// frame is shown cut off where its own ray starts.
//
// In his special frame's pixels: frame, the one with the drawn ray; start, where it leaves his gun or
// paws; middle, the height of its centre.
export const BEAMS = {
  battleCat: { frame: 'battle-cat/Special (4).png', start: 395, middle: 88 },
  battleCatPaws: { frame: 'battle-cat-paws/Special (3).png', start: 318, middle: 86 },
  // The new cat: the bolt leaves the glow at his paws, which ends at column 180. With the minigun,
  // the battle cat's frames, moved down 64 rows into his taller frame (PAWS_FRAME in
  // data/adventure/heroes.js).
  pawsCat: { frame: 'paws-cat/frames/Special (4).png', start: 181, middle: 181 },
  pawsCatArmed: { frame: 'battle-cat/Special (4).png', start: 395, middle: 88 + 64 },
};

// The bolt, drawn once into a texture: glowing layers, outside in, as [length, height, colour,
// opacity] in px, centred a little behind its nose so it looks like it's streaking forward.
export const BOLT_LAYERS = [
  [150, 72, 0x1f6fff, 0.25],
  [116, 52, 0x3d9bff, 0.45],
  [80, 35, 0xa6e0ff, 0.8],
  [48, 20, 0xffffff, 1],
];

// speed: px a second. reachTiles: how far it flies unless the ground stops it. wobble: how far it
// weaves up and down, and how quickly. pulse: how much it swells and shrinks. hitRadius: how close
// to its middle an enemy must be. trail: its sparkles, how often one is left, how long they last.
export const BOLT = {
  speed: 1500, reachTiles: 11, wobble: { px: 5, rate: 0.03 }, pulse: 0.1, hitRadius: 42,
  trail: { everyMs: 10, lifespan: 380, spread: 70 },
};
// Its bursts: a blue-tinted explosion and a ring on each enemy it hits, and a bigger one where it
// stops.
export const BEAM_HIT = { tint: 0x8fd3ff, scale: 0.9, ring: 1.6, endScale: 1.3, endRing: 2.2 };
export const BOLT_KEY = 'adventure-magic-bolt';
