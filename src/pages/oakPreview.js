// A page to try the Walking Oak's animations before they're in a level (oak-preview.html, only in
// development: npm run dev, then /oak-preview.html). It plays its cut frames (tools/cut-walking-oak.mjs)
// at the game's size, on the Autumn world's sky, trees and ground, the cat standing beside it at his
// own size, with a speed slider, a pause and a frame-by-frame step.
const OAK = '/assets/adventure/autumn/walking-oak';
const AUTUMN = '/assets/adventure/autumn';
const CAT = { frames: [1, 2, 3, 4, 5, 6].map((i) => `/assets/sprites/paws-cat/idle-${i}.png`), scale: 0.8, fps: 8 }; // as in the game (ADVENTURE_HERO)
const TILE = 64;
const GROUND_Y = 720 - 3 * TILE; // the ground's top, three rows of earth under it
// SMOOTH: the other way to animate it: ONE drawing (asleep's first frame), moved by the game every
// screen frame: breathing (a little taller and narrower, from its feet), and a slow sway. Its
// breath and sway: how much (shares of its size, degrees) and how long one takes (ms).
const SMOOTH = { stretch: 0.018, sway: 0.7, breathMs: 2600, swayMs: 4100 };
// Each animation's speed to start at (frames a second), and what plays after it in a sequence.
const SPEEDS = { asleep: 7, waking: 10, run: 12, leap: 10, lunge: 12, 'stop-run': 10, throw: 11, smash: 12 };
const SEQUENCES = { 'asleep → waking': ['asleep', 'asleep', 'waking'], 'run → leap → run': ['run', 'run', 'leap', 'run'], 'run → lunge → run': ['run', 'run', 'lunge', 'run'], 'run → throw → run': ['run', 'throw', 'run'], 'run → stop': ['run', 'run', 'stop-run'] };

import { OAK_MOVES, OAK_RIG, oakHeight, oakPose } from '../systems/adventure/oakRig.js';

const load = (src) => new Promise((done, fail) => { const img = new Image(); img.onload = () => done(img); img.onerror = () => fail(new Error(src)); img.src = src; });
const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const manifest = await (await fetch(`${OAK}/walking-oak.json`)).json();
const frames = {};
for (const [name, { frames: n }] of Object.entries(manifest.anims)) frames[name] = await Promise.all(Array.from({ length: n }, (_, i) => load(`${OAK}/${name}-${i}.png`)));
const [sky, middle, groundTop, soil] = await Promise.all(['layer-sky', 'layer-middle', 'ground-top', 'soil'].map((n) => load(`${AUTUMN}/${n}.png`)));
const cat = await Promise.all(CAT.frames.map(load));
// The puppet: its parts (tools/cut-oak-parts.mjs) and its rig (systems/adventure/oakRig.js).
const PARTS_DIR = `${OAK}/parts`;
const parts = await (await fetch(`${PARTS_DIR}/parts.json`)).json();
const partImages = Object.fromEntries(await Promise.all(Object.keys(parts).map(async (n) => [n, await load(`${PARTS_DIR}/${n}.png`)])));
const OAK_SIZE = 448; // px tall in the game: about 7 tiles
const puppetScale = OAK_SIZE / oakHeight(parts, OAK_RIG);
const rig = { ...OAK_RIG, shade: { ...OAK_RIG.shade } };
// Its sliders: [key, label, min, max, step].
const SLIDERS = [['arms', 'Arm length', 0.8, 1.7, 0.05], ['legs', 'Leg length', 0.8, 1.4, 0.05], ['crown', 'Crown size', 0.8, 1.8, 0.05], ['head', 'Head size', 0.7, 1.2, 0.02], ['speed', 'Speed', 0.25, 1.5, 0.05]];
rig.speed = 1;
const sliderBar = document.getElementById('sliders');
for (const [key, label, min, max, step] of SLIDERS) {
  sliderBar.insertAdjacentHTML('beforeend', `<label>${label} <input data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${rig[key]}"> <span data-show="${key}">${rig[key]}</span></label>`);
}
sliderBar.addEventListener('input', (e) => { const k = e.target.dataset.key; if (!k) return; rig[k] = Number(e.target.value); sliderBar.querySelector(`[data-show="${k}"]`).textContent = rig[k]; });
let puppet = 'asleep', puppetT = 0;
const moveBar = document.getElementById('moves');
for (const name of Object.keys(OAK_MOVES)) moveBar.insertAdjacentHTML('beforeend', `<button data-move="${name}">${name}</button>`);
moveBar.addEventListener('click', (e) => {
  if (!e.target.dataset.move) return;
  puppet = e.target.dataset.move; puppetT = 0; smooth = false; current = null;
  for (const b of document.querySelectorAll('#moves button, #anims button')) b.classList.toggle('on', b === e.target);
});
// Draws the puppet: each part turned about its pivot, from its place, shaded or flashing.
const drawPuppet = (x, ground) => {
  const move = OAK_MOVES[puppet];
  const pose = move.pose(puppetT % move.loop);
  for (const p of oakPose(parts, pose, rig)) {
    ctx.save();
    ctx.translate(x + p.x * puppetScale, ground + p.y * puppetScale);
    ctx.rotate(p.rotation);
    ctx.scale(puppetScale * p.scaleX, puppetScale * p.scaleY);
    const bright = p.shade * (1 + p.flash * 1.2);
    if (bright !== 1) ctx.filter = `brightness(${bright})`;
    ctx.drawImage(partImages[p.part], -p.pivot.x, -p.pivot.y);
    ctx.restore();
  }
};
// The cat's feet: the lowest solid row of his first frame.
const catFeet = (() => {
  const c = document.createElement('canvas'); c.width = cat[0].width; c.height = cat[0].height;
  const g = c.getContext('2d'); g.drawImage(cat[0], 0, 0);
  const { data } = g.getImageData(0, 0, c.width, c.height);
  for (let y = c.height - 1; y >= 0; y--) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 128) return y + 1;
  return c.height;
})();

// What plays: one animation looping, or a sequence played through, its last one looping.
let queue = [], current = Object.keys(frames)[0], frame = 0, paused = false, ms = 0, catMs = 0, catFrame = 0;
const fpsInput = document.getElementById('fps');
let smooth = false;
const play = (names) => {
  const asked = names.join();
  smooth = names[0] === 'smooth';
  if (smooth) names = ['asleep'];
  queue = [...names]; current = queue.shift(); frame = 0; ms = 0;
  fpsInput.value = SPEEDS[current] ?? 8;
  for (const b of document.querySelectorAll('#anims button')) b.classList.toggle('on', b.dataset.play === asked);
};
const bar = document.getElementById('anims');
for (const name of Object.keys(frames)) bar.insertAdjacentHTML('beforeend', `<button data-play="${name}">${name}</button>`);
for (const [label, names] of Object.entries(SEQUENCES)) if (names.every((n) => frames[n])) bar.insertAdjacentHTML('beforeend', `<button data-play="${names.join()}">${label}</button>`);
if (frames.asleep) bar.insertAdjacentHTML('beforeend', '<button data-play="smooth">asleep, smooth: one drawing moved by the game</button>');
bar.addEventListener('click', (e) => { if (e.target.dataset.play) { puppet = null; play(e.target.dataset.play.split(',')); for (const b of document.querySelectorAll('#moves button')) b.classList.remove('on'); } });
document.getElementById('pause').onclick = (e) => { paused = !paused; e.target.textContent = paused ? 'Play' : 'Pause'; };
document.getElementById('step').onclick = () => { paused = true; document.getElementById('pause').textContent = 'Play'; advance(); };
const advance = () => {
  frame += 1;
  if (frame < frames[current].length) return;
  if (queue.length) { current = queue.shift(); fpsInput.value = SPEEDS[current] ?? fpsInput.value; }
  frame = 0;
};
play([current]);
for (const b of document.querySelectorAll('#anims button')) b.classList.remove('on');
moveBar.querySelector('[data-move="asleep"]').classList.add('on');

let last = performance.now();
function draw(now) {
  const dt = Math.min(100, now - last); last = now;
  const fps = Number(fpsInput.value);
  document.getElementById('fpsText').textContent = `${fps} frames a second`;
  if (!paused && puppet) puppetT += (dt / 1000) * rig.speed;
  if (!paused && !smooth && !puppet) { ms += dt; while (ms >= 1000 / fps) { ms -= 1000 / fps; advance(); } }
  catMs += dt; if (catMs >= 1000 / CAT.fps) { catMs = 0; catFrame = (catFrame + 1) % cat.length; }
  document.getElementById('frameText').textContent = puppet ? `puppet: ${puppet}` : smooth ? 'one drawing, moved by the game every screen frame' : `${current}: frame ${frame + 1} of ${frames[current].length}`;
  // The sky and the far trees, filling the view; the ground's grassy top and its earth.
  ctx.drawImage(sky, 0, 0, 1280, 720);
  ctx.drawImage(middle, 0, 720 - middle.height * (1280 / middle.width), 1280, middle.height * (1280 / middle.width));
  for (let x = 0; x < 1280; x += TILE) {
    ctx.drawImage(groundTop, x, GROUND_Y, TILE, TILE);
    for (let y = GROUND_Y + TILE; y < 720; y += TILE) ctx.drawImage(soil, x, y, TILE, TILE);
  }
  // The oak, its feet on the ground; the cat beside it.
  if (puppet) {
    drawPuppet(820, GROUND_Y);
    const c = cat[catFrame], cw = c.width * CAT.scale, chh = c.height * CAT.scale;
    ctx.drawImage(c, 380 - cw / 2, GROUND_Y - catFeet * CAT.scale, cw, chh);
    requestAnimationFrame(draw);
    return;
  }
  const img = frames[current][smooth ? 0 : frame];
  const ox = 820 - manifest.frameW / 2, oy = GROUND_Y - manifest.footY;
  if (smooth) {
    // Breathing and swaying, from its feet.
    const breath = Math.sin((now / SMOOTH.breathMs) * Math.PI * 2), sway = Math.sin((now / SMOOTH.swayMs) * Math.PI * 2);
    ctx.save();
    ctx.translate(820, GROUND_Y);
    ctx.rotate((sway * SMOOTH.sway * Math.PI) / 180);
    ctx.scale(1 - breath * SMOOTH.stretch * 0.5, 1 + breath * SMOOTH.stretch);
    ctx.drawImage(img, -manifest.frameW / 2, -manifest.footY);
    ctx.restore();
  } else ctx.drawImage(img, ox, oy);
  if (document.getElementById('box').checked) { ctx.strokeStyle = '#6cf'; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, manifest.frameW, manifest.frameH); }
  const c = cat[catFrame], cw = c.width * CAT.scale, chh = c.height * CAT.scale;
  ctx.drawImage(c, 380 - cw / 2, GROUND_Y - catFeet * CAT.scale, cw, chh);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
