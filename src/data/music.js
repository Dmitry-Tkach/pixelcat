// Music, written as notation and synthesized in the browser. Each bar has 16 steps:
// "." is a rest, "A3" a note, "A3+C4" a chord, "x" a drum hit.
// A part's bars loop independently, so a one-bar drum pattern repeats under an eight-bar melody.
// Parts on the "danger" bus fade in only while the owner is close.

const AM_BASS = 'A2 . A3 . A2 . A3 . C3 . A3 . E3 . G3 .';
const F_BASS = 'F2 . F3 . F2 . F3 . C3 . F3 . A2 . C3 .';
const G_BASS = 'G2 . G3 . G2 . G3 . D3 . G3 . B2 . D3 .';
const E_BASS = 'E2 . E3 . E2 . E3 . B2 . E3 . G#2 . B2 .';

// Bass patterns built from a chord's root note.
const FIFTH = { C: 'G', D: 'A', F: 'C', G: 'D', A: 'E', 'A#': 'F' };
const walk = (root) => `${root}2 . . . ${root}3 . . . ${FIFTH[root]}2 . . . ${root}3 . . .`;
const boom = (root) => `${root}2 . . . . . . . ${FIFTH[root]}2 . . . . . . .`;
const drive = (root) => `${root}2 . ${root}2 ${root}3 ${root}2 . ${root}2 ${root}3 ${root}2 . ${root}2 ${root}3 ${FIFTH[root]}2 . ${root}3 .`;

const stabs = (chord) => `. . ${chord} . . . ${chord} . . . ${chord} . . . ${chord} .`;

export const MUSIC_TRACKS = {
  chase: {
    swing: 0.1,
    instruments: {
      lead: [{ wave: 'triangle', duration: 0.2, gain: 0.3 }],
      bass: [{ wave: 'square', duration: 0.13, gain: 0.26, cutoff: 650 }],
      stab: [{ wave: 'sawtooth', duration: 0.1, gain: 0.07, cutoff: 1800 }],
      alarm: [{ wave: 'square', duration: 0.07, gain: 0.08, cutoff: 3000 }],
      kick: [{ wave: 'sine', from: 150, to: 45, duration: 0.11, gain: 0.55 }],
      snare: [{ kind: 'noise', filter: 'highpass', cutoff: 1500, duration: 0.1, gain: 0.24 }],
      hat: [{ kind: 'noise', filter: 'highpass', cutoff: 7000, duration: 0.035, gain: 0.1 }],
    },
    parts: [
      {
        instrument: 'lead',
        bars: [
          'A4 . C5 . E5 . . D5 C5 . A4 . . . B4 .',
          'C5 . B4 . A4 . E4 . . . A4 . C5 . D5 .',
          'C5 . A4 . F4 . A4 C5 . . F5 . E5 . C5 .',
          'D5 . B4 . G4 . B4 D5 . . G5 . F5 . D5 .',
          'E5 . . E5 D5 . C5 . . B4 . C5 A4 . . .',
          'C5 . . C5 B4 . A4 . . E4 . G4 A4 . . .',
          'B4 . G#4 . E4 . G#4 B4 . . E5 . D5 . B4 .',
          'E5 . D5 . C5 . B4 . G#4 . B4 . E4 . . .',
        ],
      },
      { instrument: 'bass', bars: [AM_BASS, AM_BASS, F_BASS, G_BASS, AM_BASS, AM_BASS, E_BASS, E_BASS] },
      {
        instrument: 'stab',
        bars: ['A3+C4+E4', 'A3+C4+E4', 'F3+A3+C4', 'G3+B3+D4', 'A3+C4+E4', 'A3+C4+E4', 'E3+G#3+B3', 'E3+G#3+B3'].map(stabs),
      },
      { instrument: 'kick', bars: ['x . . . . . . . x . x . . . . .'] },
      { instrument: 'snare', bars: ['. . . . x . . . . . . . x . . x'] },
      { instrument: 'hat', bars: ['x . x . x . x . x . x . x . x .'] },
      { instrument: 'alarm', bus: 'danger', bars: ['A5 . . A5 . . E6 . A5 . . A5 . . E6 .'] },
      { instrument: 'hat', bus: 'danger', bars: ['. x . x . x . x . x . x . x . x'] },
    ],
  },

  // The village: a bouncy folk tune in a major key.
  village: {
    swing: 0.18,
    instruments: {
      lead: [{ wave: 'triangle', duration: 0.18, gain: 0.32 }],
      bass: [{ wave: 'triangle', duration: 0.14, gain: 0.36, cutoff: 700 }],
      stab: [{ wave: 'triangle', duration: 0.09, gain: 0.1, cutoff: 2400 }],
      alarm: [{ wave: 'square', duration: 0.07, gain: 0.07, cutoff: 3000 }],
      kick: [{ wave: 'sine', from: 130, to: 50, duration: 0.1, gain: 0.42 }],
      hat: [{ kind: 'noise', filter: 'highpass', cutoff: 6000, duration: 0.05, gain: 0.13 }],
    },
    parts: [
      {
        instrument: 'lead',
        bars: [
          'G4 . B4 . D5 . B4 . G4 . A4 . B4 . . .',
          'C5 . B4 . A4 . G4 . A4 . . . D4 . . .',
          'G4 . B4 . D5 . G5 . E5 . D5 . B4 . . .',
          'C5 . A4 . F#4 . A4 . G4 . . . . . . .',
          'E5 . D5 . C5 . E5 . D5 . C5 . B4 . . .',
          'C5 . B4 . A4 . C5 . B4 . A4 . G4 . . .',
          'A4 . B4 . C5 . A4 . D5 . C5 . B4 . A4 .',
          'G4 . D4 . G4 . B4 . G4 . . . . . . .',
        ],
      },
      { instrument: 'bass', bars: ['G', 'C', 'G', 'D', 'C', 'G', 'D', 'G'].map(walk) },
      {
        instrument: 'stab',
        bars: ['G3+B3+D4', 'C4+E4+G4', 'G3+B3+D4', 'D4+F#4+A4', 'C4+E4+G4', 'G3+B3+D4', 'D4+F#4+A4', 'G3+B3+D4'].map(stabs),
      },
      { instrument: 'kick', bars: ['x . . . . . . . x . . . . . . .'] },
      { instrument: 'hat', bars: ['. . x . . . x . . . x . . . x x'] },
      { instrument: 'alarm', bus: 'danger', bars: ['G5 . . G5 . . D6 . G5 . . G5 . . D6 .'] },
      { instrument: 'hat', bus: 'danger', bars: ['. x . x . x . x . x . x . x . x'] },
    ],
  },

  // The farm: a plucky country tune, with a boom-chick rhythm.
  farm: {
    swing: 0.06,
    instruments: {
      lead: [{ wave: 'square', duration: 0.1, gain: 0.13, cutoff: 2600 }],
      bass: [{ wave: 'triangle', duration: 0.16, gain: 0.42, cutoff: 600 }],
      stab: [{ wave: 'square', duration: 0.05, gain: 0.05, cutoff: 3200 }],
      alarm: [{ wave: 'square', duration: 0.07, gain: 0.07, cutoff: 3000 }],
      kick: [{ wave: 'sine', from: 140, to: 50, duration: 0.09, gain: 0.45 }],
      snare: [{ kind: 'noise', filter: 'highpass', cutoff: 2400, duration: 0.06, gain: 0.2 }],
    },
    parts: [
      {
        instrument: 'lead',
        bars: [
          'C5 . E5 G5 . E5 C5 . D5 . F5 A5 . F5 D5 .',
          'E5 . G5 C6 . G5 E5 . D5 . C5 . . . G4 .',
          'A4 . C5 F5 . C5 A4 . G4 . B4 D5 . B4 G4 .',
          'C5 . E5 G5 . E5 G5 . A5 . G5 E5 . D5 . .',
          'C6 . A5 . G5 . E5 . F5 . A5 . G5 . E5 .',
          'D5 . E5 F5 . D5 C5 . A4 . C5 . D5 . . .',
          'G4 . B4 D5 . G5 F5 . E5 . D5 . C5 . B4 .',
          'C5 . G4 . E4 . G4 . C5 . . . . . . .',
        ],
      },
      { instrument: 'bass', bars: ['C', 'C', 'F', 'C', 'F', 'D', 'G', 'C'].map(boom) },
      {
        instrument: 'stab',
        bars: ['C4+E4+G4', 'C4+E4+G4', 'F3+A3+C4', 'C4+E4+G4', 'F3+A3+C4', 'D4+F4+A4', 'G3+B3+D4', 'C4+E4+G4'].map(stabs),
      },
      { instrument: 'kick', bars: ['x . . . . . . . x . . . . . . .'] },
      { instrument: 'snare', bars: ['. . . . x . . . . . . . x . . .'] },
      { instrument: 'alarm', bus: 'danger', bars: ['C6 . . C6 . . G5 . C6 . . C6 . . G5 .'] },
      { instrument: 'snare', bus: 'danger', bars: ['. x . x . x . x . x . x . x . x'] },
    ],
  },

  // The finale: a dark, driving tune in a minor key.
  finale: {
    swing: 0,
    instruments: {
      lead: [{ wave: 'sawtooth', duration: 0.16, gain: 0.13, cutoff: 2400 }],
      bass: [{ wave: 'sawtooth', duration: 0.11, gain: 0.2, cutoff: 500 }],
      stab: [{ wave: 'square', duration: 0.09, gain: 0.05, cutoff: 1500 }],
      alarm: [{ wave: 'square', duration: 0.07, gain: 0.09, cutoff: 3400 }],
      kick: [{ wave: 'sine', from: 160, to: 42, duration: 0.12, gain: 0.6 }],
      snare: [{ kind: 'noise', filter: 'highpass', cutoff: 1400, duration: 0.11, gain: 0.26 }],
      hat: [{ kind: 'noise', filter: 'highpass', cutoff: 8000, duration: 0.03, gain: 0.11 }],
    },
    parts: [
      {
        instrument: 'lead',
        bars: [
          'D5 . F5 . A5 . F5 . D5 . F5 . G5 . F5 .',
          'E5 . D5 . C5 . A4 . C5 . D5 . . . . .',
          'A#4 . D5 . F5 . D5 . A#4 . D5 . F5 . G5 .',
          'A5 . G5 . F5 . E5 . C#5 . E5 . A4 . . .',
          'D5 . . D5 F5 . . F5 A5 . . A5 C6 . A5 .',
          'A#5 . A5 . G5 . F5 . E5 . F5 . G5 . . .',
          'F5 . E5 . D5 . C5 . A#4 . C5 . D5 . E5 .',
          'A5 . . . C#5 . E5 . A5 . . . . . . .',
        ],
      },
      { instrument: 'bass', bars: ['D', 'C', 'A#', 'A', 'D', 'G', 'A#', 'A'].map(drive) },
      {
        instrument: 'stab',
        bars: ['D4+F4+A4', 'C4+E4+G4', 'A#3+D4+F4', 'A3+C#4+E4', 'D4+F4+A4', 'G3+A#3+D4', 'A#3+D4+F4', 'A3+C#4+E4'].map(stabs),
      },
      { instrument: 'kick', bars: ['x . . . x . . . x . . . x . x .'] },
      { instrument: 'snare', bars: ['. . . . x . . . . . . . x . . x'] },
      { instrument: 'hat', bars: ['x x x x x x x x x x x x x x x x'] },
      { instrument: 'alarm', bus: 'danger', bars: ['D6 . . D6 . . A5 . D6 . . D6 . . F6 .'] },
      { instrument: 'hat', bus: 'danger', bars: ['. x . x . x . x . x . x . x . x'] },
    ],
  },
};
