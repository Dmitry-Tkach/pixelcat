// Development-only test driver. It steps the real game as fast as the computer allows, without
// drawing anything, so results don't depend on machine speed. See tests/play/run.mjs.
import { LEVELS } from '../data/levels/index.js';

const DEFAULT_FRAME_MS = 1000 / 60;
const MAX_LOAD_FRAMES = 60;
const MAX_FRAMES = 60 * 180;
const AIR_THRESHOLD = 20;
const GROUND_Y = 665;
const DOUBLE_JUMP_DELAY_SECONDS = 0.19;
const LUNGE_JUMP_LEAD = 0.4;
const BOUNCE_THEN_AIR_JUMP_SECONDS = 1.19;

// Dodges the Ginger Gunner the way a player is told to: jump low shots, the beam, his dash and his
// slide; slide under high shots; run from his leap and his flames. Otherwise it stands still, so his
// attacks come to it. It has to dodge fairly, because the gunner's own code decides what hits.
const SHOT_JUMP_SECONDS = 0.16;
const SHOT_SLIDE_SECONDS = 0.3;
const BEAM_JUMP_SECONDS = 0.11;
const RUSH_JUMP_DISTANCE = 200;
const RUN_FROM_FLAMES = 330;
const ROOM = 320; // between attacks, it keeps this far from him, as a player would after a stomp
const RUSH_WINDUP_JUMP_SECONDS = 0.08;
const LEAP_ROOM = 260;
function dodgeGunner(scene) {
  const { cat, controls, bossFight: fight } = scene;
  const { boss, director } = fight;
  const { state, attack, attackData, stateMs } = director;
  const away = cat.x < boss.x ? -1 : 1;
  let run = 0;
  // When he crouches to leap, it picks a way to run and sticks to it: on away from him, or back
  // under him when a wall is too close.
  if (attack === 'leap' && (state === 'windup' || state === 'active')) {
    const leap = `${director.health}:${director.patternStep}`;
    if (fight.simulatedLeap?.leap !== leap) {
      const ahead = cat.x >= boss.x ? 1 : -1;
      const room = ahead > 0 ? fight.right - cat.x : cat.x - fight.left;
      fight.simulatedLeap = { leap, run: room > LEAP_ROOM ? ahead : -ahead };
    }
    run = fight.simulatedLeap.run;
  }
  if (attack === 'rage' && (state === 'windup' || state === 'active') && Math.abs(cat.x - boss.x) < RUN_FROM_FLAMES) run = away;
  if ((state === 'hurt' || state === 'idle' || (state === 'windup' && attack !== 'leap')) && Math.abs(cat.x - boss.x) < ROOM) run = away;
  controls.left = run < 0;
  controls.right = run > 0;
  if (!cat.onGround) return;
  for (const shot of boss.shots) {
    const ahead = cat.x - shot.sprite.x;
    if (Math.sign(ahead) !== shot.direction) continue;
    const seconds = Math.abs(ahead) / shot.speed;
    const high = shot.lane === 'high';
    if (!high && seconds < SHOT_JUMP_SECONDS) { cat.requestJump(); return; }
    if (high && seconds < SHOT_SLIDE_SECONDS && !cat.isSliding) { cat.requestSlide(); return; }
  }
  if (attack === 'beam' && state === 'windup' && attackData.windup * 1000 - stateMs < BEAM_JUMP_SECONDS * 1000) cat.requestJump();
  const rush = attack === 'dash' || attack === 'slideKick';
  // A dash from close by comes too fast to react to, so it jumps as the warning ends.
  if (rush && state === 'windup' && Math.abs(cat.x - boss.x) < RUSH_JUMP_DISTANCE && attackData.windup * 1000 - stateMs < RUSH_WINDUP_JUMP_SECONDS * 1000) cat.requestJump();
  const rushing = rush && state === 'active';
  if (rushing && Math.sign(cat.x - boss.x) === boss.moveDirection && Math.abs(cat.x - boss.x) < RUSH_JUMP_DISTANCE) cat.requestJump();
}

// A small seeded generator, so a simulated player's mistakes can be repeated exactly.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A simulated player's plan for one obstacle or lunge: how far off their timing is, and whether
// they miss it altogether. With no skill given, the player is perfect.
function mistakeFor(state, key) {
  if (!state.skill) return { timing: 0, misses: false };
  if (!state.mistakes.has(key)) {
    const { timingSd, missRate } = state.skill;
    const normal = Math.sqrt(-2 * Math.log(1 - state.rand())) * Math.cos(2 * Math.PI * state.rand());
    state.mistakes.set(key, { timing: normal * timingSd, misses: state.rand() < missRate });
  }
  return state.mistakes.get(key);
}

// Plays the correct move for each obstacle, using only what a player can see on screen.
function autopilot(scene, state) {
  const { cat, obstacles, chase } = scene;
  if (chase.secondsToStrike !== null && state.lungeJumped !== chase.warningStart) {
    const mistake = mistakeFor(state, `lunge-${chase.warningStart}`);
    if (chase.secondsToStrike <= LUNGE_JUMP_LEAD + mistake.timing) {
      state.lungeJumped = chase.warningStart;
      if (!mistake.misses) cat.requestJump();
    }
  }
  const next = obstacles.items.find((item) => item.x + 90 > cat.x && !state.handled.has(item));
  if (state.pendingAirJumpAt !== null && state.seconds >= state.pendingAirJumpAt) {
    state.pendingAirJumpAt = null;
    cat.requestJump();
  }
  if (!next || next.phase === 'waiting') return;

  const distance = next.x - cat.x;
  const closing = cat.speed + (next.motion?.speed ?? 0);
  // A clock-driven obstacle is read for what it will be doing when the cat gets there.
  const avoid = next.avoid === 'read' ? next.moveIn(distance / closing, obstacles.clockPoint.x) : next.avoid;
  const mistake = mistakeFor(state, next);
  const early = closing * mistake.timing;
  // The skilful way past a wall too tall to jump: land on the bounce before it, then double jump.
  const following = obstacles.items[obstacles.items.indexOf(next) + 1];
  if (next.bounce && following?.avoid === 'lift') {
    if (distance < closing * 0.75) {
      state.handled.add(next);
      state.handled.add(following);
      cat.requestJump();
      state.pendingAirJumpAt = state.seconds + BOUNCE_THEN_AIR_JUMP_SECONDS;
    }
    return;
  }
  if (mistake.misses && avoid !== 'stay' && avoid !== 'none') {
    if (distance < closing * 0.2) state.handled.add(next);
    return;
  }
  if (avoid === 'stay' || avoid === 'none') {
    if (distance < 120) state.handled.add(next);
  } else if (avoid === 'doubleJump') {
    // A wall is thin, so the double jump's peak has to be right over it.
    const reach = next.solid ? closing * 0.52 + 80 : closing * 0.5 + 240;
    if (distance < reach + early) {
      state.handled.add(next);
      cat.requestJump();
      state.pendingAirJumpAt = state.seconds + DOUBLE_JUMP_DELAY_SECONDS;
    }
  } else if (avoid === 'terrain') {
    // Jumps so that the middle of the jump is over the middle of the zone.
    if (distance < closing * 0.42 + early) {
      state.handled.add(next);
      cat.requestJump();
    }
  } else if (avoid === 'jump') {
    if (distance < closing * 0.365 + 40 + early) {
      state.handled.add(next);
      cat.requestJump();
    }
  } else if (distance < closing * 0.45 + 60 + early) {
    state.handled.add(next);
    cat.requestSlide();
  }
}

export class Simulator {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.sounds = [];
    const audio = game.registry.get('audio');
    const original = audio.playSfx.bind(audio);
    audio.playSfx = (name) => {
      this.sounds.push(name);
      original(name);
    };
    game.loop.stop();
  }

  get scene() {
    return this.game.scene.getScene('Game');
  }

  step(frameMs) {
    this.time += frameMs;
    this.game.headlessStep(this.time, frameMs);
  }

  // Loads a level (by index, or a custom one built from `base`) and steps until it's running.
  load(spec, frameMs) {
    const base = LEVELS[spec.levelIndex ?? 0];
    const custom = spec.obstacles
      ? {
        ...base,
        id: 'simulated',
        hints: [],
        length: spec.length ?? 20000,
        obstacles: spec.obstacles,
        attacks: spec.attacks ?? [],
        pickups: spec.pickups ?? [],
        chasers: spec.chasers ?? base.chasers,
        platforms: spec.platforms ?? [],
        wagons: spec.wagons ?? [],
        treats: spec.treats ?? [],
        checkpoints: spec.checkpoints ?? [],
        pack: Boolean(spec.pack),
        lunges: spec.lunges ?? null,
        shortcut: spec.shortcut ?? null,
        highGround: spec.highGround ?? null,
        boss: spec.boss ?? null,
        finalDash: spec.finalDash ?? null,
        mouse: spec.mouse ?? null,
        chase: { ...base.chase, ...spec.chase },
      }
      : null;
    let index = spec.levelIndex ?? 0;
    if (custom) {
      LEVELS.push(custom);
      index = LEVELS.length - 1;
    }

    const previousCat = this.scene.cat;
    this.scene.loadLevel(index, spec.startCheckpoint ?? null);
    for (let i = 0; i < MAX_LOAD_FRAMES && (this.scene.cat === previousCat || !this.scene.isPlaying); i++) {
      this.step(frameMs);
    }
    if (custom) LEVELS.pop();
    if (!this.scene.isPlaying) throw new Error('The level did not start');
  }

  // Each action fires once: { press: 'jump' | 'slide' } plus a trigger, which is either
  // { item, lead, extra } (when an obstacle is within lead seconds, plus extra distance)
  // or { afterSeconds, after } (a delay following the action at index `after`).
  run(spec) {
    const frameMs = spec.frameMs ?? DEFAULT_FRAME_MS;
    this.load(spec, frameMs);
    this.sounds.length = 0;

    const { scene } = this;
    const { cat, obstacles, tracker, chase } = scene;
    // The simulated player holds right, starting at full speed unless asked not to. That way a
    // scenario's timing is the same each time, and `idle` leaves the cat standing still.
    obstacles.clockPoint.x = cat.x;
    if (!spec.idle) {
      scene.controls.right = true;
      if (spec.fullSpeed !== false) {
        cat.momentum = 1;
        cat.speedControl.baseSpeed = cat.topSpeed;
        cat.moveVelocity = cat.topSpeed;
      }
    }
    const phasesSeen = new Set();
    let hiddenWhileKnockedOut = true;
    const actions = (spec.actions ?? []).map((action) => ({ ...action }));
    const pilot = {
      handled: new Set(),
      pendingAirJumpAt: null,
      seconds: 0,
      skill: spec.skill,
      rand: seededRandom(spec.skill?.seed ?? 1),
      mistakes: new Map(),
    };
    const out = { peak: 0, onTop: false, sprint: false, maxGap: tracker.gap, minGap: tracker.gap, ledgesTouched: new Set(), rode: false, minSpeed: Infinity, maxSpeed: 0, stuckSeconds: 0, maxRise: 0, ledgeDrops: 0 };
    let wasOnLedge = false;

    let seconds = 0;
    let frames = 0;
    while (scene.isPlaying && frames < MAX_FRAMES && !(spec.until && cat.x >= spec.until)) {
      for (const action of actions) {
        if (action.doneAt !== undefined) continue;
        if (action.afterSeconds !== undefined) {
          const previous = actions[action.after ?? 0].doneAt;
          if (previous === undefined || seconds - previous < action.afterSeconds) continue;
        } else if (action.liftGoing !== undefined) {
          // When a lift passes a height, going 'up' or 'down', once the action `after` has happened.
          const lift = scene.platforms.items[action.platform ?? 0];
          const going = lift.y < action.liftWasY ? 'up' : 'down';
          const wasY = action.liftWasY;
          action.liftWasY = lift.y;
          if (wasY === undefined || actions[action.after ?? 0].doneAt === undefined) continue;
          const height = GROUND_Y - (lift.y - lift.height / 2);
          const reached = action.liftGoing === 'up' ? height >= action.height : height <= action.height;
          if (going !== action.liftGoing || !reached) continue;
        } else if (action.catX !== undefined) {
          if (cat.x < action.catX) continue;
        } else if (action.stuckFor !== undefined) {
          if (out.stuckSeconds < action.stuckFor) continue;
        } else if (action.strikeLead !== undefined) {
          const remaining = scene.chase.secondsToStrike;
          if (remaining === null || remaining > action.strikeLead) continue;
        } else if (action.platform !== undefined) {
          const ledge = scene.platforms.items[action.platform];
          if (ledge.x - ledge.width / 2 - cat.x > cat.speed * action.lead + (action.extra ?? 0)) continue;
        } else if (action.mouseLead !== undefined) {
          if (scene.toyMouse.item.x - cat.x > cat.speed * action.mouseLead) continue;
        } else if (action.wagon !== undefined) {
          const wagon = scene.wagons.items[action.wagon];
          if (wagon.x - cat.x > cat.speed * action.lead + (action.extra ?? 0)) continue;
        } else if (action.pickup !== undefined) {
          const box = scene.pickups.items[action.pickup];
          if (box.x - cat.x > cat.speed * action.lead + (action.extra ?? 0)) continue;
        } else {
          const item = obstacles.items[action.item ?? 0];
          if (item.phase === 'waiting') continue;
          const closing = cat.speed + (item.motion?.speed ?? 0);
          if (item.x - cat.x > closing * action.lead + (action.extra ?? 0)) continue;
        }
        action.doneAt = seconds;
        if (action.press === 'jump') cat.requestJump();
        else if (action.press === 'paw') scene.usePaw();
        else if (action.press === 'right') scene.controls.right = true;
        else if (action.press === 'left') scene.controls.left = true;
        else if (action.press === 'release') scene.controls.releaseSteering();
        else cat.requestSlide();
      }
      if (spec.autopilot) {
        pilot.seconds = seconds;
        autopilot(scene, pilot);
        // Simulated players only run and jump. A boss has scenarios of its own, so it's waved past.
        if (scene.bossFight?.isActive) scene.bossFight.pawHit();
      }
      if (spec.dodgeGunner && scene.bossFight?.isActive) dodgeGunner(scene);
      // Once he's beaten, it runs on out of the arena.
      if (spec.dodgeGunner && scene.bossFight?.isOver) scene.controls.right = true;
      // Drops the cat on a boss's head whenever it's open to a stomp.
      if (spec.stompWhenOpen && scene.bossFight?.director.isVulnerable && cat.onGround) {
        const { boss } = scene.bossFight;
        cat.body.reset(boss.x, boss.y - 460);
      }

      this.step(frameMs);
      seconds += frameMs / 1000;
      frames += 1;

      phasesSeen.add(chase.phase);
      if (chase.isKnockedOut && chase.koMs < 2500 && scene.chaser.visible) hiddenWhileKnockedOut = false;

      const air = GROUND_Y - cat.body.bottom;
      out.peak = Math.max(out.peak, air);
      if (cat.onGround && air > AIR_THRESHOLD) out.onTop = true;
      if (cat.onGround && cat.onPlatform) {
        scene.platforms.items.forEach((ledge, i) => {
          if (Math.abs(cat.x - ledge.x) < ledge.width / 2 + 60) out.ledgesTouched.add(i);
        });
      }
      if (cat.body.blocked.right) out.stuckSeconds += frameMs / 1000;
      out.maxRise = Math.max(out.maxRise, scene.cameraRise);
      const onLedge = cat.onGround && cat.onPlatform;
      if (wasOnLedge && !onLedge) out.ledgeDrops += 1;
      wasOnLedge = onLedge;
      if (actions.some((action) => action.doneAt !== undefined)) {
        if (!cat.onGround && out.jumpX === undefined) out.jumpX = cat.x;
        if (cat.onGround && out.jumpX !== undefined && out.landX === undefined) out.landX = cat.x;
      }
      if (cat.speedControl.isSprinting) out.sprint = true;
      if (scene.wagons.wasRiding) out.rode = true;
      out.minSpeed = Math.min(out.minSpeed, cat.speed);
      out.maxSpeed = Math.max(out.maxSpeed, cat.speed);
      out.maxGap = Math.max(out.maxGap, tracker.gap);
      out.minGap = Math.min(out.minGap, tracker.gap);
    }

    // Keeps stepping after the level ends, to see what plays next.
    const settleFrames = Math.round(((spec.settleSeconds ?? 0) * 1000) / frameMs);
    for (let i = 0; i < settleFrames; i++) this.step(frameMs);

    return {
      ...out,
      ledgesTouched: [...out.ledgesTouched],
      fallen: scene.platforms.items.map((item) => item.fallen),
      endHeight: GROUND_Y - cat.body.bottom,
      treats: cat.treats,
      treatTotal: scene.treats.total,
      startX: spec.startCheckpoint?.x ?? 0,
      savedCheckpoint: scene.savedCheckpoint,
      overlayTitle: document.querySelector('[data-title]')?.textContent,
      actionLabels: [...document.querySelectorAll('[data-actions] button')].map((b) => b.textContent),
      catVisible: cat.visible,
      followers: scene.followers.map((follower) => follower.character),
      followerDistances: scene.followers.map((follower) => Math.round(cat.x - follower.x)),
      chaserAnim: scene.chaser.anims.currentAnim?.key,
      phases: [...phasesSeen],
      chaser: chase.chaserId,
      chaserCharacter: scene.chaser.character,
      chaserVisible: scene.chaser.visible,
      startGap: spec.startGapRecord,
      hiddenWhileKnockedOut,
      hasPaw: Boolean(cat.hasPaw),
      collected: scene.pickups.items.map((item) => item.collected),
      koMs: chase.koMs,
      hits: obstacles.items.map((item) => item.wasHit),
      passed: obstacles.items.map((item) => Boolean(item.passed)),
      sounds: [...this.sounds],
      state: scene.state.state,
      streak: scene.streak.count,
      gap: tracker.gap,
      x: cat.x,
      finalSpeed: cat.speed,
      grabs: scene.grabs,
      bonusTreats: scene.bonusTreats,
      bossStarted: Boolean(scene.bossFight?.hasStarted),
      bossHealth: scene.bossFight?.director.health,
      bossState: scene.bossFight?.director.state,
      bossesAttacks: scene.bossFight?.director.attacksSeen,
      lives: scene.bossFight?.livesLeft,
      cameraX: scene.cameras.main.scrollX,
      foundMouse: scene.foundMouse,
      overlayMessage: document.querySelector('[data-message]')?.textContent,
      seconds,
      frames,
    };
  }
}
