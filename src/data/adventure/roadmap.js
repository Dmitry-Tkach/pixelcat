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

// The road map's picture (tools/adventure-roadmap-art.mjs cuts it from the owner's design): the
// worlds' islands stacked from the bottom, the first, to the top, the last, like a ladder.
//   top: where the picture is cut from the design, below its website parts; w, h: its size.
//   hex: a level button's size, as wide as the painted ones it covers.
//   nodes: the middle of each level's painted button on the cut picture, in the road map's order,
//          found by their gold colour (three to an island, left to right).
export const ROADMAP_MAP = {
  file: 'assets/ui/adventure-roadmap/map.webp',
  backdrop: 'assets/ui/adventure-roadmap/backdrop.webp',
  top: 178,
  w: 1024,
  h: 1240,
  hex: 50,
  nodes: [
    [576, 1061], [648, 1061], [720, 1061], // Forest Ruins
    [574, 915], [646, 915], [717, 915], // Rustic Village
    [573, 778], [646, 778], [716, 778], // Graveyard
    [572, 642], [644, 642], [713, 642], // Crystal Cavern
    [570, 514], [643, 514], [714, 514], // Bone Wastes
    [566, 380], [638, 380], [710, 380], // Sky Temple
    [568, 245], [639, 245], [710, 245], // Dark Fortress
    [572, 105], [644, 105], [716, 105], // Ancient Wilds
  ],
};
