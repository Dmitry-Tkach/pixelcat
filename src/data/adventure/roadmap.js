// The adventure's road map: every level planned, in order, world by world: 8 worlds of 3 levels,
// the third of each a boss level, chosen with the owner. The new worlds' titles are suggestions. `level` is the id of the
// built one in ADVENTURE_LEVELS (data/adventure/index.js); the rest are still to come, and show on
// the map locked until they're built.
export const ADVENTURE_ROADMAP = [
  // 1. Wood: the World Tree.
  { id: 'wood-1', world: 'Wood', title: 'Into the Roots', level: 'wood-1' },
  { id: 'wood-2', world: 'Wood', title: 'The Canopy', level: 'wood-2' },
  { id: 'wood-3', world: 'Wood', title: 'Heart of the Tree' },
  // 2. Autumn Forest: the seasons turn.
  { id: 'autumn-1', world: 'Autumn Forest', title: 'Golden Leaves' },
  { id: 'autumn-2', world: 'Autumn Forest', title: 'The Woodcutter\'s Path' },
  { id: 'autumn-3', world: 'Autumn Forest', title: 'The Hollow Oak' },
  // 3. Graveyard: night falls.
  { id: 'graveyard-1', world: 'Graveyard', title: 'Moonlit Graves' },
  { id: 'graveyard-2', world: 'Graveyard', title: 'The Crypt Steps' },
  { id: 'graveyard-3', world: 'Graveyard', title: 'The Bone Crypt' },
  // 4. Crystal Caves: underground.
  { id: 'caves-1', world: 'Crystal Caves', title: 'Glittering Deep' },
  { id: 'caves-2', world: 'Crystal Caves', title: 'Echo Tunnels' },
  { id: 'caves-3', world: 'Crystal Caves', title: 'The Crystal Throne' },
  // 5. Ancient: the titan's remains.
  { id: 'ancient-1', world: 'Ancient', title: 'Titan Bones' },
  { id: 'ancient-2', world: 'Ancient', title: 'Sand Stairs' },
  { id: 'ancient-3', world: 'Ancient', title: 'The Giant Skull' },
  // 6. Sky Ruins: up among the floating islands.
  { id: 'sky-1', world: 'Sky Ruins', title: 'Cloud Steps' },
  { id: 'sky-2', world: 'Sky Ruins', title: 'The Broken Bridge' },
  { id: 'sky-3', world: 'Sky Ruins', title: 'The Sky Temple' },
  // 7. Execution Grounds: the dark road to the castle.
  { id: 'execution-1', world: 'Execution Grounds', title: 'The Gallows Road' },
  { id: 'execution-2', world: 'Execution Grounds', title: 'Iron Cages' },
  { id: 'execution-3', world: 'Execution Grounds', title: 'The Executioner' },
  // 8. Medieval: the castle, and the last boss.
  { id: 'medieval-1', world: 'Medieval', title: 'Castle Gates' },
  { id: 'medieval-2', world: 'Medieval', title: 'The Ramparts' },
  { id: 'medieval-3', world: 'Medieval', title: 'The Black Knight' },
];

// What the map looks like: these worlds' ground and scenery (ui/mapArt.js), from a portal to a castle.
export const ADVENTURE_MAP_LOOK = { start: 'portal', end: 'castle' };

// Each world's ground and scenery on the road map (drawn by ui/mapArt.js), as MAP_WORLDS there does
// for the runner's.
export const ADVENTURE_MAP_WORLDS = {
  Wood: { ground: '#6cbf52', edge: '#4f9a3c', props: ['darkTree', 'tree', 'mushroom', 'darkTree', 'bush', 'stump'] },
  'Crystal Caves': { ground: '#7d8bb3', edge: '#65739b', props: ['crystal', 'rock', 'crystal', 'mushroom', 'crystal', 'rock'] },
  Ancient: { ground: '#dcc287', edge: '#c3a768', props: ['bone', 'ruin', 'rock', 'bone', 'ruin', 'bone'] },
  Medieval: { ground: '#93c26c', edge: '#76a454', props: ['tower', 'banner', 'tree', 'fence', 'house', 'banner'] },
  'Autumn Forest': { ground: '#e0a24a', edge: '#c27f2e', props: ['tree', 'house', 'fence', 'stump', 'bush', 'tree'] },
  Graveyard: { ground: '#77739a', edge: '#5d5980', props: ['darkTree', 'bone', 'rock', 'fence', 'darkTree', 'stump'] },
  'Sky Ruins': { ground: '#a6d8f2', edge: '#86bcdc', props: ['ruin', 'rock', 'crystal', 'ruin', 'bush', 'ruin'] },
  'Execution Grounds': { ground: '#86725f', edge: '#6b5a48', props: ['tower', 'banner', 'bone', 'fence', 'rock', 'banner'] },
};

// The worlds, in the order the road map goes through them. The map shows one at a time.
export const ADVENTURE_WORLDS = [...new Set(ADVENTURE_ROADMAP.map((stop) => stop.world))];

// What stands at each end of a world's page of the map: the portal where the road starts, in the
// first world; the castle where it ends, in the last; and in between, nothing, as the path runs on
// to the next world.
export function worldEnds(worldIndex) {
  return {
    start: worldIndex === 0 ? ADVENTURE_MAP_LOOK.start : 'none',
    end: worldIndex === ADVENTURE_WORLDS.length - 1 ? ADVENTURE_MAP_LOOK.end : 'none',
  };
}
