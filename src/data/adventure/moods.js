// Moods: the light and colour of a stretch of a level, so its parts feel different: a dark, cool
// hollow, a bright, warm canopy. A level lists its stretches (`moods`: from and to, in columns, and
// the mood's name); elsewhere it's `normal`. The look fades from one to the next over FADE_COLS as
// the cat moves. systems/adventure/AdventureBackdrop.js and the scene apply it.
//   backdrop: a colour the backdrop's layers are tinted by (white leaves them as they are).
//   wash: a see-through colour over the whole screen, and how strong (0 for none).
//   rays, fog: how bright the light rays and the fog are, against their usual.
export const MOODS = {
  normal: { backdrop: 0xffffff, wash: 0x000000, washAlpha: 0, rays: 1, fog: 1 },
  // Deep in a hollow: dimmer, bluer, mistier, little light from above.
  hollow: { backdrop: 0xa9c6dc, wash: 0x14284a, washAlpha: 0.16, rays: 0.35, fog: 1.6 },
  // High in the treetops: warm golden light, strong rays, no fog.
  canopy: { backdrop: 0xffe6a8, wash: 0xffe08a, washAlpha: 0.1, rays: 1.7, fog: 0.3 },
};
export const FADE_COLS = 5;

const channels = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mixColour = (a, b, t) => {
  const [ar, ag, ab] = channels(a), [br, bg, bb] = channels(b);
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};

// Two moods mixed: t 0 is all `a`, 1 all `b`.
export function mixMoods(a, b, t) {
  return {
    backdrop: mixColour(a.backdrop, b.backdrop, t),
    wash: mixColour(a.wash, b.wash, t),
    washAlpha: a.washAlpha + (b.washAlpha - a.washAlpha) * t,
    rays: a.rays + (b.rays - a.rays) * t,
    fog: a.fog + (b.fog - a.fog) * t,
  };
}

// The mood at column `col` (it may be a fraction): a stretch's own inside it, fading to normal over
// FADE_COLS beyond its ends. Plain sums, so it can be tested.
export function moodAt(col, stretches = [], moods = MOODS, fade = FADE_COLS) {
  for (const { from, to, mood } of stretches) {
    if (col < from - fade || col > to + fade) continue;
    const inside = col < from ? 1 - (from - col) / fade : col > to ? 1 - (col - to) / fade : 1;
    const t = inside * inside * (3 - 2 * inside); // eased, so it fades in and out softly
    return mixMoods(moods.normal, moods[mood], t);
  }
  return moods.normal;
}
