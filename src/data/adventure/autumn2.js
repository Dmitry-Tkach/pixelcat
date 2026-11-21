// World 2, level 2: The Hidden Dam, built to the owner's design (images/levels/autumn/level2.png):
// a "standard" level (5–8 minutes, data/adventure/levelKinds.js). Its idea: water, and controlling
// it. As in the owner's picture, the main path runs low (the white line), and over it the level
// stacks up in layers (the yellow lines): islands on earth pillars, timber walkways, ladders between
// them, coins and rewards up high. Three secret areas (the purple ones), three checkpoints.
// Its six sections:
//   1. Forest Approach: the start by the cottage, stairs up to a plateau, islands on pillars with a ?
//      block and the boar, a waterfall over a gap (a pool under it, coins, a ladder back up). Secret
//      1: walk left at the start, and fall into a cave under the cottage (a crystal, lanterns); out
//      by a ladder up to a trapdoor.
//   2. Riverside Caves: down to a lower floor with the minecart, a pool under a waterfall to swim
//      safely, and, under the floor, a flooded cave reached by diving (secret 2: the silver chest, its
//      key up on the high route, and a crystal). Over it all, the high route: islands, a ladder, the
//      ruined arch.
//   3. Water Control: the water wheel over three timber walkways (data/adventure/scaffolds.js) across
//      a pool: jump their gaps past a pumpkin and a dart statue's darts; fall, and swim to the
//      ladders. The wheel carries him up to the high route; a brick pillar and islands in the water.
//   4. The Grand Dam (data/adventure/dam.js) between two brick towers (data/adventure/bricks.js): the
//      valley's water ankle-deep, three levers, each opening a gate: the water rises a stage, up to
//      the next lever's ledge, and at last to the dam's top, where its coins float, and the far
//      tower is a leap from the water. Each ledge is out of reach until its stage
//      (tests/adventure-dam.test.js reads DAM_PUZZLE).
//   5. Flooded Depths: a pool with three brick pillars and fish; over it, ledges across, and above
//      them islands with ? blocks, ladders, a squirrel throwing acorns, the gold chest's key.
//   6. Dam Exit: spikes and the boar, a climb up two islands to the raised plaza and the exit. Secret
//      3: a room under the plaza (in by a cracked floor before the exit, out by a trapdoor past it),
//      the gold chest and a crystal.
import { mapBuilder } from './mapBuilder.js';

const COLS = 290;
const ROWS = 40;

const level = mapBuilder(COLS, ROWS);

// ----- 1. Forest Approach (columns 0-47).
level.ground(0, 17, 27) // the start's low ground: the cat stands on row 26
  .put(4, 26, '@')
  .put(14, 22, '+') // a heart over the cottage's porch
  .ground(18, 30, 25) // the plateau, up the stairs (stairs, below)
  .trap('mushroom', 25, 24) // a bounce up to the islands
  .island(19, 23, 20).put(21, 16, '?').coins(19, 20, 19) // the ? block's island
  .island(28, 33, 17).put(31, 16, 'V') // the boar's island
  .island(36, 40, 13).coins(36, 38, 12).put(40, 12, 'j') // the tall pillar: the silver key, for secret 2's chest
  // The waterfall's gap: a pool under it, coins over its water, a ledge and a ladder back up.
  .ground(31, 34, 32)
  .coins(31, 32, 28)
  .island(33, 34, 23).ladder(34, 23, 31)
  .ground(35, 47, 23) // the far side, two rows up: the first checkpoint
  .put(45, 22, 'C');
// Secret 1: walk left off the start and fall into a cave under the cottage; out by a ladder up to a
// trapdoor in the ground (an island in its top row, jumped up through), hidden with the cave.
level.hollow(0, 1, 27, 29).hollow(0, 15, 30, 32)
  .hollow(12, 13, 27, 29).island(12, 13, 27).ladder(13, 27, 32)
  .coins(4, 7, 32).put(10, 32, '*');

// ----- 2. Riverside Caves (columns 48-92).
level.ground(48, 62, 27) // the lower floor, a drop down from the checkpoint
  .put(58, 26, 'P')
  .ground(63, 69, 28)
  .ground(70, 75, 34) // the pool under the waterfall (pools), its bed
  .coins(71, 74, 30)
  .ground(76, 92, 28)
  .trap('mushroom', 86, 27) // a bounce up the step, or to the high route
  // Secret 2: under the floor, a cave flooded from the pool: dive down and swim in under the bank.
  .hollow(52, 66, 31, 33).hollow(67, 69, 32, 33)
  .put(55, 33, 'U').coins(59, 62, 33).put(53, 33, '*')
  // The high route, from the tall pillar: an arc of coins, an island with a ladder down, an ammo
  // crate, islands by the waterfall, and the ruined arch.
  .arc(41, 44, 12, 1)
  .island(45, 50, 16).ladder(50, 16, 26)
  .island(53, 58, 13).coins(54, 55, 12).put(57, 12, 'f')
  .island(62, 66, 17).coins(63, 65, 16)
  .island(68, 71, 14).coins(69, 70, 13)
  .island(75, 80, 15).coins(76, 79, 14)
  .island(83, 89, 12).put(86, 11, 'z') // under the ruined arch: laser rounds
  .island(91, 95, 16).coins(92, 94, 15); // and down to the wheel's walkways

// ----- 3. Water Control (columns 93-142): up the step onto the walkways over the wheel's pool.
level.ground(93, 100, 24)
  .ground(101, 136, 33) // the pool's bed (pools)
  .walkway(101, 108, 24, { posts: [101, 104, 108] })
  .ladder(107, 24, 32) // up from the water to the walkways' ends
  .walkway(112, 124, 24, { posts: [112, 116, 120, 124] })
  .put(121, 23, 'P')
  .ladder(123, 24, 32)
  .walkway(128, 136, 24, { posts: [128, 132, 136] })
  .island(102, 106, 28) // islands and a brick pillar in the water, a fall's soft landing
  .brickPillar(117, 28, 32).coins(117, 118, 27)
  .island(129, 133, 28).coins(130, 132, 27)
  .put(120, 32, 'Q') // a crab on the bed
  .wheel(118, 18, { dir: 1 }) // its lowest seat just over the middle walkway, up to the high route
  .island(106, 111, 16).coins(107, 110, 15)
  .island(123, 127, 12).coins(124, 126, 11)
  .island(130, 135, 14).coins(131, 134, 13).ladder(133, 14, 23) // a ladder down to the last walkway
  .island(138, 141, 19).coins(139, 140, 18)
  .ground(137, 142, 24)
  .trap('idol', 139, 23, { facing: -1 }); // darts along the walkways: time the gaps

// ----- 4. The Grand Dam (columns 143-206): the left tower, the valley with the dam in its middle,
// the far tower. Each ledge is spaced by the real jump and leap (tests/adventure-dam.test.js).
const VALLEY_FLOOR = 31; // he stands on row 30
const STAGES = [25, 24, 23]; // the valley's water, a stage for each lever: to the dam's top (row 23), never over it
const FAR_TOWER = { col: 199, row: 21 }; // the far tower's checkpoint
level.wall(143, 149, 24, ROWS - 1) // the left tower: the path runs on its top
  .ground(150, 194, VALLEY_FLOOR)
  .island(150, 151, 24).ladder(150, 24, 30) // a landing by the tower, the ladder down from it
  .put(152, 30, 'C')
  .put(157, 30, '^').put(158, 30, '^').put(159, 30, '^')
  .coins(160, 162, 29)
  .island(164, 168, 24).coins(164, 165, 23) // lever 2's ledge
  .island(180, 184, 23).coins(180, 181, 22).trap('idol', 184, 22, { facing: -1 }) // lever 3's ledge
  .coins(167, 177, 23) // along the dam's top, at the water's last stage
  .bird('hover', 193, 20, { look: 'owl' }) // over the leap out to the far tower: time it
  .put(174, 30, 'Q')
  .wall(195, 206, FAR_TOWER.row + 1, ROWS - 1) // the far tower
  .put(FAR_TOWER.col, FAR_TOWER.row, 'C');

// ----- 5. Flooded Depths (columns 207-236): the pool, its brick pillars, ledges over it, islands
// over them.
level.ground(207, 236, 34) // the pool's bed
  .brickPillar(211, 29, 33).brickPillar(219, 29, 33).brickPillar(227, 29, 33)
  .island(208, 213, 24).coins(209, 211, 23)
  .island(216, 221, 24).coins(217, 220, 23)
  .island(224, 229, 23).put(226, 22, 'P')
  .island(232, 236, 24).coins(233, 235, 23)
  .island(207, 212, 18).put(209, 14, '?').ladder(212, 18, 23)
  .island(215, 220, 16).put(217, 15, '4') // a squirrel up here, throwing acorns at the ledges
  .island(223, 229, 14).put(226, 10, '?').put(228, 13, 'k') // the gold chest's key
  .island(232, 238, 19).coins(233, 237, 18);

// ----- 6. Dam Exit (columns 237-289): spikes, the boar, two islands up to the raised plaza.
level.ground(237, 264, 27)
  .put(241, 26, '^').put(242, 26, '^').put(243, 26, '^')
  .put(248, 26, 'V')
  .island(252, 256, 23).coins(253, 255, 22)
  .island(258, 262, 20).coins(259, 261, 19)
  .ground(265, COLS - 1, 18)
  .put(276, 17, 'E')
  // Secret 3: a room under the plaza, in by a cracked floor before the exit (coins on it, so he
  // stops), out by a trapdoor past it, jumped up through.
  .hollow(267, 284, 19, 21).put(279, 21, 'T').put(282, 21, '*').coins(270, 273, 21)
  .cracked(267, 268, 18).coins(267, 268, 17) // clear of the portal's statues (data/adventure/gates.js)
  .hollow(283, 284, 18, 18).island(283, 284, 18);

// The Grand Dam's puzzle, for tests/adventure-dam.test.js: the valley's floor row, its water's
// stages, and the far tower's checkpoint, reached only with all three.
export const DAM_PUZZLE = { floor: VALLEY_FLOOR - 1, stages: STAGES, farTower: FAR_TOWER };

export const AUTUMN_DAM_LEVEL = {
  id: 'autumn-2',
  title: 'The Hidden Dam',
  world: 'autumn',
  cat: { speed: 420 },
  hearts: 3,
  hint: 'The Hidden Dam\nFollow the water',
  map: level.rows(),
  traps: level.traps(),
  movers: level.movers(),
  birds: level.birds(),
  drawbridges: level.drawbridges(),
  vines: level.vines(),
  wheels: level.wheels(),
  walkways: level.walkways(), // the timber walkways round the wheel (data/adventure/scaffolds.js)
  masonry: level.masonry(), // the brick towers and pillars (data/adventure/bricks.js)
  stairs: [{ at: 18, row: 26, dir: 1 }], // up from the start's ground to the plateau
  // Scenery from the owner's pictures: the cottage, lanterns, the minecart on its rails, the mill,
  // a trough pouring off the first walkway, banners on the towers, the exit's statues and sign.
  props: [
    { picture: 'big-tree', col: 11, row: 26, back: true },
    { picture: 'cottage', col: 8, row: 26, back: true, smoke: { x: 0.33, y: 0.08 } },
    { picture: 'start-sign', col: 3, row: 26 },
    { picture: 'lamp-post', col: 16, row: 26 },
    { picture: 'hang-lantern', col: 6, row: 30, hang: true, glow: true }, // in secret 1's cave
    { picture: 'hang-lantern', col: 11, row: 30, hang: true, glow: true },
    { picture: 'lamp-post', col: 23, row: 19 },
    { picture: 'mine-frame', col: 55, row: 26, width: 420, back: true },
    { picture: 'minecart', col: 54, row: 26 },
    { picture: 'ruin-arch', col: 86, row: 11, back: true },
    { picture: 'mill-house', col: 97, row: 23, back: true },
    { picture: 'scaffold-trough', col: 104, row: 23 },
    { picture: 'banner-open', col: 146, row: 23 }, // on the towers' tops
    { picture: 'small-tree', col: 204, row: 21, back: true },
    { picture: 'hang-lantern', col: 214, row: 25, hang: true, glow: true },
    { picture: 'big-tree', col: 260, row: 26, back: true },
    { picture: 'exit-sign', col: 285, row: 17 }, // the portal's own cat statues flank it
    { picture: 'big-tree', col: 288, row: 17, back: true },
  ],
  // Earth pillars under the islands, as in the owner's picture.
  columns: [
    { col: 21, width: 3, top: 21, bottom: 25 },
    { col: 30, width: 2, top: 18, bottom: 25 },
    { col: 38, width: 3, top: 14, bottom: 23 },
    { col: 64, width: 2, top: 18, bottom: 28 },
    { col: 77, width: 2, top: 16, bottom: 28 },
  ],
  // The waterfall gap's pool; the riverside pool and the flooded cave under the floor (one water,
  // the cave's part a secret); the wheel's pool; the dam's valley, rising a stage with each lever;
  // the flooded depths.
  pools: [
    { cols: [31, 34], bottom: 31, surface: 29 },
    { cols: [52, 75], bottom: 33, surface: 28 },
    { cols: [101, 136], bottom: 32, surface: 29 },
    { cols: [151, 194], bottom: VALLEY_FLOOR - 1, surface: VALLEY_FLOOR - 1, stages: STAGES },
    { cols: [207, 236], bottom: 33, surface: 29 },
  ],
  levers: [{ col: 155, row: 30 }, { col: 166, row: 23 }, { col: 182, row: 22 }],
  // Fish swimming between the depths' pillars (systems/adventure/AdventurePoolFish.js).
  poolFish: [{ from: 213, to: 218, row: 31 }, { from: 221, to: 226, row: 31 }],
  // Rock cliffs the waterfalls pour from, behind the level (data/adventure/rocks.js).
  rocks: [
    { parts: [{ cols: [32, 34], rows: [15, 31] }], foot: 'water' },
    { parts: [{ cols: [71, 74], rows: [10, 33] }], foot: 'water' },
    { parts: [{ cols: [87, 90], rows: [14, 27] }] },
  ],
  waterfalls: [
    { col: 33, top: 15, bottom: 29, width: 96 },
    { col: 72, top: 10, bottom: 28, width: 112 },
    { col: 88, top: 14, bottom: 28, width: 96 },
    { col: 111, top: 25, bottom: 29, width: 64 }, // over the walkways' gaps, from the wheel's channel
    { col: 125, top: 25, bottom: 29, width: 64 },
    { col: 223, top: 15, bottom: 29, width: 80 },
  ],
  dam: { col: 172, row: 30 },
  secrets: [{ cols: [0, 15], rows: [27, 32] }, { cols: [52, 69], rows: [31, 33] }, { cols: [267, 284], rows: [19, 21] }],
  caves: [{ cols: [0, 15], rows: [27, 32] }, { cols: [52, 69], rows: [31, 33] }, { cols: [267, 284], rows: [19, 21] }],
  hintsAt: [
    { col: 66, text: 'Swim! Up to stroke, out at the top' },
    { col: 152, text: 'The Grand Dam!\nPull the levers: each gate raises the water' },
  ],
  places: {
    damStart: { col: 4, row: 26 },
    damRiver: { col: 45, row: 22 }, // the first checkpoint, over the lower floor
    damWheel: { col: 99, row: 23 }, // by the walkways
    valley: { col: 152, row: 30 }, // the dam's valley floor, by lever 1
    damFront: { col: 172, row: 30 }, // in front of the Grand Dam
    depths: { col: 199, row: 21 }, // the far tower's top
    damExit: { col: 250, row: 26 }, // the exit's lower ground
  },
};
