import { describe, expect, it, vi } from 'vitest';
import PhaserMath from '../node_modules/phaser/src/math/index.js';
import BlendModes from '../node_modules/phaser/src/renderer/BlendModes.js';

// The Rootbreaker in a pretend fight, without a browser: a stand-in scene that runs his tweens and
// timers, and Phaser's own maths (so a name Phaser doesn't have fails here, as it would in the game).
// It plays a whole fight, all three phases, breaking his arms, and checks he never goes wrong.

// Phaser itself, but only its maths and blend modes: anything else the boss asked for would fail.
vi.mock('phaser', () => ({
  default: new Proxy({ Math: PhaserMath, BlendModes }, {
    get(target, key) {
      if (!(key in target)) throw new Error(`the boss asked Phaser for ${String(key)}`);
      return target[key];
    },
  }),
}));

// A stand-in game object: every method returns it; its position, size and texture are kept.
function thing(extra = {}) {
  const o = { x: 0, y: 0, displayWidth: 490, displayHeight: 373, alpha: 1, texture: { key: 'k' }, ...extra };
  const self = new Proxy(o, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'body') return (t.body = thing({ top: 0, bottom: 0, left: 0, right: 0, center: { x: 0, y: 0 }, prev: { y: 0 }, velocity: { y: 0 } }));
      if (k === 'setPosition') return (x, y) => { t.x = x; t.y = y; return self; };
      if (k === 'setScale') return (x, y = x) => { t.displayHeight = 373 * y; return self; };
      return () => self;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return self;
}

// A stand-in scene: its tweens move numbers along (and call onComplete), its timers fire, and
// pausing stops the tweens, as Phaser's do.
function standInScene() {
  let now = 0;
  const tweens = [], timers = [];
  const scene = {
    textures: { get: () => ({ getSourceImage: () => ({ width: 134, height: 138 }) }) },
    add: new Proxy({}, { get: () => (x = 0, y = 0) => thing({ x: typeof x === 'number' ? x : 0, y: typeof y === 'number' ? y : 0 }) }),
    physics: {
      add: { group: () => ({ add: (z) => z.body, contains: () => true }), image: () => thing(), existing: () => {}, collider: () => {}, overlap: () => {} },
      world: { isPaused: false, pause() { this.isPaused = true; }, resume() { this.isPaused = false; } },
    },
    tweens: {
      add(cfg) {
        const targets = [].concat(cfg.targets), from = {};
        for (const k of Object.keys(cfg)) if (typeof cfg[k] === 'number' && !['duration', 'delay', 'repeat'].includes(k)) from[k] = targets.map((t) => t[k]);
        tweens.push({ cfg, targets, from, start: now + (cfg.delay ?? 0) });
      },
      killTweensOf: (o) => { for (const t of tweens) if (t.targets.includes(o)) t.done = true; },
      pauseAll() { scene.paused = true; },
      resumeAll() { scene.paused = false; },
    },
    time: { delayedCall: (ms, fn) => timers.push({ at: now + ms, fn }), get now() { return now; } },
    cameras: { main: { shake() {}, worldView: { top: 34 * 64 - 700 } } }, // held on the arena, as the real one is
    audio: { playSfx() {} },
    effects: { dust() {}, impact() {} },
    moves: { bullets: { contains: () => true }, bulletStops() {}, isDashing: false },
    step(ms) {
      now += ms;
      for (const t of tweens) {
        if (t.done || scene.paused || now < t.start) continue;
        const k = Math.min(1, (now - t.start) / Math.max(1, t.cfg.duration ?? 1));
        for (const [key, starts] of Object.entries(t.from)) t.targets.forEach((o, i) => { o[key] = starts[i] + (t.cfg[key] - starts[i]) * k; });
        if (k >= 1) { t.done = true; t.cfg.onComplete?.(); }
      }
      for (const timer of timers.filter((x) => x.at <= now)) { timers.splice(timers.indexOf(timer), 1); timer.fn(); }
    },
  };
  return scene;
}

describe('the Rootbreaker, in a pretend fight', () => {
  it('fights through all three phases: every attack, his arms broken and grown back', async () => {
    const { AdventureRootbreaker } = await import('../src/entities/AdventureRootbreaker.js');
    const scene = standInScene();
    const cat = thing({ x: 0, onGround: true, body: thing({ left: 0, right: 0, top: 0, bottom: 0, center: { x: 0, y: 0 } }) });
    const boss = new AdventureRootbreaker(scene, {
      col: 204, floor: 34, arena: { left: 195, right: 214 }, cat, onHurtCat() {}, onDefeated() {}, onShake() {},
    });
    boss.start();
    const attacks = new Set(), stones = new Set(), arms = new Set();
    const opened = new Set(); // the phases his core opened in
    let resting = 0, longestRest = 0, attacking = 0, longestAttack = 0, unstuck = 0;
    const unstick = boss.unstick?.bind(boss);
    boss.unstick = () => { unstuck++; unstick?.(); };
    for (let frame = 0; frame < 9000; frame++) {
      // Running back and forth on the floor; for a while in phases 1 and 3 up on the top branch,
      // over his head, where his mouth's blasts go up at him.
      const onTop = (frame > 400 && frame < 1400) || (frame > 7000 && frame < 8500);
      // On the branch he stands still, right over his mouth, by the minigun: a ball blasted straight up.
      cat.x = onTop ? boss.x : 204 * 64 + Math.sin(frame / 90) * 500;
      const feet = onTop ? 25 * 64 : 34 * 64;
      Object.assign(cat.body, { left: cat.x - 30, right: cat.x + 30, top: feet - 90, bottom: feet, center: { x: cat.x, y: feet - 45 } });
      if (frame === 1500) boss.hp = 38; // into phase 2
      if (frame === 6000) boss.hp = 15; // into phase 3
      // His right arm broken in phase 3 (in phase 2 his core must open by itself, from missed smashes).
      if (frame % 15 === 0 && frame > 6200 && frame < 6600) boss.strikeParts('explosive', boss.arms[1].box);
      // Shooting his open core, but never so much that he leaves his phase before the test moves him on.
      const keepAbove = frame < 1500 ? 41 : frame < 6000 ? 21 : Infinity;
      if (frame % 50 === 0 && boss.coreOpen && boss.hp > keepAbove) boss.takeHit('standard', 0, 0);
      scene.step(16.7);
      boss.update(16.7);
      attacks.add(boss.state);
      if (boss.coreOpen) opened.add(boss.phase.index);
      resting = boss.state === 'rest' ? resting + 16.7 : 0;
      longestRest = Math.max(longestRest, resting);
      attacking = boss.state !== 'rest' ? attacking + 16.7 : 0;
      longestAttack = Math.max(longestAttack, attacking);
      for (const arm of boss.arms) {
        stones.add(arm.stone.state);
        arms.add(arm.state);
        const at = [arm.goal.x, arm.goal.y, arm.angle, arm.stone.at.x, arm.stone.at.y];
        expect(at.every(Number.isFinite), `frame ${frame}`).toBe(true);
      }
    }
    expect([...attacks], `attacks: ${[...attacks]}, hp ${boss.hp}`).toEqual(expect.arrayContaining(['smash', 'blast', 'sweep', 'laser', 'rockfall', 'shoulder']));
    expect([...stones], `stones: ${[...stones]}, hp ${boss.hp}`).toEqual(expect.arrayContaining(['home', 'tell', 'fly', 'wait', 'back']));
    expect([...arms], `arms: ${[...arms]}, hp ${boss.hp}`).toEqual(expect.arrayContaining(['broken', 'rebuild', 'stuck']));
    // He never stops attacking for long, never needs his safety net, and his core opens in every phase.
    expect(longestRest).toBeLessThan(3000);
    expect(longestAttack).toBeLessThan(4500); // none waits on a stuck fist, or on a ball that never leaves
    expect(unstuck).toBe(0);
    expect([...opened].sort()).toEqual([0, 1, 2]);
  });

  it('keeps his core open while both his arms are broken, in phase 2, until one grows back', async () => {
    const { AdventureRootbreaker } = await import('../src/entities/AdventureRootbreaker.js');
    const scene = standInScene();
    const cat = thing({ x: 204 * 64 + 300, onGround: true, body: thing({ left: 0, right: 0, top: 0, bottom: 0, center: { x: 0, y: 0 } }) });
    const boss = new AdventureRootbreaker(scene, {
      col: 204, floor: 34, arena: { left: 195, right: 214 }, cat, onHurtCat() {}, onDefeated() {}, onShake() {},
    });
    boss.start();
    boss.hp = 38; // phase 2
    const step = (frames) => { for (let i = 0; i < frames; i++) { scene.step(16.7); boss.update(16.7); } };
    step(60);
    // Both arms shot to pieces.
    for (let i = 0; i < 40 && boss.arms.some((a) => boss.whole(a)); i++) {
      for (const arm of boss.arms) if (boss.whole(arm) && arm.box) boss.strikeParts('bolt', arm.box);
      step(5);
    }
    expect(boss.arms.every((a) => a.state === 'broken')).toBe(true);
    // Long after any one opening would have shut, his core is still open.
    step(Math.round(12000 / 16.7));
    expect(boss.arms.every((a) => a.state === 'broken')).toBe(true);
    expect(boss.coreOpen).toBe(true);
    // Once an arm is back, it's no longer held open: it shuts at some point (and opens again as
    // he misses smashes).
    let shut = false;
    for (let i = 0; i < Math.round(12000 / 16.7); i++) {
      step(1);
      if (boss.arms.some((a) => a.state !== 'broken') && !boss.coreOpen) shut = true;
    }
    expect(shut).toBe(true);
  });
});
