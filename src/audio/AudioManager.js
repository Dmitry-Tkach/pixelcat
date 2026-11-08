import { MUSIC_TRACKS } from '../data/music.js';
import { SOUNDS } from '../data/sounds.js';
import { MusicSequencer } from './MusicSequencer.js';
import { compileTrack } from './notes.js';
import { playLayers } from './synth.js';

const STORAGE_KEY = 'cat-escape-audio';
const MUSIC_LEVEL = 0.55;
const DANGER_LEVEL = 0.8;
const SOUND_LEVEL = 0.9;
const FADE_SECONDS = 0.06;
const DANGER_FADE_SECONDS = 0.5;

function loadSettings() {
  try {
    return { music: true, sound: true, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
  } catch {
    return { music: true, sound: true }; // storage can be blocked, as in private browsing
  }
}

// The game's single entry point for audio. Browsers only allow audio after a user action,
// so nothing is created until unlock() runs from a click or key press.
export class AudioManager {
  constructor() {
    this.settings = loadSettings();
    this.tracks = new Map();
    this.ctx = null;
    this.playing = false;
    this.track = null; // the tune playing now, if any
    document.addEventListener('visibilitychange', () => this.handleVisibility());
  }

  unlock() {
    if (!this.ctx) this.createGraph();
    if (this.ctx?.state !== 'running') this.ctx?.resume().catch(() => {});
  }

  createGraph() {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return; // the game still works without audio

    const ctx = new AudioContextClass();
    const limiter = ctx.createDynamicsCompressor();
    limiter.connect(ctx.destination);

    const bus = (level, destination = limiter) => {
      const gain = ctx.createGain();
      gain.gain.value = level;
      gain.connect(destination);
      return gain;
    };
    this.ctx = ctx;
    this.musicBus = bus(this.settings.music ? MUSIC_LEVEL : 0);
    this.dangerBus = bus(0, this.musicBus);
    this.soundBus = bus(this.settings.sound ? SOUND_LEVEL : 0);
    this.sequencer = new MusicSequencer(ctx, { music: this.musicBus, danger: this.dangerBus });
  }

  playSfx(name) {
    if (!this.ctx || !this.settings.sound) return;
    playLayers(this.ctx, this.soundBus, this.ctx.currentTime, SOUNDS[name]);
  }

  startMusic({ track, bpm }) {
    if (!this.ctx) return;
    if (!this.tracks.has(track)) this.tracks.set(track, compileTrack(MUSIC_TRACKS[track]));
    this.setDanger(false);
    this.fadeMusic(this.settings.music ? MUSIC_LEVEL : 0);
    this.sequencer.load(this.tracks.get(track), bpm);
    this.sequencer.run();
    this.playing = true;
    this.track = track;
  }

  stopMusic() {
    this.playing = false;
    this.track = null;
    if (!this.ctx) return;
    this.sequencer.halt();
    this.fadeMusic(0);
  }

  pauseMusic() {
    if (!this.ctx || !this.playing) return;
    this.sequencer.halt();
    this.fadeMusic(0);
  }

  resumeMusic() {
    if (!this.ctx || !this.playing) return;
    this.fadeMusic(this.settings.music ? MUSIC_LEVEL : 0);
    this.sequencer.run();
  }

  // Brings in the tense extra layer while the owner is close.
  setDanger(active) {
    if (!this.ctx) return;
    this.dangerBus.gain.setTargetAtTime(active ? DANGER_LEVEL : 0, this.ctx.currentTime, DANGER_FADE_SECONDS / 3);
  }

  fadeMusic(level) {
    this.musicBus.gain.setTargetAtTime(level, this.ctx.currentTime, FADE_SECONDS / 3);
  }

  toggleMusic() {
    this.settings.music = !this.settings.music;
    this.saveSettings();
    if (this.ctx && this.sequencer.isRunning) this.fadeMusic(this.settings.music ? MUSIC_LEVEL : 0);
  }

  toggleSound() {
    this.settings.sound = !this.settings.sound;
    this.saveSettings();
    if (this.ctx) this.soundBus.gain.value = this.settings.sound ? SOUND_LEVEL : 0;
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // The setting still applies for this session.
    }
  }

  // Timers slow down in hidden tabs and would make the music stutter, so go silent instead.
  handleVisibility() {
    if (!this.ctx) return;
    if (document.hidden) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }
}
