// The adventure's enemies: zombie critters from the free "gangsta cats" pack
// (images/assets/worlds/characters/gangsta-cats). tools/adventure-art.mjs cuts each one into an
// atlas in public/assets/adventure/enemies, and AdventureScene brings them to life.
//
// Each enemy's art faces left. Measurements are in the pack's frame pixels:
//   crop  the part of the pack's frames the atlas keeps, enough for every animation
//   body  what touches the cat, while it faces left
//   feet  how far down its feet are: the bottom of its paws, not of the shadow drawn under them,
//         which falls on the ground in front of the tile's edge
// step: the atlas keeps every step-th frame of the pack's, so there are fewer to load.
// hitFrame: the attack frame where the swipe lands.
// stompable: whether the cat can knock it out by landing on it. The spiky one hurts, so it
// has to be slid into, dashed into, shot or jumped over.
// hp: how many of the cat's bullets knock it out.
// speed: its patrol walk. chaseSpeed: how fast it runs at the cat once it's seen him.
export const ENEMY_SCALE = 0.62;

export const ENEMIES = {
  goon: {
    source: 'Enemy Reg 5',
    crop: { x: 64, y: 58, w: 190, h: 150 },
    body: { x: 95, y: 105, w: 95, h: 90 },
    feet: 195,
    speed: 70,
    chaseSpeed: 165,
    stompable: true,
    hp: 1,
    anims: {
      idle: { folder: 'Idle', step: 2, fps: 14, repeat: -1 },
      walk: { folder: 'Walk', step: 2, fps: 15, repeat: -1 },
      attack: { folder: 'Attack', step: 2, fps: 18, repeat: 0, hitFrame: 6 },
      dead: { folder: 'Dead', step: 3, fps: 20, repeat: 0 },
    },
  },
  cone: {
    source: 'Enemy Reg 7',
    crop: { x: 53, y: 52, w: 213, h: 155 },
    body: { x: 85, y: 100, w: 95, h: 94 },
    feet: 194,
    speed: 110,
    chaseSpeed: 240,
    stompable: true,
    hp: 1,
    anims: {
      idle: { folder: 'Idle', step: 2, fps: 14, repeat: -1 },
      walk: { folder: 'Walk', step: 2, fps: 18, repeat: -1 },
      attack: { folder: 'Attack', step: 2, fps: 18, repeat: 0, hitFrame: 6 },
      dead: { folder: 'Dead', step: 3, fps: 20, repeat: 0 },
    },
  },
  spiky: {
    source: 'Enemy Reg 6',
    crop: { x: 53, y: 46, w: 235, h: 167 },
    body: { x: 80, y: 100, w: 115, h: 102 },
    feet: 202,
    speed: 55,
    chaseSpeed: 125,
    stompable: false,
    hp: 2,
    anims: {
      idle: { folder: 'Idle', step: 2, fps: 14, repeat: -1 },
      walk: { folder: 'Walk', step: 2, fps: 14, repeat: -1 },
      attack: { folder: 'Attack', step: 2, fps: 18, repeat: 0, hitFrame: 6 },
      dead: { folder: 'Dead', step: 3, fps: 20, repeat: 0 },
    },
  },
};

// How many frames of each animation the pack has; the atlas keeps every step-th one.
export const PACK_FRAMES = { Idle: 20, Walk: 35, Attack: 25, Dead: 60 };
export const enemyFrameCount = (anim) => Math.ceil(PACK_FRAMES[anim.folder] / anim.step);

// An enemy's size in the game, and its body and feet in the atlas frame (facing left).
export function enemyLayout(kind) {
  const { crop, body, feet } = ENEMIES[kind];
  const s = ENEMY_SCALE;
  return {
    frameW: Math.round(crop.w * s),
    frameH: Math.round(crop.h * s),
    body: { x: Math.round((body.x - crop.x) * s), y: Math.round((body.y - crop.y) * s), w: Math.round(body.w * s), h: Math.round(body.h * s) },
    feet: Math.round((feet - crop.y) * s),
  };
}

export const enemyKey = (kind) => `adventure-enemy-${kind}`;
export const enemyAnimKey = (kind, anim) => `adventure-enemy-${kind}-${anim}`;
export const enemyPath = (kind) => `assets/adventure/enemies/${kind}`;
