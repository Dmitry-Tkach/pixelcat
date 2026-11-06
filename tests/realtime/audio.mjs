// Measures the audio by rendering it offline, then checks the live game triggers it correctly.
import puppeteer from 'puppeteer-core';
const [url, shots] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--autoplay-policy=user-gesture-required'],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__catEscape?.scene.isActive('Game'), { timeout: 30000 });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (name, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);

// 1. Offline measurements of every effect and the music.
const levels = await page.evaluate(async () => {
  const { SOUNDS } = await import('/src/data/sounds.js');
  const { MUSIC_TRACKS } = await import('/src/data/music.js');
  const { compileTrack } = await import('/src/audio/notes.js');
  const { playLayers } = await import('/src/audio/synth.js');
  const { MusicSequencer } = await import('/src/audio/MusicSequencer.js');
  const stats = (buffer) => {
    const d = buffer.getChannelData(0);
    let peak = 0; let sum = 0;
    for (const v of d) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(3) };
  };
  const out = {};
  for (const [name, layers] of Object.entries(SOUNDS)) {
    const ctx = new OfflineAudioContext(1, 44100 * 2.5, 44100);
    playLayers(ctx, ctx.destination, 0, layers);
    out[name] = stats(await ctx.startRendering());
  }
  const renderMusic = async (danger, bpm) => {
    const seconds = (8 * 4 * 60) / bpm;
    const ctx = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
    const music = ctx.createGain(); music.gain.value = 0.55; music.connect(ctx.destination);
    const dangerBus = ctx.createGain(); dangerBus.gain.value = danger ? 0.8 : 0; dangerBus.connect(music);
    const seq = new MusicSequencer(ctx, { music, danger: dangerBus });
    seq.load(compileTrack(MUSIC_TRACKS.chase), bpm);
    seq.scheduleUntil(seconds - 0.2);
    return { seconds: +seconds.toFixed(1), ...stats(await ctx.startRendering()) };
  };
  out['music 138bpm'] = await renderMusic(false, 138);
  out['music 162bpm'] = await renderMusic(false, 162);
  out['music with danger'] = await renderMusic(true, 162);
  return out;
});
console.table(levels);
const worst = Math.max(...Object.values(levels).map((l) => l.peak));
log('nothing clips before the limiter', worst <= 1, `loudest peak=${worst}`);
log('every sound is audible', Object.values(levels).every((l) => l.peak > 0.05));

// 2. The live game, with a recording of every sound requested.
await page.evaluate(() => {
  const audio = window.__catEscape.registry.get('audio');
  window.__sfx = [];
  const original = audio.playSfx.bind(audio);
  audio.playSfx = (name) => { window.__sfx.push(name); original(name); };
});
const state = () => page.evaluate(() => {
  const a = window.__catEscape.registry.get('audio');
  const s = window.__catEscape.scene.getScene('Game');
  return {
    ctx: a.ctx?.state ?? 'none', seq: a.sequencer?.isRunning ?? false, playing: a.playing,
    bar: a.sequencer?.bar, step: a.sequencer?.step, settings: { ...a.settings },
    danger: a.dangerBus?.gain.value ?? 0, music: a.musicBus?.gain.value ?? 0,
    sfx: [...window.__sfx], state: s.state.state,
  };
});
const clickBtn = (label) => page.evaluate((text) => {
  const b = [...document.querySelectorAll('#overlay button')].find((e) => e.textContent === text);
  if (!b) throw new Error(`no button "${text}"`);
  const r = b.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}, label).then(({ x, y }) => page.mouse.click(x, y));

log('no audio before any user action', (await state()).ctx === 'none');
await page.screenshot({ path: `${shots}/audio-start.png` });
await clickBtn('Play');
await pause(500);
await clickBtn('Run!');
await pause(600);
let s = await state();
log('Play unlocks audio and starts music', s.ctx === 'running' && s.seq && s.sfx.includes('click'), `ctx=${s.ctx} music=${s.music.toFixed(2)}`);

const pos1 = { bar: s.bar, step: s.step };
await pause(1000);
s = await state();
log('music advances', s.bar * 16 + s.step > pos1.bar * 16 + pos1.step, `bar ${s.bar} step ${s.step}`);

await page.keyboard.press('Space');
await pause(120);
s = await state();
log('jump plays its sound', s.sfx.includes('jump'));
await pause(1100);
log('landing plays its sound', (await state()).sfx.includes('land'));

await page.keyboard.press('Escape');
await pause(250);
s = await state();
const stepAtPause = s.bar * 16 + s.step;
await pause(500);
s = await state();
log('pause stops the music', !s.seq && s.bar * 16 + s.step === stepAtPause && s.music < 0.05, `gain=${s.music.toFixed(3)}`);
await page.screenshot({ path: `${shots}/audio-pause.png` });

await clickBtn('Music: On');
await pause(100);
s = await state();
const stored = await page.evaluate(() => localStorage.getItem('cat-escape-audio'));
log('music toggle updates and saves', s.settings.music === false && stored.includes('"music":false'), stored);
await clickBtn('Resume');
await pause(500);
s = await state();
log('muted music stays silent after resume', s.seq && s.music < 0.01, `gain=${s.music.toFixed(4)}`);
await page.keyboard.press('Escape');
await pause(200);
await clickBtn('Music: Off');
await pause(50);
await clickBtn('Resume');
await pause(500);
s = await state();
log('unmuting restores the music', s.seq && s.music > 0.4, `gain=${s.music.toFixed(2)}`);

// Idle until caught: the danger layer and caught sound should both fire, and the music should stop.
await page.waitForFunction(() => window.__catEscape.scene.getScene('Game').inDanger, { timeout: 90000, polling: 100 });
await pause(900);
s = await state();
log('danger warning and tense layer come in', s.sfx.includes('danger') && s.danger > 0.4, `danger gain=${s.danger.toFixed(2)}`);
log('collisions play the hit sound', s.sfx.includes('hit'));
await page.waitForFunction(() => window.__catEscape.scene.getScene('Game').state.state === 'failed', { timeout: 90000, polling: 100 });
await pause(200);
s = await state();
log('being caught stops music and plays its sound', !s.seq && s.sfx.includes('caught'));
const dangerCount = s.sfx.filter((n) => n === 'danger').length;
log('danger warning does not spam', dangerCount <= 3, `played ${dangerCount}x`);

await page.waitForSelector('#overlay:not([hidden])');
await clickBtn('Try again');
await pause(500);
s = await state();
log('restart starts music again with no danger layer', s.seq && s.state === 'playing' && s.danger < 0.1, `danger=${s.danger.toFixed(3)}`);

// Saved settings survive a reload.
await page.keyboard.press('Escape');
await pause(150);
await clickBtn('Sound: On');
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__catEscape?.scene.isActive('Game'), { timeout: 30000 });
await pause(300);
const labels = await page.evaluate(() => [...document.querySelectorAll('#overlay button')].map((b) => b.textContent));
log('sound setting survives a reload', labels.includes('Sound: Off'), labels.join(' | '));
await page.evaluate(() => localStorage.removeItem('cat-escape-audio'));

console.log(errors.length ? `ERRORS: ${errors.join(' | ')}` : 'No page errors');
await browser.close();
