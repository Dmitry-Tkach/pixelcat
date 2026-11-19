// The adventure levels, for the battle cat, and the art each world needs. The art is prepared from
// the free world packs by tools/adventure-art.mjs, into public/assets/adventure/<world>.
import { WOOD_LEVEL } from './wood.js';
import { WOOD_MILL_LEVEL } from './wood2.js';
import { WOOD_HEART_LEVEL } from './wood3.js';
import { MILL_ART } from './millArt.js';
import { PTERO_KEYS } from './birds.js';
import { HERO_JUMP } from './heroJump.js';

export const ADVENTURE_LEVELS = [
  { ...WOOD_LEVEL, music: { track: 'village', bpm: 112 }, sky: '#8fd18f' },
  { ...WOOD_MILL_LEVEL, music: { track: 'village', bpm: 122 }, sky: '#9fdc9a' },
  { ...WOOD_HEART_LEVEL, music: { track: 'chase', bpm: 126 }, sky: '#7fc98a' },
];

// Every image a world uses, by its name in public/assets/adventure/<world>.
export const ADVENTURE_ART = {
  wood: [
    'tiles', 'back-far', 'back-near', 'ladder', 'spike', 'bonus', 'bonus-used', 'box', 'stone', 'roots',
    'coin-1', 'coin-2', 'coin-3', 'coin-4', 'coin-5', 'coin-6', 'gem', 'key', 'chest-locked', 'chest-open',
    'heart', 'bush-1', 'plant-1', 'statue', 'sign-right', 'sign-up', 'mushroom', 'bullet', 'enemy-bullet',
    'pillar-cap', 'pillar-middle', 'pillar-base', 'minigun',
    'bullet-explosive', 'bullet-laser', 'ammo-standard', 'ammo-explosive', 'ammo-laser', 'ammo-freeze', 'ammo-fire',
    'bridge', 'leaves', 'silver-key', 'chest-silver-locked', 'chest-silver-open',
    'layer-sky', 'layer-middle', // the backdrop's layers (data/adventure/backdrop.js), from the owner's pictures
    // The automatic decoration (data/adventure/decor.js): grass, flowers and hanging vines.
    'decor-tuft-1', 'decor-tuft-2', 'decor-flowers-1', 'decor-flowers-2', 'decor-vine-1', 'decor-vine-2', 'decor-vine-3',
    // The gates (data/adventure/gates.js): the start gate, the checkpoint flags and the portal's arch.
    'gate-ring', 'gate-swirl', 'flag-pole', 'flag-down', 'flag-up', 'portal-arch', 'portal-swirl', 'portal-post',
    // The moving traps (data/adventure/traps.js): the mace, the crusher, the dart idol and the mushroom.
    'trap-gallows', 'trap-chain', 'trap-mace', 'trap-crusher', 'trap-crusher-angry', 'trap-idol', 'trap-idol-angry', 'trap-dart',
    'trap-mushroom', 'trap-mushroom-squashed',
    // The stone guardian, the level 1 finale's giant (data/adventure/traps.js, guardian).
    'guardian-body', 'guardian-awake', 'guardian-arm-left', 'guardian-arm-right', 'guardian-ball', 'guardian-chain',
    // Mill Falls (level 2): the water wheel, waterfalls and props (data/adventure/millArt.js).
    ...MILL_ART,
    // The pterodactyl's frames (data/adventure/birds.js).
    ...PTERO_KEYS,
  ],
};

// Who the hero is, and how big he's shown in the adventure, against the size he's drawn: smaller
// than in the main game, so the tiles and enemies feel bigger around him. He starts each level with
// bare paws (character), and becomes `armed` when he finds the minigun. jump: how he jumps, quicker
// and higher than the main game's cat (heroJump.js, Cat.setAirSpeed).
export const ADVENTURE_HERO = { character: 'pawsCat', armed: 'pawsCatArmed', scale: 0.8, jump: HERO_JUMP };

// Where tools/adventure-art.mjs cuts the earth pillar (roots.png, 160px tall) into its cap, middle
// and base: the rows each starts at. The middle is the narrow twisting trunk.
export const PILLAR = { capFrom: 8, middleFrom: 56, baseFrom: 116, height: 160 };

export const adventureKey = (world, name) => `adventure-${world}-${name}`;
export const adventurePath = (world, name) => `assets/adventure/${world}/${name}.png`;
