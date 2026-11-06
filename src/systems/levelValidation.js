import {
  GAME,
  JUMP_AIR_TIME,
  WAGON,
  MIN_REACTION_SECONDS,
  MOVEMENT,
  LUNGE,
  SINGLE_JUMP_HEIGHT,
  VIEW,
} from '../config/gameConfig.js';
import { CHARACTERS } from '../data/characters.js';
import { CHASERS } from '../data/chasers.js';
import { activationCatX, startX } from './obstacleMotion.js';

const START_CLEARANCE = 800; // the player needs a moment before the first obstacle
const END_CLEARANCE = 400;
const MIN_JUMP_WINDOW_SECONDS = 0.15; // the shortest fair moment to press jump
const COMBO_BASE_SPACING = 200; // a combo needs at least this room, plus time to respond
const COMBO_RESPONSE_SECONDS = 0.5;
const DOUBLE_JUMP_RUN_UP_SECONDS = 2.2; // the cat must have landed before it can start one
const LEDGE_REACH_MARGIN = 0.85; // leaves room for pressing a little early or late
const CHAIN_GAP_SECONDS = 1.5; // ledges further apart than this are separate routes
const CHECKPOINT_CLEAR_SECONDS = 1.5; // room after a checkpoint, so restarting there is fair
const MAX_PLATFORM_HEIGHT = 700; // the camera rises with a climbing cat, up to about here
const MAX_TREAT_HEIGHT = 800;
const ZONE_JUMP_MARGIN = 0.8; // leaves room for pressing a little early or late
// Room around a lunge, so the cat can land from the obstacle before it, and land from the
// lunge's own jump in time to clear the obstacle after it.
const LUNGE_CLEARANCE_BEFORE_SECONDS = 0.9;
const LUNGE_CLEARANCE_AFTER_SECONDS = 1;

const CAT = CHARACTERS.cat;
const CAT_WIDTH = CAT.hitboxes.run.w * CAT.scale;

// The room one avoid action takes at a given speed, including time to react to what's next.
export function minSpacingAfter(avoid, speed) {
  const jumpRoom = speed * JUMP_AIR_TIME + speed * MIN_REACTION_SECONDS;
  const slideRoom = MOVEMENT.SLIDE_DISTANCE + speed * MIN_REACTION_SECONDS;
  switch (avoid) {
    case 'slide':
      return slideRoom;
    case 'read': // either move might be needed
      return Math.max(jumpRoom, slideRoom);
    case 'doubleJump':
      return speed * 1.5 + 300;
    default:
      return jumpRoom;
  }
}

// The tighter spacing allowed when a level marks an obstacle as a combo with the previous one.
export function minComboSpacing(speed) {
  return COMBO_BASE_SPACING + speed * COMBO_RESPONSE_SECONDS;
}

// How long the player has to press jump and still clear an obstacle, in seconds.
export function jumpWindowSeconds(type, catSpeed) {
  const closingSpeed = catSpeed + (type.motion?.speed ?? 0);
  const buried = type.motion ? 0 : GAME.GROUND_OVERLAP;
  const clearance = type.hitbox.h - buried;
  const velocity = -MOVEMENT.JUMP_VELOCITY;
  const root = Math.sqrt(velocity * velocity - 2 * MOVEMENT.GRAVITY * clearance);
  if (Number.isNaN(root)) return 0; // too tall to jump over
  const timeAboveObstacle = (2 * root) / MOVEMENT.GRAVITY;
  const distanceAvailable = closingSpeed * timeAboveObstacle;
  return (distanceAvailable - type.hitbox.w - CAT_WIDTH) / closingSpeed;
}

function validateCharger(type, at, index, catSpeed, errors) {
  const { speed, leadSeconds } = type.motion;
  if (activationCatX(at, catSpeed, leadSeconds) < 0) {
    errors.push(`moving obstacle ${index} would need to start before the level does`);
  }
  const startDistance = startX(at, speed, leadSeconds) - activationCatX(at, catSpeed, leadSeconds);
  if (startDistance <= VIEW.AHEAD) {
    errors.push(`moving obstacle ${index} would appear on screen instead of running in`);
  }
}

function validateObstacle(obstacle, i, type, level, errors) {
  const speed = level.cat.speed;
  if (obstacle.at < START_CLEARANCE) errors.push(`obstacle ${i} is too close to the start`);
  if (obstacle.at > level.length - END_CLEARANCE) errors.push(`obstacle ${i} is too close to the escape point`);

  if (['jump', 'read'].includes(type.avoid) && jumpWindowSeconds(type, speed) < MIN_JUMP_WINDOW_SECONDS) {
    errors.push(`obstacle ${i} (${obstacle.type}) leaves too little time to jump over it`);
  }
  if (type.avoid === 'doubleJump' && type.hitbox.h - GAME.GROUND_OVERLAP <= SINGLE_JUMP_HEIGHT) {
    errors.push(`obstacle ${i} (${obstacle.type}) can be cleared with one jump`);
  }
  if (type.motion?.moves && !(obstacle.position in type.motion.moves)) {
    const options = Object.keys(type.motion.moves).map((p) => `"${p}"`).join(' or ');
    errors.push(`obstacle ${i} (${obstacle.type}) needs a position of ${options}`);
  }
  if (type.motion?.speed) validateCharger(type, obstacle.at, i, speed, errors);
  if (type.zone && type.zone.width > speed * JUMP_AIR_TIME * ZONE_JUMP_MARGIN) {
    errors.push(`obstacle ${i} (${obstacle.type}) is too wide to jump across`);
  }
}

// A wagon needs room to drive into view, and nothing that interrupts the ride.
function validateWagons(level, errors) {
  const speed = level.cat.speed;
  // Riding is faster than the wagon, so the cat leaves it after covering this much of the level.
  const rideLength = WAGON.DECK_WIDTH / (1 - WAGON.SPEED_RATIO);
  (level.wagons ?? []).forEach((wagon, i) => {
    if (wagon.at < START_CLEARANCE) errors.push(`wagon ${i} is too close to the start`);
    if (wagon.at + rideLength > level.length - END_CLEARANCE) errors.push(`wagon ${i} is too close to the escape point`);
    const seconds = (attack) => (attack.warningSeconds ?? LUNGE.WARNING_SECONDS) + LUNGE.DASH_MS / 1000;
    if ((level.attacks ?? []).some((attack) => {
      const strikeAt = attack.at + speed * seconds(attack);
      return strikeAt >= wagon.at && strikeAt <= wagon.at + rideLength;
    })) {
      errors.push(`wagon ${i} has a lunge during its ride`);
    }
  });
}

// Can the cat jump from the end of one ledge (or the ground) onto the next, in one jump?
export function ledgeReachable(fromHeight, toHeight, gap, speed) {
  const rise = toHeight - fromHeight;
  if (rise >= SINGLE_JUMP_HEIGHT) return false;
  const velocity = -MOVEMENT.JUMP_VELOCITY;
  const landingSeconds = (velocity + Math.sqrt(velocity * velocity - 2 * MOVEMENT.GRAVITY * rise)) / MOVEMENT.GRAVITY;
  return gap <= speed * landingSeconds * LEDGE_REACH_MARGIN;
}

function validateExtras(level, errors) {
  const { obstacles, platforms = [], checkpoints = [], treats = [], cat: { speed } } = level;
  // A lift has to be reachable from, and to, wherever it happens to be.
  const lowest = (platform) => platform.height - (platform.lift?.travel ?? 0);
  const highest = (platform) => platform.height + (platform.lift?.travel ?? 0);

  checkpoints.forEach((x, i) => {
    if (obstacles.some((o) => o.at >= x && o.at - x < speed * CHECKPOINT_CLEAR_SECONDS)) {
      errors.push(`checkpoint ${i} has an obstacle too soon after it`);
    }
  });

  platforms.forEach((platform, i) => {
    if (highest(platform) > MAX_PLATFORM_HEIGHT) errors.push(`platform ${i} is too high`);
    const next = platforms[i + 1];
    if (!next) return;
    const gap = next.at - (platform.at + platform.width);
    if (gap < 0) errors.push(`platforms ${i} and ${i + 1} overlap`);
    // Only ledges in the same chain need to connect.
    if (gap < speed * CHAIN_GAP_SECONDS && !ledgeReachable(lowest(platform), highest(next), gap, speed)) {
      errors.push(`platform ${i + 1} can't be reached from platform ${i}`);
    }
  });

  if (level.mouse && level.mouse.height > MAX_TREAT_HEIGHT) errors.push('the toy mouse is too high to reach');
  treats.forEach((treat, i) => {
    if (treat.height > MAX_TREAT_HEIGHT) errors.push(`treat ${i} is too high to reach`);
  });
}

// A lunge needs a jump, so the moment it lands must be clear of every obstacle.
function validateAttacks(level, errors) {
  const speed = level.cat.speed;
  (level.attacks ?? []).forEach((attack, i) => {
    const seconds = (attack.warningSeconds ?? LUNGE.WARNING_SECONDS) + LUNGE.DASH_MS / 1000;
    const strikeAt = attack.at + speed * seconds;
    const tooClose = (o) => o.at < strikeAt
      ? strikeAt - o.at < speed * LUNGE_CLEARANCE_BEFORE_SECONDS
      : o.at - strikeAt < speed * LUNGE_CLEARANCE_AFTER_SECONDS;
    if (level.obstacles.some(tooClose)) {
      errors.push(`lunge ${i} lands too close to an obstacle`);
    }
  });
}

// Returns a list of problems, empty when the level is playable and fair.
export function validateLevel(level, obstacleTypes, themes, musicTracks) {
  const errors = [];
  const { cat, chase, obstacles } = level;

  if (!themes[level.theme]) errors.push(`unknown theme "${level.theme}"`);
  if (!level.title || !level.intro || !level.outro) errors.push('level needs a title, intro and outro');
  if (!musicTracks[level.music?.track]) errors.push(`unknown music track "${level.music?.track}"`);
  if (chase.ownerSpeed >= cat.speed) errors.push('the owner must be slower than the cat at full speed');
  for (const id of level.chasers ?? []) {
    if (!CHASERS[id]) errors.push(`unknown chaser "${id}"`);
    else if (chase.ownerSpeed + CHASERS[id].speedDelta >= cat.speed) errors.push(`${id} would be faster than the cat`);
  }
  if (chase.startGap <= chase.catchGap) errors.push('startGap must be larger than catchGap');
  if (chase.startGap > chase.maxGap) errors.push('startGap must not exceed maxGap');

  obstacles.forEach((obstacle, i) => {
    const type = obstacleTypes[obstacle.type];
    if (!type) {
      errors.push(`unknown obstacle type "${obstacle.type}"`);
      return;
    }
    validateObstacle(obstacle, i, type, level, errors);

    const next = obstacles[i + 1];
    if (!next) return;
    let needed = next.combo ? minComboSpacing(cat.speed) : minSpacingAfter(type.avoid, cat.speed);
    if (obstacleTypes[next.type]?.avoid === 'doubleJump') needed = Math.max(needed, cat.speed * DOUBLE_JUMP_RUN_UP_SECONDS);
    // Spacing is measured from the near and far edges of a wide zone, not its middle.
    needed += (type.zone?.width ?? 0) / 2 + (obstacleTypes[next.type]?.zone?.width ?? 0) / 2;
    if (next.at - obstacle.at < needed) errors.push(`obstacles ${i} and ${i + 1} are too close to avoid both`);
  });

  validateAttacks(level, errors);
  validateExtras(level, errors);
  validateWagons(level, errors);
  return errors;
}
