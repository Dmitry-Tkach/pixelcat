// The third adventure level: Heart of the Tree, the Wood world's boss level, from the owner's idea
// (images/levels/forest/levelel3-example): two paths to one portal, a boss at the end of each: the
// jungle path above, to a stone giant, and the caves below, to the troll. Each path is long, longer
// than levels 1 and 2, since a run plays only one of them.
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
  .put(27, 33, '/') // up: the jungle path
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
  .put(229, 33, 'b').put(234, 33, 'E');

// ===== The jungle path: up the ladder by the signpost, across the cave mouth on branches, and on over
// the rock above the caves, in the trees. Its star is the spore bud (systems/adventure/sporeBuds.js):
// a closed green bud that a round opens into a bounce mushroom for a few seconds. Built up:
// (J1) a bounce mushroom to play with, then the first bud, the only way over a trunk; (J2) thorn pits,
// crumbling leaves and a dart idol, a crystal on an arch a bud reaches; (J3) a breather in old ruins:
// maces swinging under arches, a rifle gunner, a heart; (J4) buds in a chain, high over a floor of
// thorns, a pterodactyl over the gap, a crystal on the chain and a secret one out of sight above.
// Then the Rootbreaker's arena, and on to the Heart of the Tree.
const thorns = (from, to) => { // a thorn pit in the rock: two cells deep, spikes at its bottom
  level.hollow(from, to, SURFACE, SURFACE + 1);
  for (let c = from; c <= to; c++) level.put(c, SURFACE + 1, '^');
};

// ----- J0. Up from the fork, and across the cave mouth on branches.
level.island(25, 29, 26).ladder(28, 26, 33)
  .island(32, 35, 25).island(38, 41, 24).island(44, 47, 26)
  .island(41, 45, 30) // a low branch over the cave mouth: somewhere to land, in view from the edge
  .coins(33, 34, 23).coins(39, 40, 22).coins(45, 46, 24);

// ----- J1. Vine Gate: a bounce mushroom to a ledge, to play with; then a trunk too high to climb,
// and the first spore bud, closed, by it: shoot it, and bounce.
level.trap('mushroom', 52, 33).island(51, 54, 25).coins(52, 53, 24).coins(52, 52, 29)
  .trap('mushroom', 60, 33, { bud: true }).island(59, 62, 25).coins(60, 61, 24)
  .fill(64, 65, 22, SURFACE - 1).coins(64, 65, 20) // the trunk
  .island(67, 69, 27); // a step down from it

// ----- J2. Broken Aqueduct: a checkpoint, thorn pits, crumbling leaves over the widest, and a dart
// idol firing across the landing. A crystal on an arch, reached from a bud.
level.put(67, 33, 'C');
thorns(72, 74);
thorns(80, 82);
thorns(86, 92);
level.put(88, 33, '%').put(89, 33, '%').put(90, 33, '%')
  .coins(73, 73, 31).coins(81, 81, 31).coins(88, 90, 31)
  .trap('idol', 99, 33, { facing: -1 })
  .trap('mushroom', 102, 33, { bud: true }).island(103, 106, 25).put(104, 24, '*');

// ----- J3. Bell Ruins: a checkpoint, two maces swinging under ruined arches over firm ground, a heart,
// and a rifle gunner on a ruined tower.
level.put(110, 33, 'C')
  .island(118, 122, 27).trap('mace', 120, 28, { hanging: true, chain: 237, swingDeg: 30 })
  .island(130, 134, 27).trap('mace', 132, 28, { hanging: true, chain: 237, swingDeg: 30, phaseMs: 1600 })
  .put(126, 33, '+').coins(119, 121, 31).coins(131, 133, 31)
  .island(138, 141, 26).put(139, 25, '3');

// ----- J4. Spore Lift: a checkpoint, then a tall trunk, crossed by two buds in a chain: one on the
// ground to a branch, one on the branch to a branch above, by the trunk's top. Beyond it, a floor of thorns: high branches
// over it, crumbling leaves over the widest gap with a pterodactyl hovering by them; a bud to a crystal
// above; and, out of sight over the last branch, a secret crystal one odd coin hints at.
level.put(145, 33, 'C')
  .trap('mushroom', 149, 33, { bud: true }).island(148, 151, 25).trap('mushroom', 150, 24, { bud: true })
  .island(148, 151, 17) // the second bud throws him straight up to this branch, by the trunk's top
  .fill(152, 153, 19, SURFACE - 1).coins(152, 153, 17); // the tall trunk
thorns(154, 185);
level.island(157, 160, 19).trap('mushroom', 159, 18, { bud: true }).island(160, 163, 10).put(161, 9, '*')
  .put(163, 19, '%').put(164, 19, '%')
  .bird('hover', 166, 16)
  .island(168, 171, 22).coins(169, 169, 17).island(170, 173, 13).put(172, 12, '*') // the secret, above
  .trap('mushroom', 169, 21, { bud: true })
  .island(176, 179, 21) // a branch under the secret's right edge, so the way down is in view
  .island(175, 178, 26).island(181, 184, 30).coins(176, 177, 24).coins(182, 183, 28);

// ----- The Rootbreaker's arena (data/adventure/rootbreaker.js): a checkpoint and a crate of explosive
// rounds, then his floor, with a low ledge each side, three cells up: from a ledge (or a jump, or a
// fist stuck in the floor) a round reaches his core; up there his low laser passes under, his sweep
// too, but not his high laser. Beating him crumbles his door, on to the Heart of the Tree.
level.put(187, 33, 'C').put(189, 33, 'e')
  .island(193, 196, 31).island(214, 217, 31).put(195, 30, 'a');

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
  birds: level.birds(),
  // The two paths: where each begins (cells), for the tests to check each on its own reaches the
  // portal with three crystals (the other's entrance closed).
  paths: {
    jungle: { cols: [25, 29], rows: [26, 31] }, // the ladder up by the signpost, and the branch at its top
    cave: { cols: [30, 47], rows: [SURFACE, CAVE_TOP - 1] }, // the cave mouth
  },
  // The bosses (AdventureScene buildBoss): each waits in his arena until the cat walks in.
  bosses: [
    {
      kind: 'rootbreaker', col: 205, floor: SURFACE, arena: { left: 190, right: 221 }, door: { col: 222, rows: [SURFACE - 8, SURFACE - 1] },
      hint: 'The Rootbreaker!\nMake him miss a smash, then hit his core',
    },
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
    jungle: { col: 67, row: 33 },
    ruins: { col: 110, row: 33 },
    sporeLift: { col: 145, row: 33 },
    rootbreaker: { col: 187, row: 33 },
    lake: { col: 63, row: 46 },
    tunnel: { col: 112, row: 46 },
    secondLake: { col: 139, row: 46 },
    troll: { col: 193, row: 46 },
  },
};
