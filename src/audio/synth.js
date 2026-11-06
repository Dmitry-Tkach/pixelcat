// Sound building blocks. Each works on any audio context, including the offline one used for measuring.

const QUIET = 0.0001;
const noiseBuffers = new WeakMap();

function noiseBuffer(ctx) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function envelope(ctx, time, attack, duration, level) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(QUIET, time);
  gain.gain.exponentialRampToValueAtTime(level, time + attack);
  gain.gain.exponentialRampToValueAtTime(QUIET, time + duration);
  return gain;
}

// A pitched sound. `to` slides the pitch over the note's duration.
export function playTone(ctx, destination, time, { wave = 'sine', from, to, duration, gain, attack = 0.005, cutoff }) {
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, time);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, time + duration);

  const amp = envelope(ctx, time, attack, duration, gain);
  if (cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    osc.connect(filter).connect(amp);
  } else {
    osc.connect(amp);
  }
  amp.connect(destination);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

// A burst of noise through a filter. `sweepTo` moves the filter over the duration.
export function playNoise(ctx, destination, time, { filter = 'bandpass', cutoff, sweepTo, q = 1, duration, gain, attack = 0.002 }) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;

  const shaper = ctx.createBiquadFilter();
  shaper.type = filter;
  shaper.Q.value = q;
  shaper.frequency.setValueAtTime(cutoff, time);
  if (sweepTo) shaper.frequency.exponentialRampToValueAtTime(sweepTo, time + duration);

  source.connect(shaper).connect(envelope(ctx, time, attack, duration, gain)).connect(destination);
  source.start(time, Math.random() * 0.5);
  source.stop(time + duration + 0.02);
}

// Plays a list of layers, the format used for sound effects and instruments.
export function playLayers(ctx, destination, time, layers, frequency) {
  for (const layer of layers) {
    const at = time + (layer.at ?? 0);
    if (layer.kind === 'noise') {
      playNoise(ctx, destination, at, layer);
    } else {
      const from = layer.from ?? frequency;
      const to = layer.toRatio ? from * layer.toRatio : layer.to;
      playTone(ctx, destination, at, { ...layer, from, to });
    }
  }
}
