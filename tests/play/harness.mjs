// Starts the game in a browser, fast-forwarded and without drawing, and runs specs on it.
import puppeteer from 'puppeteer-core';
import { availableParallelism } from 'node:os';
import { createServer } from 'vite';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WORKERS = Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2)));
const BATCH = 25;
const STARTUP_MS = 120000;

export async function startHarness() {
  const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
  await server.listen();
  const url = `${server.resolvedUrls.local[0]}?simulate`;
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
    protocolTimeout: 1200000,
  });

  const openWorker = async () => {
    const page = await browser.newPage();
    page.pageErrors = [];
    page.on('pageerror', (error) => page.pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') page.pageErrors.push(message.text());
    });
    await page.goto(url, { waitUntil: 'load', timeout: STARTUP_MS });
    try {
      await page.waitForFunction(() => window.__simulator, { timeout: STARTUP_MS, polling: 100 });
    } catch {
      throw new Error(`The game did not start. Page errors: ${page.pageErrors.join(' | ') || 'none'}`);
    }
    return page;
  };
  const pages = await Promise.all(Array.from({ length: WORKERS }, openWorker));

  // Hands out batches to whichever page is free, so slow specs don't hold others up.
  const runAll = async (jobs, batchSize = BATCH) => {
    const results = new Array(jobs.length);
    let nextJob = 0;
    await Promise.all(pages.map(async (page) => {
      while (nextJob < jobs.length) {
        const from = nextJob;
        nextJob += batchSize;
        const specs = jobs.slice(from, from + batchSize);
        const batch = await page.evaluate((list) => list.map((spec) => window.__simulator.run(spec)), specs);
        batch.forEach((result, i) => { results[from + i] = result; });
      }
    }));
    return results;
  };

  const close = async () => {
    await browser.close();
    await server.close();
  };
  return { pages, runAll, close, workers: WORKERS };
}
