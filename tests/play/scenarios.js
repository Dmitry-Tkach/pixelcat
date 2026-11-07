// In-game scenarios, generated from the game's data. A new obstacle or level is covered
// automatically, based on what its data says should avoid it.
import { LEVELS } from '../../src/data/levels/index.js';
import { OBSTACLES } from '../../src/data/obstacles.js';

const AT = 900; // where a test obstacle stands
const FRAME_RATES = [60, 30, 20]; // uneven or slow frames must not change the outcome
const WINDOW_LEADS = Array.from({ length: 40 }, (_, i) => 0.03 * i + 0.03);
const MIN_PRESS_WINDOW_SECONDS = 0.12;
const MIN_BOUNCE_PEAK = 300;
const ROOFTOP_START = 1500;

const JUMP = { press: 'jump', lead: 0.365, extra: 40 };
const SLIDE = { press: 'slide', lead: 0.45, extra: 60 };
const BIG_JUMP = [
  { press: 'jump', lead: 0.5, extra: 240 },
  { press: 'jump', afterSeconds: 0.19, after: 0 },
];
// A wall is thin, so the peak of the double jump has to be right over it.
const WALL_BIG_JUMP = [
  { press: 'jump', lead: 0.52, extra: 80 },
  { press: 'jump', afterSeconds: 0.19, after: 0 },
];
const JUMP_TO_LAND = { press: 'jump', lead: 0.75 };
const TEST_LEVEL = 4; // a level in the middle of the game, for checking movement and walls

// Obstacles are checked at the slowest, middle and fastest level speeds.
const SPEED_LEVELS = [0, Math.floor((LEVELS.length - 1) / 2), LEVELS.length - 1];

const clean = (r) => !r.hits[0];
const hit = (r) => r.hits[0];
const levelName = (i) => `level ${i + 1} speed`;

function untilPast(obstacles, extra = 300) {
  return Math.max(...obstacles.map((o) => o.at)) + extra;
}

// What should happen for each way of avoiding an obstacle.
function checksFor(name, type) {
  const place = (position) => [{ type: name, at: AT, position }];
  switch (type.avoid) {
    case 'jump':
      return [
        { label: 'jump clears', obstacles: place(), actions: [JUMP], expect: clean },
        { label: 'doing nothing hits', obstacles: place(), expect: hit },
      ];
    case 'slide':
      return [
        { label: 'slide clears', obstacles: place(), actions: [SLIDE], expect: clean },
        { label: 'doing nothing hits', obstacles: place(), expect: hit },
      ];
    case 'doubleJump': {
      const bigJump = type.solid ? WALL_BIG_JUMP : BIG_JUMP;
      return [
        { label: 'double jump clears', obstacles: place(), actions: bigJump, expect: clean },
        { label: 'single jump hits', obstacles: place(), actions: [bigJump[0]], expect: hit },
      ];
    }
    case 'read': {
      const moves = { jump: [JUMP], slide: [SLIDE], none: [] };
      const checks = [];
      for (const [position, move] of Object.entries(type.motion.moves)) {
        checks.push({ label: `${position}: ${move} clears`, obstacles: place(position), actions: moves[move], expect: clean });
        if (move !== 'none') checks.push({ label: `${position}: doing nothing hits`, obstacles: place(position), expect: hit });
      }
      return checks;
    }
    case 'terrain':
      return [
        { label: 'jumping across avoids it', obstacles: place(), actions: [{ press: 'jump', lead: 0.42 }], expect: clean },
        {
          label: 'running through slows the cat, which recovers',
          obstacles: place(),
          expect: (r) => hit(r) && r.minSpeed < r.finalSpeed * 0.7 && r.finalSpeed === r.maxSpeed,
        },
      ];
    case 'stay':
      return [
        { label: 'staying down is safe', obstacles: place(), expect: (r) => clean(r) && r.passed[0] },
        { label: 'jumping into it hits', obstacles: place(), actions: [{ press: 'jump', lead: 0.3, extra: 60 }], expect: hit },
      ];
    case 'lift':
      return [{ label: 'running into it stops the cat', obstacles: place(), expect: hit }];
    default:
      throw new Error(`No checks for avoid type "${type.avoid}"`);
  }
}

// The correct actions for one obstacle in a sequence.
function movesFor(entry, index) {
  const type = OBSTACLES[entry.type];
  const avoid = type.avoid === 'read' ? type.motion.moves[entry.position] : type.avoid;
  if (avoid === 'stay' || avoid === 'none') return [];
  if (avoid === 'slide') return [{ ...SLIDE, item: index }];
  if (avoid === 'terrain') return [{ press: 'jump', lead: 0.42, item: index }];
  if (avoid === 'doubleJump') return BIG_JUMP.map((a) => ({ ...a, item: index }));
  return [{ ...JUMP, item: index }];
}

export function buildScenarios() {
  const scenarios = [];
  const add = (name, spec) => scenarios.push({ name, ...spec });

  for (const fps of FRAME_RATES) {
    const frameMs = 1000 / fps;

    // Every obstacle, at every level's speed.
    for (const [typeName, type] of Object.entries(OBSTACLES)) {
      SPEED_LEVELS.forEach((levelIndex) => {
        for (const check of checksFor(typeName, type)) {
          add(`${typeName}: ${check.label}, ${levelName(levelIndex)}, ${fps}fps`, {
            levelIndex,
            frameMs,
            obstacles: check.obstacles,
            actions: check.actions,
            until: untilPast(check.obstacles),
            expect: check.expect,
          });
        }
      });

      // Every landable obstacle: tops are safe, sides are hits.
      if (type.landable && type.avoid === 'jump') {
        const obstacles = [{ type: typeName, at: AT }];
        const until = AT + 500;
        add(`${typeName}: landing on top is safe, ${fps}fps`, {
          frameMs,
          obstacles,
          actions: [JUMP_TO_LAND],
          until,
          expect: type.bounce
            ? (r) => clean(r) && r.sounds.includes('bounce') && r.peak > MIN_BOUNCE_PEAK
            : (r) => clean(r) && r.onTop,
        });
      }
    }

    // Every combo written into a level, at that level's speed.
    LEVELS.forEach((level, levelIndex) => {
      level.obstacles.forEach((entry, i) => {
        if (!entry.combo) return;
        const previous = level.obstacles[i - 1];
        const gap = entry.at - previous.at;
        const obstacles = [
          { ...previous, at: AT, combo: undefined },
          { ...entry, at: AT + gap, combo: undefined },
        ];
        add(`combo ${previous.type} then ${entry.type}, ${level.id}, ${fps}fps`, {
          levelIndex,
          frameMs,
          obstacles,
          actions: [...movesFor(obstacles[0], 0), ...movesFor(obstacles[1], 1)],
          until: untilPast(obstacles),
          expect: (r) => !r.hits[0] && !r.hits[1],
        });
      });
    });

    // Every full level, played by the autopilot and ignored by the player.
    LEVELS.forEach((level, levelIndex) => {
      add(`${level.id}: autopilot escapes with no hits, ${fps}fps`, {
        levelIndex,
        frameMs,
        autopilot: true,
        // Clock-driven obstacles may not be clearable at the moment a non-stop cat arrives.
        // And a cat slowed by a hit may not be fast enough to jump all the way across mud.
        expect: (r) => r.state === 'complete' && level.obstacles.every((o, i) => !r.hits[i] || ['read', 'terrain'].includes(OBSTACLES[o.type].avoid)),
        detail: (r) => `state=${r.state} x=${Math.round(r.x)} hit: ${level.obstacles.filter((_o, i) => r.hits[i]).map((o) => `${o.type}@${o.at}`).join(', ')}`,
      });
      add(`${level.id}: doing nothing gets caught, ${fps}fps`, {
        levelIndex,
        frameMs,
        idle: true,
        expect: (r) => r.state === 'failed',
        detail: (r) => `state=${r.state} x=${Math.round(r.x)}`,
      });
    });
  }

  // The lunge, at every level's speed and frame rate.
  const clearRoad = [{ type: 'cone', at: 6000 }];
  for (const fps of FRAME_RATES) {
    const frameMs = 1000 / fps;
    SPEED_LEVELS.forEach((levelIndex) => {
      const name = `${levelName(levelIndex)}, ${fps}fps`;
      const lunge = { levelIndex, frameMs, obstacles: clearRoad, attacks: [{ at: 700 }], until: 2200 };
      add(`lunge: jumping as she dashes dodges it, ${name}`, {
        ...lunge,
        actions: [{ press: 'jump', strikeLead: 0.4 }],
        expect: (r) => r.sounds.includes('lungeWarn') && r.sounds.includes('lungeMiss') && !r.sounds.includes('hit'),
      });
      add(`lunge: doing nothing gets grabbed, ${name}`, {
        ...lunge,
        expect: (r) => r.sounds.includes('hit') && !r.sounds.includes('lungeMiss') && r.grabs === 1,
        detail: (r) => `grabs=${r.grabs}`,
      });
      add(`lunge: jumping far too early gets grabbed, ${name}`, {
        ...lunge,
        actions: [{ press: 'jump', strikeLead: 1.05 }],
        expect: (r) => r.sounds.includes('hit'),
      });
      add(`lunge: sliding doesn't dodge it, ${name}`, {
        ...lunge,
        actions: [{ press: 'slide', strikeLead: 0.4 }],
        expect: (r) => r.sounds.includes('hit'),
      });
    });
  }
  add('lunge: a grab when she is already close means caught', {
    obstacles: clearRoad,
    attacks: [{ at: 200 }],
    chase: { startGap: 120 },
    until: 2200,
    expect: (r) => r.state === 'failed',
  });
  add('lunge: she follows normally again afterward', {
    obstacles: clearRoad,
    attacks: [{ at: 700 }],
    until: 2600,
    actions: [{ press: 'jump', strikeLead: 0.4 }],
    expect: (r) => ['warning', 'dashing', 'striking', 'recovering', 'chasing'].every((p) => r.phases.includes(p)) && r.sounds.includes('lungeMiss'),
  });

  // The Super Paw.
  const box = [{ type: 'superPaw', at: 900 }];
  const toBox = [
    { press: 'jump', pickup: 0, lead: 0.63 },
    { press: 'jump', afterSeconds: 0.26, after: 0 },
  ];
  LEVELS.forEach((level, levelIndex) => {
    add(`paw box: a double jump collects it, ${level.id}`, {
      levelIndex,
      obstacles: clearRoad,
      pickups: box,
      until: 1400,
      actions: toBox,
      expect: (r) => r.collected[0] && r.hasPaw && r.sounds.includes('pawPickup'),
    });
    add(`paw box: one jump can't reach it, ${level.id}`, {
      levelIndex,
      obstacles: clearRoad,
      pickups: box,
      until: 1400,
      actions: [{ press: 'jump', pickup: 0, lead: 0.42 }],
      expect: (r) => !r.collected[0],
    });
    add(`paw: knocks the chaser out, then she comes back, ${level.id}`, {
      levelIndex,
      obstacles: [{ type: 'cone', at: 9000 }],
      pickups: box,
      until: 4400,
      actions: [...toBox, { press: 'paw', afterSeconds: 1, after: 1 }],
      expect: (r) => r.sounds.includes('punch') && r.sounds.includes('chaserBack') && r.phases.includes('knockedOut') && r.hiddenWhileKnockedOut && !r.hasPaw,
    });
  });
  add('paw: E does nothing without a box', {
    obstacles: clearRoad,
    until: 1500,
    actions: [{ press: 'paw', lead: 99 }],
    expect: (r) => !r.sounds.includes('punch'),
  });
  add('paw: one box gives one punch', {
    obstacles: clearRoad,
    pickups: box,
    until: 2500,
    actions: [...toBox, { press: 'paw', afterSeconds: 1, after: 1 }, { press: 'paw', afterSeconds: 1.6, after: 1 }],
    expect: (r) => r.sounds.filter((s) => s === 'punch').length === 1,
  });
  add('paw: hitting her during a lunge is a counter, and cancels the grab', {
    obstacles: clearRoad,
    pickups: box,
    attacks: [{ at: 1200 }],
    until: 2400,
    actions: [...toBox, { press: 'paw', strikeLead: 0.5 }],
    expect: (r) => r.sounds.includes('punch') && !r.sounds.includes('hit') && r.koMs > 2500,
    detail: (r) => `koMs=${Math.round(r.koMs)} sounds=${r.sounds.join(',')}`,
  });
  add('paw: a lunge planned during the knockout is skipped', {
    obstacles: [{ type: 'cone', at: 9000 }],
    pickups: box,
    attacks: [{ at: 1700 }],
    until: 3400,
    actions: [...toBox, { press: 'paw', afterSeconds: 1, after: 1 }],
    expect: (r) => !r.sounds.includes('lungeWarn'),
  });
  add('paw box: a van double jump in level 1 can collect it', {
    levelIndex: 0,
    obstacles: [{ type: 'van', at: AT }],
    pickups: [{ type: 'superPaw', at: AT }],
    until: AT + 500,
    actions: BIG_JUMP,
    expect: (r) => r.collected[0] && !r.hits[0],
  });
  add('paw box: a bin bounce in level 2 can collect it', {
    levelIndex: 1,
    obstacles: [{ type: 'bin', at: AT }],
    pickups: [{ type: 'superPaw', at: AT + 300 }],
    until: AT + 700,
    actions: [JUMP_TO_LAND],
    expect: (r) => r.collected[0] && !r.hits[0],
  });

  // The chaser roster.
  const farCone = [{ type: 'cone', at: 12000 }];
  const knockOut = [...toBox, { press: 'paw', afterSeconds: 1, after: 1 }];
  add('roster: a knockout brings in the next chaser', {
    obstacles: farCone,
    pickups: box,
    chasers: ['girl', 'boy'],
    until: 3600,
    actions: knockOut,
    expect: (r) => r.chaser === 'boy' && r.chaserCharacter === 'boy' && r.chaserVisible && r.sounds.includes('chaserBack'),
    detail: (r) => `chaser=${r.chaser} character=${r.chaserCharacter} visible=${r.chaserVisible}`,
  });
  add('roster: grandma can follow the boy', {
    levelIndex: 1,
    obstacles: farCone,
    pickups: box,
    chasers: ['boy', 'grandma'],
    until: 3600,
    actions: knockOut,
    expect: (r) => r.chaser === 'grandma' && r.chaserCharacter === 'grandma' && r.chaserVisible,
    detail: (r) => `chaser=${r.chaser} character=${r.chaserCharacter} visible=${r.chaserVisible}`,
  });
  add('roster: the last chaser keeps coming back', {
    obstacles: farCone,
    pickups: box,
    chasers: ['girl'],
    until: 3600,
    actions: knockOut,
    expect: (r) => r.chaser === 'girl' && r.chaserVisible,
  });
  for (const chaser of ['girl', 'boy', 'grandma']) {
    add(`roster: ${chaser} can lunge, be dodged and recover`, {
      levelIndex: 1,
      obstacles: farCone,
      chasers: [chaser],
      attacks: [{ at: 700 }],
      until: 2200,
      actions: [{ press: 'jump', strikeLead: 0.4 }],
      expect: (r) => r.sounds.includes('lungeMiss') && r.phases.includes('recovering') && r.chaserCharacter === (chaser === 'girl' ? 'owner' : chaser),
    });
  }

  // What each chaser does on catching the cat.
  const catchSpec = {
    obstacles: farCone,
    attacks: [{ at: 200 }],
    chase: { startGap: 120 },
    until: 2200,
    settleSeconds: 1,
  };
  add('catch: the girl hugs the cat, which disappears into her arms', {
    ...catchSpec,
    chasers: ['girl'],
    expect: (r) => r.state === 'failed' && r.chaserAnim === 'owner-hug' && !r.catVisible && r.sounds.includes('caughtHug'),
    detail: (r) => `state=${r.state} anim=${r.chaserAnim} catVisible=${r.catVisible} sounds=${r.sounds.join(',')}`,
  });
  add('catch: the boy hugs the cat too, then keeps cuddling', {
    ...catchSpec,
    chasers: ['boy'],
    settleSeconds: 2,
    expect: (r) => r.state === 'failed' && r.chaserAnim === 'boy-hugLoop' && !r.catVisible && r.sounds.includes('caughtHug'),
    detail: (r) => `state=${r.state} anim=${r.chaserAnim} catVisible=${r.catVisible} sounds=${r.sounds.join(',')}`,
  });
  add('catch: grandma hugs the cat too, then keeps cuddling', {
    ...catchSpec,
    chasers: ['grandma'],
    settleSeconds: 2,
    expect: (r) => r.state === 'failed' && r.chaserAnim === 'grandma-hugLoop' && !r.catVisible && r.sounds.includes('caughtHug'),
    detail: (r) => `state=${r.state} anim=${r.chaserAnim} catVisible=${r.catVisible} sounds=${r.sounds.join(',')}`,
  });
  add('catch: restarting after a hug brings the cat back', {
    ...catchSpec,
    chasers: ['girl'],
    chase: {},
    attacks: [],
    until: 800,
    settleSeconds: 0,
    expect: (r) => r.catVisible && r.state === 'playing',
  });

  // Stars and the toy mouse.
  add('stars: a lunge that lands counts as being grabbed', {
    obstacles: [{ type: 'cone', at: 15000 }],
    attacks: [{ at: 1000 }],
    until: 2200,
    expect: (r) => r.grabs === 1,
    detail: (r) => `grabs=${r.grabs}`,
  });
  add('stars: a dodged lunge does not count', {
    obstacles: [{ type: 'cone', at: 15000 }],
    attacks: [{ at: 1000 }],
    actions: [{ press: 'jump', strikeLead: 0.4 }],
    until: 2200,
    expect: (r) => r.grabs === 0,
    detail: (r) => `grabs=${r.grabs}`,
  });
  add('toy mouse: touching it finds it', {
    obstacles: [{ type: 'cone', at: 15000 }],
    mouse: { at: 1200, height: 150 },
    actions: [{ press: 'jump', mouseLead: 0.5 }],
    until: 1600,
    expect: (r) => r.foundMouse && r.sounds.includes('squeak'),
    detail: (r) => `found=${r.foundMouse} sounds=${r.sounds.join(',')}`,
  });
  add('toy mouse: running underneath misses it', {
    obstacles: [{ type: 'cone', at: 15000 }],
    mouse: { at: 1200, height: 300 },
    until: 1600,
    expect: (r) => !r.foundMouse,
    detail: (r) => `found=${r.foundMouse}`,
  });

  // Solid walls.
  const WALL_AT = 1200;
  const stoneWall = [{ type: 'stoneWall', at: WALL_AT }];
  const tallWall = [{ type: 'tallStoneWall', at: WALL_AT }];
  add('walls: doing nothing stops the cat until the chaser arrives', {
    levelIndex: TEST_LEVEL,
    obstacles: stoneWall,
    expect: (r) => r.state === 'failed' && r.hits[0] && r.x < WALL_AT && r.stuckSeconds > 1 && r.sounds.includes('thud') && r.streak === 0,
    detail: (r) => `state=${r.state} x=${Math.round(r.x)} stuck=${r.stuckSeconds.toFixed(2)} sounds=${r.sounds.join(',')}`,
  });
  add('walls: a close chaser gives much less time', {
    levelIndex: TEST_LEVEL,
    obstacles: stoneWall,
    chase: { startGap: 200 },
    expect: (r) => r.state === 'failed' && r.stuckSeconds < 1,
    detail: (r) => `state=${r.state} stuck=${r.stuckSeconds.toFixed(2)}`,
  });
  for (const fps of FRAME_RATES) {
    add(`walls: jumping from a standstill escapes, ${fps}fps`, {
      levelIndex: TEST_LEVEL,
      frameMs: 1000 / fps,
      obstacles: stoneWall,
      actions: [{ press: 'jump', stuckFor: 0.4 }],
      until: WALL_AT + 500,
      expect: (r) => r.state === 'playing' && r.x >= WALL_AT + 500 && r.hits[0],
      detail: (r) => `state=${r.state} x=${Math.round(r.x)} gap=${Math.round(r.gap)}`,
    });
    add(`walls: a double jump from a standstill clears the tall wall, ${fps}fps`, {
      levelIndex: TEST_LEVEL,
      frameMs: 1000 / fps,
      obstacles: tallWall,
      actions: [{ press: 'jump', stuckFor: 0.3 }, { press: 'jump', afterSeconds: 0.25, after: 0 }],
      until: WALL_AT + 500,
      expect: (r) => r.state === 'playing' && r.x >= WALL_AT + 500,
      detail: (r) => `state=${r.state} x=${Math.round(r.x)} peak=${Math.round(r.peak)}`,
    });
  }
  add('walls: one jump from a standstill doesn\'t clear the tall wall', {
    levelIndex: TEST_LEVEL,
    obstacles: tallWall,
    actions: [{ press: 'jump', stuckFor: 0.2 }],
    expect: (r) => r.state === 'failed' && r.x < WALL_AT,
    detail: (r) => `state=${r.state} x=${Math.round(r.x)}`,
  });
  add('walls: sliding into one still gets stuck, and a jump escapes', {
    levelIndex: TEST_LEVEL,
    obstacles: stoneWall,
    actions: [{ press: 'slide', item: 0, lead: 0.3 }, { press: 'jump', stuckFor: 0.3 }],
    until: WALL_AT + 500,
    expect: (r) => r.hits[0] && r.state === 'playing' && r.x >= WALL_AT + 500,
    detail: (r) => `hits=${r.hits} state=${r.state} x=${Math.round(r.x)}`,
  });
  add('walls: running into a tall wall in mid-jump leaves the double jump to escape', {
    levelIndex: TEST_LEVEL,
    obstacles: tallWall,
    actions: [{ press: 'jump', item: 0, lead: 0.4 }, { press: 'jump', stuckFor: 0.05 }],
    until: WALL_AT + 500,
    expect: (r) => r.state === 'playing' && r.x >= WALL_AT + 500,
    detail: (r) => `state=${r.state} x=${Math.round(r.x)} stuck=${r.stuckSeconds.toFixed(2)}`,
  });
  add('walls: the cat is slow for a moment after escaping', {
    levelIndex: TEST_LEVEL,
    obstacles: stoneWall,
    actions: [{ press: 'jump', stuckFor: 0.3 }],
    until: WALL_AT + 80,
    expect: (r) => r.finalSpeed < LEVELS[TEST_LEVEL].cat.speed * 0.8,
    detail: (r) => `speed=${Math.round(r.finalSpeed)}`,
  });

  // Moving ledges.
  const longFarCone = [{ type: 'cone', at: 15000 }];
  for (const fps of FRAME_RATES) {
    add(`lifts: a riding cat stays on through a full cycle, ${fps}fps`, {
      levelIndex: TEST_LEVEL,
      frameMs: 1000 / fps,
      obstacles: longFarCone,
      platforms: [{ at: 900, width: 1800, height: 150, style: 'plank', lift: { travel: 45, seconds: 2 } }],
      actions: [{ press: 'jump', platform: 0, lead: 0.3 }],
      until: 2600,
      expect: (r) => r.ledgesTouched.includes(0) && r.ledgeDrops === 0 && r.endHeight > 100,
      detail: (r) => `touched=${r.ledgesTouched} drops=${r.ledgeDrops} end=${Math.round(r.endHeight)}`,
    });
    add(`collapse: a ledge falls soon after landing, ${fps}fps`, {
      levelIndex: TEST_LEVEL,
      frameMs: 1000 / fps,
      obstacles: longFarCone,
      platforms: [{ at: 900, width: 1200, height: 150, style: 'marketAwning', collapse: true }],
      actions: [{ press: 'jump', platform: 0, lead: 0.3 }],
      until: 1900,
      expect: (r) => r.fallen[0] && r.sounds.includes('creak') && r.sounds.includes('collapse') && r.endHeight < 2,
      detail: (r) => `fallen=${r.fallen} end=${Math.round(r.endHeight)} sounds=${r.sounds.join(',')}`,
    });
  }
  add('collapse: it holds until the cat lands on it', {
    levelIndex: TEST_LEVEL,
    obstacles: longFarCone,
    platforms: [{ at: 900, width: 1200, height: 150, style: 'marketAwning', collapse: true }],
    until: 1900,
    expect: (r) => !r.fallen[0],
    detail: (r) => `fallen=${r.fallen}`,
  });

  // The whole climb, from several start points so the lift is somewhere different each time.
  const climbLedges = LEVELS[TEST_LEVEL].platforms.filter((p, i, all) => {
    const firstLift = all.findIndex((q) => q.lift);
    return i >= firstLift - 2 && i <= firstLift + 3;
  });
  const climbStart = climbLedges[0].at;
  [900, 1050, 1200, 1350, 1500, 1700].forEach((startAt) => {
    const platforms = climbLedges.map((p) => ({ ...p, at: p.at - climbStart + startAt }));
    const roof = platforms.at(-1);
    add(`climb: the whole route can be followed, starting at ${startAt}`, {
      levelIndex: TEST_LEVEL,
      obstacles: longFarCone,
      platforms,
      actions: [
        { press: 'jump', platform: 0, lead: 0.3 },
        { press: 'jump', platform: 1, lead: 0.6 },
        { press: 'jump', platform: 2, lead: 0.6 },
        { press: 'jump', platform: 3, lead: 0.6 },
        { press: 'jump', platform: 4, lead: 0.65 },
        { press: 'jump', platform: 5, lead: 0.7 },
      ],
      until: roof.at + roof.width + 900,
      expect: (r) => platforms.every((_p, i) => r.ledgesTouched.includes(i)) && r.maxRise > 250 && r.endHeight < 2 && r.sprint,
      detail: (r) => `touched=${r.ledgesTouched} rise=${Math.round(r.maxRise)} end=${Math.round(r.endHeight)} sprint=${r.sprint}`,
    });
  });
  // Both ways past a wall too tall to jump.
  const LIFT_GATE_AT = 2000;
  for (const levelIndex of SPEED_LEVELS) {
    const top = LEVELS[levelIndex].cat.speed;
    const gate = { type: 'gateWall', at: LIFT_GATE_AT };
    add(`lift gate: bouncing and double jumping gets over, ${levelName(levelIndex)}`, {
      levelIndex,
      obstacles: [{ type: 'bin', at: LIFT_GATE_AT - 1.2 * top }, gate],
      actions: [{ press: 'jump', item: 0, lead: 0.75 }, { press: 'jump', afterSeconds: 1.19, after: 0 }],
      until: LIFT_GATE_AT + 600,
      expect: (r) => !r.hits[0] && !r.hits[1] && r.x >= LIFT_GATE_AT + 600,
      detail: (r) => `hits=${r.hits} x=${Math.round(r.x)} peak=${Math.round(r.peak)}`,
    });
    add(`lift gate: a double jump alone can't get over, ${levelName(levelIndex)}`, {
      levelIndex,
      obstacles: [gate],
      actions: WALL_BIG_JUMP,
      expect: (r) => r.state === 'failed' && r.x < LIFT_GATE_AT,
      detail: (r) => `state=${r.state} x=${Math.round(r.x)}`,
    });
    add(`lift gate: waiting for the lift and riding it gets over, ${levelName(levelIndex)}`, {
      levelIndex,
      obstacles: [gate, { type: 'cone', at: 15000 }],
      platforms: [{ at: LIFT_GATE_AT - 1.05 * top, width: Math.round(0.8 * top), height: 300, style: 'plank', lift: { travel: 130, seconds: 2.4 } }],
      chase: { startGap: 1100 },
      highGround: LEVELS[levelIndex].highGround,
      // The player stops under the lift and watches it. They jump as it comes down, ride it back
      // up, then run along it and jump over.
      actions: [
        { press: 'release', catX: LIFT_GATE_AT - 0.9 * top },
        { press: 'jump', liftGoing: 'down', height: 300, after: 0 },
        { press: 'right', liftGoing: 'up', height: 340, after: 1 },
        { press: 'jump', afterSeconds: 0.35, after: 2 },
      ],
      until: LIFT_GATE_AT + 300,
      expect: (r) => r.ledgesTouched.includes(0) && r.state === 'playing' && r.x >= LIFT_GATE_AT + 300,
      detail: (r) => `touched=${r.ledgesTouched} state=${r.state} x=${Math.round(r.x)} peak=${Math.round(r.peak)}`,
    });
  }

  // Boss fights. Unlike a level, these aren't full play-throughs: the stomps are placed exactly, so
  // they check the rules of the fight, and not whether it feels fair.
  const BOSS_AT = 1200;
  const bossRoad = [{ type: 'cone', at: 15000 }];
  const bossSpec = { levelIndex: 2, obstacles: bossRoad, boss: { type: 'crownCat', at: BOSS_AT }, length: 4000 };
  add('boss: running in shuts the arena, and the family stays out', {
    ...bossSpec,
    until: BOSS_AT + 400,
    expect: (r) => r.bossStarted && r.state === 'playing' && !r.chaserVisible && r.lives === 3 && r.bossHealth === 3,
    detail: (r) => `started=${r.bossStarted} state=${r.state} chaser=${r.chaserVisible} lives=${r.lives} health=${r.bossHealth}`,
  });
  add('boss: the cat can\'t leave until he\'s beaten', {
    ...bossSpec,
    expect: (r) => r.state === 'failed' && r.lives === 0 && r.x < BOSS_AT + 1300 && r.sounds.includes('caught'),
    detail: (r) => `state=${r.state} lives=${r.lives} x=${Math.round(r.x)}`,
  });
  add('boss: he uses all three attacks, and beats a cat that just stands there', {
    ...bossSpec,
    actions: [{ press: 'release', catX: BOSS_AT + 300 }],
    expect: (r) => r.state === 'failed' && r.lives === 0,
    detail: (r) => `state=${r.state} lives=${r.lives} attacks=${r.bossesAttacks}`,
  });
  for (const fps of FRAME_RATES) {
    add(`boss: three stomps beat him, then the way out opens, ${fps}fps`, {
      ...bossSpec,
      frameMs: 1000 / fps,
      stompWhenOpen: true,
      expect: (r) => r.state === 'complete' && r.bossHealth === 0 && r.bossState === 'defeated' && r.sounds.includes('punch'),
      detail: (r) => `state=${r.state} health=${r.bossHealth} boss=${r.bossState} lives=${r.lives} x=${Math.round(r.x)}`,
    });
  }
  add('boss: the Super Paw hits him at any time', {
    ...bossSpec,
    startCheckpoint: { x: 700, treats: 0, hasPaw: true, rosterIndex: 0 },
    actions: [{ press: 'paw', catX: BOSS_AT + 300 }],
    until: BOSS_AT + 500,
    settleSeconds: 0.5,
    expect: (r) => r.bossHealth === 2 && !r.hasPaw,
    detail: (r) => `health=${r.bossHealth} hasPaw=${r.hasPaw}`,
  });
  add('boss: a checkpoint restart begins the fight afresh', {
    ...bossSpec,
    startCheckpoint: { x: 1000, treats: 0, hasPaw: false, rosterIndex: 0 },
    until: BOSS_AT + 300,
    expect: (r) => r.bossStarted && r.lives === 3 && r.bossHealth === 3,
    detail: (r) => `started=${r.bossStarted} lives=${r.lives} health=${r.bossHealth}`,
  });

  // Being chased on platform-controls rules.
  add('high ground: a cat on a ledge can\'t be caught from the road, until it stays too long', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 15000 }],
    platforms: [{ at: 900, width: 3000, height: 200, style: 'plank' }],
    highGround: LEVELS[TEST_LEVEL].highGround,
    chase: { startGap: 300 },
    actions: [{ press: 'jump', platform: 0, lead: 0.3 }, { press: 'release', afterSeconds: 0.9, after: 0 }],
    settleSeconds: 1.5,
    expect: (r) => r.state === 'failed' && r.endHeight > 100 && r.sounds.includes('chaserRush') && r.chaserAnim.includes('hug'),
    detail: (r) => `state=${r.state} end=${Math.round(r.endHeight)} anim=${r.chaserAnim}`,
  });
  add('high ground: running on calls the climb off', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 15000 }],
    platforms: [{ at: 900, width: 3000, height: 200, style: 'plank' }],
    highGround: LEVELS[TEST_LEVEL].highGround,
    chase: { startGap: 300 },
    actions: [
      { press: 'jump', platform: 0, lead: 0.3 },
      { press: 'release', afterSeconds: 0.9, after: 0 },
      { press: 'right', afterSeconds: 1.3, after: 1 },
    ],
    until: 3400,
    expect: (r) => r.state === 'playing',
    detail: (r) => `state=${r.state} gap=${Math.round(r.gap)}`,
  });
  add('momentum: starting from a stop is slower than the chaser, and top speed is faster', {
    levelIndex: TEST_LEVEL,
    fullSpeed: false,
    obstacles: [{ type: 'cone', at: 15000 }],
    until: 3000,
    expect: (r) => r.minSpeed < LEVELS[TEST_LEVEL].chase.ownerSpeed && r.maxSpeed > LEVELS[TEST_LEVEL].chase.ownerSpeed && r.finalSpeed === LEVELS[TEST_LEVEL].cat.speed,
    detail: (r) => `speeds=${Math.round(r.minSpeed)}-${Math.round(r.maxSpeed)} final=${Math.round(r.finalSpeed)}`,
  });
  add('momentum: a hit loses it', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 1200 }],
    until: 1500,
    expect: (r) => r.hits[0] && r.finalSpeed < LEVELS[TEST_LEVEL].cat.speed * 0.8,
    detail: (r) => `final=${Math.round(r.finalSpeed)}`,
  });
  add('standing still: the chaser closes in at their own speed', {
    levelIndex: TEST_LEVEL,
    idle: true,
    obstacles: [{ type: 'cone', at: 15000 }],
    expect: (r) => r.state === 'failed' && r.x === 0 && r.seconds > 1 && r.seconds < 2.5,
    detail: (r) => `state=${r.state} x=${Math.round(r.x)} seconds=${r.seconds}`,
  });
  add('lunges: a close chaser lunges by itself', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 15000 }],
    lunges: LEVELS[TEST_LEVEL].lunges,
    chase: { startGap: 200, maxGap: 200 },
    actions: [{ press: 'jump', strikeLead: 0.4 }],
    until: 3000,
    expect: (r) => r.sounds.includes('lungeWarn'),
    detail: (r) => `sounds=${r.sounds.join(',')}`,
  });
  add('lunges: a far chaser doesn\'t', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 15000 }],
    lunges: LEVELS[TEST_LEVEL].lunges,
    until: 6000,
    expect: (r) => !r.sounds.includes('lungeWarn'),
    detail: (r) => `sounds=${r.sounds.join(',')}`,
  });
  add('shortcut: a chaser left far behind warns, then lands in view', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 30000 }],
    shortcut: LEVELS[TEST_LEVEL].shortcut,
    chase: { startGap: 1100 },
    until: 5000,
    expect: (r) => r.sounds.includes('chaserRush') && r.sounds.includes('chaserBack') && r.minGap <= LEVELS[TEST_LEVEL].shortcut.landGap,
    detail: (r) => `minGap=${Math.round(r.minGap)} sounds=${r.sounds.join(',')}`,
  });
  add('shortcut: treats count double until it lands, without helping the treat star', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 30000 }],
    shortcut: LEVELS[TEST_LEVEL].shortcut,
    chase: { startGap: 1100 },
    treats: [{ at: 600, height: 30 }],
    until: 900,
    expect: (r) => r.treats === 1 && r.bonusTreats === 1,
    detail: (r) => `treats=${r.treats} bonus=${r.bonusTreats}`,
  });
  add('climb: the camera stays put for a normal jump', {
    levelIndex: TEST_LEVEL,
    obstacles: [{ type: 'cone', at: 1000 }],
    actions: [JUMP],
    until: 1800,
    expect: (r) => r.maxRise === 0,
    detail: (r) => `rise=${r.maxRise}`,
  });

  // The rooftops, the market and the finale's dash.
  add('rooftops: a bin bounce reaches the roof', {
    levelIndex: 2,
    obstacles: [{ type: 'bin', at: 1400 }],
    platforms: [{ at: 1650, width: 850, height: 300, style: 'rooftop' }],
    actions: [{ press: 'jump', lead: 0.61 }],
    until: 2400,
    expect: (r) => r.onTop && r.ledgesTouched.includes(0) && !r.hits[0],
    detail: (r) => `onTop=${r.onTop} touched=${r.ledgesTouched} hits=${r.hits} peak=${r.peak}`,
  });
  add('market: one bounce carries the cat to the next stall', {
    levelIndex: 4,
    obstacles: [{ type: 'marketStall', at: 1400 }, { type: 'marketStall', at: 1918 }],
    actions: [{ press: 'jump', lead: 0.61 }],
    until: 2300,
    expect: (r) => !r.hits[0] && !r.hits[1] && r.sounds.filter((n) => n === 'bounce').length === 2,
    detail: (r) => `hits=${r.hits} sounds=${r.sounds.join(',')} peak=${r.peak}`,
  });
  add('finale: the last dash gives a burst of speed', {
    levelIndex: 7,
    obstacles: [{ type: 'cone', at: 15000 }],
    finalDash: { at: 1200, seconds: 4, multiplier: 1.2, hint: 'Run!' },
    until: 1800,
    expect: (r) => r.maxSpeed > r.minSpeed * 1.15 && r.sprint,
    detail: (r) => `speeds=${r.minSpeed}-${r.maxSpeed}`,
  });

  // Traffic lights in the city.
  add('crossing: cars keep coming, so a cat that waits on red can run across on green', {
    obstacles: [{ type: 'crossingCar', at: 1900, position: 'red' }],
    chase: { startGap: 1100 },
    // Reaches the crossing as the first car does. It stops short, then goes half a cycle later.
    actions: [
      { press: 'release', catX: 1500 },
      { press: 'right', afterSeconds: 1.45, after: 0 },
    ],
    until: 2300,
    expect: (r) => !r.hits[0] && r.x >= 2300,
    detail: (r) => `hits=${r.hits} x=${Math.round(r.x)}`,
  });
  add('crossing: a red light warns with a horn before the car can hit', {
    obstacles: [{ type: 'crossingCar', at: 1900, position: 'red' }],
    actions: [{ press: 'jump', lead: 0.365, extra: 40 }],
    until: 2300,
    expect: (r) => !r.hits[0] && r.sounds.includes('honk'),
    detail: (r) => `hits=${r.hits} sounds=${r.sounds.join(',')}`,
  });
  add('crossing: jumping on green is harmless', {
    obstacles: [{ type: 'crossingCar', at: 1900, position: 'green' }],
    actions: [{ press: 'jump', lead: 0.365, extra: 40 }],
    until: 2300,
    expect: (r) => !r.hits[0],
    detail: (r) => `hits=${r.hits}`,
  });

  // Mud on the farm.
  add('mud: running through it does not end a streak', {
    levelIndex: 5,
    obstacles: [{ type: 'cone', at: 1200 }, { type: 'mudPool', at: 2200 }, { type: 'cone', at: 3400 }],
    actions: [
      { press: 'jump', item: 0, lead: 0.365, extra: 40 },
      { press: 'jump', item: 2, lead: 0.365, extra: 40 },
    ],
    until: 3700,
    expect: (r) => !r.hits[0] && r.hits[1] && !r.hits[2] && r.streak === 2 && !r.sounds.includes('hit') && r.sounds.includes('splat'),
    detail: (r) => `hits=${r.hits} streak=${r.streak} sounds=${r.sounds.join(',')}`,
  });
  add('mud: a clean jump across counts toward a streak', {
    levelIndex: 5,
    obstacles: [{ type: 'mudPool', at: 1200 }],
    actions: [{ press: 'jump', item: 0, lead: 0.42 }],
    until: 1800,
    expect: (r) => !r.hits[0] && r.passed[0] && r.streak === 1 && !r.sounds.includes('splat'),
    detail: (r) => `hits=${r.hits} passed=${r.passed} streak=${r.streak}`,
  });

  // Hay wagons on the farm.
  const farFarCone = [{ type: 'cone', at: 15000 }];
  const WAGON_AT = 2500;
  const board = { press: 'jump', wagon: 0, lead: 0.3 };
  for (const levelIndex of [5, 6]) {
    add(`wagon: jumping on gives a faster ride, ${levelName(levelIndex)}`, {
      levelIndex,
      obstacles: farFarCone,
      wagons: [{ at: WAGON_AT }],
      actions: [board],
      until: WAGON_AT + 1000,
      expect: (r) => r.rode && r.onTop && r.sounds.includes('hayRide'),
      detail: (r) => `rode=${r.rode} onTop=${r.onTop} sounds=${r.sounds.join(',')}`,
    });
    add(`wagon: the cat runs off the front and lands, ${levelName(levelIndex)}`, {
      levelIndex,
      obstacles: farFarCone,
      wagons: [{ at: WAGON_AT }],
      actions: [board],
      until: WAGON_AT + 2600,
      expect: (r) => r.rode && r.endHeight < 2,
      detail: (r) => `rode=${r.rode} end=${Math.round(r.endHeight)}`,
    });
  }
  add('wagon: staying on the road is safe and has no boost', {
    levelIndex: 5,
    obstacles: farFarCone,
    wagons: [{ at: WAGON_AT }],
    until: WAGON_AT + 2600,
    expect: (r) => !r.rode && !r.onTop && !r.hits[0],
    detail: (r) => `rode=${r.rode} onTop=${r.onTop}`,
  });
  add('wagon: riding clears what is on the road, including mud', {
    levelIndex: 5,
    obstacles: [{ type: 'pumpkin', at: WAGON_AT + 500 }, { type: 'mudPool', at: WAGON_AT + 1100 }],
    wagons: [{ at: WAGON_AT }],
    actions: [board],
    until: WAGON_AT + 1500,
    expect: (r) => r.rode && !r.hits[0] && !r.hits[1],
    detail: (r) => `rode=${r.rode} hits=${r.hits}`,
  });
  add('wagon: riding pulls away from the chaser', {
    levelIndex: 5,
    obstacles: farFarCone,
    wagons: [{ at: WAGON_AT }],
    actions: [board],
    chase: { startGap: 300, maxGap: 900 },
    until: WAGON_AT + 1600,
    expect: (r) => r.rode && r.gap > 300 + 250,
    detail: (r) => `rode=${r.rode} gap=${Math.round(r.gap)}`,
  });
  add('wagon: Down drops off into a slide', {
    levelIndex: 5,
    obstacles: farFarCone,
    wagons: [{ at: WAGON_AT }],
    actions: [board, { press: 'slide', afterSeconds: 1, after: 0 }],
    until: WAGON_AT + 1500,
    expect: (r) => r.rode && r.sounds.includes('dive') && r.sounds.includes('slide'),
    detail: (r) => `rode=${r.rode} sounds=${r.sounds.join(',')}`,
  });

  // Floating ledges.
  const ledge = (at, height = 150, width = 500) => ({ at, height, width, style: 'plank' });
  add('ledges: the cat jumps up through one and lands on top', {
    obstacles: farCone,
    platforms: [ledge(900)],
    until: 1300,
    actions: [{ press: 'jump', platform: 0, lead: 0.3 }],
    expect: (r) => r.onTop && r.ledgesTouched.includes(0),
  });
  add('ledges: they never block a cat running underneath', {
    obstacles: farCone,
    platforms: [ledge(900)],
    until: 1600,
    expect: (r) => !r.onTop && r.x >= 1600,
  });
  add('ledges: walking off the end falls back to the ground', {
    obstacles: farCone,
    platforms: [ledge(900, 150, 200)],
    until: 1700,
    actions: [{ press: 'jump', platform: 0, lead: 0.3 }],
    expect: (r) => r.onTop && r.sounds.filter((n) => n === 'land').length >= 3,
  });
  add('ledges: Down drops through, and slides on landing', {
    obstacles: farCone,
    platforms: [ledge(900, 150, 800)],
    until: 1500,
    actions: [{ press: 'jump', platform: 0, lead: 0.3 }, { press: 'slide', afterSeconds: 0.9, after: 0 }],
    expect: (r) => r.sounds.includes('dive') && r.sounds.includes('slide'),
    detail: (r) => `sounds=${r.sounds.join(',')}`,
  });
  add('ledges: being up high clears ground obstacles', {
    obstacles: [{ type: 'cone', at: 1100 }],
    platforms: [ledge(900, 150, 400)],
    until: 1500,
    actions: [{ press: 'jump', platform: 0, lead: 0.3 }],
    expect: (r) => !r.hits[0] && r.ledgesTouched.includes(0),
  });
  // Every chain of ledges in every level can be followed, at that level's speed.
  LEVELS.forEach((level, levelIndex) => {
    const speed = level.cat.speed;
    const seen = new Set();
    level.platforms.forEach((p, i) => {
      const chain = [p];
      for (let j = i + 1; j < level.platforms.length; j++) {
        const before = level.platforms[j - 1];
        if (level.platforms[j].at - (before.at + before.width) > speed * 1.5) break;
        chain.push(level.platforms[j]);
      }
      const key = chain.map((c) => c.height).join('-');
      if (chain.length < 2 || seen.has(key)) return;
      if (chain.some((c) => c.lift || c.collapse)) return; // the climb has its own scenarios
      seen.add(key);
      // Rooftops are too high to jump onto from the road: a bin's bounce gets the cat up there.
      const fromBin = p.style === 'rooftop';
      if (fromBin && i > 0 && level.platforms[i - 1].style === 'rooftop') return;
      const offset = (fromBin ? ROOFTOP_START : AT) - p.at;
      const platforms = chain.map((c) => ({ ...c, at: c.at + offset }));
      // Each jump is pressed before the ledge underfoot ends, as a player would.
      const actions = chain.map((c, index) => {
        const before = chain[index - 1];
        const gapSeconds = before ? (c.at - (before.at + before.width)) / speed : 0;
        return { press: 'jump', platform: index, lead: Math.max(0.3, gapSeconds + 0.1) };
      });
      if (fromBin) actions[0] = { ...JUMP_TO_LAND, item: 0 };
      for (const fps of FRAME_RATES) {
        add(`ledges: chain ${key} can be followed, ${level.id}, ${fps}fps`, {
          levelIndex,
          frameMs: 1000 / fps,
          obstacles: fromBin ? [{ type: 'bin', at: ROOFTOP_START - speed * 0.6 }] : farCone,
          platforms,
          actions,
          until: platforms[platforms.length - 1].at + platforms[platforms.length - 1].width,
          expect: (r) => chain.every((_c, index) => r.ledgesTouched.includes(index)),
          detail: (r) => `touched=${r.ledgesTouched} of ${chain.length}`,
        });
      }
    });
  });

  add('ledges: an air jump just after running off a ledge still reaches the next', {
    levelIndex: 2,
    obstacles: farCone,
    platforms: [ledge(900, 180, 552), ledge(1636, 320, 552)],
    until: 2100,
    actions: [{ press: 'jump', platform: 0, lead: 0.3 }, { press: 'jump', platform: 1, lead: 0.3 }],
    expect: (r) => r.ledgesTouched.includes(1),
    detail: (r) => `touched=${r.ledgesTouched} peak=${Math.round(r.peak)}`,
  });

  // The whole family at once, in the final level.
  const family = ['girl', 'boy', 'grandma'];
  const packSpec = { levelIndex: LEVELS.length - 1, obstacles: farCone, chasers: family, pack: true };
  add('pack: everyone is on screen behind the front chaser', {
    ...packSpec,
    until: 1000,
    expect: (r) => r.chaser === 'girl' && r.followers.join() === 'boy,grandma' && r.followerDistances[0] < r.followerDistances[1],
    detail: (r) => `chaser=${r.chaser} followers=${r.followers} at ${r.followerDistances}`,
  });
  add('pack: a knockout brings the next one forward, and removes them from the pack', {
    ...packSpec,
    pickups: box,
    until: 3700,
    actions: knockOut,
    expect: (r) => r.chaser === 'boy' && r.chaserVisible && r.followers.join() === 'grandma',
    detail: (r) => `chaser=${r.chaser} followers=${r.followers} visible=${r.chaserVisible}`,
  });
  add('pack: only the front chaser can lunge', {
    ...packSpec,
    attacks: [{ at: 900 }],
    until: 2600,
    actions: [{ press: 'jump', strikeLead: 0.4 }],
    expect: (r) => r.sounds.filter((n) => n === 'lungeWarn').length === 1 && !r.sounds.includes('hit'),
    detail: (r) => `sounds=${r.sounds.join(',')}`,
  });

  // Fish treats.
  add('treats: touching one collects it, and only once', {
    obstacles: farCone,
    treats: [{ at: 800, height: 30 }, { at: 900, height: 30 }, { at: 1000, height: 300 }],
    until: 1400,
    expect: (r) => r.treats === 2 && r.treatTotal === 3 && r.sounds.filter((n) => n === 'treat').length === 2,
    detail: (r) => `treats=${r.treats} of ${r.treatTotal}`,
  });
  LEVELS.forEach((level, levelIndex) => {
    add(`treats: the autopilot collects some on ${level.id}`, {
      levelIndex,
      autopilot: true,
      expect: (r) => r.treats > 0 && r.treatTotal === level.treats.length && r.state === 'complete',
      detail: (r) => `treats=${r.treats} of ${r.treatTotal} state=${r.state}`,
    });
  });

  // Checkpoints.
  add('checkpoints: reaching one saves progress', {
    obstacles: farCone,
    checkpoints: [800],
    treats: [{ at: 600, height: 30 }],
    until: 1000,
    expect: (r) => r.savedCheckpoint?.x === 800 && r.savedCheckpoint?.treats === 1 && r.sounds.includes('checkpoint'),
    detail: (r) => `saved=${JSON.stringify(r.savedCheckpoint)}`,
  });
  add('checkpoints: getting caught offers to continue', {
    obstacles: farCone,
    checkpoints: [500],
    actions: [{ press: 'release', catX: 700 }],
    until: 2200,
    settleSeconds: 3,
    expect: (r) => r.state === 'failed' && r.actionLabels.includes('Continue from checkpoint') && r.actionLabels.includes('Restart level'),
    detail: (r) => `state=${r.state} actions=${r.actionLabels}`,
  });
  add('checkpoints: continuing starts there, with what was collected', {
    obstacles: [{ type: 'cone', at: 700 }, { type: 'bench', at: 2400 }],
    startCheckpoint: { x: 1000, treats: 7, hasPaw: true, rosterIndex: 0 },
    until: 1500,
    expect: (r) => r.x >= 1500 && r.treats === 7 && r.hasPaw && r.hits.length === 1 && r.seconds < 2,
    detail: (r) => `x=${Math.round(r.x)} treats=${r.treats} hasPaw=${r.hasPaw} items=${r.hits.length} seconds=${r.seconds}`,
  });
  LEVELS.forEach((level, levelIndex) => {
    level.checkpoints.forEach((x, i) => {
      add(`checkpoints: ${level.id} can be finished from checkpoint ${i + 1}`, {
        levelIndex,
        startCheckpoint: { x, treats: 0, hasPaw: false, rosterIndex: 0 },
        autopilot: true,
        expect: (r) => r.state === 'complete',
        detail: (r) => `state=${r.state} hits=${r.hits.filter(Boolean).length} x=${Math.round(r.x)}`,
      });
    });
  });

  // Movement rules.
  const cones = [{ type: 'cone', at: 1100 }, { type: 'cone', at: 1800 }, { type: 'cone', at: 2500 }];
  add('double jump: only one per jump', {
    obstacles: [{ type: 'cone', at: 4000 }],
    until: 1000,
    actions: [
      { press: 'jump', lead: 99 },
      { press: 'jump', afterSeconds: 0.2, after: 0 },
      { press: 'jump', afterSeconds: 0.15, after: 1 },
    ],
    expect: (r) => r.sounds.filter((s) => s === 'doubleJump').length === 1,
  });
  add('dive: pressing slide in the air dives, then slides', {
    obstacles: [{ type: 'cone', at: 4000 }],
    until: 1000,
    actions: [{ press: 'jump', lead: 99 }, { press: 'slide', afterSeconds: 0.3, after: 0 }],
    expect: (r) => r.sounds.includes('dive') && r.sounds.includes('slide'),
  });
  add('landing: the cat can jump again from on top', {
    obstacles: [{ type: 'bench', at: AT }, { type: 'bench', at: AT + 500 }],
    until: AT + 800,
    actions: [JUMP_TO_LAND, { ...JUMP, item: 1 }],
    expect: (r) => r.onTop && !r.hits[0] && !r.hits[1],
  });
  add('van: the roof can be landed on', {
    obstacles: [{ type: 'van', at: AT }],
    until: AT + 500,
    actions: BIG_JUMP,
    expect: (r) => clean(r) && r.onTop,
  });
  add('van: a bin bounce can reach the roof', {
    obstacles: [{ type: 'bin', at: AT }, { type: 'van', at: AT + 420 }],
    until: AT + 800,
    actions: [JUMP_TO_LAND],
    expect: (r) => !r.hits[0] && !r.hits[1],
  });
  add('sprint: three clean passes earn one', {
    obstacles: cones,
    until: 3000,
    actions: cones.map((_, item) => ({ ...JUMP, item })),
    expect: (r) => r.sprint && r.sounds.includes('sprint'),
  });
  add('sprint: a hit breaks the streak', {
    obstacles: cones,
    until: 3000,
    actions: [JUMP, { ...JUMP, item: 2 }],
    expect: (r) => !r.sprint && r.hits[1],
  });
  add('chase: repeated hits close the gap', {
    levelIndex: TEST_LEVEL,
    obstacles: cones,
    until: 3000,
    expect: (r) => r.gap < LEVELS[TEST_LEVEL].chase.startGap,
    detail: (r) => `gap=${Math.round(r.gap)}`,
  });

  return scenarios;
}

// Sweeps press timing to measure how long the player really has for each move.
export function buildWindowSweeps() {
  const sweeps = [];
  for (const [typeName, type] of Object.entries(OBSTACLES)) {
    if (type.reskinOf) continue; // the same timing as the obstacle it's based on
    let press = null;
    let position;
    if (type.avoid === 'jump') press = 'jump';
    if (type.avoid === 'slide') press = 'slide';
    if (type.avoid === 'read') {
      position = Object.keys(type.motion.moves).find((p) => type.motion.moves[p] === 'jump');
      press = 'jump';
    }
    if (!press) continue;
    SPEED_LEVELS.forEach((levelIndex) => {
      const obstacles = [{ type: typeName, at: AT, position }];
      sweeps.push({
        typeName,
        press,
        levelIndex,
        runs: WINDOW_LEADS.map((lead) => ({
          lead,
          spec: { levelIndex, obstacles, actions: [{ press, lead }], until: AT + 400 },
        })),
      });
    });
  }
  return sweeps;
}

export { MIN_PRESS_WINDOW_SECONDS };
