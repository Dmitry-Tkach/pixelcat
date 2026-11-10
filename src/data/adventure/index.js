// The adventure levels, for the battle cat, and the art each world needs. The art is prepared from
// the free world packs by tools/adventure-art.mjs, into public/assets/adventure/<world>.
import { WOOD_LEVEL } from './wood.js';

export const ADVENTURE_LEVELS = [
  { ...WOOD_LEVEL, music: { track: 'village', bpm: 112 }, sky: '#8fd18f' },
];

// Every image a world uses, by its name in public/assets/adventure/<world>.
export const ADVENTURE_ART = {
  wood: [
    'tiles', 'back-far', 'back-near', 'ladder', 'spike', 'bonus', 'bonus-used', 'box', 'stone', 'roots',
    'coin-1', 'coin-2', 'coin-3', 'coin-4', 'coin-5', 'coin-6', 'gem', 'key', 'chest-locked', 'chest-open',
    'heart', 'portal', 'bush-1', 'plant-1', 'statue', 'sign-right', 'sign-up', 'lantern', 'mushroom', 'bullet', 'enemy-bullet',
  ],
};

// Who the hero is, and how big he's shown in the adventure, against the size he's drawn: smaller
// than in the main game, so the tiles and enemies feel bigger around him.
export const ADVENTURE_HERO = { character: 'battleCat', scale: 0.8 };

export const adventureKey = (world, name) => `adventure-${world}-${name}`;
export const adventurePath = (world, name) => `assets/adventure/${world}/${name}.png`;
