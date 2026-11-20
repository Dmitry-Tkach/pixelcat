// Screenshots of an adventure level in the real game, in a headless Chrome, to compare it with its
// design. Starts the game's dev server, opens /adventure.html?at=<place> for each place asked for
// (the level's `places`), waits for it to settle, and saves <out>/<place>.png at 1280 x 720.
// A place can be followed by a key to hold first, and for how long (ms): cliffTop+right2000 starts
// at cliffTop and walks right for 2 s before the screenshot (saved as cliffTop+right2000.png).
// Run only with the owner's go-ahead (it runs Chrome): node tools/adventure-screens.mjs <out> village mill ...
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SETTLE_MS = 3500; // after the level starts: the cat lands and the camera settles
const START_MS = 120000;
const [out, ...places] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const KEYS = { right: 'ArrowRight', left: 'ArrowLeft', up: 'ArrowUp', down: 'ArrowDown' };
  for (const place of places) {
    const [at, move] = place.split('+');
    await page.goto(`${base}adventure.html?unlockAll&at=${at}`, { waitUntil: 'load', timeout: START_MS });
    await page.waitForSelector('canvas', { timeout: START_MS });
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const [, key, ms] = move?.match(/^([a-z]+)(\d+)$/) ?? [];
    if (key) {
      await page.keyboard.down(KEYS[key]);
      await new Promise((resolve) => setTimeout(resolve, Number(ms)));
      await page.keyboard.up(KEYS[key]);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    await page.screenshot({ path: join(out, `${place}.png`) });
    console.log(`${place}: saved${errors.length ? ` (page errors: ${errors.join(' | ')})` : ''}`);
    errors.length = 0;
  }
} finally {
  await browser.close();
  await server.close();
}
