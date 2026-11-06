import { describe, expect, it } from 'vitest';
import { STEPS_PER_BAR, noteToFrequency, parseBar } from '../src/audio/notes.js';
import { MUSIC_TRACKS } from '../src/data/music.js';
import { SOUNDS } from '../src/data/sounds.js';

describe('music notation', () => {
  it('converts note names to frequencies', () => {
    expect(noteToFrequency('A4')).toBeCloseTo(440);
    expect(noteToFrequency('C4')).toBeCloseTo(261.63, 1);
    expect(noteToFrequency('G#4')).toBeCloseTo(415.3, 1);
    expect(noteToFrequency('Bb3')).toBeCloseTo(233.08, 1);
    expect(noteToFrequency('nope')).toBeNull();
  });

  it('parses rests, notes, chords and drum hits', () => {
    const [rest, single, chord, hit] = parseBar('. A4 A3+E4 x');
    expect(rest).toBeNull();
    expect(single).toHaveLength(1);
    expect(chord).toHaveLength(2);
    expect(hit).toEqual([]);
  });
});

describe.each(Object.entries(MUSIC_TRACKS))('track "%s"', (_name, track) => {
  it('has full-length bars containing only valid notes', () => {
    for (const part of track.parts) {
      for (const bar of part.bars) {
        const steps = parseBar(bar);
        expect(steps, bar).toHaveLength(STEPS_PER_BAR);
        for (const step of steps) {
          if (step) expect(step.every((frequency) => frequency > 0), bar).toBe(true);
        }
      }
    }
  });

  it('only uses instruments it defines', () => {
    for (const part of track.parts) {
      expect(track.instruments[part.instrument], part.instrument).toBeDefined();
    }
  });
});

describe('sound effects', () => {
  it.each(Object.entries(SOUNDS))('"%s" has playable layers', (_name, layers) => {
    expect(layers.length).toBeGreaterThan(0);
    for (const layer of layers) {
      expect(layer.duration).toBeGreaterThan(0);
      expect(layer.gain).toBeGreaterThan(0);
      if (layer.kind === 'noise') expect(layer.cutoff).toBeGreaterThan(0);
      else expect(layer.from).toBeGreaterThan(0);
    }
  });
});
