// Swimming (systems/adventure/AdventureSwimming.js): how the cat moves in a level's pools
// (systems/adventure/pools.js). He floats: the water pulls him down slowly, each jump press is a
// stroke up, and he moves at a share of his running speed. At the surface a press leaps him out,
// onto the bank. The numbers worth tuning:
//   gravity: px/s² down in water (his own on land is 2645); maxSink, maxRise: his fastest down and
//   up (px/s); stroke: his speed up from one press; speedShare: of his top running speed;
//   submerge: px his middle must be under the surface to swim (above it he's still walking or
//   jumping); surfaceBand: px under the surface where a press leaps him out (outJump, px/s up: his
//   jump is -1104); feetUnder: px his feet are under the surface as he floats at it (his middle
//   `submerge` under it, and half his 90 px). A leap lifts his feet outJump²/(2g) = 185 px, so they
//   clear the water by about 1.75 rows: onto a bank one row up, never a ledge two rows up (the
//   water's ledges are spaced by that: tests/adventure-dam.test.js); he springs out at his full
//   running speed. bubbleEveryMs: a bubble from his nose this often.
export const SWIM = {
  gravity: 520,
  maxSink: 200,
  maxRise: 460,
  stroke: -430,
  speedShare: 0.55,
  submerge: 28,
  surfaceBand: 52,
  outJump: -990,
  feetUnder: 73,
  bubbleEveryMs: 700,
};

// The route checker's swimming (systems/adventureRoutes.js): how many cells up he can leap out of
// the water from its surface, and across, a safe share of outJump, as for his jump (JUMP_REACH).
export const SWIM_REACH = { up: 2, across: 3 };

// How a pool looks and how fast its water rises a stage (systems/adventure/AdventurePools.js):
// riseMsPerRow, the time for its surface to climb one row.
export const POOL = { riseMsPerRow: 420, back: { depth: 1.95, reach: 26 }, front: { alpha: 0.5, depth: 6.5 } };

// How a flood looks (systems/adventure/AdventureFlood.js), so it never looks like water he swims in:
// calm blue water is safe; a flood is muddy brown rushing water, foaming, things tumbling in it.
//   its water: the muddy water picture (data/adventure/water.js, WATER_ART.mud), as the dam bursts;
//   deep: its deep water's colour (the mud picture's bottom). waves: how much faster its waves run
//   than a pool's.
//   foam: white spray along its surface, perMs a puff; debris: twigs and leaves tumbling on it, perMs
//   one, in these colours. sweptHint: what he's told when it catches him.
export const FLOOD = {
  deep: 0x3e2716, waves: 3,
  foam: { perMs: 22, tint: 0xfff6e8, scale: 0.9 },
  debris: { perMs: 160, tints: [0x4a2c16, 0x6b4226, 0xd9822b, 0xb5651d], scale: 1.6 },
  sweptHint: 'Swept away by the flood!',
};
