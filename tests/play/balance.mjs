// Estimates difficulty: simulated players at three skill levels each attempt every level many
// times, in one go with no checkpoints or Super Paw. These are stand-ins for people, so use the
// numbers to compare levels with each other, not as a promise of how hard a person will find them.
//   npm run test:balance
//   npm run test:balance -- 30     attempts per level (default 20)
import { startHarness } from './harness.mjs';
import { LEVELS } from '../../src/data/levels/index.js';

const ATTEMPTS = Number(process.argv[2] ?? 20);
const SKILLS = {
  beginner: { timingSd: 0.16, missRate: 0.08 },
  average: { timingSd: 0.1, missRate: 0.03 },
  expert: { timingSd: 0.05, missRate: 0.005 },
};

const { runAll, close, pages } = await startHarness();
const jobs = [];
const keys = [];
LEVELS.forEach((level, levelIndex) => {
  for (const [skillName, skill] of Object.entries(SKILLS)) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      jobs.push({ levelIndex, autopilot: true, skill: { ...skill, seed: levelIndex * 1000 + attempt * 7 + skillName.length * 131 } });
      keys.push({ level, skillName });
    }
  }
});

try {
  const results = await runAll(jobs, 5);
  const table = {};
  results.forEach((result, i) => {
    const { level, skillName } = keys[i];
    const row = (table[level.id] ??= {
      seconds: Math.round(level.length / level.cat.speed),
    });
    const stats = (row[`_${skillName}`] ??= { wins: 0, hits: 0, progress: 0, coins: 0, runs: 0 });
    stats.runs += 1;
    if (result.state === 'complete') stats.wins += 1;
    stats.hits += result.hits.filter(Boolean).length;
    stats.progress += Math.min(1, result.x / level.length);
    stats.coins += result.treats / Math.max(1, result.treatTotal);
  });
  for (const row of Object.values(table)) {
    for (const skillName of Object.keys(SKILLS)) {
      const stats = row[`_${skillName}`];
      row[`${skillName} escapes`] = `${Math.round((100 * stats.wins) / stats.runs)}%`;
      row[`${skillName} hits`] = Number((stats.hits / stats.runs).toFixed(1));
      row[`${skillName} coins`] = `${Math.round((100 * stats.coins) / stats.runs)}%`;
      delete row[`_${skillName}`];
    }
  }
  console.table(table);
  for (const page of pages) for (const message of page.pageErrors) console.log(`PAGE ERROR  ${message}`);
} finally {
  await close();
}
