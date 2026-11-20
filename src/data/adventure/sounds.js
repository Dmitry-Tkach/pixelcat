// The adventure's own sound effects, in the same layers as data/sounds.js (which takes them in), so
// audio.playSfx plays them by name. Each crate of rounds sounds like what's in it, so the player
// hears what they picked up (the crate's sound is named in data/adventure/ammo.js).

export const ADVENTURE_SOUNDS = {
  // Standard rounds: a metal click-clack, like loading the gun, and a little chime.
  ammoStandard: [
    { kind: 'noise', filter: 'bandpass', cutoff: 3200, q: 4, duration: 0.03, gain: 0.4 },
    { wave: 'square', from: 1800, to: 1200, duration: 0.025, gain: 0.08, cutoff: 4000 },
    { kind: 'noise', filter: 'bandpass', at: 0.09, cutoff: 2200, sweepTo: 1400, q: 3, duration: 0.06, gain: 0.45 },
    { wave: 'sine', at: 0.09, from: 180, to: 120, duration: 0.08, gain: 0.3 },
    { wave: 'triangle', at: 0.17, from: 1319, duration: 0.12, gain: 0.14 },
  ],
  // Explosive rounds: a heavy thump, then a fizzing fuse.
  ammoExplosive: [
    { wave: 'sine', from: 110, to: 45, duration: 0.3, gain: 0.6 },
    { kind: 'noise', filter: 'lowpass', cutoff: 900, sweepTo: 200, duration: 0.18, gain: 0.35 },
    { kind: 'noise', filter: 'highpass', at: 0.08, cutoff: 5000, duration: 0.35, gain: 0.12 },
    { wave: 'triangle', at: 0.16, from: 523, duration: 0.1, gain: 0.14 },
    { wave: 'triangle', at: 0.24, from: 784, duration: 0.14, gain: 0.14 },
  ],
  // Laser rounds: a rising electric zip, and a bright ping.
  ammoLaser: [
    { wave: 'sine', from: 300, to: 2400, duration: 0.22, gain: 0.22, attack: 0.02 },
    { wave: 'sawtooth', from: 600, to: 3000, duration: 0.22, gain: 0.07, cutoff: 5000 },
    { wave: 'triangle', at: 0.22, from: 1760, duration: 0.18, gain: 0.2 },
    { wave: 'triangle', at: 0.26, from: 2637, duration: 0.14, gain: 0.1 },
  ],
  // Freeze rounds: a crystal chime running up, with a little crackle of frost.
  ammoFreeze: [
    { wave: 'sine', from: 1568, duration: 0.09, gain: 0.18 },
    { wave: 'sine', at: 0.06, from: 2093, duration: 0.09, gain: 0.16 },
    { wave: 'sine', at: 0.12, from: 2637, duration: 0.2, gain: 0.16 },
    { kind: 'noise', filter: 'highpass', cutoff: 6000, duration: 0.3, gain: 0.1, attack: 0.04 },
  ],
  // An enemy frozen: a crackle of ice forming, and a cold low note.
  freeze: [
    { kind: 'noise', filter: 'bandpass', cutoff: 4500, sweepTo: 2500, q: 2, duration: 0.25, gain: 0.3 },
    { wave: 'sine', from: 900, to: 600, duration: 0.3, gain: 0.14 },
  ],
  // Ice shattering: a bright glassy crash.
  shatter: [
    { kind: 'noise', filter: 'highpass', cutoff: 3000, sweepTo: 7000, duration: 0.28, gain: 0.45 },
    { wave: 'triangle', from: 2400, to: 1200, duration: 0.18, gain: 0.14 },
    { wave: 'triangle', at: 0.05, from: 3100, to: 1800, duration: 0.15, gain: 0.1 },
  ],
  // Fire rounds: a whoosh of flame catching, and a crackle.
  ammoFire: [
    { kind: 'noise', filter: 'bandpass', cutoff: 600, sweepTo: 2400, q: 0.8, duration: 0.3, gain: 0.45, attack: 0.03 },
    { kind: 'noise', filter: 'highpass', at: 0.18, cutoff: 3500, duration: 0.25, gain: 0.12 },
    { wave: 'triangle', at: 0.2, from: 659, duration: 0.1, gain: 0.14 },
    { wave: 'triangle', at: 0.28, from: 988, duration: 0.14, gain: 0.14 },
  ],
  // An enemy catching fire: a low "whoomp".
  ignite: [
    { kind: 'noise', filter: 'lowpass', cutoff: 500, sweepTo: 1800, duration: 0.22, gain: 0.4, attack: 0.02 },
    { wave: 'sine', from: 140, to: 220, duration: 0.18, gain: 0.25 },
  ],
  // The pterodactyl's screech, its warning before a dive (data/adventure/birds.js): a harsh squawk
  // that shoots up, warbles, and falls away, with a raspy breath under it, about half a second, so
  // it's over before the dive (and its whoosh) begins. Two voices a little apart make it rough.
  pteroScreech: [
    { wave: 'sawtooth', from: 900, to: 2300, duration: 0.08, gain: 0.1, attack: 0.01, cutoff: 5200 },
    { wave: 'square', from: 960, to: 2460, duration: 0.08, gain: 0.05, attack: 0.01, cutoff: 4200 },
    { wave: 'sawtooth', at: 0.07, from: 2300, to: 1700, duration: 0.12, gain: 0.11, cutoff: 5200 },
    { wave: 'square', at: 0.07, from: 2460, to: 1820, duration: 0.12, gain: 0.05, cutoff: 4200 },
    { wave: 'sawtooth', at: 0.17, from: 2050, to: 1500, duration: 0.1, gain: 0.1, cutoff: 5000 },
    { wave: 'sawtooth', at: 0.26, from: 1850, to: 650, duration: 0.24, gain: 0.1, cutoff: 4200 },
    { wave: 'square', at: 0.26, from: 1980, to: 700, duration: 0.24, gain: 0.045, cutoff: 3400 },
    { kind: 'noise', filter: 'bandpass', cutoff: 2800, sweepTo: 1500, q: 2, duration: 0.45, gain: 0.22, attack: 0.02 },
  ],
  // A mace swinging through the bottom of its swing: a heavy whoosh of air, rising and falling.
  maceWhoosh: [
    { kind: 'noise', filter: 'bandpass', cutoff: 280, sweepTo: 900, q: 1.2, duration: 0.38, gain: 0.5, attack: 0.14 },
    { wave: 'sine', from: 95, to: 60, duration: 0.3, gain: 0.18, attack: 0.08 },
  ],
  // A mace at the end of its swing: the chain creaking under the weight.
  // The squirrel's throw: a quick, light swish of air.
  acornThrow: [
    { kind: 'noise', filter: 'bandpass', cutoff: 1800, sweepTo: 3600, q: 2, duration: 0.12, gain: 0.25 },
  ],
  maceCreak: [
    { wave: 'sawtooth', from: 430, to: 370, duration: 0.2, gain: 0.05, cutoff: 1400, attack: 0.03 },
    { kind: 'noise', filter: 'bandpass', cutoff: 2600, q: 6, duration: 0.16, gain: 0.07 },
  ],
  // The stone guardian waking: a deep grinding roar, and stone cracking.
  guardianRoar: [
    { wave: 'sawtooth', from: 70, to: 48, duration: 1.1, gain: 0.32, cutoff: 420, attack: 0.15 },
    { wave: 'sine', from: 55, to: 38, duration: 1.2, gain: 0.4, attack: 0.1 },
    { kind: 'noise', filter: 'lowpass', cutoff: 700, sweepTo: 250, duration: 1, gain: 0.3, attack: 0.2 },
    { kind: 'noise', filter: 'bandpass', at: 0.1, cutoff: 2200, q: 3, duration: 0.25, gain: 0.18 },
  ],
  // Falling into water: a splash.
  splash: [
    { kind: 'noise', filter: 'lowpass', cutoff: 2600, sweepTo: 600, duration: 0.4, gain: 0.5, attack: 0.01 },
    { kind: 'noise', filter: 'highpass', at: 0.05, cutoff: 4000, duration: 0.3, gain: 0.15 },
    { wave: 'sine', from: 300, to: 120, duration: 0.2, gain: 0.2 },
  ],
  // A fish leaping out of the water (data/adventure/fish.js): small and light, as fish leap often.
  // A quick bright spray, and the "bloop" of a bubble (water's own note: a sine sliding quickly up).
  fishLeap: [
    { kind: 'noise', filter: 'bandpass', cutoff: 2600, sweepTo: 1300, q: 1.4, duration: 0.13, gain: 0.16, attack: 0.005 },
    { wave: 'sine', from: 520, to: 1150, duration: 0.05, gain: 0.12, attack: 0.004 },
    { kind: 'noise', filter: 'highpass', at: 0.04, cutoff: 5000, duration: 0.12, gain: 0.05 },
  ],
  // A fish diving back in: a "plop", a lower bubble note with a soft splash, then a tiny bubble.
  fishDive: [
    { wave: 'sine', from: 330, to: 880, duration: 0.07, gain: 0.16, attack: 0.004 },
    { kind: 'noise', filter: 'lowpass', cutoff: 1900, sweepTo: 700, duration: 0.16, gain: 0.14, attack: 0.005 },
    { wave: 'sine', at: 0.08, from: 760, to: 1500, duration: 0.035, gain: 0.06, attack: 0.003 },
  ],
};
