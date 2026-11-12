// The adventure's road map: every level planned, in order, world by world: 8 worlds of 3 levels, the
// third of each a boss level, chosen with the owner. The worlds' names are the owner's map's; the
// titles of the levels not yet built are suggestions. `level` is the id of the built one in
// ADVENTURE_LEVELS (data/adventure/index.js); the rest are still to come, and show on the map
// locked until they're built. Each `id` stays as it is, as saved progress is kept by it.
export const ADVENTURE_ROADMAP = [
  // 1. Forest Ruins: the World Tree's roots.
  { id: 'wood-1', world: 'Forest Ruins', title: 'Into the Roots', level: 'wood-1' },
  { id: 'wood-2', world: 'Forest Ruins', title: 'The Canopy', level: 'wood-2' },
  { id: 'wood-3', world: 'Forest Ruins', title: 'Heart of the Tree' },
  // 2. Rustic Village: an autumn wood, the seasons turning.
  { id: 'autumn-1', world: 'Rustic Village', title: 'Golden Leaves' },
  { id: 'autumn-2', world: 'Rustic Village', title: 'The Woodcutter\'s Path' },
  { id: 'autumn-3', world: 'Rustic Village', title: 'The Hollow Oak' },
  // 3. Graveyard: night falls.
  { id: 'graveyard-1', world: 'Graveyard', title: 'Moonlit Graves' },
  { id: 'graveyard-2', world: 'Graveyard', title: 'The Crypt Steps' },
  { id: 'graveyard-3', world: 'Graveyard', title: 'The Bone Crypt' },
  // 4. Crystal Cavern: underground.
  { id: 'caves-1', world: 'Crystal Cavern', title: 'Glittering Deep' },
  { id: 'caves-2', world: 'Crystal Cavern', title: 'Echo Tunnels' },
  { id: 'caves-3', world: 'Crystal Cavern', title: 'The Crystal Throne' },
  // 5. Bone Wastes: the titan's remains.
  { id: 'ancient-1', world: 'Bone Wastes', title: 'Titan Bones' },
  { id: 'ancient-2', world: 'Bone Wastes', title: 'Sand Stairs' },
  { id: 'ancient-3', world: 'Bone Wastes', title: 'The Giant Skull' },
  // 6. Sky Temple: up among the floating islands.
  { id: 'sky-1', world: 'Sky Temple', title: 'Cloud Steps' },
  { id: 'sky-2', world: 'Sky Temple', title: 'The Broken Bridge' },
  { id: 'sky-3', world: 'Sky Temple', title: 'The Temple Gate' },
  // 7. Dark Fortress: the grim road on.
  { id: 'execution-1', world: 'Dark Fortress', title: 'The Gallows Road' },
  { id: 'execution-2', world: 'Dark Fortress', title: 'Iron Cages' },
  { id: 'execution-3', world: 'Dark Fortress', title: 'The Executioner' },
  // 8. Ancient Wilds: the old castle's ruins, and the last boss.
  { id: 'medieval-1', world: 'Ancient Wilds', title: 'Castle Gates' },
  { id: 'medieval-2', world: 'Ancient Wilds', title: 'The Ramparts' },
  { id: 'medieval-3', world: 'Ancient Wilds', title: 'The Black Knight' },
];

// The worlds, in the order the road climbs through them, from the bottom of the map.
export const ADVENTURE_WORLDS = [...new Set(ADVENTURE_ROADMAP.map((stop) => stop.world))];

// The road map (Level Select): the worlds' islands stacked from the bottom, the first, to the top,
// the last, climbed like a ladder, the golden road snaking up through their levels. The pieces are
// cut from the owner's atlas by tools/adventure-roadmap-art.mjs; systems/adventure/roadmapLayout.js
// places them, in the map's own units, by ROADMAP_LOOK.
export const ROADMAP_ART = 'assets/ui/adventure-roadmap';

// Each piece's size as cut, in pixels: by world for the islands and title plates.
export const ROADMAP_PIECES = {
  islands: [[386, 227], [378, 241], [376, 251], [371, 234], [377, 190], [371, 210], [383, 195], [388, 212]],
  titles: [[203, 58], [194, 58], [188, 58], [198, 59], [189, 58], [191, 59], [190, 59], [192, 59]],
  badge: [71, 77],
  level: [71, 75],
  cat: [182, 203],
  clouds: [[139, 65], [128, 57]],
};

// How the map is laid out, in its own units (the screen scales them to the map's width):
//   width: the map's width. bottom, top: room under the first island and over the last.
//   row: how far each world is above the one below it. island: an island's width.
//   swing: how far the islands sit left and right of the middle, taking turns, so the road winds.
//   levels: where an island's three buttons sit on it, as shares of its width and height, from
//           the left; on every other island the road runs back, right to left. button: their width.
//   title: how far a world's title plate rises above its island's top. cat: the cat's height, as he
//          stands on top of the level the player is up to, like a game piece.
//   clouds: drifting by the islands: their middle (as shares of the map), size, and which cloud.
export const ROADMAP_LOOK = {
  width: 760,
  bottom: 90,
  top: 130,
  row: 268,
  island: 410,
  swing: 80,
  levels: { y: 0.74, x: [0.26, 0.5, 0.74] },
  button: 64,
  title: 24,
  cat: 96,
  clouds: [
    { x: 0.08, y: 0.9, w: 120, cloud: 1 }, { x: 0.93, y: 0.78, w: 110, cloud: 2 },
    { x: 0.06, y: 0.55, w: 105, cloud: 2 }, { x: 0.94, y: 0.42, w: 125, cloud: 1 },
    { x: 0.07, y: 0.24, w: 115, cloud: 1 }, { x: 0.92, y: 0.1, w: 100, cloud: 2 },
  ],
};
