// Music notation helpers, with no audio dependency so they can be unit-tested.

const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const STEPS_PER_BAR = 16;

// "A4" -> 440, "C#5" -> 554.37. Returns null for anything that isn't a note.
export function noteToFrequency(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  const midi = 12 * (Number(octave) + 1) + SEMITONES[letter] + shift;
  return 440 * 2 ** ((midi - 69) / 12);
}

// A bar is 16 space-separated steps: "." is a rest, "x" a drum hit, "A3+C4" a chord.
// Returns one entry per step: null for a rest, otherwise a list of frequencies (or [] for a drum hit).
export function parseBar(bar) {
  return bar.trim().split(/\s+/).map((token) => {
    if (token === '.') return null;
    if (token === 'x') return [];
    return token.split('+').map(noteToFrequency);
  });
}

// Precomputes a track's parts, so playback does no text parsing.
export function compileTrack(track) {
  return {
    ...track,
    parts: track.parts.map((part) => ({ ...part, steps: part.bars.map(parseBar) })),
  };
}
