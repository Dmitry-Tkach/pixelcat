// Phone emulation with real touch events: tap, swipe (fast and slow), and the rotate message.
import puppeteer from 'puppeteer-core';
const [url, shots] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__catEscape?.scene.isActive('Game'), { timeout: 30000 });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const cat = () => page.evaluate(() => {
  const s = window.__catEscape.scene.getScene('Game');
  return { vy: s.cat.body.velocity.y, sliding: s.cat.isSliding, state: s.state.state, ground: s.cat.onGround };
});
const log = (name, ok, extra = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
const untilGround = async () => { for (let i = 0; i < 40 && !(await cat()).ground; i++) await pause(50); };

await page.screenshot({ path: `${shots}/phone-start.png` });
await page.tap('#overlay button.primary');
await pause(500);
await page.tap('#overlay button.primary');
await pause(300);
log('touching Play starts without a stray jump', (await cat()).vy === 0 && (await cat()).state === 'playing');

await page.touchscreen.tap(420, 200);
await pause(120);
log('tap jumps', (await cat()).vy !== 0);
await pause(400);
await page.screenshot({ path: `${shots}/phone-jump.png` });
await untilGround();

await page.touchscreen.touchStart(420, 120);
await page.touchscreen.touchMove(420, 170);
const before = await cat();
await page.touchscreen.touchEnd();
let slid = false; let waited = 0;
for (; waited < 500 && !slid; waited += 25) { slid = (await cat()).sliding; if (!slid) await pause(25); }
log('fast swipe down slides', slid, `seen after ${waited}ms; at swipe end: ground=${before.ground} vy=${Math.round(before.vy)} state=${before.state}`);
for (let i = 0; i < 40 && (await cat()).sliding; i++) await pause(50);

// A slow swipe: the finger takes 400ms, longer than the tap-hold threshold.
await page.touchscreen.touchStart(420, 120);
for (let y = 127; y <= 150; y += 4) {
  await page.touchscreen.touchMove(420, y);
  await pause(55);
}
const during = await cat();
await page.touchscreen.touchEnd();
await pause(60);
log('slow swipe slides and never jumps', during.vy === 0 && (await cat()).sliding, `vy=${during.vy}`);

const paused = await page.evaluate(() => {
  const b = window.__catEscape.scene.getScene('Game').hud.pauseButton;
  return { x: b.x, y: b.y };
});
const scale = 390 / 720;
const offsetX = (844 - 1280 * scale) / 2;
await untilGround();
await page.touchscreen.tap(offsetX + paused.x * scale, paused.y * scale);
await pause(150);
const after = await cat();
log('pause button pauses without a jump', after.state === 'paused' && after.vy === 0, `state=${after.state}`);

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await pause(300);
const rotateShown = await page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
log('portrait shows the rotate message', rotateShown);
await page.screenshot({ path: `${shots}/phone-portrait.png` });
console.log(errors.length ? `ERRORS: ${errors.join(' | ')}` : 'No page errors');
await browser.close();
