// How the minigun's shots look (systems/adventure/ShotEffects.js draws them, systems/AdventureMoves.js
// fires them): each kind of round its own glowing picture, a glow at the muzzle, brass shell cases
// thrown out, a trail behind some, sparks where they hit, and for the explosive round a bigger blast.
// Plain data and sums, without Phaser, so the art tool and the tests can use them.

// The pictures, drawn by tools/adventure-shot-art.mjs into SHOT_PATH, by name.
export const SHOT_ART = {
  standard: 'shot-standard', explosive: 'shot-explosive', laser: 'shot-laser', freeze: 'shot-freeze',
  glow: 'shot-glow', casing: 'shot-casing', smoke: 'shot-smoke', ice: 'shot-ice', shard: 'shot-shard',
};
export const SHOT_PATH = 'assets/adventure/fx/shots';
export const shotKey = (name) => `adventure-${SHOT_ART[name]}`;

// Each round: its picture, its size and size on screen (scale), where its head is across the picture
// (head, 0 to 1: the hitbox sits there, and it leaves the muzzle there), and whether it's drawn
// glowing (ADD: light added to what's behind). colour: its glow, sparks and flash. casing: whether
// the minigun throws out a shell case. trail: something left behind it every `everyMs`: `glow`, a
// fading glow of its colour; `smoke`, a puff of smoke and an ember.
export const ROUNDS = {
  standard: { picture: 'standard', w: 110, h: 28, head: 0.87, scale: 0.75, add: true, colour: 0xffd34d, casing: true },
  explosive: { picture: 'explosive', w: 72, h: 44, head: 0.72, scale: 0.8, add: false, colour: 0xff8a2a, casing: true, trail: { everyMs: 26, smoke: true } },
  laser: { picture: 'laser', w: 160, h: 26, head: 0.95, scale: 0.8, add: true, colour: 0x6dff6a, casing: false, trail: { everyMs: 32, glow: true } },
  freeze: { picture: 'freeze', w: 96, h: 32, head: 0.86, scale: 0.75, add: false, colour: 0x8fe3ff, casing: true, trail: { everyMs: 30, glow: true } },
};

// muzzle: the glow at the barrel's end each shot, its size and how long it lasts. casing: the shell
// cases: thrown up and back from this far behind the muzzle, how fast, how heavy, how long they last.
// trail: the glow left by a laser, its size and how long it lasts; smoke, the puffs behind a
// fireball. hit: where a round hits something: a flash, sparks, and against a wall a little dust.
// blast: an explosive round's burst, on top of its explosion: a flash, a ring, embers and smoke.
// depth: drawn over the cat and the enemies.
export const SHOT_LOOK = {
  muzzle: { size: 0.9, ms: 90 },
  casing: { back: 26, speed: [160, 260], angle: [235, 280], gravity: 1500, ms: 650, spin: 720 },
  trail: { glowSize: 0.45, glowMs: 180, smokeSize: [0.35, 0.6], smokeMs: 420, smokeTint: 0x8a8a8a },
  hit: { flashSize: 0.8, flashMs: 120, sparks: 7, ring: 0.9, dust: 3 },
  blast: { flashSize: 3.2, flashMs: 220, ring: 2.4, ringMs: 380, embers: 16, smoke: 6, colour: 0xff8a2a },
  depth: 6,
};

// Where a round's picture is held, so its head is at its position, facing `dir` (1 right, -1 left),
// and where its hitbox (w by h, on screen) goes in the picture: on its head. Phaser flips a picture
// about its middle, so a round facing left has its head on the picture's left.
//   returns origin: the picture's origin across, 0 to 1; body: the hitbox's size and offset, in the
//   picture's own pixels (Phaser scales them with it)
export function roundFit(round, dir, hitbox) {
  const head = dir < 0 ? 1 - round.head : round.head;
  const w = hitbox.w / round.scale, h = hitbox.h / round.scale;
  return {
    origin: head,
    body: { w, h, x: head * round.w - w / 2, y: (round.h - h) / 2 },
  };
}
