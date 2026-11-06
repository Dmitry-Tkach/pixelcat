import { STEPS_PER_BAR } from './notes.js';
import { playLayers } from './synth.js';

const LOOKAHEAD_SECONDS = 0.15;
const TIMER_MS = 30;
const START_DELAY = 0.06;

// Schedules a compiled track slightly ahead of time, so notes stay exact even if a frame runs late.
export class MusicSequencer {
  constructor(ctx, buses) {
    this.ctx = ctx;
    this.buses = buses; // bus name -> audio node, such as main music and the danger layer
    this.timer = null;
    this.track = null;
  }

  load(track, bpm) {
    this.track = track;
    this.stepSeconds = 60 / bpm / 4;
    this.step = 0;
    this.bar = 0;
    this.nextTime = this.ctx.currentTime + START_DELAY;
  }

  // Schedules every step that starts before `time`.
  scheduleUntil(time) {
    while (this.nextTime < time) {
      this.playStep(this.nextTime);
      this.nextTime += this.stepSeconds;
      this.step += 1;
      if (this.step === STEPS_PER_BAR) {
        this.step = 0;
        this.bar += 1;
      }
    }
  }

  playStep(time) {
    const { parts, instruments, swing = 0 } = this.track;
    const at = this.step % 2 === 1 ? time + this.stepSeconds * swing : time;
    for (const part of parts) {
      const event = part.steps[this.bar % part.steps.length][this.step];
      if (!event) continue;
      const bus = this.buses[part.bus ?? 'music'];
      const layers = instruments[part.instrument];
      if (event.length === 0) playLayers(this.ctx, bus, at, layers);
      for (const frequency of event) playLayers(this.ctx, bus, at, layers, frequency);
    }
  }

  run() {
    this.halt();
    // After a pause, carry on from the current moment instead of rushing to catch up.
    this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + START_DELAY);
    const tick = () => this.scheduleUntil(this.ctx.currentTime + LOOKAHEAD_SECONDS);
    tick();
    this.timer = setInterval(tick, TIMER_MS);
  }

  halt() {
    clearInterval(this.timer);
    this.timer = null;
  }

  get isRunning() {
    return this.timer !== null;
  }
}
