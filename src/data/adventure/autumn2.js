// World 2, level 2: The Hidden Dam, from the owner's design (images/levels/autumn/level2.png). Its
// idea: water. The cat swims (systems/adventure/AdventureSwimming.js) and, later in the level, the
// dam's three gates raise the water a stage each, opening the way up (levers, pools' stages).
// Its six sections, as in the owner's picture:
//   1. Forest Approach: the start, a cottage, islands to climb, a ? block, a bounce mushroom.
//   2. Riverside Caves: the river the cat first swims in, safely: coins under the water, a crystal on
//      its bed, and a cave reached by swimming under the bank, hidden until he's in it.
//   3. Water Control, 4. The Grand Dam, 5. Flooded Depths, 6. Dam Exit: to come.
// Being built: for now the level ends past the river.
import { mapBuilder } from './mapBuilder.js';

const COLS = 80;
const ROWS = 32;
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
  .ground(45, COLS - 1, GROUND)
  .hollow(22, 30, 24, RIVER_BED - 1) // the cave under the near bank, and its tunnel to the river
  .coins(33, 35, 24).coins(36, 39, 26).put(41, RIVER_BED - 1, '*')
  .put(23, RIVER_BED - 1, 'U').coins(25, 27, 25)
  .put(72, 21, 'E');

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
  // The river and the cave under the near bank: one water, the cave's part a secret.
  pools: [{ cols: [22, 44], bottom: RIVER_BED - 1, surface: RIVER_TOP }],
  secrets: [{ cols: [22, 30], rows: [24, RIVER_BED - 1] }],
  caves: [{ cols: [22, 30], rows: [24, RIVER_BED - 1] }],
  places: {
    start: { col: 2, row: 21 },
    river: { col: 30, row: 21 }, // on the near bank's edge, over the river
  },
};
