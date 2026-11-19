// How the adventure's cat jumps, against the main game's (config/gameConfig.js MOVEMENT): a plain
// module, so the traps' rules (systems/adventure/trapLogic.js) can read it as well as the cat.
//   airSpeed: his jumps and bounces this much quicker, at the same height (speeds up and down times
//     it, gravity times its square);
//   height: his jumps (not his bounces) this much higher (their speed times its square root).
export const HERO_JUMP = { airSpeed: 1.15, height: 1.1 };
