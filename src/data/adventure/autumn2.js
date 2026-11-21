// World 2, level 2: The Hidden Dam, from the owner's design (images/levels/autumn/level2.png). Its
// idea: water. The cat swims (systems/adventure/AdventureSwimming.js) and, later in the level, the
// dam's three gates raise the water a stage each, opening the way up (levers, pools' stages).
// Its six sections, as in the owner's picture:
//   1. Forest Approach: the start, a cottage, islands to climb, a ? block, a bounce mushroom.
//   2. Riverside Caves: the river the cat first swims in, safely: coins under the water, a crystal on
//      its bed, and a cave reached by swimming under the bank, hidden until he's in it.
//   3. Water Control: a mill basin, its stone pillars to hop, a crab on its bed, and the water wheel
//      (systems/adventure/wheels.js) carrying him up to a high walkway.
//   4. The Grand Dam: a valley, the dam in its middle (data/adventure/dam.js), the water ankle-deep.
//      Three levers, each opening a gate: the water rises a stage, up to the next lever's ledge,
//      and at last to the dam's top (never over it), where its coins float, and the far cliff is a
//      leap from the water. Each ledge is out of reach until its stage (tests/adventure-dam.test.js).
//   5. Flooded Depths: a deep basin, a rock wall across it to dive under, pillars, a crab, a crystal.
//   6. Dam Exit: a climb to the exit on a raised plaza, the EXIT sign, and a secret room under it.
import { mapBuilder } from './mapBuilder.js';

const COLS = 220;
const ROWS = 36;
const GROUND = 22; // the banks' ground row: the cat stands on row 21
const RIVER_TOP = 23; // the river's surface row, a row under the banks
const RIVER_BED = 28; // the river's bed (its floor row)

const level = mapBuilder(COLS, ROWS);

// ----- 1. Forest Approach: the start by the cottage, a pumpkin for the stomp's lesson on flat
// ground, islands up to a ? block and coins, and a bounce mushroom to the higher one.
level.ground(0, 30, GROUND)
  .put(2, 21, '@')
  .put(14, 21, 'P')
  .island(9, 13, 18).put(11, 14, '?').coins(10, 12, 17)
  .island(17, 21, 15).coins(18, 19, 14).put(20, 14, 'j').put(21, 14, '+') // the silver key: its chest is in the river's cave
  .trap('mushroom', 16, 21);

// ----- 2. Riverside Caves: the river sunk between its banks, the first water to swim in, safe (it
// has a bed, unlike the deep chasm's water). Coins lead down under its surface to a crystal on its
// bed; at its near end a tunnel under the bank leads to a cave full of water with the silver chest
// (its key on the high island), the level's first secret. The far bank and the way on.
level.ground(31, 44, RIVER_BED) // the river's bed
  .ground(45, 52, GROUND)
  .hollow(22, 30, 24, RIVER_BED - 1) // the cave under the near bank, and its tunnel to the river
  .coins(33, 35, 24).coins(36, 39, 26).put(41, RIVER_BED - 1, '*')
  .put(23, RIVER_BED - 1, 'U').coins(25, 27, 25)
  ;

// ----- 3. Water Control: a checkpoint on the bank, then the mill basin: stone pillars to hop over its
// water (or swim it), a crab on its bed, and the water wheel, its seats dipping into the water,
// carrying him up to the high walkway (a ? block over it) and on to the far bank.
level.put(48, 21, 'C')
  .ground(53, 90, 31) // the basin's bed
  .fill(57, 58, 25, 30).fill(63, 64, 25, 30).fill(69, 70, 25, 30) // the stone pillars
  .arc(59, 62, 23, 1).arc(65, 68, 23, 1)
  .put(66, 30, 'Q') // a crab on the bed
  .wheel(77, 22, { dir: 1 })
  .island(81, 94, 18).coins(83, 90, 17).put(87, 14, '?')
  .ground(91, 95, GROUND);

// ----- 4. The Grand Dam: down the ladder into the valley, the dam in its middle. The water is
// ankle-deep. Lever 1 is on the valley floor; each lever opens a gate, and the water rises a stage:
// up to lever 2's ledge on the right, then lever 3's on the left, then to the dam's top, where its
// coins float, and a leap from the water to the far cliff. A crab on the valley floor.
level.ground(96, 140, 31)
  .island(96, 97, 22).ladder(96, 22, 30) // a landing by the bank, the ladder down from it
  .coins(104, 108, 29)
  .island(128, 132, 25).coins(128, 129, 24) // lever 2's ledge: out of a jump from the far cliff
  .island(106, 110, 24).coins(109, 110, 23) // lever 3's ledge: out of a jump from the bank
  .coins(113, 123, 23) // along the dam's top, at the water's last stage
  .put(127, 30, 'Q');

// ----- 5. Flooded Depths: the far cliff's top, a checkpoint, then a deep basin: a rock wall across
// it to its bed but for a gap at the bottom (the way on is under it), pillars, a crab on the bed, a
// crystal in the deep, a ledge above with a ? block, reached from the cliff.
level.ground(141, 150, 22)
  .put(143, 21, 'C')
  .ground(151, 180, 31)
  .fill(164, 166, 20, 27) // the rock wall: dive under it
  .fill(156, 157, 26, 30).fill(172, 173, 25, 30)
  .put(160, 30, '*').coins(167, 170, 29)
  .put(176, 30, 'Q')
  .island(152, 156, 18).put(154, 14, '?').coins(153, 155, 17);

// ----- 6. Dam Exit: the far bank, a checkpoint, a climb up two islands to the raised plaza and the
// exit. A secret room under the plaza, in through a cracked floor past the exit, out by a trapdoor.
level.ground(181, COLS - 1, 24)
  .put(184, 23, 'C')
  .island(189, 193, 21).coins(190, 192, 20)
  .island(195, 199, 18).coins(196, 198, 17)
  .ground(202, COLS - 1, 16)
  .put(210, 15, 'E')
  .hollow(205, 218, 17, 19).put(212, 19, '*').coins(208, 211, 19) // the secret room
  .cracked(217, 218, 16) // in: the cracked floor past the exit
  .hollow(205, 206, 16, 16).island(205, 206, 16); // out: the trapdoor, jumped up through

export const AUTUMN_DAM_LEVEL = {
  id: 'autumn-2',
  title: 'The Hidden Dam',
  world: 'autumn',
  cat: { speed: 420 },
  hearts: 3,
  hint: 'The Hidden Dam\nThe river: swim! Up to stroke, out at the top',
  map: level.rows(),
  traps: level.traps(),
  movers: level.movers(),
  birds: level.birds(),
  drawbridges: level.drawbridges(),
  vines: level.vines(),
  wheels: level.wheels(),
  // Scenery from the owner's pictures (level 1's sheets and level 2's): the cottage at the start, the
  // mill house by the basin, trees, the EXIT sign and the cat statues by the exit.
  props: [
    { picture: 'cottage', col: 6, row: 21, back: true },
    { picture: 'big-tree', col: 26, row: 21, back: true },
    { picture: 'mill-house', col: 49, row: 21, back: true },
    { picture: 'small-tree', col: 93, row: 21, back: true },
    { picture: 'big-tree', col: 146, row: 21, back: true },
    { picture: 'small-tree', col: 186, row: 23, back: true },
    { picture: 'cat-statue', col: 207, row: 15, back: true },
    { picture: 'cat-statue', col: 214, row: 15, back: true },
    { picture: 'exit-sign', col: 216, row: 15 },
  ],
  // The river and the cave under the near bank (one water, the cave's part a secret); the mill
  // basin; the dam's valley, rising a stage with each lever; the flooded depths.
  pools: [
    { cols: [22, 44], bottom: RIVER_BED - 1, surface: RIVER_TOP },
    { cols: [53, 90], bottom: 30, surface: 25 },
    { cols: [97, 140], bottom: 30, surface: 30, stages: [26, 25, 23] }, // to the dam's top (row 23), never over it
    { cols: [151, 180], bottom: 30, surface: 23 },
  ],
  levers: [{ col: 101, row: 30 }, { col: 130, row: 24 }, { col: 108, row: 23 }],
  dam: { col: 118, row: 30 },
  secrets: [{ cols: [22, 30], rows: [24, RIVER_BED - 1] }, { cols: [205, 218], rows: [17, 19] }],
  caves: [{ cols: [22, 30], rows: [24, RIVER_BED - 1] }, { cols: [205, 218], rows: [17, 19] }],
  hintsAt: [{ col: 98, text: 'The Grand Dam!\nPull the levers: each gate raises the water' }],
  places: {
    damStart: { col: 2, row: 21 },
    damRiver: { col: 30, row: 21 }, // on the near bank's edge, over the river
    millBasin: { col: 50, row: 21 }, // the mill basin's bank
    valley: { col: 98, row: 30 }, // the dam's valley floor, by lever 1
    damFront: { col: 118, row: 30 }, // in front of the Grand Dam
    depths: { col: 146, row: 21 }, // the flooded depths' cliff top
    damExit: { col: 186, row: 23 }, // the dam exit's bank
  },
};
