import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { describe, expect, it } from 'vitest';

// The three pages: what each starts, and everything that pulls in, by following the imports.
const PAGES = { 'index.html': 'src/pages/choice.js', 'runner.html': 'src/pages/runner.js', 'adventure.html': 'src/pages/adventure.js' };

function imports(entry) {
  const seen = new Set();
  const packages = new Set();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const [, staticFrom, lazyFrom] of src.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const from = staticFrom ?? lazyFrom;
      if (from.startsWith('.')) stack.push(normalize(join(dirname(file), from)));
      else packages.add(from);
    }
  }
  return { files: seen, packages };
}

describe('the three pages', () => {
  it.each(Object.entries(PAGES))('%s starts its own code', (page, entry) => {
    expect(readFileSync(page, 'utf8')).toContain(`<script type="module" src="/${entry}"></script>`);
    expect(readFileSync('vite.config.js', 'utf8')).toContain(`'${page}'`);
  });

  it('the first page loads no game engine, so it opens at once', () => {
    const { packages, files } = imports(PAGES['index.html']);
    expect([...packages]).not.toContain('phaser');
    expect([...files].some((f) => f.includes('/scenes/'))).toBe(false);
  });

  it('the adventure\'s page loads none of the runner\'s scenes', () => {
    const { files } = imports(PAGES['adventure.html']);
    for (const runnerFile of ['src/scenes/GameScene.js', 'src/scenes/BootScene.js']) expect(files.has(runnerFile), runnerFile).toBe(false);
  });

  it('the runner\'s page loads none of the adventure\'s scenes', () => {
    const { files } = imports(PAGES['runner.html']);
    for (const file of files) expect(/scenes\/Adventure|scenes\/adventure/.test(file), file).toBe(false);
  });
});
