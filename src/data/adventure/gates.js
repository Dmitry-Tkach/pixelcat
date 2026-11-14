// Each world's gates (systems/adventure/AdventureGates.js builds them): the stone gate the cat
// comes out of at the start, the flag posts that are the checkpoints, and the arch round the portal
// at the end.
// The pictures are cut from the owner's gates sheet (images/levels/forest/gates.png) by
// tools/adventure-gates-cut.mjs, at the sizes below. It prints the places it measures inside them
// (the holes, the flag), to copy here when the sheet is redrawn.
//
// Sizes are the height (px) each is shown at in the game, whatever size it's drawn, so a new
// drawing fits without changing the code. Places inside a picture (the hole in the gate, the top of
// the flag pole) are fractions of its width and height, from its top left.
// sink: how far (px) its bottom goes into the ground, so it looks rooted.
// depth: just behind the tiles (2), so the ground covers its foot; the cat (6) passes in front.
export const GATES = {
  wood: {
    start: {
      ring: 'gate-ring', swirl: 'gate-swirl', height: 170, sink: 8, depth: 1.8,
      hole: { x: 0.49, y: 0.503, size: 0.463 }, // the empty middle the swirl fills, as a fraction of the ring's width
      spinMs: 9000, // one turn of the swirl
      openMs: 1400, // the swirl shines bright as the cat comes out, then settles
      idleAlpha: 0.55, // how bright the swirl stays once he's out
      catFadeMs: 500, // how long the cat takes to appear out of it
    },
    checkpoint: {
      pole: 'flag-pole', down: 'flag-down', up: 'flag-up', height: 160, sink: 4, depth: 1.8,
      // Where the flag hangs from the pole: its left edge at x, its top at downY (limp, low on the
      // pole) or upY (raised, at the top).
      flag: { x: 0.427, downY: 0.292, upY: 0.13 },
      raiseMs: 600, // the flag running up the pole
      waveMs: 700, // one flap of the raised flag
      hit: { w: 60, h: 120 }, // the zone he touches to reach it
    },
    portal: {
      arch: 'portal-arch', swirl: 'portal-swirl', post: 'portal-post',
      height: 200, postHeight: 110, sink: 8, depth: 1.8,
      hole: { x: 0.496, y: 0.54, size: 0.419 },
      postGap: 130, // how far (px) each flame post stands from the arch's middle, if there's ground there
      postFoot: 40, // how wide (px) the ground under a post must be
      spinMs: 4000,
      pulseMs: 900, // the swirl's glow breathing
      enterMs: 700, // the cat drawn into the swirl at the end
    },
  },
};
