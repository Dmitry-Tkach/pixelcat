// The second adventure level: Mill Falls, in the Wood world, from the owner's painting
// (images/levels/forest/level2-example). Across old ruins over a river, where waterfalls turn
// great wooden water wheels.
//
// Its star is the water wheel (systems/adventure/wheels.js): seats round its rim stay level as it
// turns, and the cat rides them up and across. Built up the way level 1 built up the mace: (2) a
// small wheel in a dry dip, the only way up a cliff, where a fall costs nothing; (3) the big
// waterfall wheel over the river, with a secret above it; (4) a wheel a dart idol fires across;
// (5) a breather from wheels: hanging crushers and spikes, and a crusher to freeze into a step;
// (6) two wheels turning opposite ways, and a jump between them, then a small one up to the cliff;
// (7) the portal cliff, a moving log up to the portal, and a cave under the cliff for the silver
// chest. A checkpoint starts each hard part. Tests check the routes and blind drops, as for every
// level: they count a wheel's whole ring as somewhere to stand, as he can wait for a seat.
// To see it: node tools/adventure-preview.mjs <out.png> 1 --routes
//
// Letters as in wood.js; also % crumbling leaves, j the silver key, U the silver chest.
import { mapBuilder } from './mapBuilder.js';

const COLS = 210;
const ROWS = 40;
const FLOOR = 36; // the river bank's surface row: the cat stands on row 35
const CLIFF = 28; // the cliffs' and banks' surface row over the river: he stands on row 27

const level = mapBuilder(COLS, ROWS).ground(0, COLS - 1, FLOOR);

// ----- 1. Ruin Gate: a safe start on the river bank. Crates, a terrace with the minigun, a ? block,
// a goon to warm up on, and a narrow gap of water with ground both sides: water costs a heart.
level.put(2, 35, '@').put(4, 35, '>').put(7, 35, 'B')
  .ground(9, 13, 34).put(12, 33, 'w').coins(9, 11, 32)
  .put(16, 31, '?').put(20, 35, 'g').put(18, 35, 'p')
  .gap(23, 24).arc(22, 25, 33, 1)
  .put(27, 35, 'b');

// ----- 2. The Little Wheel: a small wheel turning in a dry dip, under a cliff too high to jump. Its
// top seat is the only way up. A fall lands in the dip, and he climbs out to try again.
const LITTLE = { radius: 3, seats: 4, periodMs: 10000 };
level.ground(31, 42, 39) // the dip, three cells down
  .wheel(38, 34, LITTLE)
  .coins(37, 39, 29) // over the top seat
  .ground(43, 54, CLIFF);

// ----- 3. The Waterfall Wheel: the painting's big wheel, over the river. From the cliff onto a
// seat, round, and off onto the far bank. A bonus: from the top seat, a jump straight up reaches a
// branch high in the leaves, with a crystal and the silver key (a coin just above the seat hints at
// it). (It's in plain view for now: leaves drawn in front would make it a secret.) Then a bridge,
// with a cone head on it.
level.put(47, 27, 'C').put(52, 27, '/')
  .gap(55, 70)
  .wheel(62, 30, { dir: 1 })
  .put(62, 23, 'o').island(61, 63, 21).put(62, 20, '*').put(61, 20, 'j')
  .ground(71, 82, CLIFF).put(77, 27, 'c').coins(72, 75, 26)
  .gap(83, 88).bridge(83, 88, CLIFF).coins(84, 85, 26).put(86, 27, 'c');

// ----- 4. Idol Ruins: a wheel turning the other way, and a dart idol on a rock in the river firing
// across its lower seats, which he rides through: jump the darts, or first freeze the idol (three
// rounds, as taught in level 1) from the crate by the checkpoint. Then a mace on a gallows, alone,
// as in level 1, and a heart.
level.ground(89, 93, CLIFF).put(90, 27, 'C').put(92, 27, 'f')
  .gap(94, 108)
  .wheel(101, 30, { dir: -1 })
  .island(107, 108, 33).trap('idol', 108, 32, { facing: -1 })
  .ground(109, 124, CLIFF)
  .trap('mace', 114, 27).put(117, 27, '+');

// ----- 5. Crusher Canopy: no wheels, a change of pace. A goon by the checkpoint, islands over the
// river, one with spikes, then two crushers hanging under a ruined slab, out of step, slamming onto
// the island under it; the first stands back, so the landing past the spikes is safe. Crumbling
// leaves lead up and on. The slab's top, with a crystal, is reached from the leaves, or by riding a
// crusher up as it lifts (a coin under it hints at it), and hopping up through the slab.
level.put(120, 27, 'C').put(122, 27, 'g')
  .gap(125, 149)
  .island(127, 131, 27).put(130, 26, '^').put(131, 26, '^').coins(127, 129, 25)
  .island(133, 139, 27).trap('crusher', 135, 19, { phaseMs: 0 }).trap('crusher', 138, 19, { phaseMs: 1100 })
  .coins(136, 137, 26).put(135, 21, 'o')
  .island(133, 139, 18).put(136, 17, '*')
  .put(141, 23, '%').put(142, 23, '%')
  .island(146, 149, 26).coins(146, 149, 24);

// ----- 6. Twin Wheels: the test. Two wheels side by side, turning the same way, so where they meet
// one's seats go up as the other's come down: the jump across needs timing. A blaster on the portal
// cliff fires at him as he rides. Then a small wheel lifts him to the cliff.
level.ground(150, 153, CLIFF).put(151, 27, 'C')
  .gap(154, 185)
  .wheel(159, 30, { dir: 1 })
  .wheel(172, 30, { dir: 1 })
  .wheel(181, 27, { ...LITTLE, dir: 1 });

// ----- 7. Portal Cliff: up on the cliff, the blaster and a goon, a crusher over the path, and a
// moving log lifting him to the portal. Under the cliff, at the river, a cave with the silver chest
// and a crystal, four cells high with a ledge in front, reached by dropping off the small wheel's
// lowest seat. (The owner's waterfall will hide it.)
level.ground(186, COLS - 1, 23)
  .gap(186, 190).ground(186, 190, 34).fill(186, 190, 23, 29) // the cave: four cells high, under the cliff
  .ground(184, 185, 34) // a ledge in front of it, to catch a short drop
  .put(184, 33, 'o').put(187, 33, 'o').put(189, 33, 'U').put(190, 33, '*')
  .put(191, 22, '1').put(193, 22, 'g')
  .trap('crusher', 195, 15) // the last hazard before the lift
  .mover(199, 22, { up: 6 })
  .island(203, 209, 16).put(206, 15, 'E'); // room each side for the portal's flame posts

export const WOOD_MILL_LEVEL = {
  id: 'wood-2',
  title: 'Mill Falls',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  // Water in the river's gaps, its surface a row under the bank (data/adventure/water.js).
  water: { row: FLOOR + 1 },
  map: level.rows(),
  movers: level.movers(),
  wheels: level.wheels(),
  traps: level.traps(),
  // Places to start at while developing, with /adventure.html?at=<name> (systems/adventure/devPlaces.js).
  places: {
    bigWheel: { col: 47, row: 27 },
    idol: { col: 90, row: 27 },
    crushers: { col: 120, row: 27 },
    twins: { col: 151, row: 27 },
  },
};
