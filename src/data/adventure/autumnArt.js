// The Autumn Forest world's own art (world 2), prepared by tools/adventure-autumn-art.mjs into
// public/assets/adventure/autumn (its characters by tools/adventure-autumn-characters.mjs). Every other picture a level asks for (the minigun, the traps, the
// gates, the water wheel...) is the Wood world's (data/adventure/index.js, adventureArtKey).
import { OWL_KEYS } from './birds.js';

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
};

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
  'standing-stone', 'barrel', 'cave-back', 'column-2', 'column-3',
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
  ...Object.keys(AUTUMN_PIECES).filter((name) => !['vine', 'cracked', 'switch-off', 'switch-on', 'gate-door', 'fish-1', 'fish-2'].includes(name)),
];
