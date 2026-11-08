// Sound effects, described as layers and synthesized in the browser.
// tone:  wave, from/to (Hz), duration, gain, optional at (seconds), cutoff
// noise: filter, cutoff, sweepTo, q, duration, gain, optional at
// To use a new effect, add it here and call audio.playSfx('name').

const note = (from, at, duration, gain, wave = 'triangle') => ({ from, at, duration, gain, wave });

export const SOUNDS = {
  click: [{ wave: 'sine', from: 660, to: 880, duration: 0.06, gain: 0.25 }],

  jump: [{ wave: 'triangle', from: 300, to: 780, duration: 0.17, gain: 0.4 }],

  doubleJump: [{ wave: 'triangle', from: 520, to: 1180, duration: 0.15, gain: 0.34 }],

  dive: [{ wave: 'triangle', from: 900, to: 220, duration: 0.14, gain: 0.3 }],

  bounce: [
    { wave: 'sine', from: 190, to: 760, duration: 0.2, gain: 0.42 },
    { wave: 'triangle', from: 380, to: 1200, duration: 0.2, gain: 0.16 },
  ],

  sprint: [
    { wave: 'triangle', from: 523, duration: 0.09, gain: 0.26 },
    { wave: 'triangle', at: 0.08, from: 784, duration: 0.09, gain: 0.26 },
    { wave: 'triangle', at: 0.16, from: 1047, duration: 0.18, gain: 0.28 },
  ],

  whistle: [{ wave: 'sine', from: 1500, to: 520, duration: 0.5, gain: 0.14 }],

  // Running into a wall.
  thud: [
    { wave: 'sine', from: 140, to: 50, duration: 0.22, gain: 0.55 },
    { wave: 'square', from: 90, to: 60, duration: 0.08, gain: 0.16, cutoff: 500 },
  ],

  // A collapsing ledge starting to give way, then falling.
  creak: [{ wave: 'sawtooth', from: 180, to: 300, duration: 0.3, gain: 0.14, cutoff: 900 }],
  collapse: [{ wave: 'triangle', from: 320, to: 70, duration: 0.4, gain: 0.3 }],

  smash: [
    { kind: 'noise', filter: 'highpass', cutoff: 2200, duration: 0.16, gain: 0.34 },
    { wave: 'sine', from: 170, to: 80, duration: 0.09, gain: 0.3 },
  ],

  land: [{ wave: 'sine', from: 150, to: 70, duration: 0.08, gain: 0.3 }],

  squeak: [
    { wave: 'sine', from: 1400, to: 2200, duration: 0.09, gain: 0.25 },
    { wave: 'sine', at: 0.11, from: 1500, to: 2500, duration: 0.11, gain: 0.25 },
  ],

  honk: [
    { wave: 'square', from: 392, duration: 0.14, gain: 0.16, cutoff: 1800 },
    { wave: 'square', from: 494, duration: 0.14, gain: 0.14, cutoff: 1800 },
    { wave: 'square', at: 0.2, from: 392, duration: 0.24, gain: 0.16, cutoff: 1800 },
    { wave: 'square', at: 0.2, from: 494, duration: 0.24, gain: 0.14, cutoff: 1800 },
  ],

  splat: [
    { kind: 'noise', filter: 'lowpass', cutoff: 700, sweepTo: 200, duration: 0.22, gain: 0.5 },
    { wave: 'sine', from: 220, to: 90, duration: 0.16, gain: 0.3 },
  ],

  hayRide: [
    { kind: 'noise', filter: 'bandpass', cutoff: 1800, q: 0.7, duration: 0.14, gain: 0.3 },
    { wave: 'triangle', at: 0.05, from: 392, duration: 0.1, gain: 0.24 },
    { wave: 'triangle', at: 0.14, from: 523, duration: 0.14, gain: 0.26 },
  ],

  slide: [{ kind: 'noise', filter: 'bandpass', cutoff: 2000, sweepTo: 450, q: 0.9, duration: 0.34, gain: 0.45, attack: 0.02 }],

  hit: [
    { wave: 'square', from: 230, to: 65, duration: 0.2, gain: 0.3, cutoff: 1400 },
    { kind: 'noise', filter: 'lowpass', cutoff: 1800, duration: 0.14, gain: 0.5 },
  ],

  danger: [
    note(880, 0, 0.1, 0.16, 'square'),
    note(659, 0.13, 0.12, 0.16, 'square'),
  ],

  bark: [
    { wave: 'square', from: 430, to: 220, duration: 0.09, gain: 0.26, cutoff: 1800 },
    { wave: 'square', at: 0.14, from: 470, to: 230, duration: 0.1, gain: 0.26, cutoff: 1800 },
  ],

  caw: [
    { wave: 'sawtooth', from: 1050, to: 680, duration: 0.11, gain: 0.17, cutoff: 3000 },
    { wave: 'sawtooth', at: 0.15, from: 1000, to: 620, duration: 0.14, gain: 0.17, cutoff: 3000 },
  ],

  lungeWarn: [
    { wave: 'square', from: 300, to: 620, duration: 0.3, gain: 0.16, cutoff: 2000 },
    { wave: 'square', at: 0.36, from: 620, duration: 0.1, gain: 0.18, cutoff: 2000 },
  ],

  lungeDash: [{ kind: 'noise', filter: 'bandpass', cutoff: 700, sweepTo: 3000, q: 0.8, duration: 0.3, gain: 0.5, attack: 0.03 }],

  // Bumping a paw-print block from below.
  bump: [
    { wave: 'square', from: 520, to: 780, duration: 0.07, gain: 0.18, cutoff: 2400 },
    { wave: 'triangle', at: 0.06, from: 990, to: 1320, duration: 0.12, gain: 0.22 },
  ],

  // The Gunner boss: one shot, the beam charging up, the beam, and his rage bursting into flames.
  shot: [
    { kind: 'noise', filter: 'bandpass', cutoff: 1600, sweepTo: 500, q: 1.2, duration: 0.07, gain: 0.32 },
    { wave: 'square', from: 220, to: 90, duration: 0.05, gain: 0.1, cutoff: 1200 },
  ],
  beamCharge: [{ wave: 'sine', from: 300, to: 1400, duration: 0.95, gain: 0.2, attack: 0.1 }],
  beam: [
    { wave: 'sawtooth', from: 900, to: 500, duration: 0.5, gain: 0.14, cutoff: 2600 },
    { kind: 'noise', filter: 'highpass', cutoff: 2400, duration: 0.5, gain: 0.25 },
  ],
  flameBurst: [
    { kind: 'noise', filter: 'lowpass', cutoff: 400, sweepTo: 2400, duration: 0.6, gain: 0.55, attack: 0.05 },
    { wave: 'sine', from: 110, to: 45, duration: 0.5, gain: 0.45 },
  ],
  overheat: [{ kind: 'noise', filter: 'highpass', cutoff: 3500, sweepTo: 1500, duration: 0.6, gain: 0.22, attack: 0.02 }],

  lungeMiss: [
    { wave: 'triangle', from: 520, to: 180, duration: 0.3, gain: 0.3 },
    { kind: 'noise', filter: 'lowpass', cutoff: 900, at: 0.26, duration: 0.14, gain: 0.45 },
  ],

  pawPickup: [
    { wave: 'triangle', from: 659, duration: 0.09, gain: 0.3 },
    { wave: 'triangle', at: 0.08, from: 880, duration: 0.09, gain: 0.3 },
    { wave: 'triangle', at: 0.16, from: 1319, duration: 0.25, gain: 0.3 },
  ],

  punch: [
    { wave: 'sine', from: 240, to: 50, duration: 0.24, gain: 0.6 },
    { kind: 'noise', filter: 'lowpass', cutoff: 2600, duration: 0.14, gain: 0.55 },
    { wave: 'triangle', at: 0.1, from: 500, to: 1500, duration: 0.45, gain: 0.2 },
  ],

  chaserBack: [
    { wave: 'square', from: 392, duration: 0.1, gain: 0.16, cutoff: 2000 },
    { wave: 'square', at: 0.12, from: 330, duration: 0.18, gain: 0.16, cutoff: 2000 },
  ],

  chaserRush: [
    { wave: 'square', from: 240, to: 520, duration: 0.2, gain: 0.14, cutoff: 1800 },
    { wave: 'square', at: 0.16, from: 300, to: 640, duration: 0.2, gain: 0.14, cutoff: 1800 },
  ],

  // A surprised meow, then a warm little phrase for being hugged.
  caughtHug: [
    { wave: 'sawtooth', from: 900, to: 600, duration: 0.25, gain: 0.16, attack: 0.03, cutoff: 2400 },
    note(523, 0.32, 0.18, 0.28),
    note(659, 0.5, 0.18, 0.28),
    note(784, 0.68, 0.18, 0.28),
    note(1047, 0.86, 0.5, 0.26),
  ],

  rumble: [
    { wave: 'sawtooth', from: 90, to: 70, duration: 0.5, gain: 0.3, cutoff: 500 },
    { wave: 'triangle', at: 0.05, from: 160, to: 120, duration: 0.3, gain: 0.2 },
  ],

  treat: [{ wave: 'triangle', from: 1320, to: 1760, duration: 0.07, gain: 0.16 }],

  checkpoint: [
    { wave: 'triangle', from: 660, duration: 0.1, gain: 0.26 },
    { wave: 'triangle', at: 0.1, from: 990, duration: 0.2, gain: 0.26 },
  ],

  // A falling yowl from the cat, then a sad little phrase.
  caught: [
    { wave: 'sawtooth', from: 980, to: 330, duration: 0.5, gain: 0.2, attack: 0.03, cutoff: 2600 },
    note(494, 0.55, 0.2, 0.32),
    note(415, 0.75, 0.2, 0.32),
    note(349, 0.95, 0.2, 0.32),
    note(294, 1.15, 0.55, 0.36),
  ],

  // A rising phrase ending on a held chord.
  escape: [
    note(523, 0, 0.14, 0.34),
    note(659, 0.12, 0.14, 0.34),
    note(784, 0.24, 0.14, 0.34),
    note(1047, 0.36, 0.7, 0.34),
    note(659, 0.36, 0.7, 0.2),
    note(784, 0.36, 0.7, 0.2),
  ],
};
