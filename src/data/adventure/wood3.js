// The third adventure level: Heart of the Tree, the Wood world's boss level, from the owner's idea
// (images/levels/forest/levelel3-example): two paths to one portal, a boss at the end of each. The
// jungle path above, to a stone giant, is still to come: for now its way up is closed, and the only
// way on is down, into the caves under the tree, to the troll. Each path is long, longer than levels
// 1 and 2, since a run plays only one of them.
//
// The caves' star is the arrow stone (systems/adventure/arrowStones.js): a moving stone platform with
// a green arrow showing which way it goes next. Green means shoot it, as level 2 taught with the
// water wheel's hub: a round turns a stone back, and a stone that parks waits until it's shot or
// stood on. Built up as before: (C1) one stone over a dry pit: shoot it to call it, ride it across;
// (C2) stones going to and fro over the underground lake, one rising, caught by turning them back;
// (C3) a breather on dry rock: stalactite crushers, a dart idol, a heart and the silver key;
// (C4) a second lake, the hardest, under a gunner's fire, with a low stone to a secret nook behind
// a veil of water; then the troll's arena, his door, and a ladder up to the portal in the tree's heart.
//
// The map: the shared start on the forest floor (row 34); under it, thick rock, then the caves
// (rows 38 down), their lakes' surface at row 61. The caves' floors and pillars are filled in from
// the bottom (fill, not ground, which would clear the rock roof above them). Letters as in wood.js
// and wood2.js.
import { mapBuilder } from './mapBuilder.js';

const COLS = 240;
const ROWS = 64;
const SURFACE = 34; // the forest floor's surface row: the cat stands on row 33
const CAVE = 47; // the caves' rock floor: he stands on row 46
const CAVE_TOP = 38; // the first open row under the rock
const LAKE = 61; // the underground lakes' surface row

const level = mapBuilder(COLS, ROWS).ground(0, COLS - 1, SURFACE)
  .hollow(48, 223, CAVE_TOP, ROWS - 1); // the caves, under the rock

// ----- The shared start: on the forest floor, the minigun, a crate of rounds and a goon. Then the
// fork: the jungle's way up is closed for now (a sign marks where it will be); the way down is a
// broken stair of rock into the dark.
level.put(2, 33, '@').put(4, 33, '>').put(7, 33, 'b')
  .put(8, 33, 'w').coins(10, 13, 31).put(15, 33, 'a')
  .put(19, 33, 'g').put(22, 33, 'p')
  .put(27, 33, '/') // the jungle path, to come
  .hollow(30, 47, SURFACE, ROWS - 1) // the cave mouth
  .fill(30, 32, 38, ROWS - 1).fill(33, 35, 41, ROWS - 1).fill(36, 39, 44, ROWS - 1).fill(40, 47, CAVE, ROWS - 1)
  .coins(31, 31, 36).coins(34, 34, 39).coins(37, 37, 42);

// ----- C1. Lantern Steps: the first arrow stone, parked across a dry pit, its arrow pointing at him.
// Shoot it and it comes; stand on it and it carries him over. A fall lands in the pit, and he
// climbs out to try again.
level.fill(48, 52, CAVE, ROWS - 1).put(50, 46, 'g')
  .fill(53, 60, 51, ROWS - 1) // the dry pit, four cells down
  .mover(57, CAVE, { across: -4, arrow: true, parks: true })
  .coins(54, 59, 44)
  .fill(61, 72, CAVE, ROWS - 1).put(63, 46, 'C').put(67, 46, 'c').coins(68, 71, 45);

// ----- C2. Crystal Lake: the stones go to and fro on their own over the water, and he catches each
// by turning it back. The second rises and falls between two rock pillars. A crystal on a ledge over
// the third stone's track.
level.mover(73, CAVE, { across: 6, arrow: true })
  .fill(85, 87, CAVE, ROWS - 1).coins(74, 80, 44)
  .mover(91, 51, { up: 7, arrow: true })
  .fill(97, 99, 44, ROWS - 1).coins(92, 92, 46).coins(92, 92, 42)
  .mover(100, 44, { across: 6, arrow: true })
  .island(104, 106, 39).put(105, 38, '*')
  .fill(110, 140, CAVE, ROWS - 1).put(113, 46, 'c');

// ----- C3. Drip Tunnel: a breather on dry rock. Two stalactite crushers out of step, a crate of
// rounds, a heart, the silver key on a ledge, and a dart idol whose glow lights the dark.
level.put(112, 46, 'C').put(115, 46, 'a')
  .trap('crusher', 119, CAVE_TOP, { phaseMs: 0 }).trap('crusher', 124, CAVE_TOP, { phaseMs: 800 })
  .coins(118, 125, 45)
  .island(129, 131, 42).put(130, 41, 'j').put(128, 46, '+')
  .trap('idol', 137, 46, { facing: -1 });

// ----- C4. The Second Lake: the hardest stones, under a gunner's fire from the far bank. A stone
// across, a pillar, a rising stone, and a long high one; a crystal over the high one's track. Under
// it all, a low stone runs along the water to a nook in the far bank, behind a veil of water, with
// the silver chest and a crystal; a ladder climbs out of it.
level.put(139, 46, 'C')
  .mover(141, CAVE, { across: 7, arrow: true })
  .fill(154, 156, 44, ROWS - 1).coins(142, 150, 44)
  .mover(160, 50, { up: 8, arrow: true })
  .mover(165, 44, { across: 9, arrow: true })
  .island(169, 171, 39).put(170, 38, '*')
  .mover(170, 56, { across: 7, arrow: true }) // the low stone, to the nook
  .fill(180, 224, CAVE, ROWS - 1).put(188, 46, '1')
  .hollow(180, 183, 52, 55).hollow(182, 183, CAVE, 51) // the nook, and its way up
  .island(182, 183, CAVE).ladder(183, CAVE, 55)
  .put(181, 55, '*').put(182, 55, 'U');

// ----- The Troll: a checkpoint and a crate of explosive rounds before his arena; an island at each
// side, four cells up, safe from his shock wave (he walks under them). Beating him crumbles his door.
level.put(193, 46, 'C').put(195, 46, 'e')
  .island(201, 204, 43).island(215, 218, 43)
  .put(203, 42, 'a');

// ----- The Heart of the Tree: a ladder up from past his door to the portal.
level.hollow(224, 226, SURFACE, CAVE - 1)
  .island(224, 226, SURFACE).ladder(225, SURFACE, 46)
  .fill(222, 223, SURFACE - 6, SURFACE - 1) // a rock wall: the way back over the caves is the jungle's, to come
  .put(229, 33, 'b').put(234, 33, 'E');

export const WOOD_HEART_LEVEL = {
  id: 'wood-3',
  title: 'Heart of the Tree',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  hint: 'Heart of the Tree\nGreen means shoot it: turn the arrow stones',
  water: { row: LAKE },
  map: level.rows(),
  movers: level.movers(),
  traps: level.traps(),
  // The bosses (AdventureScene buildBoss): each waits in his arena until the cat walks in.
  bosses: [
    {
      kind: 'troll1', col: 218, floor: CAVE, arena: { left: 198, right: 221 }, door: { col: 222, rows: [CAVE_TOP, CAVE - 1] },
      hint: 'The Troll!\nJump his shock waves, and hit him hard while his club is stuck',
    },
  ],
  // The dark of the caves, behind the rock (systems/adventure/AdventureScenery.js), lanterns
  // hanging from the roof, and a veil of water over the secret nook.
  caves: [
    { cols: [30, 47], rows: [SURFACE, ROWS - 1] },
    { cols: [48, 223], rows: [CAVE_TOP, ROWS - 1] },
    { cols: [224, 226], rows: [SURFACE, CAVE - 1] },
  ],
  props: [50, 66, 82, 104, 118, 133, 150, 176, 196, 210].map((col) => ({ picture: 'mill-lantern', col, row: CAVE_TOP, hang: true })),
  waterfalls: [{ col: 180, top: CAVE, bottom: 56, veil: true }],
  places: {
    lake: { col: 63, row: 46 },
    tunnel: { col: 112, row: 46 },
    secondLake: { col: 139, row: 46 },
    troll: { col: 193, row: 46 },
  },
};
