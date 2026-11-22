// Real-time checks, for what fast-forwarding can't cover: drawing, touch input, audio and
// real frame timing. They take several minutes and depend on machine speed, so use them
// before a release, on an otherwise idle computer.
//   npm run test:realtime
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));
const shots = mkdtempSync(join(tmpdir(), 'cat-escape-'));
const server = await createServer({ server: { port: 0 }, logLevel: 'error' });
await server.listen();
const url = `${server.resolvedUrls.local[0]}runner.html`; // the runner's own page

let failed = false;
for (const script of ['play.mjs', 'touch.mjs', 'audio.mjs']) {
  console.log(`\n=== ${script}`);
  const { status, stdout, stderr } = spawnSync('node', [join(HERE, script), url, shots], { encoding: 'utf8' });
  process.stdout.write(stdout);
  if (status !== 0) process.stderr.write(stderr);
  if (status !== 0 || stdout.includes('FAIL') || stdout.includes('ERRORS')) failed = true;
}
await server.close();
console.log(`\nScreenshots: ${shots}`);
process.exit(failed ? 1 : 0);
