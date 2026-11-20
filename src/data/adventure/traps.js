// Each world's moving traps (systems/adventure/AdventureTraps.js moves them). A level lists its
// traps beside its map, with mapBuilder's trap(kind, col, row, options), like its moving logs:
//   mace      a spiked ball swinging on a chain, from a gallows standing at (col, row), or, with
//             { hanging: true }, from the underside of the island above (col, row). Options:
//             facing (-1: the gallows' beam points left), chain (its length, px), periodMs, swingDeg,
//             phaseMs (where in its swing it starts: maces side by side with one period and a small
//             lag between them swing as a wave, and never touch)
//   crusher   a stone block waiting in the air at (col, row); its eyes glow, it slams down to the
//             ground below and lifts slowly back. It's solid: he can stand on it and ride it, and
//             it hurts only by falling on him. phaseMs: where in its wait it starts (under waitMs),
//             so crushers side by side don't slam together
//   idol      a stone head standing at (col, row) that shoots darts across the path; { facing: -1 }
//             to shoot left. Its stone is solid: he can stand on its head, above its darts
//   mushroom  a bouncy mushroom standing at (col, row): landing on it throws the cat up high
//   guardian  a giant stone statue standing on a stone platform, solid (his body fills it, so there's
//             no way over him), his feet at row + 1,
//             his middle on column col's left edge. He wakes as he comes into view, and swings a
//             spiked mace on a chain in each hand down onto the path below, in turn: each arm
//             winds up outward and strikes back down. Under his platform, between the maces, is safe.
//             Options: chain (px, from his fist to the ball)
// A trap that stands is on the ground or island under its cell, like an enemy.
//
// The pictures are cut from the owner's sheet (images/levels/forest/obstacles.png) by
// tools/adventure-traps-art.mjs, at the heights below (px, as shown). Places inside a picture are
// fractions of its width and height, from its top left.
export const TRAP_KINDS = ['mace', 'crusher', 'idol', 'mushroom', 'guardian'];

export const TRAPS = {
  wood: {
    mace: {
      gallows: 'trap-gallows', link: 'trap-chain', ball: 'trap-mace',
      gallowsHeight: 300, ballHeight: 84, depth: 1.8,
      hook: { x: 0.857, y: 0.354 }, // where the chain hangs from the gallows' beam (the ring)
      gallowsAspect: 0.861, // the gallows picture's width over its height
      chain: 41, // px from the hook to the ball's ring: on the gallows, a slide passes under the spikes, a standing cat doesn't
      ballMiddle: 0.56, // where the ball's middle is, down its picture (its ring is on top)
      swingDeg: 65, // how far it swings each way from straight down
      periodMs: 2600, // one swing there and back
      hitShare: 0.36, // the spiky ball hurts within this share of its height of its middle
      hangingSink: 6, // px a hanging chain starts inside the island above, so it looks fixed to it
      // How it shows its weight: a shadow on the ground under the ball, darker as it comes lower;
      // fading copies of the ball behind it when it's fast; a whoosh as it swings through the bottom
      // and a creak at each end, louder the nearer it is (heardWithin px).
      shadow: { width: 70, alpha: { low: 0.4, high: 0.08 }, fadeOver: 260, depth: 2.05 },
      trail: { ghosts: 3, alpha: 0.28, minSpeed: 0.0016 }, // minSpeed: radians a ms
      sounds: { whoosh: 'maceWhoosh', creak: 'maceCreak', heardWithin: 900 },
      // A level can stand crates under a mace ({ crate: true }): the first swing that hits them while
      // the player can see them smashes them to pieces, so he learns what the mace does. A stack of
      // `stack`, so the ball, which swings over a slide, goes through the top one.
      crate: { picture: 'box', stack: 2, pieces: 10, smashReach: 0.5 }, // smashReach: the ball's spikes, as a share of its height
    },
    crusher: {
      calm: 'trap-crusher', angry: 'trap-crusher-angry', height: 120, depth: 3.5,
      waitMs: 1500, // at the top, calm
      warnMs: 550, // its eyes glow before it falls
      fallSpeed: 1500, // px a second, once it's dropping (it speeds up to this)
      fallAccel: 6000,
      downMs: 450, // resting on the ground after the slam
      riseSpeed: 160, // px a second, lifting slowly back
      hitInset: 10, // px off each side of the picture that don't hurt or block (its soft moss edges)
      shakeIfWithin: 700, // px from the camera's middle: the slam shakes the screen
    },
    idol: {
      calm: 'trap-idol', angry: 'trap-idol-angry', dart: 'trap-dart',
      height: 150, dartWidth: 56, sink: 4, depth: 1.9,
      mouth: { x: 0.9, y: 0.44 }, // where its darts come out (facing right)
      body: { left: 0.22, right: 0.82, top: 0.08 }, // its solid stone (facing right), as fractions of its picture
      everyMs: 2600, // one dart this often
      warnMs: 500, // its eye glows before it shoots
      dartSpeed: 560, // px a second
      dartRange: 640, // px it flies before it falls away, if it hits nothing
      dartHit: { w: 40, h: 12 },
      wakeWithin: 1200, // px from the camera's middle: further off, it doesn't shoot
    },
    mushroom: {
      calm: 'trap-mushroom', squashed: 'trap-mushroom-squashed', height: 96, sink: 6, depth: 3.5,
      bounce: -1700, // the cat's speed up off it (a normal jump is -1104): about 8.5 tiles high
      capTop: 0.9, // where he lands on it: this share of its height above its foot
      capShare: 0.8, // the share of its width he can land on
      squashMs: 140, // how long it stays squashed
    },
    guardian: {
      body: 'guardian-body', awake: 'guardian-awake', arms: ['guardian-arm-left', 'guardian-arm-right'],
      ball: 'guardian-ball', link: 'guardian-chain',
      height: 420, depth: 1.8, sink: 4,
      // His pictures' sizes as shown (px), printed by tools/adventure-guardian-art.mjs.
      bodySize: { w: 334, h: 420 }, armSize: { w: 156, h: 359 },
      // Where each arm joins his body (its socket, as fractions of the body picture), and, on each
      // arm's own picture, its shoulder (where it turns) and the end of the chain in its fist. Left
      // arm first.
      sockets: [{ x: 0.113, y: 0.395 }, { x: 0.885, y: 0.395 }],
      armJoints: [
        { shoulder: { x: 0.81, y: 0.128 }, chainEnd: { x: 0.439, y: 1 } },
        { shoulder: { x: 0.19, y: 0.128 }, chainEnd: { x: 0.558, y: 1 } },
      ],
      ballHeight: 110, ballMiddle: 0.56, hitShare: 0.36,
      chain: 73, // px from his fist to the ball's ring, for a platform five cells over the path
      swingDeg: 56, // how far each arm winds up, outward from hanging straight down
      periodMs: 3600, // one swing of an arm; the other is half a swing behind
      // Each swing's parts, as shares of periodMs: resting low (a slide passes under), rising
      // outward (the warning), holding up there, and the strike back down, fast.
      swing: { rest: 0.32, rise: 0.36, hold: 0.14, strike: 0.18 },
      platformCells: 4, // stone blocks under his feet: col - 2 to col + 1
      solid: { width: 0.86, top: 0.04 }, // his solid stone: this share of his body's width, from this far down
      wakeInset: 120, // px inside the camera's view: once he's this far in view, he wakes
      wakeMs: 600, // his eyes and runes lighting up
      sounds: { roar: 'guardianRoar', whoosh: 'maceWhoosh', creak: 'maceCreak', heardWithin: 1100 },
      // Fire from his mouth, poured straight down onto the path under him, so the middle isn't safe for
      // long. His mouth glows, and the path glows where it will land (warnMs), then it pours (pourMs).
      // It comes every everyMs, startMs into each, on his arms' clock, timed so that one arm rests low
      // (a slide gets out under it) and the other is up and away. Not before firstAfterMs.
      fire: {
        mouth: { x: 0.5, y: 0.29 }, width: 110,
        everyMs: 3600, startMs: 1850, warnMs: 750, pourMs: 1050, firstAfterMs: 3600,
        colours: [0xfff0a0, 0xffb02a, 0xff5a1a],
      },
    },
  },
};
// The Autumn Forest's traps are the Wood world's: the same crushers and mushrooms. Its mace is the
// owner's spiked ball (data/adventure/autumnArt.js), with no ring on top: its middle is its middle.
TRAPS.autumn = { ...TRAPS.wood, mace: { ...TRAPS.wood.mace, ballMiddle: 0.5 } };
