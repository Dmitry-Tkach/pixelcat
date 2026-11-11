// The adventure's road map: every level planned, in order, world by world. `level` is the id of the
// built one in ADVENTURE_LEVELS (data/adventure/index.js); the rest are still to come, and show on
// the map locked until they're built.
export const ADVENTURE_ROADMAP = [
  { id: 'wood-1', world: 'Wood', title: 'Into the Roots', level: 'wood-1' },
  { id: 'wood-2', world: 'Wood', title: 'The Canopy', level: 'wood-2' },
  { id: 'wood-3', world: 'Wood', title: 'Heart of the Tree' },
  { id: 'caves-1', world: 'Crystal Caves', title: 'Glittering Deep' },
  { id: 'caves-2', world: 'Crystal Caves', title: 'Echo Tunnels' },
  { id: 'caves-3', world: 'Crystal Caves', title: 'The Crystal Throne' },
  { id: 'ancient-1', world: 'Ancient', title: 'Titan Bones' },
  { id: 'ancient-2', world: 'Ancient', title: 'Sand Stairs' },
  { id: 'ancient-3', world: 'Ancient', title: 'The Giant Skull' },
  { id: 'medieval-1', world: 'Medieval', title: 'Castle Gates' },
  { id: 'medieval-2', world: 'Medieval', title: 'The Ramparts' },
  { id: 'medieval-3', world: 'Medieval', title: 'The Black Knight' },
];

// What the map looks like: these worlds' ground and scenery (ui/mapArt.js), from a portal to a castle.
export const ADVENTURE_MAP_LOOK = { start: 'portal', end: 'castle' };
