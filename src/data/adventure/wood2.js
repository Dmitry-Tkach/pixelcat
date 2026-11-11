// The second adventure level: The Canopy, in the Wood world. Into the Roots went mostly across; this
// one goes up, from the foot of a giant tree, up its trunk and along its branches, to the treetops.
//
// Its new idea is moving logs: (1) a first ride over a shallow dip; (2) logs that lift him up the
// trunk, under fire; (3) logs across a bottomless gap between branches, with a log going down to a
// hidden hollow with the silver key; (4) crumbling leaves to climb before they fall; (5) everything
// together, across the canopy; (6) the treetop portal, and the silver chest. A checkpoint starts each
// hard part. Tests check every pickup can be reached and no edge is a blind drop, as for every level.
//
// Letters as in wood.js; new here: % crumbling leaves, j the silver key, U the silver chest. Moving
// logs are listed with `mover`, see data/adventure/mapBuilder.js.
import { mapBuilder } from './mapBuilder.js';

const COLS = 100;
const ROWS = 70;
const FLOOR = 66; // the forest floor's surface row, under the first two sections: he stands on 65

const level = mapBuilder(COLS, ROWS).ground(0, 45, FLOOR).put(46, 65, 'X'); // the floor ends: a stone at its edge

// ----- 1. The Trunk's Foot: a safe start. His first moving log glides over a shallow dip, not a pit,
// so he learns to ride it. A goon to warm up on.
level.put(2, 65, '@').put(4, 65, '>').put(7, 65, 'b')
  .ground(10, 16, 68) // the dip, two cells deep: easy to climb out of
  .mover(10, 66, { across: 4 }).coins(11, 15, 63)
  .put(22, 65, 'g').coins(19, 21, 64).put(26, 65, 'p');

// ----- 2. The Lift: logs that go up and down lift him up the trunk. The minigun waits halfway, and
// a blaster fires from a ledge as he rides.
level.mover(30, 65, { up: 8 }).put(29, 65, '/')
  .coins(31, 31, 62).coins(31, 31, 59)
  .island(34, 40, 57).put(38, 56, 'w').put(36, 56, 'g')
  .island(26, 29, 50).put(28, 49, '1').put(25, 49, 'X')
  .mover(42, 57, { up: 8 }).coins(43, 43, 54).coins(43, 43, 51)
  .island(46, 52, 49).put(47, 48, 'C').put(51, 48, '+');

// ----- 3. Branch Walk: no forest floor from here on: a fall goes back to the checkpoint. Logs carry
// him across the gaps between branches, cone heads on them, a blaster on a branch above. A log off the
// last branch goes down to a hidden hollow with the silver key and a crystal.
level.mover(54, 49, { across: 6 }).coins(55, 61, 47)
  .island(65, 69, 49).put(67, 48, 'c').put(65, 48, 'a')
  .island(60, 63, 41).put(61, 40, '1')
  .mover(71, 47, { across: 6 }).coins(72, 78, 45)
  .island(82, 88, 46).put(85, 45, 'g')
  .mover(90, 46, { up: -8 }) // down to the hollow
  .island(94, 99, 54).put(96, 53, 'j').put(98, 53, '*').coins(94, 95, 53);

// ----- 4. Falling Leaves: a checkpoint and a rage mushroom, then a climb up crumbling leaves, which
// fall soon after he lands: no stopping.
level.put(83, 45, 'C').put(87, 45, 'm')
  .put(76, 43, '%').put(77, 43, '%').put(78, 43, '%')
  .put(70, 40, '%').put(71, 40, '%').put(72, 40, '%')
  .put(75, 37, '%').put(76, 37, '%').put(77, 37, '%').put(77, 34, '*')
  .put(69, 34, '%').put(70, 34, '%').put(71, 34, '%')
  .island(60, 67, 31).put(62, 30, 'C').put(61, 30, 'k').put(65, 30, 'c').coins(68, 68, 32);

// ----- 5. Canopy Run: everything together. A log across, a spiky one by a laser crate, leaves, a log
// lifting him to the top branch, under a rifle gunner's fire.
level.mover(50, 31, { across: 6 })
  .island(40, 46, 31).put(43, 30, 'v').put(41, 30, 'z').put(45, 30, '+')
  .island(44, 49, 22).put(46, 21, '3')
  .put(34, 28, '%').put(35, 28, '%').put(36, 28, '%')
  .mover(28, 28, { up: 7 }).coins(29, 29, 25)
  .island(20, 26, 21).put(25, 20, 'C').put(22, 20, 'T').put(24, 20, 'g').put(19, 20, 'X');

// ----- 6. Treetop Portal: the last climb, to the portal, and the silver chest for whoever found its
// key.
level.island(30, 35, 17).put(33, 16, 'c')
  .put(38, 14, '%').put(39, 14, '%').put(40, 14, '%')
  .mover(43, 11, { across: 6 }).put(47, 7, '*').coins(44, 50, 9)
  .island(54, 62, 11).put(55, 10, 's').put(57, 10, 'U').put(59, 10, 'g').put(61, 10, 'E').put(63, 10, 'X')
  .island(30, 34, 6).put(32, 5, '2');

export const WOOD_CANOPY_LEVEL = {
  id: 'wood-2',
  title: 'The Canopy',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  map: level.rows(),
  movers: level.movers(),
};
