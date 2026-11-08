// Obstacle types. To add one: draw its texture, add an entry here, then use it in a level.
//
// avoid:    'jump'       ground obstacle: jump over it
//           'slide'      overhead obstacle: slide under it, or double jump over it
//           'doubleJump' too tall for one jump
//           'read'       changes state: watch it, then choose. `moves` says what each state needs
//           'stay'       passes overhead: only hits a cat that jumps into it
//           'terrain'    lies on the ground: jump across it, or get slowed. It never counts as a hit
//           'lift'       too tall for a double jump: ride a lift, or bounce and double jump
// hitbox:   in texture pixels from the top-left corner (smaller than the art, to feel fair)
// penalty:  how a collision slows the cat
// landable: the cat can land on top safely, and run along it. Its sides still count as hits.
// bounce:   launches a cat that lands on top, at this vertical speed
// heavy:    stays upright when hit
// zone:     for terrain: { width, speedMultiplier }, how wide it is and how much it slows the cat
// solid:    stops the cat dead until it jumps over, while the chaser closes in. Safe to land on.
//           `penalty` is how the cat picks up speed afterward, and `stuckHint` says what to do.
// breakable: a solid obstacle that a sliding cat smashes straight through
// ditch:    { depth }, a gap in the road this deep. A cat that falls in has to jump back out, while
//           the chaser closes in. Its `zone` width is the gap's width.
//
// A type with a `motion` block moves, and in a level its `at` is where it meets the cat.
//
// motion kinds:
//   charge (the default) runs at the cat, using `character` from data/characters.js.
//     speed:           how fast it runs toward the cat
//     leadSeconds:     how long before meeting the cat it starts, with a warning sound and icon
//     anim:            the animation role to play while approaching
//     warnIcon, sound: the warning shown and played when it starts
//     hop:             optional { height, seconds }, low bounces that signal it is a leaper
//     leap:            optional { height, seconds }, a big arc that carries it over a sliding cat
//     flyHeight:       optional, flies at this height above the ground instead of running
//     bob:             optional { height, seconds }, a gentle rise and fall while flying
//     hideIn:          optional texture, a hiding place on the pavement where it waits in plain
//                      sight, and springs out of, instead of running in from off-screen
//   fall drops from above, then becomes a ground obstacle using `texture` and `hitbox`.
//     leadSeconds, fallSeconds, fallFrom, fallingTexture, fallingHitbox, sound, landSound
//   swing moves up and down. Levels add `position` for where it is when the cat arrives.
//     period, maxHeight, moves
//   pulse switches on and off. Levels add `position` for its state when the cat arrives.
//     period, waterTexture, moves
//   A charger without a `character` is a rolling `texture`: spin (degrees per second), rollRadius.
//   crossing drives across the road at a traffic light. Levels add `position` for the light.
//     crossSeconds, passBehindSeconds, hitSeconds, cars, stripesTexture, sound, moves

const STANDARD_HIT = { speedMultiplier: 0.5, durationMs: 900 };
const HEAVY_HIT = { speedMultiplier: 0.42, durationMs: 1000 };
const WALL_RECOVERY = { speedMultiplier: 0.5, durationMs: 600 };

export const OBSTACLES = {
  cone: {
    texture: 'cone',
    avoid: 'jump',
    landable: true,
    hitbox: { x: 22, y: 30, w: 56, h: 86 },
    penalty: STANDARD_HIT,
  },
  bin: {
    texture: 'bin',
    avoid: 'jump',
    landable: true,
    bounce: -1357,
    hitbox: { x: 16, y: 14, w: 68, h: 116 },
    penalty: HEAVY_HIT,
  },
  boxes: {
    texture: 'boxes',
    avoid: 'jump',
    landable: true,
    hitbox: { x: 20, y: 24, w: 106, h: 100 },
    penalty: STANDARD_HIT,
  },
  hydrant: {
    texture: 'hydrant',
    avoid: 'jump',
    landable: true,
    hitbox: { x: 12, y: 12, w: 46, h: 88 },
    penalty: HEAVY_HIT,
  },
  bench: {
    texture: 'bench',
    avoid: 'jump',
    landable: true,
    hitbox: { x: 13, y: 14, w: 124, h: 76 },
    penalty: STANDARD_HIT,
  },
  barrier: {
    texture: 'barrier',
    avoid: 'jump',
    landable: true,
    hitbox: { x: 8, y: 12, w: 114, h: 84 },
    penalty: STANDARD_HIT,
  },
  van: {
    texture: 'van',
    avoid: 'doubleJump',
    landable: true,
    heavy: true,
    hitbox: { x: 10, y: 28, w: 320, h: 272 },
    penalty: HEAVY_HIT,
  },
  manhole: {
    texture: 'manhole',
    avoid: 'jump',
    hitbox: { x: 22, y: 4, w: 88, h: 28 },
    penalty: HEAVY_HIT,
  },
  scaffold: {
    texture: 'scaffold',
    avoid: 'slide',
    hitbox: { x: 20, y: 40, w: 130, h: 122 },
    penalty: HEAVY_HIT,
  },
  washingLine: {
    texture: 'washing-line',
    avoid: 'slide',
    hitbox: { x: 14, y: 40, w: 142, h: 122 },
    penalty: STANDARD_HIT,
  },
  banner: {
    texture: 'banner',
    avoid: 'slide',
    hitbox: { x: 14, y: 40, w: 142, h: 122 },
    penalty: STANDARD_HIT,
  },

  // Runs straight at the cat. Jump over it.
  dog: {
    character: 'dog',
    avoid: 'jump',
    hitbox: { x: 30, y: 44, w: 120, h: 76 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'charge',
      speed: 150,
      leadSeconds: 1.6,
      anim: 'run',
      warnIcon: 'warn-jump',
      sound: 'bark',
    },
  },

  // Bounds along, then leaps at head height. Slide under it.
  leapingDog: {
    character: 'dog',
    avoid: 'slide',
    hitbox: { x: 30, y: 44, w: 120, h: 76 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'charge',
      speed: 170,
      leadSeconds: 1.6,
      anim: 'leap',
      warnIcon: 'warn-slide',
      sound: 'bark',
      hop: { height: 34, seconds: 0.42 },
      leap: { height: 135, seconds: 0.85 },
    },
  },

  // A dog hiding in a bin on the pavement, which bursts out and leaps at the cat. Slide under it.
  binDog: {
    character: 'dog',
    avoid: 'slide',
    hitbox: { x: 30, y: 44, w: 120, h: 76 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'charge',
      speed: 230,
      leadSeconds: 1.3,
      anim: 'leap',
      warnIcon: 'warn-slide',
      sound: 'bark',
      hideIn: 'bin',
      leap: { height: 135, seconds: 0.85 },
    },
  },

  // Rolls along the road at the cat. Jump over it.
  barrel: {
    texture: 'barrel',
    avoid: 'jump',
    hitbox: { x: 14, y: 14, w: 72, h: 72 },
    penalty: HEAVY_HIT,
    motion: {
      kind: 'charge',
      speed: 130,
      leadSeconds: 1.6,
      spin: -320,
      rollRadius: 50,
      warnIcon: 'warn-jump',
      sound: 'rumble',
    },
  },

  // A long line of pigeons at head height. Slide under them, or double jump over.
  pigeonFlock: {
    character: 'flock',
    avoid: 'slide',
    hitbox: { x: 20, y: 24, w: 290, h: 66 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'charge',
      speed: 150,
      leadSeconds: 1.8,
      anim: 'fly',
      warnIcon: 'warn-slide',
      sound: 'caw',
      flyHeight: 96,
      bob: { height: 3, seconds: 0.5 },
    },
  },

  // Flies at head height. Slide under it.
  bird: {
    character: 'bird',
    avoid: 'slide',
    hitbox: { x: 20, y: 18, w: 80, h: 64 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'charge',
      speed: 170,
      leadSeconds: 1.6,
      anim: 'fly',
      warnIcon: 'warn-slide',
      sound: 'caw',
      flyHeight: 100,
      bob: { height: 4, seconds: 0.5 },
    },
  },

  // Flies just above the cat's head. Stay on the ground, or get hit by jumping into it.
  highBird: {
    character: 'bird',
    avoid: 'stay',
    hitbox: { x: 20, y: 18, w: 80, h: 64 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'charge',
      speed: 170,
      leadSeconds: 1.6,
      anim: 'fly',
      warnIcon: 'warn-stay',
      sound: 'caw',
      flyHeight: 160,
      bob: { height: 6, seconds: 0.5 },
    },
  },

  // Falls from a balcony with a warning shadow, then lies in the road. Jump over the pieces.
  flowerPot: {
    texture: 'pot-broken',
    avoid: 'jump',
    hitbox: { x: 10, y: 8, w: 70, h: 36 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'fall',
      leadSeconds: 1.05,
      fallSeconds: 0.5,
      fallFrom: 780,
      fallingTexture: 'pot',
      fallingHitbox: { x: 10, y: 10, w: 50, h: 70 },
      sound: 'whistle',
      landSound: 'smash',
    },
  },

  // Swings on a crane rope. Jump over it when it's low, slide under it when it's high.
  crate: {
    texture: 'crate',
    avoid: 'read',
    hitbox: { x: 17, y: 6, w: 96, h: 104 },
    penalty: HEAVY_HIT,
    motion: {
      kind: 'swing',
      period: 2.6,
      maxHeight: 120,
      moves: { low: 'jump', high: 'slide' },
    },
  },

  // Cars keep crossing the road. Red light: one is coming, so wait for it or jump over it.
  // Green light: run across. Levels add `position`, which is what a cat at top speed finds there.
  crossingCar: {
    texture: 'car-1',
    avoid: 'read',
    hitbox: { x: 30, y: 26, w: 90, h: 110 },
    penalty: HEAVY_HIT,
    motion: {
      kind: 'crossing',
      crossSeconds: 1.6,
      cycleSeconds: 3.6, // how often a car crosses
      hitSeconds: 0.45, // how long either side of the middle of its crossing a car can hit the cat
      cars: ['car-1', 'car-2', 'car-3'],
      stripesTexture: 'zebra-crossing',
      redLight: 'traffic-light-red',
      greenLight: 'traffic-light-green',
      sound: 'honk',
      moves: { red: 'jump', green: 'none' },
    },
  },

  // Sprays on and off. Jump over the water when it's on, and just run through when it's off.
  sprinkler: {
    texture: 'sprinkler',
    avoid: 'read',
    hitbox: { x: 23, y: 12, w: 54, h: 148 },
    penalty: STANDARD_HIT,
    motion: {
      kind: 'pulse',
      period: 2.4,
      waterTexture: 'sprinkler-water',
      moves: { on: 'jump', off: 'none' },
    },
  },
};

// Other worlds' versions of the obstacles above: the same size and behaviour, with new art.
const reskin = (base, texture, changes = {}) => ({ ...OBSTACLES[base], texture, reskinOf: base, ...changes });
const appleFall = { ...OBSTACLES.flowerPot.motion, fallingTexture: 'apple' };

Object.assign(OBSTACLES, {
  // Village
  rock: reskin('cone', 'rock'),
  stump: reskin('hydrant', 'stump'),
  hedge: reskin('barrier', 'hedge'),
  logPile: reskin('boxes', 'log-pile'),
  mud: reskin('manhole', 'mud'),
  branch: reskin('scaffold', 'branch'),
  iceCreamVan: reskin('van', 'ice-cream-van'),
  mushroom: reskin('bin', 'mushroom'),
  tireSwing: reskin('crate', 'tire-swing'),
  apple: reskin('flowerPot', 'apple-splat', { motion: appleFall }),
  // Things falling from the market's windows and stalls.
  fruitCrate: reskin('flowerPot', 'fruit-splat', { motion: { ...OBSTACLES.flowerPot.motion, fallingTexture: 'fruit-crate' } }),
  laundry: reskin('flowerPot', 'laundry-pile', { motion: { ...OBSTACLES.flowerPot.motion, fallingTexture: 'laundry-bundle' } }),
  // A market stall. Land on its awning to bounce, far enough to reach the next stall in a row.
  marketStall: {
    texture: 'market-stall',
    avoid: 'jump',
    landable: true,
    bounce: -1552,
    hitbox: { x: 48, y: 64, w: 93, h: 116 },
    penalty: HEAVY_HIT,
  },
  // Stone walls stop the cat dead. The tall one takes a double jump.
  stoneWall: {
    texture: 'stone-wall',
    avoid: 'jump',
    solid: true,
    stuckHint: 'Stuck! JUMP!',
    hitbox: { x: 11, y: 8, w: 88, h: 120 },
    penalty: WALL_RECOVERY,
  },
  tallStoneWall: {
    texture: 'stone-wall-tall',
    avoid: 'doubleJump',
    solid: true,
    stuckHint: 'Too tall! Jump twice!',
    hitbox: { x: 10, y: 8, w: 90, h: 272 },
    penalty: WALL_RECOVERY,
  },
  gateWall: {
    texture: 'stone-wall-gate',
    avoid: 'lift',
    solid: true,
    stuckHint: 'Too tall! Use the lift, or bounce and double jump',
    hitbox: { x: 10, y: 8, w: 90, h: 472 },
    penalty: WALL_RECOVERY,
  },
  // The same dog, hiding in a hedge or a haystack.
  hedgeDog: reskin('binDog', undefined, { motion: { ...OBSTACLES.binDog.motion, hideIn: 'hedge' } }),
  hayDog: reskin('binDog', undefined, { motion: { ...OBSTACLES.binDog.motion, hideIn: 'hay-stack' } }),
  // Farm
  pumpkin: reskin('cone', 'pumpkin'),
  milkCan: reskin('hydrant', 'milk-can'),
  fence: reskin('barrier', 'fence'),
  hayStack: reskin('boxes', 'hay-stack'),
  trough: reskin('bench', 'trough'),
  farmSign: reskin('scaffold', 'farm-sign'),
  tractor: reskin('van', 'tractor'),
  hayBale: reskin('bin', 'hay-bale'),
  bucket: reskin('crate', 'bucket'),
  rollingHay: reskin('barrel', 'rolling-hay'),

  // Same as a crossing car, but a tractor, with flags instead of traffic lights.
  tractorCrossing: reskin('crossingCar', 'tractor-front', {
    motion: {
      ...OBSTACLES.crossingCar.motion,
      cars: ['tractor-front'],
      stripesTexture: 'dirt-crossing',
      redLight: 'farm-flag-red',
      greenLight: 'farm-flag-green',
    },
  }),

  // A ditch across the road. Jump it, or fall in and climb out.
  ditch: {
    texture: 'ditch',
    avoid: 'terrain',
    zone: { width: 184, speedMultiplier: 0.5 },
    ditch: { depth: 46 },
  },

  // A tall stack of cardboard boxes: slide into it to smash through, or jump it twice.
  boxStack: {
    texture: 'box-stack',
    avoid: 'doubleJump',
    solid: true,
    breakable: true,
    stuckHint: 'Slide into the boxes to smash them!',
    hitbox: { x: 8, y: 10, w: 92, h: 266 },
    penalty: WALL_RECOVERY,
  },

  // Wide mud. Crossing it slows the cat, but it doesn't end a streak. Jump across it.
  mudPool: {
    texture: 'mud-pool',
    avoid: 'terrain',
    zone: { width: 280, speedMultiplier: 0.6 },
  },

  // A big bale rolling fast down the road. Jump over it.
  bigHay: {
    texture: 'big-hay',
    avoid: 'jump',
    hitbox: { x: 18, y: 18, w: 94, h: 94 },
    penalty: HEAVY_HIT,
    motion: {
      kind: 'charge',
      speed: 170,
      leadSeconds: 1.7,
      spin: -300,
      rollRadius: 65,
      warnIcon: 'warn-jump',
      sound: 'rumble',
    },
  },
});

// Each world's walls.
Object.assign(OBSTACLES, {
  brickWall: reskin('stoneWall', 'brick-wall'),
  tallBrickWall: reskin('tallStoneWall', 'brick-wall-tall'),
  gateBrickWall: reskin('gateWall', 'brick-wall-gate'),
  woodWall: reskin('stoneWall', 'wood-wall'),
  tallWoodWall: reskin('tallStoneWall', 'wood-wall-tall'),
  gateWoodWall: reskin('gateWall', 'wood-wall-gate'),
});
