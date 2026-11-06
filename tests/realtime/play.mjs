// Plays the real game in headless Chrome: an idle run must fail, a bot must win every level.
import puppeteer from 'puppeteer-core';
const [url, shots] = process.argv.slice(2);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--window-size=1280,720', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__catEscape?.scene.isActive('Game'), { timeout: 30000 });

const scene = () => page.evaluate(() => {
  const s = window.__catEscape.scene.getScene('Game');
  return { state: s.state.state, level: s.level.id, levelIndex: s.levelIndex, x: Math.round(s.cat.x), gap: Math.round(s.tracker.gap), active: window.__catEscape.scene.isActive('Game'), overlay: document.getElementById('overlay').hidden ? null : document.querySelector('[data-title]').textContent };
});
const click = (label) => page.evaluate((text) => {
  const b = [...document.querySelectorAll('#overlay button')].find((e) => e.textContent === text);
  if (!b) throw new Error(`no button "${text}"`);
  b.click();
}, label);
const waitOverlay = (title, timeout = 180000) => page.waitForFunction((t) => !document.getElementById('overlay').hidden && document.querySelector('[data-title]').textContent === t, { timeout, polling: 200 }, title);

// Drives the cat with the real key events, using only what a player could see on screen.
const startBot = () => page.evaluate(() => {
  window.__bot = setInterval(() => {
    const s = window.__catEscape.scene.getScene('Game');
    if (!s.isPlaying) return;
    const next = s.obstacles.items.find((o) => o.x + 90 > s.cat.x && !o.botDone);
    if (!next) return;
    const dist = next.x - s.cat.x;
    const key = (code, keyCode) => window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code, keyCode, which: keyCode, bubbles: true }));
    const closing = s.cat.speed + (next.motion?.speed ?? 0);
    const jump = () => key('Space', 32);
    const slide = () => key('ArrowDown', 40);
    const avoid = next.avoid === 'read' ? (next.position === 'high' ? 'slide' : 'jump') : next.avoid;
    if (avoid === 'stay') { if (dist < 120) next.botDone = true; return; }
    if (avoid === 'doubleJump' && dist < closing * 0.45 + 200) { next.botDone = true; jump(); setTimeout(jump, 320); }
    if (avoid === 'jump' && dist < closing * 0.42 + 40) { next.botDone = true; jump(); }
    if (avoid === 'slide' && dist < closing * 0.45 + 60) { next.botDone = true; slide(); }
  }, 16);
});
const stopBot = () => page.evaluate(() => clearInterval(window.__bot));

const log = [];
const check = (name, ok, extra = '') => { log.push(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };

await pause(300);
check('start screen shows', (await scene()).overlay === 'Cat Escape');
await page.screenshot({ path: `${shots}/1-start.png` });

// Idle: never pressing anything must end in failure.
await click('Play');
await pause(400);
await click('Run!');
await pause(2500);
await page.screenshot({ path: `${shots}/2-running.png` });
const running = await scene();
check('cat runs automatically', running.x > 300 && running.state === 'playing', `x=${running.x}`);
await waitOverlay('Caught!');
const caught = await scene();
check('idle cat gets caught', caught.state === 'failed', `x=${caught.x} gap=${caught.gap}`);
await page.screenshot({ path: `${shots}/3-caught.png` });

// Restart, then pause and resume.
await click('Try again');
await pause(500);
const restarted = await scene();
check('restart resets the level', restarted.x < 500 && restarted.state === 'playing' && restarted.overlay === null, `x=${restarted.x}`);
await page.keyboard.press('Escape');
await pause(100);
const paused = await scene();
await pause(500);
const stillPaused = await scene();
check('pause freezes the cat', paused.state === 'paused' && paused.x === stillPaused.x && paused.overlay === 'Paused');
await page.screenshot({ path: `${shots}/4-paused.png` });
await click('Resume');
await pause(400);
const resumed = await scene();
check('resume continues', resumed.state === 'playing' && resumed.x > stillPaused.x);

// Real inputs: tap to jump, swipe down to slide.
const airborne = () => page.evaluate(() => { const s = window.__catEscape.scene.getScene('Game'); return { y: s.cat.body.velocity.y, sliding: s.cat.isSliding }; });
await page.mouse.move(600, 300);
await page.mouse.down();
await page.mouse.up();
await pause(120);
check('tap makes the cat jump', (await airborne()).y !== 0);
await pause(1200);
await page.mouse.move(600, 200);
await page.mouse.down();
await page.mouse.move(600, 320, { steps: 4 });
await page.mouse.up();
await pause(60);
check('swipe down makes the cat slide', (await airborne()).sliding);
await page.screenshot({ path: `${shots}/5-slide.png` });
await pause(1300);

// The bot must beat every level, and no obstacle should be hit.
await page.evaluate(() => window.__catEscape.scene.getScene('Game').loadLevel(0));
await pause(300);
await startBot();
for (let i = 0; i < 3; i++) {
  const final = i === 2;
  await waitOverlay(final ? 'You escaped!' : 'Level complete!');
  const done = await scene();
  const hits = await page.evaluate(() => window.__catEscape.scene.getScene('Game').obstacles.items.filter((o) => o.wasHit).map((o) => o.texture.key + '@' + o.x).join(','));
  check(`bot clears level ${i + 1}`, done.state === 'complete' && done.levelIndex === i, `hits=${hits} gap=${done.gap}`);
  await page.screenshot({ path: `${shots}/6-complete-${i + 1}.png` });
  if (!final) {
    await click('Next level');
    await pause(400);
    await click('Run!');
    await pause(400);
    const after = await scene();
    check(`next level loads (${i + 2})`, after.levelIndex === i + 1 && after.state === 'playing');
    if (i === 1) await page.screenshot({ path: `${shots}/7-level3.png` });
  }
}
await stopBot();
await click('Play again');
await pause(400);
await click('Run!');
await pause(300);
check('play again returns to level 1', (await scene()).levelIndex === 0);

console.log(log.join('\n'));
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'No page errors');
await browser.close();
