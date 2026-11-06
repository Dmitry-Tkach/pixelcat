// Global tuning values. Per-level values (speeds, chase distances) live in data/levels.

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
const WORLD_BOTTOM = BASE_HEIGHT; // the lowest world y that's drawn, the bottom of the road
const BASE_CAT_SCREEN_X = 670;

export const GAME = {
  WIDTH: BASE_WIDTH, // updated by setViewAspect to match the window's shape
  HEIGHT: BASE_HEIGHT,
  GROUND_Y: 665,
  CAMERA_ZOOM: 0.9, // below 1 shows more of the world, at the cost of smaller characters
  GROUND_OVERLAP: 8, // obstacles sit this far into the road, so they look planted
};

// What the zoomed camera can see, in world pixels. Kept up to date by setViewAspect.
export const VIEW = {
  // How far ahead of the cat the player can see. It never changes with the window's shape,
  // so a wider screen doesn't make the game easier: extra width goes behind the cat.
  AHEAD: (BASE_WIDTH - BASE_CAT_SCREEN_X) / GAME.CAMERA_ZOOM,
};

// Sizes the game view to fill a window of this shape. The ground stays at the bottom of the
// screen. Wider windows see more behind the cat, and taller ones see more sky.
export function setViewAspect(aspect) {
  const wider = aspect >= BASE_WIDTH / BASE_HEIGHT;
  GAME.WIDTH = wider ? Math.round(BASE_HEIGHT * aspect) : BASE_WIDTH;
  GAME.HEIGHT = wider ? BASE_HEIGHT : Math.round(BASE_WIDTH / aspect);

  const { WIDTH, HEIGHT, CAMERA_ZOOM } = GAME;
  VIEW.WIDTH = WIDTH / CAMERA_ZOOM;
  VIEW.HEIGHT = HEIGHT / CAMERA_ZOOM;
  VIEW.LEFT_OFFSET = (WIDTH - VIEW.WIDTH) / 2; // visible left edge, relative to camera scrollX
  VIEW.RIGHT_OFFSET = (WIDTH + VIEW.WIDTH) / 2; // visible right edge, relative to camera scrollX
  VIEW.TOP = WORLD_BOTTOM - VIEW.HEIGHT; // the highest visible world y
  VIEW.SCROLL_Y = WORLD_BOTTOM - HEIGHT / 2 - VIEW.HEIGHT / 2; // lines up the bottom of the world
  VIEW.CAT_OFFSET = VIEW.RIGHT_OFFSET - VIEW.AHEAD; // how far the cat stands from camera scrollX
  return { width: WIDTH, height: HEIGHT };
}
setViewAspect(BASE_WIDTH / BASE_HEIGHT);

export const MOVEMENT = {
  GRAVITY: 2000,
  JUMP_VELOCITY: -960,
  AIR_JUMP_VELOCITY: -800, // the second jump, pressed in the air
  FAST_FALL_VELOCITY: 1300,
  SLIDE_DISTANCE: 420, // measured in distance, so slides fit obstacles at every level speed
  JUMP_BUFFER_MS: 130,
  PLATFORM_DROP_MS: 220, // how long the cat ignores ledges after dropping through one
};

// A clean run of avoided obstacles earns a short burst of speed.
export const SPRINT = {
  STREAK: 3,
  MULTIPLIER: 1.2,
  DURATION_MS: 1500,
};

// Hay wagons on the farm. Riding one carries the cat along, on top of its own running.
export const WAGON = {
  SPEED_RATIO: 0.6, // how fast the wagon drives, compared with the level's top speed
  START_AHEAD: 1000, // it starts driving when the cat is this far before the place it should meet
  DECK_WIDTH: 720,
  DECK_HEIGHT: 150,
};

// The player runs the cat. Clean running builds momentum, and that's the only way to go faster than
// the chaser. The hybrid mode always runs, with the keys changing the speed. Speeds are shares of
// the level's top speed.
export const FREE_MOVE = {
  START_SHARE: 0.55, // just started, or just hit something
  BUILD_SECONDS: 3, // how long running clean takes to reach top speed
  LOSS_RATE: 2, // momentum lost per second when not running forward
  BACK_SHARE: 0.55,
  ACCELERATION: 1800,
  AIR_CONTROL: 0.6, // how much of that acceleration the cat has in the air
  CRASH_SPEED: 100, // walking into a wall slower than this isn't a crash
  RUNNING_SPEED: 100, // going forward faster than this counts as running on, not hanging around
  IDLE_BELOW: 20, // slower than this looks like standing still
  HYBRID_MOMENTUM: 0.45, // where momentum settles with no key held in hybrid mode
  HYBRID_BRAKE_SHARE: 0.4,
};

// The camera rises once the cat's feet are this far above the road.
export const CLIMB_CAMERA = { FOLLOW_ABOVE: 300, RATE: 6 };

// How long a collapsing ledge holds after the cat lands, and how long it takes to fall.
export const COLLAPSE = { DELAY_MS: 550, FALL_MS: 600, SHAKE: 3 };

// Landing from a big drop gives a burst of speed.
export const BIG_LAND = { FALL_SPEED: 1250, MULTIPLIER: 1.2, DURATION_MS: 1500, SHAKE: 0.008 };

// The chaser's lunge. The cat must be at least DODGE_HEIGHT off the ground for the whole strike.
export const LUNGE = {
  WARNING_SECONDS: 0.7,
  DASH_MS: 350,
  STRIKE_MS: 220,
  RECOVER_MS: 700,
  DODGE_HEIGHT: 110,
  GRAB_DISTANCE_LOSS: 220,
  MISS_DISTANCE_BONUS: 70,
};

// The Super Paw knocks the chaser off screen for a while.
export const PAW = {
  KO_MS: 3500,
  COUNTER_KO_MS: 5500, // for hitting her during a lunge
  RETURN_MS: 1000,
  RETURN_FROM_BEHIND: 500, // how far off-screen she starts running back from
};

// How high one jump lifts the cat's feet.
export const SINGLE_JUMP_HEIGHT = MOVEMENT.JUMP_VELOCITY ** 2 / (2 * MOVEMENT.GRAVITY);

// How long one jump stays in the air, in seconds.
export const JUMP_AIR_TIME = (2 * -MOVEMENT.JUMP_VELOCITY) / MOVEMENT.GRAVITY;

// The reaction time levels must leave between one obstacle and the next.
export const MIN_REACTION_SECONDS = 0.35;
