// The adventure's bosses. The first is Troll 1 from the troll bosses pack
// (images/assets/worlds/characters/troll-bosses), the Wood world's boss, the troll in the victory
// picture. tools/adventure-boss-art.mjs cuts him into a multi-page atlas in
// public/assets/adventure/bosses.
//
// The pack draws each animation on a canvas of its own size and place, so every frame is placed by
// the troll himself: the middle of his legs, and the bottom of his feet, at the same spot in every
// cell. Measurements are in the pack's pixels:
//   cell   how far the cell reaches from that spot: left, right, and up (the most any frame does,
//          as measured over all of them: lying back when knocked out, the club's swing, the club up
//          as he runs). Under his feet, `below`.
//   body   his hitbox, from the same spot: his trunk and legs, without the club
//   scale  how much smaller he's shown: about 3 tiles tall standing, like a boss should be
// facing: which way the art faces (1 is right). hitFrame: the attack frame where the club lands.
export const BOSSES = {
  troll1: {
    source: 'Troll1',
    scale: 0.271,
    facing: 1,
    cell: { left: 870, right: 996, up: 1272, below: 20 },
    body: { left: 230, right: 230, up: 560 },
    hp: 30,
    anims: {
      idle: { folder: 'Idle', frames: 10, fps: 10, repeat: -1 },
      walk: { folder: 'Walk', frames: 10, fps: 12, repeat: -1 },
      run: { folder: 'Run', frames: 10, fps: 16, repeat: -1 },
      jump: { folder: 'Jump', frames: 10, fps: 12, repeat: 0 },
      attack: { folder: 'Attack', frames: 10, fps: 14, repeat: 0, hitFrame: 5 },
      hurt: { folder: 'Hurt', frames: 10, fps: 16, repeat: 0 },
      dead: { folder: 'Dead', frames: 10, fps: 10, repeat: 0 },
    },
  },
};

// The atlas is in pages of this many cells across and down, each under 2048px on a side.
export const BOSS_PAGE = { cols: 4, rows: 5 };

// A boss's size in the game, and his body and feet in a cell, as the atlas draws them.
export function bossLayout(kind) {
  const { scale, cell, body } = BOSSES[kind];
  const s = (v) => Math.round(v * scale);
  const frameW = s(cell.left + cell.right);
  const frameH = s(cell.up + cell.below);
  const feetX = s(cell.left), feetY = s(cell.up);
  return {
    frameW, frameH, feetX, feetY,
    body: { x: feetX - s(body.left), y: feetY - s(body.up), w: s(body.left + body.right), h: s(body.up) },
  };
}

export const bossFrameCount = (anim) => anim.frames;
export const bossKey = (kind) => `adventure-boss-${kind}`;
export const bossAnimKey = (kind, anim) => `adventure-boss-${kind}-${anim}`;
export const bossPath = (kind) => `assets/adventure/bosses/${kind}`;
