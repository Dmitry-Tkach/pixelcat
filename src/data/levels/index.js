// Levels play in this order. Each is a list of sections from sections.js, assembled at its speed.
// To add a level: add a plan, then run `npm test` and `npm run test:play`. They check that spacing
// is fair and that the level can be completed.
//
// cat:      the cat's top speed, reached by running clean. It also sets the level's spacing
// chase:    the chaser's constant speed. It must be below cat.speed, or the cat can never win back distance.
//           The owner catches the cat when the gap shrinks to catchGap.
// music:    which track from data/music.js plays, and how fast
// chasers:  who chases, from data/chasers.js. The first starts, and each knockout brings the next.
// title, intro, outro: the story shown before and after the level
// theme:    the world, from data/themes.js. It swaps shared obstacles for that world's own.
// light:    an optional tint over the scenery, for the time of day as the journey goes on
// finalDash: { seconds, multiplier, hint }, the cat gets one last burst of speed before the end
// pack:     every chaser is on screen at once, and each knockout brings the next one forward
// startHint: a message shown as the level begins
// lunges:   { farGap, nearGap, farEverySeconds, nearEverySeconds, warningSeconds, dodgeBonus }, lunges
//           that depend on how close the chaser is
// shortcut: { offscreenSeconds, warningSeconds, landGap, cooldownSeconds, graceSeconds }, a chaser
//           left far behind takes a shortcut back into view, and treats count double until then
// highGround: { safeHeight, holdMargin, beneathRange, climbSeconds }, a cat this high can't be caught
//           from the road. A chaser waits holdMargin past catchGap, and one within beneathRange
//           of that climbs up after climbSeconds
// plan:     section names in order. { section, hint } also shows a message on arriving there, and
//           { section, mouse: true } hides the level's toy mouse in that section's mouseSpot.
//           A plan should rise and fall: calm, build-up, a peak, then relief before the end.

import { THEMES } from '../themes.js';
import { SECTIONS } from './sections.js';

const START_AT = 900; // the first section begins here, after a moment to get going
const END_MARGIN_SECONDS = 2;
const ARC_TREATS = 5;
const ARC_STEP_SECONDS = 0.1;
const ARC_PEAK = 185;
const ARC_BASE = 40;
const LINE_STEP_SECONDS = 0.135;
const HINT_LEAD_SECONDS = 1.1;

// How hard the family pushes, gentlest first. Level 5's numbers were tried out by hand, and the
// others are set around them.
const HIGH_GROUND = { safeHeight: 150, holdMargin: 20, beneathRange: 100, climbSeconds: 2.5 };
const PRESSURE = {
  gentle: {
    lunges: { farGap: 450, nearGap: 260, farEverySeconds: 10, nearEverySeconds: 5, warningSeconds: 0.8, dodgeBonus: 200 },
    shortcut: { offscreenSeconds: 6, warningSeconds: 2, landGap: 520, cooldownSeconds: 20, graceSeconds: 3 },
  },
  normal: {
    lunges: { farGap: 520, nearGap: 300, farEverySeconds: 7, nearEverySeconds: 3.5, warningSeconds: 0.7, dodgeBonus: 180 },
    shortcut: { offscreenSeconds: 4, warningSeconds: 1.5, landGap: 450, cooldownSeconds: 14, graceSeconds: 2 },
  },
  fierce: {
    lunges: { farGap: 580, nearGap: 340, farEverySeconds: 5.5, nearEverySeconds: 2.8, warningSeconds: 0.6, dodgeBonus: 160 },
    shortcut: { offscreenSeconds: 3.5, warningSeconds: 1.3, landGap: 400, cooldownSeconds: 11, graceSeconds: 1.5 },
  },
};

// A curve of treats that follows a jump over `center`.
function arcTreats(center, speed) {
  const half = (ARC_TREATS - 1) / 2;
  return Array.from({ length: ARC_TREATS }, (_, i) => {
    const u = (i - half) / half;
    return { at: center + u * half * ARC_STEP_SECONDS * speed, height: ARC_BASE + ARC_PEAK * (1 - u * u) };
  });
}

function lineTreats(start, count, height, speed) {
  return Array.from({ length: count }, (_, i) => ({ at: start + i * LINE_STEP_SECONDS * speed, height }));
}

// Turns a plan into world positions, using the level's speed.
function buildLevel({ plan, finalDash, ...config }) {
  const speed = config.cat.speed;
  const { swap = {}, ledges = {} } = THEMES[config.theme];
  const level = {
    highGround: HIGH_GROUND,
    ...config,
    obstacles: [],
    platforms: [],
    treats: [],
    pickups: [],
    pawBlocks: [],
    catFlaps: [],
    crows: [],
    wagons: [],
    attacks: [],
    checkpoints: [],
    hints: [],
  };
  let cursor = START_AT;
  const worldAt = (t) => Math.round(cursor + t * speed);

  for (const step of plan) {
    const { section: name, hint, mouse } = typeof step === 'string' ? { section: step } : step;
    const section = SECTIONS[name];
    if (!section) throw new Error(`Unknown section "${name}" in ${config.id}`);
    if (hint) level.hints.push({ at: Math.round(cursor - HINT_LEAD_SECONDS * speed), text: hint });
    if (mouse) level.mouse = { at: worldAt(section.mouseSpot.t), height: section.mouseSpot.height };

    for (const { t, type, ...entry } of section.obstacles ?? []) {
      level.obstacles.push({ ...entry, type: swap[type] ?? type, at: worldAt(t) });
    }
    for (const { t, seconds, style, ...entry } of section.platforms ?? []) {
      level.platforms.push({ ...entry, style: ledges[style] ?? style, at: worldAt(t), width: Math.round(seconds * speed) });
    }
    for (const { t, type } of section.pickups ?? []) level.pickups.push({ type, at: worldAt(t) });
    for (const { t, reward, count } of section.pawBlocks ?? []) level.pawBlocks.push({ at: worldAt(t), reward, count });
    if (section.catFlap) level.catFlaps.push({ at: worldAt(section.catFlap.t), exitAt: worldAt(section.catFlap.exit) });
    if (section.crow) level.crows.push({ at: worldAt(section.crow.t), until: worldAt(section.crow.until) });
    if (section.boss) level.boss = { type: section.boss.type, at: worldAt(section.boss.t) };
    for (const { t } of section.wagons ?? []) level.wagons.push({ at: worldAt(t) });
    if (section.checkpoint) level.checkpoints.push(worldAt(section.checkpoint.t));
    for (const treat of section.treats ?? []) {
      if (treat.arc !== undefined) level.treats.push(...arcTreats(worldAt(treat.arc), speed));
      else level.treats.push(...lineTreats(worldAt(treat.line), treat.count, treat.height, speed));
    }
    cursor += section.duration * speed;
  }
  level.length = Math.round(cursor + END_MARGIN_SECONDS * speed);
  level.treats = level.treats.map((treat) => ({ ...treat, at: Math.round(treat.at) }));
  if (finalDash) {
    level.finalDash = { ...finalDash, at: Math.round(level.length - finalDash.seconds * speed) };
  }
  return level;
}

const WORLD_COLOR = { city: 'City', park: 'Village', farm: 'Farm', vet: 'Sunset' };

export const LEVELS = [
  buildLevel({
    id: 'city-1',
    name: 'Level 1',
    light: 0xffe4cf,
    theme: 'city',
    title: 'Bath Day',
    intro: 'The bath is running, and she has a towel and that look in her eye. Today is bath day! Hold the right arrow to run, and get to the park!',
    outro: 'You made it to the little park on the corner. But the family isn\'t giving up that easily.',
    cat: { speed: 360 },
    music: { track: 'chase', bpm: 138 },
    chase: { ownerSpeed: 252, startGap: 750, maxGap: 1200, catchGap: 110 },
    chasers: ['girl', 'boy'],
    ...PRESSURE.gentle,
    startHint: 'Hold right to run! Clean running builds speed',
    plan: [
      'breather',
      { section: 'hops', hint: 'Collect fish coins for stars!' },
      { section: 'benches', hint: 'You can land on top of obstacles!' },
      { section: 'pawBlocks', hint: 'Paw blocks! Jump into them from below' },
      'breather',
      'duck',
      { section: 'checkpoint', hint: 'A checkpoint: you restart here if caught' },
      { section: 'ledges', hint: 'Jump up onto the ledges. Press Down to drop off' },
      { section: 'van', hint: 'Too tall? Press jump again in the air', mouse: true },
      'breather',
      { section: 'crossingIntro', hint: 'Green light: run across. Red light: wait for the car, or jump it' },
      { section: 'combos', hint: 'Press Down in the air to dive into a slide' },
      { section: 'wallIntro', hint: 'Walls stop you dead! Jump them' },
      { section: 'flock', hint: 'Low birds: slide. High birds: stay down' },
      { section: 'bounce', hint: 'Land on a bin to bounce high' },
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'city-2',
    name: 'Level 2',
    theme: 'city',
    title: 'Main Street',
    intro: 'The shops are opening, and everyone is in the way. The boy has joined the hunt with a sponge, and he\'s quick. The garden square is at the end of the street!',
    outro: 'Safe in the garden square, for now. Over the railings, the city is thinning out.',
    cat: { speed: 395 },
    music: { track: 'chase', bpm: 146 },
    chase: { ownerSpeed: 285, startGap: 700, maxGap: 1200, catchGap: 110 },
    chasers: ['boy', 'grandma'],
    ...PRESSURE.normal,
    plan: [
      'breather',
      'bounce',
      'benches',
      'breather',
      { section: 'dogs', hint: 'Look out above!' },
      'breather',
      { section: 'crates', hint: 'Crate low: jump. Crate high: slide. Or wait for your moment' },
      'checkpoint',
      { section: 'ditches', hint: 'Roadworks! Jump the ditches' },
      'pawSurprise',
      'breather',
      { section: 'twoRoutes', hint: 'Ledges: more treats, but watch for the bird. Road: safer', mouse: true },
      { section: 'sprinklers', hint: 'Sprinkler on: jump, or wait. Off: run through' },
      'crossings',
      'breather',
      'wallIntro',
      { section: 'liftGate', hint: 'Too tall! Wait for the lift, or bounce and double jump' },
      'van',
      'checkpoint',
      'combos',
      'flock',
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'city-3',
    name: 'Level 3',
    light: 0xfff6e6,
    theme: 'city',
    title: 'Rush Hour',
    intro: 'Grandma was waiting at the crossroads with the shampoo, and she runs faster than she looks. One last dash through the city, to the big city park!',
    outro: 'Even the Crown Cat couldn\'t stop you, and the city park is all yours. Beyond it there are red roofs and green fields. Surely they won\'t follow you here?',
    cat: { speed: 425 },
    music: { track: 'chase', bpm: 154 },
    chase: { ownerSpeed: 315, startGap: 700, maxGap: 1200, catchGap: 110 },
    chasers: ['grandma', 'boy', 'girl'],
    ...PRESSURE.normal,
    plan: [
      'breather',
      'benches',
      'dogs',
      'breather',
      'duck',
      'breather',
      'sprinklers',
      'breather',
      { section: 'binDogs', hint: 'Dogs in the bins! Slide when they leap' },
      'checkpoint',
      'combos',
      { section: 'rushHour', hint: 'Rush hour! Watch every light' },
      'breather',
      { section: 'bigClimb', hint: 'Climb the scaffolding! Awnings collapse, and walls wait below', mouse: true },
      'breather',
      'checkpoint',
      'crates',
      'breather',
      { section: 'boxStack', hint: 'Too tall to jump? Slide into the boxes!' },
      'flock',
      'wallIntro',
      'van',
      'checkpoint',
      'crownCatArena',
    ],
  }),
  buildLevel({
    id: 'village-1',
    name: 'Level 4',
    theme: 'park',
    title: 'Village Lane',
    intro: 'Fresh air, flowers, and no traffic. Then you hear a familiar voice behind you, and the slosh of a bucket. They followed you all the way here! Run for the little park by the church.',
    outro: 'Through the hedge and into the churchyard garden. The village green is just ahead.',
    cat: { speed: 410 },
    music: { track: 'village', bpm: 148 },
    chase: { ownerSpeed: 290, startGap: 750, maxGap: 1200, catchGap: 110 },
    chasers: ['girl', 'boy'],
    ...PRESSURE.gentle,
    plan: [
      'breather',
      { section: 'hops', hint: 'New place, same moves. Jump the rocks and stumps!' },
      'benches',
      'breather',
      'duck',
      'breather',
      { section: 'checkpoint', hint: 'Checkpoint ahead!' },
      { section: 'catFlapShortcut', hint: 'A cat flap! Slide into it for a shortcut' },
      'ditches',
      { section: 'fallingMarket', hint: 'Market day! Watch for shadows' },
      { section: 'twoRoutes', hint: 'High or low? Ledges have more treats', mouse: true },
      'breather',
      'wallIntro',
      { section: 'sprinklers', hint: 'Sprinkler on: jump, or wait. Off: run through' },
      { section: 'liftGate', hint: 'Too tall! Wait for the lift, or bounce and double jump' },
      { section: 'bounce', hint: 'Land on the mushroom to bounce high' },
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'village-2',
    name: 'Level 5',
    light: 0xfff2d9,
    theme: 'park',
    title: 'The Village Green',
    intro: 'It\'s market day on the green, and apples are falling from every tree. Watch your head, and don\'t stop until you reach the green!',
    outro: 'Not even the Bomber Rat could stop you, and the village green is yours. Beyond it there\'s a dirt road, and the smell of hay.',
    cat: { speed: 435 },
    music: { track: 'village', bpm: 156 },
    chase: { ownerSpeed: 330, startGap: 700, maxGap: 1200, catchGap: 110 },
    chasers: ['boy', 'grandma'],
    ...PRESSURE.normal,
    plan: [
      'breather',
      'trip',
      'wallIntro',
      { section: 'dogs', hint: 'Falling apples! Watch for the shadow' },
      'breather',
      { section: 'crates', hint: 'Tire swing low: jump. High: slide' },
      { section: 'crowOverhead', hint: 'A crow! It drops acorns where its shadow falls: jump them' },
      'checkpoint',
      'fallingMarket',
      'breather',
      'boxStack',
      'pawBlocks',
      'breather',
      { section: 'bigClimb', hint: 'Climb the market! Awnings collapse, and walls wait below', mouse: true },
      'breather',
      'checkpoint',
      { section: 'liftGate', hint: 'Too tall! Wait for the lift, or bounce and double jump' },
      { section: 'marketStalls', hint: 'Bounce along the market stalls!' },
      'breather',
      'flock',
      'gauntlet',
      'homeStretch',
      'checkpoint',
      'bomberRatArena',
    ],
  }),
  buildLevel({
    id: 'farm-1',
    name: 'Level 6',
    light: 0xffe9bd,
    theme: 'farm',
    title: 'Sunny Farm',
    intro: 'Pumpkins, hay and very confused sheep. A farm seems like a perfect place to hide, until grandma climbs over the fence with a towel. Head for the meadow!',
    outro: 'Not even the Ginger Gunner could stop you. You reached the meadow and lost the family in the long grass. Or so you thought.',
    cat: { speed: 450 },
    music: { track: 'farm', bpm: 158 },
    chase: { ownerSpeed: 335, startGap: 700, maxGap: 1200, catchGap: 110 },
    chasers: ['grandma', 'girl'],
    ...PRESSURE.normal,
    plan: [
      'breather',
      { section: 'benches', hint: 'Hop the troughs and hay!' },
      { section: 'mudPatch', hint: 'Mud slows you down. Jump across it!' },
      'sprinklers',
      'breather',
      { section: 'dogs', hint: 'The farm dog wants to play!' },
      'breather',
      { section: 'catnipRun', hint: 'Catnip! Grab it and bowl right through' },
      'checkpoint',
      { section: 'tractors', hint: 'Red flag: wait for the tractor, or jump it. Green flag: run' },
      { section: 'hayRoll', hint: 'Big bales coming! Keep jumping' },
      'breather',
      { section: 'hayWagon', hint: 'Jump on the hay wagon for a fast ride!', mouse: true },
      'breather',
      'checkpoint',
      'wallIntro',
      'catFlapShortcut',
      'ditches',
      'breather',
      { section: 'liftGate', hint: 'Too tall! Wait for the lift, or bounce and double jump' },
      'muddyRoad',
      'crates',
      'homeStretch',
      'checkpoint',
      'orangeCatArena',
    ],
  }),
  buildLevel({
    id: 'farm-2',
    name: 'Level 7',
    light: 0xffd49c,
    theme: 'farm',
    title: 'Harvest Run',
    intro: 'The whole farm is working, and the road is full. Rolling hay, swinging buckets, and the family close behind. Keep moving, all the way to the meadow by the river!',
    outro: 'The meadow ends at a road back into town. And at the end of it is the biggest park of all.',
    cat: { speed: 470 },
    music: { track: 'farm', bpm: 164 },
    chase: { ownerSpeed: 365, startGap: 700, maxGap: 1200, catchGap: 110 },
    chasers: ['boy', 'grandma', 'girl'],
    ...PRESSURE.fierce,
    plan: [
      'breather',
      'muddyRoad',
      'breather',
      'hayRoll',
      'tractors',
      'checkpoint',
      { section: 'bigClimb', hint: 'Up the hay stacks! They collapse, and fences wait below', mouse: true },
      'flock',
      'binDogs',
      'crowOverhead',
      'crates',
      'breather',
      'hayWagon',
      'breather',
      'boxStack',
      'pawSurprise',
      'ditches',
      'checkpoint',
      'combos',
      'wallIntro',
      'muddyRoad',
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'vet-final',
    name: 'Level 8',
    theme: 'vet',
    title: 'Sunset Park',
    intro: 'It\'s nearly dark, and the street lamps are on. The whole family is here, all at once, and the bath is still warm. Make it through the park gates and you\'re free. This is it!',
    outro: 'You ran through the park gates as the sun went down. No bath today, and maybe no bath ever.',
    cat: { speed: 490 },
    music: { track: 'finale', bpm: 172 },
    chase: { ownerSpeed: 390, startGap: 650, maxGap: 1200, catchGap: 110 },
    chasers: ['girl', 'boy', 'grandma'],
    pack: true,
    ...PRESSURE.fierce,
    finalDash: { seconds: 4, multiplier: 1.2, hint: 'The vet\'s door! RUN!' },
    plan: [
      { section: 'breather', hint: 'The whole family! Super Paws knock them out one by one' },
      'van',
      'gauntlet',
      'breather',
      'dogs',
      'checkpoint',
      'twoRoutes',
      { section: 'bounce', mouse: true },
      'crates',
      'wallIntro',
      'flock',
      'breather',
      'checkpoint',
      'catnipRun',
      'binDogs',
      'crowOverhead',
      'breather',
      'bigClimb',
      'breather',
      'liftGate',
      'catFlapShortcut',
      'breather',
      'boxStack',
      { section: 'finale', hint: 'Everything you ran through, all at once!' },
      'combos',
      'breather',
      'vetDash',
    ],
  }),
];

// The world each level belongs to, for grouping on the level select screen.
export const worldName = (level) => WORLD_COLOR[level.theme];
