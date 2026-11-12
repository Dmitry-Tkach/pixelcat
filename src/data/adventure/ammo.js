// The minigun's ammunition, all of it limited. The minigun comes loaded with standard rounds; more of
// each kind comes in crates found in a level (map letters in systems/adventureMap.js). He fires the
// kind he picked up last, Q switches to the next kind he has rounds for, and when one runs out he
// switches to another. With none left, the minigun just clicks. Art from the gangsta cats pack,
// prepared by tools/adventure-art.mjs.
//   bullet: its image. speed: px a second. range: how far it flies, about to the screen's edge
//   ahead of him (it shows about 13 tiles, 830px, in front of him) or, for the laser, past it.
//   everyMs: the time between shots in a burst (a tap has its own cooldown, see AdventureMoves).
//   pierce: it flies on through enemies, hitting each once. blast: it bursts where it hits, knocking
//   out every enemy within this many px. rounds: how many a crate gives. colour: the HUD's count.
export const AMMO = {
  standard: { bullet: 'bullet', speed: 1150, range: 900, everyMs: 120, rounds: 40, crate: 'ammo-standard', colour: '#ffe066' },
  explosive: { bullet: 'bullet-explosive', speed: 850, range: 800, everyMs: 300, blast: 90, rounds: 12, crate: 'ammo-explosive', colour: '#ff9a3c' },
  laser: { bullet: 'bullet-laser', speed: 1700, range: 1200, everyMs: 140, pierce: true, rounds: 20, crate: 'ammo-laser', colour: '#7dff6a' },
};
// The rounds the minigun comes with when he finds it.
export const LOADED = { standard: 60 };

// The explosion, from the pack's Explosion frames: a small burst in the middle of big frames, so only
// `crop` is kept, scaled to `size` across. Every step-th frame of the pack's.
export const EXPLOSION = { folder: 'Explosion', frames: 20, step: 2, fps: 20, crop: { x: 384, y: 356, w: 541, h: 525 }, size: 200 };
export const EXPLOSION_KEY = 'adventure-explosion';
export const EXPLOSION_PATH = 'assets/adventure/fx/explosion';
export const explosionFrameCount = () => Math.ceil(EXPLOSION.frames / EXPLOSION.step);
