// Each world's moving traps (systems/adventure/AdventureTraps.js moves them). A level lists its
// traps beside its map, with mapBuilder's trap(kind, col, row, options), like its moving logs:
//   mace      a spiked ball swinging on a chain, from a gallows standing at (col, row), or, with
//             { hanging: true }, from the underside of the island above (col, row). Options:
//             facing (-1: the gallows' beam points left), chain (its length, px), periodMs
//   crusher   a stone block waiting in the air at (col, row); its eyes glow, it slams down to the
//             ground below and lifts slowly back
//   idol      a stone head standing at (col, row) that shoots darts across the path; { facing: -1 }
//             to shoot left
//   mushroom  a bouncy mushroom standing at (col, row): landing on it throws the cat up high
// A trap that stands is on the ground or island under its cell, like an enemy.
//
// The pictures are cut from the owner's sheet (images/levels/forest/obstacles.png) by
// tools/adventure-traps-art.mjs, at the heights below (px, as shown). Places inside a picture are
// fractions of its width and height, from its top left.
export const TRAP_KINDS = ['mace', 'crusher', 'idol', 'mushroom'];

export const TRAPS = {
  wood: {
    mace: {
      gallows: 'trap-gallows', link: 'trap-chain', ball: 'trap-mace',
      gallowsHeight: 300, ballHeight: 84, depth: 1.8,
      hook: { x: 0.857, y: 0.354 }, // where the chain hangs from the gallows' beam (the ring)
      gallowsAspect: 0.861, // the gallows picture's width over its height
      chain: 80, // px from the hook to the ball's ring (a level can give a hanging mace its own)
      ballMiddle: 0.56, // where the ball's middle is, down its picture (its ring is on top)
      swingDeg: 65, // how far it swings each way from straight down
      periodMs: 2600, // one swing there and back
      hitShare: 0.36, // the spiky ball hurts within this share of its height of its middle
      hangingSink: 6, // px a hanging chain starts inside the island above, so it looks fixed to it
    },
    crusher: {
      calm: 'trap-crusher', angry: 'trap-crusher-angry', height: 120, depth: 3.5,
      waitMs: 1500, // at the top, calm
      warnMs: 550, // its eyes glow before it falls
      fallSpeed: 1500, // px a second, once it's dropping (it speeds up to this)
      fallAccel: 6000,
      downMs: 450, // resting on the ground after the slam
      riseSpeed: 110, // px a second, lifting slowly back
      hitInset: 10, // px off each side of the picture that don't hurt (its soft moss edges)
      shakeIfWithin: 700, // px from the camera's middle: the slam shakes the screen
    },
    idol: {
      calm: 'trap-idol', angry: 'trap-idol-angry', dart: 'trap-dart',
      height: 150, dartWidth: 56, sink: 4, depth: 1.9,
      mouth: { x: 0.9, y: 0.44 }, // where its darts come out (facing right)
      everyMs: 2600, // one dart this often
      warnMs: 500, // its eye glows before it shoots
      dartSpeed: 560, // px a second
      dartRange: 640, // px it flies before it falls away, if it hits nothing
      dartHit: { w: 40, h: 12 },
      wakeWithin: 1200, // px from the camera's middle: further off, it doesn't shoot
    },
    mushroom: {
      calm: 'trap-mushroom', squashed: 'trap-mushroom-squashed', height: 96, sink: 6, depth: 3.5,
      bounce: -1480, // the cat's speed up off it (a normal jump is -1104): about 6 tiles high
      capShare: 0.8, // the share of its width he can land on
      squashMs: 140, // how long it stays squashed
    },
  },
};
