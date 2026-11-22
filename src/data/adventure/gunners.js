// The adventure's gunners: cats with guns from the free "gangsta cats" pack
// (images/assets/worlds/characters/gangsta-cats/Png/Characters). They stand in one place, turn to
// face the battle cat and shoot at him wherever he is. tools/adventure-art.mjs cuts each one into an
// atlas in public/assets/adventure/gunners, and entities/AdventureGunner.js brings them to life.
//
// Each gunner's art faces right. Measurements are in the pack's frame pixels, as for the enemies (see
// enemies.js): crop, body, feet (the bottom of the paws, not the shadow), and muzzle, the end of the
// gun in the first shoot frame, where bullets start.
// frames: how many the pack has of each animation; the atlas keeps every step-th one.
// fireFrame: the shoot frame on which the bullet leaves the gun.
// sees: how far away, in tiles, it spots the cat, across and up or down. It needs a clear line to him
// through the ground (islands don't block it).
// everyMs: the time between shots. bulletSpeed: in px a second, slow enough to dodge.
// hp: how many of the cat's bullets knock it out. The cat can also land on it, slide or dash into it.
import { layoutOf } from './enemies.js';

export const GUNNER_SCALE = 0.75;

const ANIMS = {
  idle: { folder: 'Idle', frames: 20, step: 2, fps: 14, repeat: -1 },
  shoot: { folder: 'Shoot', frames: 10, step: 1, fps: 20, repeat: 0, fireFrame: 1 },
};

export const GUNNERS = {
  // C3: a bandana and a chunky blaster. Slow, heavy shots.
  blaster: {
    source: 'C3',
    crop: { x: 6, y: 8, w: 116, h: 130 },
    body: { x: 30, y: 30, w: 70, h: 94 },
    feet: 124,
    muzzle: { x: 112, y: 74 },
    sees: { across: 7, up: 6 },
    everyMs: 1700,
    bulletSpeed: 380,
    hp: 2,
    stompable: true,
    anims: ANIMS,
  },
  // C8: goggles and a ray gun. Quicker shots.
  raygun: {
    source: 'C8',
    crop: { x: 24, y: 25, w: 162, h: 122 },
    body: { x: 45, y: 45, w: 85, h: 88 },
    feet: 133,
    muzzle: { x: 181, y: 75 },
    sees: { across: 8, up: 10 }, // it fires down from high ledges
    everyMs: 1150,
    bulletSpeed: 470,
    hp: 2,
    stompable: true,
    anims: ANIMS,
  },
  // C13: a blue helmet and a rifle. Fast bullets, from far away.
  rifle: {
    source: 'C13',
    crop: { x: 26, y: 27, w: 118, h: 126 },
    body: { x: 45, y: 45, w: 70, h: 93 },
    feet: 138,
    muzzle: { x: 138, y: 110 },
    sees: { across: 11, up: 12 }, // a sniper, high up
    everyMs: 2200,
    bulletSpeed: 700,
    hp: 2,
    stompable: true,
    anims: ANIMS,
  },
  // The Autumn world's gunner, the owner's squirrel (prompts/autumn-level/09-squirrel.md): it sits on
  // a branch or a roof and throws acorns, spinning, at the cat. Drawn as a sheet, facing left
  // (facesLeft), cut by tools/adventure-autumn-characters.mjs, so its measurements are in a cell's
  // pixels and its anims name the sheet's rows. bullet: the world's picture it throws, spinning
  // spinDeg a second. noFlash: a throw, so no muzzle flash. Its knock-out is drawn (dead).
  squirrel: {
    sheet: { file: 'images/levels/autumn/squirrel.png', cols: 6, rows: 4 },
    scale: 0.55,
    facesLeft: true,
    crop: { x: 0, y: 0, w: 256, h: 256 },
    body: { x: 70, y: 96, w: 104, h: 124 },
    feet: 221,
    muzzle: { x: 52, y: 150 },
    sees: { across: 8, up: 7 },
    everyMs: 1900,
    bulletSpeed: 360,
    bullet: 'acorn',
    spinDeg: 720,
    noFlash: true,
    hp: 1,
    stompable: true,
    anims: {
      idle: { row: 0, count: 6, fps: 8, repeat: -1 },
      shoot: { row: 1, count: 6, fps: 12, repeat: 0, fireFrame: 3 },
      dead: { row: 2, count: 6, fps: 10, repeat: 0 },
    },
  },
};

// The muzzle flash, from the pack's ShootFx: 15 frames, the last empty. The flash starts at
// `origin` in its frame and points right.
export const FLASH = { folder: 'ShootFx', frames: 14, step: 2, fps: 24, scale: 0.35, size: { w: 249, h: 157 }, origin: { x: 25, y: 78 } };

export const gunnerLayout = (kind) => layoutOf(GUNNERS[kind], GUNNERS[kind].scale ?? GUNNER_SCALE);
export const gunnerFrameCount = (anim) => anim.count ?? Math.ceil(anim.frames / anim.step);
export const flashFrameCount = () => Math.ceil(FLASH.frames / FLASH.step);
export const gunnerKey = (kind) => `adventure-gunner-${kind}`;
export const gunnerAnimKey = (kind, anim) => `adventure-gunner-${kind}-${anim}`;
export const gunnerPath = (kind) => `assets/adventure/gunners/${kind}`;
export const FLASH_KEY = 'adventure-flash';
export const FLASH_PATH = 'assets/adventure/gunners/flash';
