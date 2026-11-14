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
};
