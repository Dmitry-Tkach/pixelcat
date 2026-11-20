// The Autumn Forest world's own art (world 2), prepared by tools/adventure-autumn-art.mjs into
// public/assets/adventure/autumn (its characters by tools/adventure-autumn-characters.mjs). Every other picture a level asks for (the minigun, the traps, the
// gates, the water wheel...) is the Wood world's (data/adventure/index.js, adventureArtKey).
import { OWL_KEYS } from './birds.js';

// The squirrel's acorn: cut from its sheet's cell (row, col, from 0), shrunk to `width` px long.
export const ACORN = { sheet: 'images/levels/autumn/squirrel.png', row: 3, col: 0, width: 28 };

// The Wood world's leaves and plants, turned from green to autumn's orange and gold.
export const AUTUMN_FROM_WOOD = [
  'leaves', 'decor-tuft-1', 'decor-tuft-2', 'decor-flowers-1', 'decor-flowers-2', 'decor-vine-1', 'decor-vine-2', 'decor-vine-3',
];

export const AUTUMN_ART = [
  // From the Autumn Forest pack, with the same names as the Wood world's.
  'tiles', 'back-far', 'back-near', 'ladder', 'spike', 'bonus', 'bonus-used', 'box', 'stone', 'bridge',
  'coin-1', 'coin-2', 'coin-3', 'coin-4', 'coin-5', 'coin-6', 'gem', 'key', 'silver-key',
  'chest-locked', 'chest-open', 'chest-silver-locked', 'chest-silver-open', 'heart', 'mushroom',
  'bush-1', 'plant-1', 'sign-right', 'sign-up',
  // Its own scenery, for a level's props (systems/adventure/AdventureScenery.js).
  'stump', 'sign-skull', 'sign-warn', 'fence', 'fence-2', 'torch', 'house', 'tree-1', 'tree-2', 'rock', 'rock-2',
  'standing-stone', 'barrel',
  ...AUTUMN_FROM_WOOD,
  // Stand-ins drawn by the tool, until the owner's pictures come: the climbing vine, the cracked
  // floor, the switch, the Guardian Gate's door and the fish.
  'vine', 'cracked', 'switch-off', 'switch-on', 'gate-door',
  // The leaping fish (data/adventure/fish.js), in two poses: its tail one way, then the other.
  'fish-1', 'fish-2',
  // The owner's characters: the squirrel's acorn and the owl's frames.
  'acorn', ...OWL_KEYS,
];
