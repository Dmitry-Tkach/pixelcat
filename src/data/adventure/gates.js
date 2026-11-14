// Each world's gates (systems/adventure/AdventureGates.js builds them): the stone gate the cat
// comes out of at the start, the flag posts that are the checkpoints, and the arch round the portal
// at the end.
// The pictures are code-drawn stand-ins (tools/adventure-gates-art.mjs) until the owner's gates
// sheet (prompts/forest-level/08-gates.md) comes, cut to the same names.
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
      hole: { x: 0.5, y: 0.46, size: 0.62 }, // the empty middle the swirl fills, as a fraction of the ring's width
      spinMs: 9000, // one turn of the swirl
      openMs: 1400, // the swirl shines bright as the cat comes out, then settles
      idleAlpha: 0.55, // how bright the swirl stays once he's out
      catFadeMs: 500, // how long the cat takes to appear out of it
    },
    checkpoint: {
      pole: 'flag-pole', down: 'flag-down', up: 'flag-up', height: 140, sink: 4, depth: 1.8,
      // Where the flag hangs from the pole: its left edge at x, its top at downY (limp, low on the
      // pole) or upY (raised, at the top).
      flag: { x: 0.5, downY: 0.45, upY: 0.07 },
      raiseMs: 600, // the flag running up the pole
      waveMs: 700, // one flap of the raised flag
      hit: { w: 60, h: 120 }, // the zone he touches to reach it
    },
    portal: {
      arch: 'portal-arch', swirl: 'portal-swirl', post: 'portal-post',
      height: 220, postHeight: 90, sink: 8, depth: 1.8,
      hole: { x: 0.5, y: 0.424, size: 0.66 },
      postGap: 90, // how far (px) each flame post stands from the arch's middle, if there's ground there
      postFoot: 44, // how wide (px) the ground under a post must be
      spinMs: 4000,
      pulseMs: 900, // the swirl's glow breathing
      enterMs: 700, // the cat drawn into the swirl at the end
    },
  },
};
