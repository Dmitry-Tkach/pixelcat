// How the cat's dash looks (systems/AdventureMoves.js draws it): glowing ghosts of him left behind
// as he rushes, thin wind streaks streaming back, and a puff of dust where he pushes off the ground.

// ghosts: one left every `everyMs`, the colour he's lit in, how see-through it starts, and how long it
// takes to fade. streaks: how many each time a ghost is left, how long (px), how far up and down his
// body they spread, how long they last, and how far they drift back as they fade. dust: the puffs at
// his feet when he starts on the ground. depth: drawn just behind him.
export const DASH_LOOK = {
  ghosts: { everyMs: 28, tint: 0x9fdcff, alpha: 0.55, fadeMs: 220 },
  streaks: { count: 2, length: [26, 54], spread: 0.8, ms: 200, drift: 40, colour: 0xffffff, alpha: 0.85, width: 2 },
  dust: 7,
  depthBehind: 1,
};
