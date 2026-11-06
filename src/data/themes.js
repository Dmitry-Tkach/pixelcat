// Visual worlds for levels. `factor` is how fast a layer scrolls relative to the camera,
// `y` and `height` place the layer on screen. Keeping layers only as tall as their art
// avoids drawing transparent pixels, which matters on phones.
// A new theme is a new set of layer images plus an entry here.

const FOREGROUND_DEPTH = 8;

const layers = (world, clouds = `${world}-clouds`) => [
  { texture: clouds, factor: 0.04, y: -80, height: 320 },
  { texture: `${world}-far`, factor: 0.15, y: 0, height: 520 },
  { texture: `${world}-near`, factor: 0.55, y: 0, height: 540 },
  { texture: `${world}-street`, factor: 1, y: 520, height: 200 },
  // In front of the cat, and low enough to stay below its feet, so it never hides a hazard.
  { texture: `${world}-fore`, factor: 1.35, y: 672, height: 48, depth: FOREGROUND_DEPTH },
];

// gate:  the escape point's image.
// swap:  replaces obstacle types from the shared level sections with this world's own.
// ledges: replaces ledge styles the same way.
export const THEMES = {
  city: {
    backdrop: 'city-sky',
    layers: layers('city'),
    gate: 'gate',
  },
  park: {
    backdrop: 'park-sky',
    layers: layers('park', 'city-clouds'),
    gate: 'park-gate',
    swap: {
      cone: 'rock',
      hydrant: 'stump',
      barrier: 'hedge',
      boxes: 'logPile',
      manhole: 'mud',
      scaffold: 'branch',
      banner: 'branch',
      van: 'iceCreamVan',
      bin: 'mushroom',
      crate: 'tireSwing',
      flowerPot: 'apple',
    },
    ledges: { awning: 'leafy' },
  },
  farm: {
    backdrop: 'farm-sky',
    layers: layers('farm', 'city-clouds'),
    gate: 'farm-gate',
    swap: {
      cone: 'pumpkin',
      hydrant: 'milkCan',
      barrier: 'fence',
      boxes: 'hayStack',
      bench: 'trough',
      manhole: 'mud',
      scaffold: 'farmSign',
      banner: 'farmSign',
      van: 'tractor',
      bin: 'hayBale',
      crate: 'bucket',
      flowerPot: 'apple',
      barrel: 'rollingHay',
    },
    ledges: { awning: 'hay' },
  },
  vet: {
    backdrop: 'vet-sky',
    layers: layers('vet'),
    gate: 'vet-gate',
  },
};

const WORLD_IMAGES = {
  'park-sky': 'park-sky', 'park-far': 'park-far', 'park-near': 'park-near', 'park-street': 'park-street',
  'farm-sky': 'farm-sky', 'farm-far': 'farm-far', 'farm-near': 'farm-near', 'farm-street': 'farm-street',
  'vet-sky': 'vet-sky', 'vet-clouds': 'vet-clouds', 'vet-far': 'vet-far', 'vet-near': 'vet-near', 'vet-street': 'vet-street',
  rock: 'rock', stump: 'stump', hedge: 'hedge', 'log-pile': 'log-pile', mud: 'mud', branch: 'branch',
  'ice-cream-van': 'ice-cream-van', mushroom: 'mushroom', 'tire-swing': 'tire-swing', apple: 'apple', 'apple-splat': 'apple-splat',
  'platform-leafy': 'platform-leafy', 'park-gate': 'park-gate',
  pumpkin: 'pumpkin', 'milk-can': 'milk-can', fence: 'fence', 'hay-stack': 'hay-stack', trough: 'trough', 'farm-sign': 'farm-sign',
  tractor: 'tractor', 'hay-bale': 'hay-bale', bucket: 'bucket', 'rolling-hay': 'rolling-hay', 'platform-hay': 'platform-hay', 'farm-gate': 'farm-gate',
  'tractor-front': 'tractor-front', 'dirt-crossing': 'dirt-crossing', 'farm-flag-red': 'farm-flag-red', 'farm-flag-green': 'farm-flag-green',
  'market-stall': 'market-stall', 'fruit-crate': 'fruit-crate', 'fruit-splat': 'fruit-splat', 'laundry-bundle': 'laundry-bundle', 'laundry-pile': 'laundry-pile',
  'platform-roof': 'platform-roof', 'roof-wall': 'roof-wall', 'toy-mouse': 'toy-mouse',
  'stone-wall': 'stone-wall', 'stone-wall-tall': 'stone-wall-tall',
  'city-fore': 'city-fore', 'park-fore': 'park-fore', 'farm-fore': 'farm-fore', 'vet-fore': 'vet-fore',
  'mud-pool': 'mud-pool', 'big-hay': 'big-hay', 'hay-wagon': 'hay-wagon',
  'vet-gate': 'vet-gate',
};

// Every image file the themes and obstacles need: texture key -> path under public/.
export const IMAGE_ASSETS = {
  ...Object.fromEntries(Object.entries(WORLD_IMAGES).map(([key, file]) => [key, `assets/worlds/${file}.png`])),
  'city-sky': 'assets/city/sky.png',
  'city-clouds': 'assets/city/clouds.png',
  'city-far': 'assets/city/far.png',
  'city-near': 'assets/city/near.png',
  'city-street': 'assets/city/street.png',
  cone: 'assets/city/cone.png',
  bin: 'assets/city/bin.png',
  boxes: 'assets/city/boxes.png',
  scaffold: 'assets/city/scaffold.png',
  hydrant: 'assets/city/hydrant.png',
  bench: 'assets/city/bench.png',
  barrier: 'assets/city/barrier.png',
  banner: 'assets/city/banner.png',
  van: 'assets/city/van.png',
  pot: 'assets/city/pot.png',
  'pot-broken': 'assets/city/pot-broken.png',
  crate: 'assets/city/crate.png',
  'warn-jump': 'assets/city/warn-jump.png',
  'warn-slide': 'assets/city/warn-slide.png',
  'warn-stay': 'assets/city/warn-stay.png',
  gate: 'assets/city/gate.png',
  manhole: 'assets/city/manhole.png',
  'car-1': 'assets/city/car-1.png',
  'car-2': 'assets/city/car-2.png',
  'car-3': 'assets/city/car-3.png',
  'zebra-crossing': 'assets/city/zebra-crossing.png',
  'traffic-light-red': 'assets/city/traffic-light-red.png',
  'traffic-light-green': 'assets/city/traffic-light-green.png',
  barrel: 'assets/city/barrel.png',
  sprinkler: 'assets/city/sprinkler.png',
  'sprinkler-water': 'assets/city/sprinkler-water.png',
  'washing-line': 'assets/city/washing-line.png',
  'platform-awning': 'assets/city/platform-awning.png',
  'platform-plank': 'assets/city/platform-plank.png',
  fish: 'assets/city/fish.png',
  'checkpoint-flag': 'assets/city/checkpoint-flag.png',
  'paw-box': 'assets/city/paw-box.png',
  'paw-head': 'assets/city/paw-head.png',
  'paw-spring': 'assets/city/paw-spring.png',
  'paw-icon': 'assets/city/paw-icon.png',
  star: 'assets/city/star.png',
};
