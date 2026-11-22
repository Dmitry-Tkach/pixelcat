// World 2, level 2: The Hidden Dam, built to the owner's design (images/levels/autumn/level2.png):
// a "standard" level (5–8 minutes, data/adventure/levelKinds.js). Its idea: water, and controlling
// it. As in the owner's picture, the level is built into a cliff: the main path runs low (the white
// line), and over it the level stacks up in layers (the yellow lines), rock behind them (the rock
// kit): islands on earth pillars, timber walkways, ladders between them, coins and rewards up high.
// Three secret areas (the purple ones), three checkpoints. Its six sections:
//   1. Forest Approach: the start by the cottage, stairs up to a plateau, islands on pillars with a ?
//      block and the boar, a waterfall over a gap (a pool under it, coins, a ladder back up). Secret
//      1: walk left at the start, and fall into a cave under the cottage (a crystal, lanterns); out
//      by a ladder up to a trapdoor.
//   2. Riverside Caves: down to the minecart's floor, on its rails; a pool at the foot of
//      the rock cliff, its two waterfalls; the high route over it, to the ruined arch. Secret 2: a
//      trapdoor in the floor, a ladder down through it (Down, standing on it) into a dry cave: the silver chest (its key up
//      on the tall pillar), a crystal, purple crystals glowing.
//   3. Water Control: the water wheel over one long timber walkway (data/adventure/scaffolds.js)
//      across a pool, a dart statue's darts down its length, pumpkins on it; ladders from the water;
//      the wheel carries him up to the high route, and the minecart on its top.
//   4. The Grand Dam (data/adventure/dam.js), big, between two brick towers (data/adventure/bricks.js):
//      the valley's water ankle-deep, three levers, each opening a gate: the water pours out and
//      rises a stage, up to the next lever's ledge, and at last to the dam's top, where its coins
//      float, and the far tower is a leap from the water. Each ledge is out of reach until its stage
//      (tests/adventure-dam.test.js reads DAM_PUZZLE).
//   5. Flooded Depths: a pool with three brick pillars and fish; over it, islands on earth pillars,
//      and over those more, with ? blocks, a ladder, a squirrel throwing acorns, the gold chest's
//      key, and a waterfall down the rock behind them.
//   6. Dam Exit: the dam bursts as he reaches the cliff's foot, and the muddy water floods up behind
//      him (pools' flood): a climb against it, up two towers of islands, past the thorns, the boar,
//      the owls and a squirrel, to the exit high on the clifftop. Secret 3: a room under the
//      clifftop, by a trapdoor on it: the gold chest and a crystal.
import { mapBuilder } from './mapBuilder.js';

const COLS = 290;
const ROWS = 40;

const level = mapBuilder(COLS, ROWS);

// ----- 1. Forest Approach (columns 0-47).
level.ground(0, 17, 27) // the start's low ground: the cat stands on row 26
  .put(4, 26, '@')
  .coins(13, 15, 22) // coins over the cottage's porch (no heart: he starts with all three)
  .ground(18, 31, 25) // the plateau, up the stairs (stairs, below)
  .trap('mushroom', 25, 24) // a bounce up to the islands
  .island(19, 23, 20).put(21, 16, '?').coins(19, 20, 19) // the ? block's island
  .island(26, 31, 17).put(29, 16, 'V') // the boar's island
  .island(35, 40, 14).coins(35, 37, 13).put(40, 13, 'j') // the tall pillar: the silver key, for secret 2's chest
  // The waterfall's gap: a pool under it, coins over its water, a ledge and a ladder back up.
  .ground(32, 34, 32)
  .coins(32, 33, 28)
  .island(33, 34, 23).ladder(34, 23, 31)
  .ground(35, 47, 23) // the far side, two rows up
  .put(44, 22, 'w'); // the minigun: the level's ammo is his from here
// Secret 1: walk left off the start and fall into a cave under the cottage; out by a ladder up to a
// trapdoor in the ground, its hatch seen on the start's ground: every player walks over it, and
// learns what a hatch is before secret 2's.
level.hollow(0, 1, 27, 29).hollow(0, 15, 30, 32)
  .hollow(12, 13, 28, 29).trapdoor(12, 13, 27).ladder(13, 27, 32)
  .coins(4, 7, 32).put(10, 32, '*');

// ----- 2. Riverside Caves (columns 48-92): down to the minecart's floor.
level.ground(48, 69, 27) // the minecart's floor, one flat floor to the pool (a drop down from the checkpoint)
  .put(56, 26, 'P')
  .ground(70, 75, 32) // the pool at the cliff's foot (pools), a row under the floor; its bed
  .coins(71, 74, 30)
  .ground(76, 92, 27)
  .trap('mushroom', 86, 26) // a bounce up the step, or to the high route
  .put(80, 26, 'Q') // the crab, met first on dry ground
  // Secret 2: a trapdoor in the floor (drawn as the floor, its wooden hatch on it), a ladder down
  // through it into a dry cave: standing on the hatch, Down climbs him down.
  .hollow(50, 66, 31, 33)
  .hollow(60, 61, 28, 30).trapdoor(60, 61, 27).ladder(61, 27, 33)
  .put(55, 33, 'U').coins(57, 59, 33).put(52, 33, '*')
  // The high route, from the tall pillar: an arc of coins, an island with a ladder down, an ammo
  // crate, islands on the cliff, and the ruined arch.
  .arc(41, 44, 12, 1)
  .ladder(50, 16, 26) // down from the rock's top (the rock, below) to the minecart's floor
  .island(53, 58, 13).coins(54, 55, 12).put(57, 12, 'f')
  .island(62, 66, 17).coins(63, 65, 16)
  .island(68, 71, 14).coins(69, 70, 13)
  .island(76, 81, 15).coins(77, 80, 14)
  .put(86, 11, 'z') // on the rock's top, under the ruined arch: laser rounds
  .put(82, 11, '4') // a squirrel guarding the high route's best coins
  .island(91, 95, 16).coins(92, 94, 15); // and down to the wheel's walkway

// ----- 3. Water Control (columns 93-142): up the step onto the long walkway over the wheel's pool.
level.ground(93, 100, 24)
  .put(98, 23, 'C') // the first checkpoint, by the mill, before the walkway
  .ground(101, 136, 33) // the pool's bed (pools)
  .walkway(101, 136, 24, { posts: [101, 105, 110, 114, 120, 125, 130, 136] })
  .ladder(107, 24, 32).ladder(123, 24, 32) // up from the water to the walkway
  .put(110, 23, 'P').put(128, 23, 'P')
  .island(102, 106, 28) // islands and a brick pillar in the water, a fall's soft landing
  .brickPillar(117, 28, 32).coins(117, 118, 27)
  .island(129, 133, 28).coins(130, 132, 27)
  .put(120, 32, 'Q') // a crab on the bed
  .wheel(118, 18, { dir: 1 }) // its lowest seat just over the walkway, up to the high route
  .island(106, 111, 16).coins(107, 110, 15)
  .island(123, 127, 12).coins(124, 126, 11)
  .coins(132, 135, 13).ladder(133, 14, 23) // on the rock's top, a ladder down to the walkway
  .island(138, 141, 19).coins(139, 140, 18)
  .ground(137, 142, 24)
  .trap('idol', 139, 23, { facing: -1 }) // darts down the walkway: jump them
  .put(142, 23, '+'); // a heart past them, after the hardest part before the dam

// ----- 4. The Grand Dam (columns 143-206): the left tower, the valley with the big dam in its
// middle, the far tower, both towers as high as the dam's top, so the risen water stays between
// them. Each ledge is spaced by the real jump and leap (tests/adventure-dam.test.js).
const VALLEY_FLOOR = 31; // he stands on row 30
const STAGES = [25, 23, 21]; // the valley's water, a stage for each lever: up to just under the dam's walkway (row 20)
const FAR_TOWER = { col: 194, row: 19 }; // the far tower's checkpoint
level.wall(143, 149, 20, ROWS - 1) // the left tower: up onto it from the walkway's end
  .ground(150, 190, VALLEY_FLOOR)
  .island(150, 151, 24).ladder(150, 24, 30) // a landing under the tower's top, the ladder down from it
  .put(147, 19, 'C') // on the left tower: over the risen water, if he comes back
  .put(157, 30, '^').put(158, 30, '^').put(159, 30, '^')
  .coins(160, 161, 29)
  .island(162, 165, 24).coins(162, 163, 23).put(165, 23, 'P') // lever 2's ledge, a pumpkin on it
  .island(174, 180, 22) // lever 3's ledge, its dart statue at its far end: the dart seen coming
  .trap('idol', 180, 21, { facing: -1 })
  .coins(160, 173, 21) // along the dam's top, at the water's last stage
  .bird('hover', 190, 18, { look: 'owl' }) // right over the leap out to the far tower: time it
  .put(170, 30, 'Q')
  .wall(191, 206, FAR_TOWER.row + 1, ROWS - 1) // the far tower
  .put(FAR_TOWER.col, FAR_TOWER.row, 'C');

// ----- 5. Flooded Depths (columns 207-236): the pool, brick pillars between islands on earth
// pillars, more islands over them, rock and a waterfall behind.
level.ground(207, 236, 34) // the pool's bed
  .brickPillar(214, 31, 33).brickPillar(222, 31, 33).brickPillar(230, 31, 33) // their heads a row over the water
  .island(208, 213, 24).coins(209, 211, 23)
  .island(216, 221, 24).coins(217, 220, 23)
  .island(224, 229, 23).put(226, 22, 'P')
  .island(232, 236, 24).coins(233, 235, 23)
  .coins(216, 221, 33).coins(224, 229, 33).put(233, 33, '+') // the underwater route, under the fish
  .island(208, 213, 18).put(210, 14, '?').ladder(213, 18, 23)
  .island(216, 221, 16).put(218, 15, '4') // a squirrel up here, throwing acorns at the ledges
  .put(226, 10, '?').put(228, 13, 'k') // on the rock's top: the gold chest's key
  .island(230, 231, 21).coins(230, 231, 20); // a step down off the rock's right edge (too far from the exit's cliff to cross to it)

// ----- 6. Dam Exit (columns 237-289): the climb against the flood. As he reaches the cliff's foot,
// the dam bursts and the water rises behind him (pools' flood): the only way up starts here, after
// it (nothing in section 5 reaches the high ground, tests/adventure-dam.test.js). Two towers of
// islands on earth pillars zig-zag up, six islands, past the thorns, the boar on the floor, two owls
// and a squirrel throwing acorns from the top; the water (0.7 rows a second) catches anyone still on
// the floor or the first three islands, the fourth is the first safe one (it stops at row 20, level
// with the far tower's top). No ladder: the climb is the challenge (the owner). The exit is high on
// the clifftop. A room at the cliff's foot floods, its heart a risky reward; secret 3 is a room under
// the clifftop, above the water, by a trapdoor on it.
const CLIFF_FOOT = 31; // the cliff's foot: he stands on row 30, the water reaching him about 3 s after it bursts
const CLIFF_TOP = 10; // the exit's clifftop: he stands on row 9
level.ground(237, 256, CLIFF_FOOT)
  .put(240, 30, '^').put(241, 30, '^').put(242, 30, '^')
  .put(253, 30, 'V') // the boar on the floor, under the right tower
  // Two towers of islands, one over another, zig-zagging up three rows a step: the water catches
  // him on the floor and the first three (rows 28, 25, 22); the fourth (row 19) is the first safe one.
  .island(244, 247, 28).coins(245, 246, 27)
  .island(249, 252, 25).coins(250, 251, 24)
  .island(244, 247, 22).coins(245, 246, 21)
  .island(249, 252, 19).put(250, 18, 'P') // the first safe island: a pumpkin on it
  .island(244, 247, 16).coins(245, 246, 15)
  .island(249, 252, 13).coins(250, 251, 12) // and up through the cliff rock's top to the clifftop
  .bird('hover', 247, 23, { look: 'owl' }) // over the flooded climb
  .bird('hover', 247, 11, { look: 'owl' }) // over the last jumps
  .ground(257, COLS - 1, CLIFF_TOP) // the clifftop, the exit on it
  .hollow(257, 265, 27, CLIFF_FOOT - 1).coins(259, 262, 30).put(264, 30, '+') // the room at the foot: it floods
  .put(258, 9, '4') // a squirrel on the clifftop's edge, throwing down the climb
  // Secret 3: a room under the clifftop, above the water: a trapdoor on the clifftop, its hatch seen,
  // a ladder down through it.
  .hollow(258, 266, 12, 14).put(263, 14, 'T').put(266, 14, '*').coins(258, 260, 14)
  .hollow(261, 262, 11, 11).trapdoor(261, 262, CLIFF_TOP).ladder(262, CLIFF_TOP, 14)
  .put(272, 9, 'E');

// The cliff the level is built into, last, so its tops (stood on, as ground) leave what's already
// placed as it is: rock behind the layers, as in the owner's picture, the waterfalls pouring down it.
level.rock([{ cols: [32, 34], rows: [15, 31] }], { foot: 'water' }) // the first waterfall's
  .rock([{ cols: [41, 50], rows: [16, 26] }]) // behind the tall pillar: its top the way on, down behind the ground and to the minecart's floor past its end
  .rock([{ cols: [69, 77], rows: [10, 31] }], { foot: 'water' }) // the riverside cliff, over its pool, clear of secret 2's cave (its side and its plants reach past it)
  .rock([{ cols: [78, 90], rows: [12, 28] }]) // its top the ruined arch's floor
  .rock([{ cols: [132, 142], rows: [14, 24] }]) // its top the high route's end, its ladder down
  .rock([{ cols: [223, 229], rows: [14, 33] }], { foot: 'water' }) // the depths' waterfall, the key on its top
  .rock([{ cols: [249, 255], rows: [CLIFF_TOP, CLIFF_FOOT - 1] }]); // the exit's cliff behind the right tower, its top the clifftop's start

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
  walkways: level.walkways(), // the timber walkway round the wheel (data/adventure/scaffolds.js)
  masonry: level.masonry(), // the brick towers and pillars (data/adventure/bricks.js)
  stairs: [{ at: 18, row: 26, dir: 1 }], // up from the start's ground to the plateau
  // Scenery from the owner's pictures, as thick as in their level picture: the cottage, lanterns,
  // fences, posts, boulders half-buried in the earth, the minecart on its rails, the mill, a trough
  // pouring off the walkway, banners, crystals glowing in the secret caves, the exit's sign.
  props: [
    // 1. Forest Approach.
    { picture: 'big-tree', col: 11, row: 26, back: true },
    { picture: 'cottage', col: 8, row: 26, back: true, smoke: { x: 0.33, y: 0.08 } },
    { picture: 'start-sign', col: 3, row: 26 },
    { picture: 'lamp-post', col: 16, row: 26 },
    { picture: 'fence', col: 14, row: 26 },
    { picture: 'hang-lantern', col: 6, row: 30, hang: true, glow: true }, // in secret 1's cave
    { picture: 'hang-lantern', col: 11, row: 30, hang: true, glow: true },
    { picture: 'crystal-purple', col: 8, row: 32 },
    { picture: 'crystal-purple', col: 2, row: 32 },
    { picture: 'lamp-post', col: 23, row: 19 },
    { picture: 'fence-2', col: 20, row: 24 },
    { picture: 'post-rope', col: 30, row: 24 },
    { picture: 'torch', col: 38, row: 13, width: 84, glow: true },
    { picture: 'post-cross', col: 41, row: 22 },
    { picture: 'boulder-big', col: 5, row: 35, inGround: true },
    { picture: 'boulder-small', col: 22, row: 28, inGround: true },
    { picture: 'boulder-big', col: 28, row: 31, inGround: true },
    { picture: 'boulder-small', col: 40, row: 27, inGround: true },
    // 2. Riverside Caves.
    { picture: 'drawbridge', col: 12, row: 27, inGround: true, dy: -61 }, // secret 1's trapdoor: its hatch
    { picture: 'drawbridge', col: 13, row: 27, inGround: true, dy: -61 },
    { picture: 'drawbridge', col: 60, row: 27, inGround: true, dy: -61 }, // secret 2's trapdoor: its hatch, on the floor
    { picture: 'drawbridge', col: 61, row: 27, inGround: true, dy: -61 },
    { picture: 'mine-mouth', col: 55, row: 26, width: 420, back: true }, // its dark tunnel, behind it
    { picture: 'mine-frame', col: 55, row: 26, width: 420, back: true },
    { picture: 'mine-rail', col: 51, row: 26 }, { picture: 'mine-rail', col: 53, row: 26 },
    { picture: 'mine-rail', col: 55, row: 26 }, { picture: 'mine-rail', col: 57, row: 26 },
    { picture: 'minecart', col: 54, row: 26 },
    { picture: 'hang-lantern', col: 58, row: 31, hang: true, glow: true }, // in secret 2's cave
    { picture: 'crystal-purple', col: 63, row: 33 },
    { picture: 'crystal-purple', col: 50, row: 33 },
    { picture: 'post-candle', col: 54, row: 33, glow: true },
    { picture: 'ruin-arch', col: 86, row: 11, back: true },
    { picture: 'crystal-blue', col: 88, row: 11 },
    { picture: 'barrel', col: 79, row: 14 },
    { picture: 'fence', col: 65, row: 26 },
    { picture: 'torch', col: 90, row: 26, width: 84, glow: true },
    { picture: 'boulder-big', col: 58, row: 36, inGround: true },
    { picture: 'boulder-small', col: 80, row: 31, inGround: true },
    { picture: 'boulder-big', col: 89, row: 33, inGround: true },
    // 3. Water Control.
    { picture: 'mill-house', col: 97, row: 23, back: true },
    // Troughs under the deck, carrying the wheel's water: each pours into a fall down to the pool.
    { picture: 'scaffold-trough', col: 110, row: 25, hang: true, dx: -29, dy: 12 },
    { picture: 'scaffold-trough', col: 126, row: 25, hang: true, dx: -29, dy: 12 }, // clear of the ladder
    { picture: 'barrel', col: 113, row: 23 },
    { picture: 'torch', col: 125, row: 23, width: 84, glow: true },
    { picture: 'minecart', col: 125, row: 11 },
    { picture: 'hang-lantern', col: 108, row: 25, hang: true, glow: true },
    { picture: 'hang-lantern', col: 131, row: 25, hang: true, glow: true },
    { picture: 'boulder-small', col: 96, row: 28, inGround: true },
    { picture: 'boulder-big', col: 140, row: 29, inGround: true },
    // 4. The Grand Dam (its own banner is on its left).
    { picture: 'banner-open', col: 146, row: 19 },
    { picture: 'torch', col: 148, row: 19, width: 84, glow: true },
    { picture: 'torch', col: 192, row: 19, width: 84, glow: true },
    { picture: 'small-tree', col: 204, row: 19, back: true },
    // 5. Flooded Depths.
    { picture: 'hang-lantern', col: 210, row: 25, hang: true, glow: true },
    { picture: 'hang-lantern', col: 234, row: 25, hang: true, glow: true },
    { picture: 'fence-2', col: 220, row: 15 },
    // 6. Dam Exit.
    { picture: 'crystal-purple', col: 258, row: 14 }, // in secret 3's room, above the water
    { picture: 'crystal-purple', col: 265, row: 14 },
    { picture: 'post-candle', col: 260, row: 14, glow: true },
    { picture: 'drawbridge', col: 261, row: 10, inGround: true, dy: -61 }, // its trapdoor's hatch, on the clifftop
    { picture: 'drawbridge', col: 262, row: 10, inGround: true, dy: -61 },
    { picture: 'hang-lantern', col: 261, row: 27, hang: true, glow: true }, // in the room at the cliff's foot
    { picture: 'barrel', col: 258, row: 30 },
    { picture: 'big-tree', col: 240, row: 30, back: true },
    { picture: 'boulder-big', col: 245, row: 33, inGround: true },
    { picture: 'boulder-small', col: 270, row: 20, inGround: true },
    { picture: 'boulder-big', col: 280, row: 27, inGround: true },
    { picture: 'exit-sign', col: 279, row: 9 }, // the portal's own cat statues flank it
    { picture: 'big-tree', col: 285, row: 9, back: true },
  ],
  // Earth pillars under the islands, each in its island's middle, as in the owner's picture.
  columns: [
    { col: 20, width: 3, top: 21, bottom: 25 },
    { col: 28, width: 2, top: 18, bottom: 25 }, // its foot on the plateau, clear of the waterfall's gap
    { col: 37, width: 2, top: 15, bottom: 23 },
    { col: 63, width: 3, top: 18, bottom: 27 },
    { col: 78, width: 2, top: 16, bottom: 27 },
    { col: 210, width: 2, top: 25, bottom: 33 }, // the depths' islands, down to the pool's bed
    { col: 218, width: 2, top: 25, bottom: 33 },
    { col: 233, width: 3, top: 25, bottom: 33 },
    { col: 210, width: 2, top: 19, bottom: 23 }, // and the islands over them
    { col: 218, width: 2, top: 17, bottom: 23 },
    { col: 245, width: 2, top: 29, bottom: CLIFF_FOOT - 1 }, // the exit's two towers of islands
    { col: 245, width: 2, top: 23, bottom: 27 },
    { col: 245, width: 2, top: 17, bottom: 21 },
    { col: 250, width: 2, top: 26, bottom: CLIFF_FOOT - 1 },
    { col: 250, width: 2, top: 20, bottom: 24 },
    { col: 250, width: 2, top: 14, bottom: 18 },
  ],
  // The waterfall gap's pool; the pool at the riverside cliff's foot; the wheel's pool; the dam's
  // valley, rising a stage with each lever; the flooded depths.
  pools: [
    { cols: [32, 34], bottom: 31, surface: 29 },
    { cols: [70, 75], bottom: 31, surface: 28 },
    { cols: [101, 136], bottom: 32, surface: 29 },
    { cols: [150, 190], bottom: VALLEY_FLOOR - 1, surface: VALLEY_FLOOR - 1, stages: STAGES },
    // The depths: when he reaches the exit's cliff (from, on its foot or over it: not from secret 3's
    // cave under it), the dam bursts, and this water floods up
    // behind him, over the cliff's foot and into its room, to just under the exit's ledge: climb!
    { cols: [207, 265], bottom: 33, surface: 32, flood: { from: 238, above: CLIFF_FOOT - 1, top: 20, rowsPerSecond: 0.7 } },
  ],
  levers: [{ col: 155, row: 30 }, { col: 164, row: 23 }, { col: 175, row: 21 }],
  // Fish swimming between the depths' pillars (systems/adventure/AdventurePoolFish.js).
  poolFish: [{ from: 216, to: 221, row: 33 }, { from: 224, to: 229, row: 33 }],
  // The cliff the level is built into (data/adventure/rocks.js): rock behind the layers, as in the
  // owner's picture, the waterfalls pouring down it; its tops stood on (mapBuilder's rock()).
  rocks: level.rocks(),
  hiddenTiles: level.hiddenTiles(),
  waterfalls: [
    { col: 33, top: 15, bottom: 29, width: 96 },
    { col: 72, top: 10, bottom: 28, width: 112 },
    { col: 86, top: 12, bottom: 27, width: 96 },
    { col: 111, top: 26, bottom: 29, width: 64 }, // from the troughs under the walkway
    { col: 127, top: 26, bottom: 29, width: 64 },
    { col: 227, top: 14, bottom: 32, width: 80 },
  ],
  dam: { col: 170, row: 30 },
  secrets: [{ cols: [0, 1], rows: [27, 29] }, { cols: [0, 15], rows: [28, 32] }, { cols: [50, 66], rows: [28, 33] }, { cols: [258, 266], rows: [11, 14] }],
  caves: [{ cols: [0, 15], rows: [27, 32] }, { cols: [50, 66], rows: [28, 33] }, { cols: [258, 266], rows: [11, 14] }, { cols: [257, 265], rows: [27, CLIFF_FOOT - 1] }],
  hintsAt: [
    { col: 70, text: 'Swim! Up to stroke, out at the top' },
    { col: 152, text: 'The Grand Dam!\nPull the levers: each gate raises the water' },
    { col: 238, text: 'The dam is bursting!\nClimb to the exit!' },
  ],
  places: {
    damStart: { col: 4, row: 26 },
    damRiver: { col: 45, row: 22 }, // over the minecart's floor
    damWheel: { col: 99, row: 23 }, // by the walkway
    valley: { col: 152, row: 30 }, // the dam's valley floor, by lever 1 (its checkpoint up on the left tower)
    damFront: { col: 170, row: 30 }, // in front of the Grand Dam
    depths: { col: 194, row: 19 }, // the far tower's top
    damExit: { col: 239, row: CLIFF_FOOT - 1 }, // the exit's cliff foot
  },
};
