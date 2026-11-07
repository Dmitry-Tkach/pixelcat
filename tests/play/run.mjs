// Fast in-game tests: runs the real game in a browser, fast-forwarded and without drawing.
//   npm run test:play             everything
//   npm run test:play -- bird     only scenarios whose name contains "bird"
//   npm run test:play -- --no-windows   skip the press-timing measurements
import { startHarness } from './harness.mjs';
import { MIN_PRESS_WINDOW_SECONDS, buildScenarios, buildWindowSweeps } from './scenarios.js';

const args = process.argv.slice(2);
const filters = args.filter((a) => !a.startsWith('--'));
const skipWindows = args.includes('--no-windows') || filters.length > 0;
const matches = (name) => filters.length === 0 || filters.some((f) => name.includes(f));

const started = Date.now();
const { pages, runAll, close, workers } = await startHarness();

// Only the part of a scenario that the browser needs: functions stay here.
const SPEC_KEYS = ['boss', 'stompWhenOpen', 'dodgeGunner', 'length', 'idle', 'fullSpeed', 'lunges', 'shortcut', 'highGround', 'pack', 'finalDash', 'mouse', 'skill', 'levelIndex', 'frameMs', 'obstacles', 'attacks', 'pickups', 'platforms', 'wagons', 'treats', 'checkpoints', 'startCheckpoint', 'chasers', 'chase', 'actions', 'until', 'autopilot', 'settleSeconds'];
const toSpec = (scenario) => Object.fromEntries(SPEC_KEYS.map((key) => [key, scenario[key]]));

let failed = 0;
let simulatedSeconds = 0;

try {
  const scenarios = buildScenarios().filter((s) => matches(s.name));
  const results = await runAll(scenarios.map(toSpec));
  results.forEach((result, i) => {
    simulatedSeconds += result.seconds;
    const scenario = scenarios[i];
    if (scenario.expect(result)) return;
    failed += 1;
    const detail = scenario.detail
      ? scenario.detail(result)
      : `hits=${result.hits} peak=${Math.round(result.peak)} onTop=${result.onTop} x=${Math.round(result.x)} state=${result.state} hasPaw=${result.hasPaw} koMs=${Math.round(result.koMs)} phases=${result.phases} sounds=${result.sounds.join(',')}`;
    console.log(`FAIL  ${scenario.name}  (${detail})`);
  });
  console.log(`${scenarios.length - failed}/${scenarios.length} scenarios passed`);

  if (!skipWindows) {
    const sweeps = buildWindowSweeps();
    const jobs = sweeps.flatMap((sweep) => sweep.runs.map((run) => run.spec));
    const sweepResults = await runAll(jobs);
    sweepResults.forEach((result) => { simulatedSeconds += result.seconds; });

    // The longest unbroken run of timings that avoid the obstacle.
    const table = {};
    let offset = 0;
    for (const sweep of sweeps) {
      let best = 0;
      let current = 0;
      for (let i = 0; i < sweep.runs.length; i++) {
        const clear = !sweepResults[offset + i].hits[0];
        current = clear ? current + 1 : 0;
        best = Math.max(best, current);
      }
      offset += sweep.runs.length;
      const step = sweep.runs[1].lead - sweep.runs[0].lead;
      const seconds = best * step;
      (table[sweep.typeName] ??= { move: sweep.press })[`level ${sweep.levelIndex + 1}`] = Number(seconds.toFixed(2));
      if (seconds < MIN_PRESS_WINDOW_SECONDS) {
        failed += 1;
        console.log(`FAIL  ${sweep.typeName}: only ${seconds.toFixed(2)}s to press ${sweep.press}, level ${sweep.levelIndex + 1} speed`);
      }
    }
    console.log('\nTime available to press the right move, in seconds:');
    console.table(table);
  }

  // The menus, driven by pressing their real buttons.
  const menuProblems = await pages[0].evaluate(() => {
    const sim = window.__simulator;
    const problems = [];
    const check = (name, ok, detail = '') => { if (!ok) problems.push(`${name} ${detail}`); };
    const settle = () => { for (let i = 0; i < 15; i++) sim.step(1000 / 60); };
    const title = () => document.querySelector('[data-title]').textContent;
    const press = (label) => {
      const button = [...document.querySelectorAll('#overlay button')].find((b) => b.textContent.includes(label));
      if (!button) throw new Error(`No button "${label}" on "${title()}"`);
      button.click();
      settle();
    };
    localStorage.removeItem('cat-escape-progress');
    const progress = sim.game.registry.get('progress');
    progress.results = {};

    sim.scene.openScreen(0, 'menu');
    settle();
    check('the menu opens', title() === 'Cat Escape', title());
    press('Levels');
    let tiles = [...document.querySelectorAll('.tile')];
    check('every level has a tile', tiles.length === 8, String(tiles.length));
    check('only level 1 starts open', tiles.filter((t) => t.disabled).length === 7);
    press('Vet Day');
    check('a level opens on its story', title() === 'Vet Day', title());
    check('it waits for the player', sim.scene.state.state === 'ready', sim.scene.state.state);
    press('Run!');
    check('Run! starts the level', sim.scene.isPlaying, sim.scene.state.state);

    // Finish it, and move on through the screens.
    sim.scene.handleEscape();
    for (let i = 0; i < 90; i++) sim.step(1000 / 60);
    check('finishing shows the result', title() === 'Level complete!', title());
    check('finishing saves progress', Boolean(progress.resultFor('city-1')));
    const image = document.querySelector('[data-image]');
    check('finishing shows the success animation', !image.hidden && image.src.endsWith('escape-success.gif'), image.src);
    press('Next level');
    check('the next level opens on its story', title() === 'Main Street', title());
    check('the animation leaves with the result screen', image.hidden);
    check('the next level is the right one', sim.scene.level.id === 'city-2', sim.scene.level.id);
    press('Levels');
    tiles = [...document.querySelectorAll('.tile')];
    check('finishing unlocks the next level', tiles.filter((t) => t.disabled).length === 6);
    press('Back');
    check('Back returns to the menu', title() === 'Cat Escape', title());
    check('Continue replaces Play', [...document.querySelectorAll('#overlay button')].some((b) => b.textContent === 'Continue'));
    press('Continue');
    check('Continue goes to the first unfinished level', sim.scene.level.id === 'city-2', sim.scene.level.id);

    // Pause, then leave for the level list.
    press('Run!');
    sim.scene.togglePause();
    settle();
    check('pausing shows the menu', title() === 'Paused', title());
    press('Levels');
    check('pause can open the level list', title() === 'Choose a level', title());

    // The last level ends the story.
    sim.scene.openScreen(7, 'intro');
    settle();
    check('the final level has its story', title() === "The Vet's Door", title());
    check('the final level shows the family', sim.scene.followers.length === 2, String(sim.scene.followers.length));
    press('Run!');
    sim.scene.handleEscape();
    for (let i = 0; i < 90; i++) sim.step(1000 / 60);
    check('the final level ends the game', title() === 'You escaped!', title());
    press('Play again');
    check('Play again returns to level 1', sim.scene.level.id === 'city-1', sim.scene.level.id);
    progress.results = {};
    localStorage.removeItem('cat-escape-progress');
    return problems;
  });
  for (const problem of menuProblems) {
    failed += 1;
    console.log(`FAIL  menus: ${problem}`);
  }

  for (const page of pages) {
    for (const message of page.pageErrors) {
      failed += 1;
      console.log(`PAGE ERROR  ${message}`);
    }
  }
} finally {
  await close();
}

const elapsed = (Date.now() - started) / 1000;
console.log(`\nSimulated ${Math.round(simulatedSeconds / 60)} minutes of play in ${elapsed.toFixed(1)}s, using ${workers} browser pages`);
if (failed > 0) {
  console.log(`${failed} problem(s) found`);
  process.exitCode = 1;
} else {
  console.log('All good');
}
