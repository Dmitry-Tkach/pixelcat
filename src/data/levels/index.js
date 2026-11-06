// Levels play in this order. Each is a list of sections from sections.js, assembled at its speed.
// To add a level: add a plan, then run `npm test` and `npm run test:play`. They check that spacing
// is fair and that the level can be completed.
//
// cat:      the cat's full running speed
// chase:    ownerSpeed must be below cat.speed, or the cat can never win back distance.
//           The owner catches the cat when the gap shrinks to catchGap.
// music:    which track from data/music.js plays, and how fast
// chasers:  who chases, from data/chasers.js. The first starts, and each knockout brings the next.
// warningSeconds: how much warning the level's lunges give
// title, intro, outro: the story shown before and after the level
// theme:    the world, from data/themes.js. It swaps shared obstacles for that world's own.
// light:    an optional tint over the scenery, for the time of day as the journey goes on
// finalRush: { seconds, extraSpeed }, the chaser speeds up for this long before the escape point
// finalDash: { seconds, multiplier, hint }, the cat gets one last burst of speed before the end
// pack:     every chaser is on screen at once, and each knockout brings the next one forward
// plan:     section names in order. { section, hint } also shows a message on arriving there, and
//           { section, mouse: true } hides the level's toy mouse in that section's mouseSpot.
//           A plan should rise and fall: calm, build-up, a peak, then relief before the end.

import { THEMES } from '../themes.js';
import { SECTIONS } from './sections.js';

const START_AT = 900; // the first section begins here, after a moment to get going
const END_MARGIN_SECONDS = 2;
const ARC_TREATS = 5;
const ARC_STEP_SECONDS = 0.115;
const ARC_PEAK = 185;
const ARC_BASE = 40;
const LINE_STEP_SECONDS = 0.135;
const HINT_LEAD_SECONDS = 1.1;

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
function buildLevel({ plan, warningSeconds, finalRush, finalDash, ...config }) {
  const speed = config.cat.speed;
  const { swap = {}, ledges = {} } = THEMES[config.theme];
  const level = {
    ...config,
    obstacles: [],
    platforms: [],
    treats: [],
    pickups: [],
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
    for (const { t } of section.wagons ?? []) level.wagons.push({ at: worldAt(t) });
    for (const { t } of section.attacks ?? []) level.attacks.push({ at: worldAt(t), warningSeconds });
    if (section.checkpoint) level.checkpoints.push(worldAt(section.checkpoint.t));
    for (const treat of section.treats ?? []) {
      if (treat.arc !== undefined) level.treats.push(...arcTreats(worldAt(treat.arc), speed));
      else level.treats.push(...lineTreats(worldAt(treat.line), treat.count, treat.height, speed));
    }
    cursor += section.duration * speed;
  }
  level.length = Math.round(cursor + END_MARGIN_SECONDS * speed);
  level.treats = level.treats.map((treat) => ({ ...treat, at: Math.round(treat.at) }));
  if (finalRush) {
    level.finalRush = { at: Math.round(level.length - finalRush.seconds * speed), extraSpeed: finalRush.extraSpeed };
  }
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
    title: 'Vet Day',
    intro: 'The carrier is out, and she has that look in her eye. Today is vet day. Out of the door, and run!',
    outro: 'You made it out of the front garden. But the family isn\'t giving up that easily.',
    cat: { speed: 360 },
    music: { track: 'chase', bpm: 138 },
    chase: { ownerSpeed: 330, startGap: 560, maxGap: 640, catchGap: 110 },
    chasers: ['girl', 'boy'],
    plan: [
      'breather',
      { section: 'hops', hint: 'Collect fish coins for stars!' },
      { section: 'benches', hint: 'You can land on top of obstacles!' },
      { section: 'lunge', hint: 'Lunge! Jump as she dashes' },
      'duck',
      { section: 'checkpoint', hint: 'A checkpoint: you restart here if caught' },
      { section: 'ledges', hint: 'Jump up onto the ledges. Press Down to drop off' },
      { section: 'van', hint: 'Too tall? Press jump again in the air', mouse: true },
      'breather',
      { section: 'crossingIntro', hint: 'Green light: keep running. Red light: jump the car!' },
      { section: 'combos', hint: 'Press Down in the air to dive into a slide' },
      'lunge',
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
    intro: 'The shops are opening, and everyone is in the way. The boy has joined the hunt, and he\'s quick.',
    outro: 'Past the shops at last. Over the back fence, the city is thinning out.',
    cat: { speed: 395 },
    music: { track: 'chase', bpm: 146 },
    chase: { ownerSpeed: 364, startGap: 550, maxGap: 630, catchGap: 110 },
    chasers: ['boy', 'grandma'],
    plan: [
      'breather',
      'bounce',
      'benches',
      'breather',
      { section: 'dogs', hint: 'Look out above!' },
      'lunge',
      { section: 'crates', hint: 'Crate low: jump. Crate high: slide' },
      'checkpoint',
      { section: 'twoRoutes', hint: 'Ledges: more treats, but watch for the bird. Road: safer', mouse: true },
      { section: 'sprinklers', hint: 'Sprinkler on: jump. Off: run through' },
      'crossings',
      'breather',
      'van',
      'lunge',
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
    intro: 'Grandma was waiting at the crossroads, and she runs faster than she looks. One last dash through the city!',
    outro: 'The city is behind you. Up ahead there are red roofs and green fields. Surely they won\'t follow you here?',
    cat: { speed: 425 },
    music: { track: 'chase', bpm: 154 },
    chase: { ownerSpeed: 393, startGap: 550, maxGap: 620, catchGap: 110 },
    chasers: ['grandma', 'boy', 'girl'],
    finalRush: { seconds: 8, extraSpeed: 25 },
    plan: [
      'breather',
      'benches',
      'dogs',
      'breather',
      'duck',
      'lunge',
      'sprinklers',
      'checkpoint',
      'combos',
      { section: 'rushHour', hint: 'Rush hour! Watch every light' },
      'breather',
      { section: 'rooftops', hint: 'Bounce off the bin and take the rooftops!', mouse: true },
      'breather',
      'lunge',
      'checkpoint',
      'crates',
      'flock',
      'van',
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'village-1',
    name: 'Level 4',
    theme: 'park',
    title: 'Village Lane',
    intro: 'Fresh air, flowers, and no traffic. Then you hear a familiar voice behind you. They followed you all the way here!',
    outro: 'Through the hedge and away. The village green is just ahead.',
    cat: { speed: 410 },
    music: { track: 'village', bpm: 148 },
    chase: { ownerSpeed: 381, startGap: 550, maxGap: 630, catchGap: 110 },
    chasers: ['girl', 'boy'],
    plan: [
      'breather',
      { section: 'hops', hint: 'New place, same moves. Jump the rocks and stumps!' },
      'benches',
      'breather',
      'duck',
      'lunge',
      { section: 'checkpoint', hint: 'Checkpoint ahead!' },
      { section: 'fallingMarket', hint: 'Market day! Watch for shadows' },
      { section: 'twoRoutes', hint: 'High or low? Ledges have more treats', mouse: true },
      'breather',
      { section: 'sprinklers', hint: 'Sprinkler on: jump. Off: run through' },
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
    intro: 'It\'s market day on the green, and apples are falling from every tree. Watch your head, and don\'t stop.',
    outro: 'Out of the village at last. There\'s a dirt road, and the smell of hay.',
    cat: { speed: 435 },
    music: { track: 'village', bpm: 156 },
    chase: { ownerSpeed: 408, startGap: 540, maxGap: 620, catchGap: 110 },
    chasers: ['boy', 'grandma'],
    finalRush: { seconds: 8, extraSpeed: 25 },
    plan: [
      'breather',
      'trip',
      { section: 'dogs', hint: 'Falling apples! Watch for the shadow' },
      'breather',
      'lunge',
      { section: 'crates', hint: 'Tire swing low: jump. High: slide' },
      'checkpoint',
      'fallingMarket',
      'climb',
      'breather',
      { section: 'marketStalls', hint: 'Bounce along the market stalls!', mouse: true },
      'breather',
      'lunge',
      'checkpoint',
      'flock',
      'gauntlet',
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'farm-1',
    name: 'Level 6',
    light: 0xffe9bd,
    theme: 'farm',
    title: 'Sunny Farm',
    intro: 'Pumpkins, hay and very confused sheep. A farm seems like a perfect place to hide, until grandma climbs over the fence.',
    outro: 'You lost them in the barn, or so you thought.',
    cat: { speed: 450 },
    music: { track: 'farm', bpm: 158 },
    chase: { ownerSpeed: 426, startGap: 530, maxGap: 610, catchGap: 110 },
    chasers: ['grandma', 'girl'],
    plan: [
      'breather',
      { section: 'benches', hint: 'Hop the troughs and hay!' },
      { section: 'mudPatch', hint: 'Mud slows you down. Jump across it!' },
      'sprinklers',
      'lunge',
      'breather',
      { section: 'dogs', hint: 'The farm dog wants to play!' },
      'checkpoint',
      { section: 'tractors', hint: 'Red flag: jump the tractor. Green flag: keep running' },
      { section: 'hayRoll', hint: 'Big bales coming! Keep jumping' },
      'breather',
      { section: 'hayWagon', hint: 'Jump on the hay wagon for a fast ride!', mouse: true },
      'breather',
      'lunge',
      'checkpoint',
      'muddyRoad',
      'crates',
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'farm-2',
    name: 'Level 7',
    light: 0xffd49c,
    theme: 'farm',
    title: 'Harvest Run',
    intro: 'The whole farm is working, and the road is full. Rolling hay, swinging buckets, and the family close behind. Keep moving!',
    outro: 'The fields end at a road. It leads back into town, and there\'s no other way out. It goes right past the vet\'s door.',
    cat: { speed: 470 },
    music: { track: 'farm', bpm: 164 },
    chase: { ownerSpeed: 448, startGap: 520, maxGap: 590, catchGap: 110 },
    chasers: ['boy', 'grandma', 'girl'],
    warningSeconds: 0.6,
    finalRush: { seconds: 8, extraSpeed: 25 },
    plan: [
      'breather',
      'muddyRoad',
      'lunge',
      'breather',
      'hayRoll',
      'tractors',
      'checkpoint',
      { section: 'highRoad', mouse: true },
      'flock',
      'crates',
      'lunge',
      'breather',
      'hayWagon',
      'breather',
      'checkpoint',
      'combos',
      'lunge',
      'muddyRoad',
      'homeStretch',
    ],
  }),
  buildLevel({
    id: 'vet-final',
    name: 'Level 8',
    theme: 'vet',
    title: 'The Vet\'s Door',
    intro: 'It\'s nearly dark, and the clinic lights are on. The whole family is here, all at once. Get past the door and you\'re free. This is it!',
    outro: 'You ran right past the vet\'s door and out onto the open road. No vet today, and maybe no vet ever.',
    cat: { speed: 490 },
    music: { track: 'finale', bpm: 172 },
    chase: { ownerSpeed: 472, startGap: 500, maxGap: 570, catchGap: 110 },
    chasers: ['girl', 'boy', 'grandma'],
    pack: true,
    warningSeconds: 0.55,
    finalRush: { seconds: 10, extraSpeed: 25 },
    finalDash: { seconds: 4, multiplier: 1.2, hint: 'The vet\'s door! RUN!' },
    plan: [
      { section: 'breather', hint: 'The whole family! Super Paws knock them out one by one' },
      'van',
      'gauntlet',
      'lunge',
      'breather',
      'highRoad',
      'dogs',
      'checkpoint',
      'twoRoutes',
      { section: 'bounce', mouse: true },
      'crates',
      'lunge',
      'flock',
      'breather',
      'checkpoint',
      { section: 'finale', hint: 'Everything you ran through, all at once!' },
      'lunge',
      'combos',
      'breather',
      'vetDash',
    ],
  }),
];

// The world each level belongs to, for grouping on the level select screen.
export const worldName = (level) => WORLD_COLOR[level.theme];
