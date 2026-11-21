// The Autumn Forest world's own art (world 2), prepared by tools/adventure-autumn-art.mjs into
// public/assets/adventure/autumn (its characters by tools/adventure-autumn-characters.mjs). Every other picture a level asks for (the minigun, the traps, the
// gates, the water wheel...) is the Wood world's (data/adventure/index.js, adventureArtKey).
import { OWL_KEYS } from './birds.js';
import { rockKitArt } from './rocks.js';
import { pillarKitArt } from './pillars.js';
import { scaffoldKitArt } from './scaffolds.js';
import { brickKitArt } from './bricks.js';
import { DAM_ART } from './dam.js';

// The squirrel's acorn: cut from its sheet's cell (row, col, from 0), shrunk to `width` px long.
export const ACORN = { sheet: 'images/levels/autumn/squirrel.png', row: 3, col: 0, width: 28 };

// The owner's scenery sheets (images/levels/autumn, from prompts/autumn-level 03 to 05), cut by
// tools/adventure-autumn-scenery.mjs: each sheet's pieces in rows, as found on it, left to right.
// Pieces named like a stand-in (the vine, the cracked floor, the switch, the door, the fish) take
// its place; until a sheet comes, the stand-in stays.
export const AUTUMN_SHEETS = {
  'village-props': [['cottage', 'mill-house'], ['banner-pole', 'banner-rolled', 'banner-open'], ['lamp-post', 'hang-lantern', 'fish-1', 'fish-2']],
  'ruins-gate': [['ruin-arch', 'ruin-pillar'], ['guardian-gate', 'gate-door', 'cat-statue'], ['switch-off', 'switch-on', 'drawbridge']],
  'mine-secrets': [['mine-frame', 'minecart', 'mine-rail'], ['cracked', 'chunk-1', 'chunk-2', 'chunk-3'], ['vine'], ['crystal-purple', 'crystal-blue']],
  'cliff-stairs-posts': [['cliff', 'stairs-up-right', 'stairs-up-left'], ['post-cross', 'post-rope', 'stake-tall', 'stake-small', 'post-candle'], ['boulder-big', 'boulder-small']],
  // The spiked ball is the Autumn world's mace (trap-mace); the pier deck becomes its bridge tile.
  'bridges-fire': [['pier-deck', 'pier-post'], ['rope-plank', 'move-block', 'trap-mace'], ['fire-bowl', 'big-tree', 'small-tree']],
  // The waterfall steps: the falling strip becomes the world's fall-middle (made to loop), the big
  // splash its fall-splash; the stepped cliff, ledges and rocks they pour over.
  'waterfall-steps': [['fall-strip', 'fall-strip-narrow'], ['fall-spill', 'fall-landing', 'fall-splash'], ['fall-mist', 'fall-trickle']],
  'waterfall-rocks': [['cliff-steps-right', 'cliff-steps-left'], ['ledge-wide', 'ledge-narrow', 'rock-column'], ['pool-rocks', 'pool-rocks-small']],
  // The waterfall cliff drawn on its own, big (prompt 15), so it's sharp: shown smaller than drawn.
  'big-waterfall-cliff': [['big-cliff']],
  // Level 2, The Hidden Dam (prompts/hidden-dam): the dam's wall, its gate doors, the lever and the
  // EXIT sign, and the flooded part's floor.
  'grand-dam': [['grand-dam']],
  'dam-doors': [['dam-door-closed', 'dam-door-open']],
  'lever-exit': [['lever-off', 'lever-on', 'exit-sign']],
  'underwater-decor': [
    ['uw-weed-1', 'uw-weed-2', 'uw-plants-1', 'uw-plants-2'],
    ['uw-stone-1', 'uw-stone-2', 'uw-pebbles-1', 'uw-pebbles-2'],
    ['uw-shell-1', 'uw-shell-2', 'uw-plank-1', 'uw-plank-2'],
  ],
};
// The size (px) each piece is cut to, as it's shown in the game: its width, its height, or both.
// The banners are cut at the pole's scale (withPole), so they hang from it at the size drawn.
export const AUTUMN_PIECES = {
  cottage: { width: 440 }, 'mill-house': { width: 400 },
  'banner-pole': { height: 170 }, 'banner-rolled': { withPole: true }, 'banner-open': { withPole: true },
  'lamp-post': { height: 120 }, 'hang-lantern': { height: 70 }, 'fish-1': { width: 64 }, 'fish-2': { width: 64 },
  'ruin-arch': { width: 250 }, 'ruin-pillar': { height: 200 },
  'guardian-gate': { height: 300 }, 'gate-door': { height: 200 }, 'cat-statue': { height: 150 },
  'switch-off': { width: 56, height: 56 }, 'switch-on': { width: 56, height: 56 }, drawbridge: { width: 64 },
  'mine-frame': { width: 520 }, minecart: { width: 150 }, 'mine-rail': { width: 128 },
  cracked: { width: 64, height: 64 }, 'chunk-1': { width: 26 }, 'chunk-2': { width: 22 }, 'chunk-3': { width: 18 },
  vine: { width: 48 }, 'crystal-purple': { width: 80 }, 'crystal-blue': { width: 80 },
  cliff: { height: 700 }, 'stairs-up-right': { height: 128 }, 'stairs-up-left': { height: 128 },
  'post-cross': { height: 70 }, 'post-rope': { height: 70 }, 'stake-tall': { height: 60 }, 'stake-small': { height: 42 }, 'post-candle': { height: 70 },
  'boulder-big': { width: 130 }, 'boulder-small': { width: 90 },
  'pier-deck': { width: 136 }, 'pier-post': { width: 40 }, 'rope-plank': { width: 64 }, 'move-block': { width: 192 },
  'trap-mace': { height: 84 }, 'fire-bowl': { height: 120 }, 'big-tree': { width: 440 }, 'small-tree': { width: 260 },
  'fall-strip': { width: 150 }, 'fall-strip-narrow': { width: 120 }, 'fall-spill': { width: 220 }, 'fall-landing': { width: 260 },
  'fall-splash': { width: 260 }, 'fall-mist': { width: 300 }, 'fall-trickle': { height: 200 },
  // The stepped cliffs are shown bigger than drawn: cut straight to the size shown, sharpened, so
  // they're resized once, not twice (cut, then scaled in the game), which blurred them.
  'cliff-steps-right': { width: 988, sharpen: true }, 'cliff-steps-left': { width: 988, sharpen: true }, 'ledge-wide': { width: 260 }, 'ledge-narrow': { width: 150 },
  'rock-column': { width: 140 }, 'big-cliff': { width: 1095 }, 'pool-rocks': { width: 300 }, 'pool-rocks-small': { width: 180 },
  // The dam's doors are drawn behind its wall, a little bigger than its arches (DAM_ART), so the
  // arches frame them with no gap; the tool crops off their own stone pillars.
  'grand-dam': { width: DAM_ART.width }, 'dam-door-closed': { height: DAM_ART.doorHeight }, 'dam-door-open': { height: DAM_ART.doorHeight },
  'lever-off': { height: 96 }, 'lever-on': { height: 96 }, 'exit-sign': { height: 120 },
  'uw-weed-1': { height: 120 }, 'uw-weed-2': { height: 120 }, 'uw-plants-1': { width: 84 }, 'uw-plants-2': { width: 84 },
  'uw-stone-1': { width: 110 }, 'uw-stone-2': { width: 110 }, 'uw-pebbles-1': { width: 90 }, 'uw-pebbles-2': { width: 90 },
  'uw-shell-1': { width: 40 }, 'uw-shell-2': { width: 40 }, 'uw-plank-1': { width: 120 }, 'uw-plank-2': { width: 120 },
};

// The falling strip, made to loop as the world's fall-middle: its bright top band (topCut of its
// height) is cut off, and its bottom (blend of what's left) faded into its top, then dropped, so
// stacked copies join with no line.
export const FALL_STRIP = { topCut: 0.08, blend: 0.15 };

// The pier deck as the bridge tile (the strip's tenth, systems/adventureMap.js TILES.bridge): its
// middle, `slice` px wide, at the top of the tile, so walkways and bridges are the owner's pier.
export const PIER_TILE = { slice: 64 };

// The Wood world's leaves and plants, turned from green to autumn's orange and gold.
export const AUTUMN_FROM_WOOD = [
  'leaves', 'decor-tuft-1', 'decor-tuft-2', 'decor-flowers-1', 'decor-flowers-2', 'decor-vine-1', 'decor-vine-2', 'decor-vine-3',
];

export const AUTUMN_ART = [
  // From the Autumn Forest pack, with the same names as the Wood world's.
  'tiles', 'ladder', 'spike', 'bonus', 'bonus-used', 'box', 'stone', 'bridge',
  'coin-1', 'coin-2', 'coin-3', 'coin-4', 'coin-5', 'coin-6', 'gem', 'key', 'silver-key',
  'chest-locked', 'chest-open', 'chest-silver-locked', 'chest-silver-open', 'heart', 'mushroom',
  'bush-1', 'plant-1', 'sign-right', 'sign-up',
  // Its own scenery, for a level's props (systems/adventure/AdventureScenery.js).
  'stump', 'sign-skull', 'sign-warn', 'fence', 'fence-2', 'torch', 'house', 'tree-1', 'tree-2', 'rock', 'rock-2',
  'standing-stone', 'barrel', 'cave-back', 'column-2', 'column-3', 'start-sign',
  'soil', // the earth over a secret cave (systems/adventure/AdventureScenery.js, secrets)
  'fall-middle', 'fall-head', 'fall-foam', 'fall-splash', // the softer waterfalls
  ...rockKitArt('autumn'), // its rock kit, for cliffs (data/adventure/rocks.js)
  ...pillarKitArt('autumn'), // its earth pillars (data/adventure/pillars.js)
  ...scaffoldKitArt('autumn'), // its timber walkways (data/adventure/scaffolds.js)
  ...brickKitArt('autumn'), // its stone brick walls and pillars (data/adventure/bricks.js)
  ...AUTUMN_FROM_WOOD,
  // Stand-ins drawn by the tool, until the owner's pictures come: the climbing vine, the cracked
  // floor, the switch, the Guardian Gate's door and the fish.
  'vine', 'cracked', 'switch-off', 'switch-on', 'gate-door',
  // The leaping fish (data/adventure/fish.js), in two poses: its tail one way, then the other.
  'fish-1', 'fish-2',
  // The owner's characters: the squirrel's acorn and the owl's frames.
  'acorn', ...OWL_KEYS,
  // The owner's backdrop layers (tools/adventure-backdrop-art.mjs), and the scenery cut from the
  // sheets that has no stand-in: a stand-in's piece is listed above, under its name.
  'layer-sky', 'layer-middle',
  ...Object.keys(AUTUMN_PIECES).filter((name) => !['vine', 'cracked', 'switch-off', 'switch-on', 'gate-door', 'fish-1', 'fish-2', 'fall-splash', 'fall-strip'].includes(name)),
];
