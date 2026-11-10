// The first adventure level: the Wood world (World Tree Roots), for the battle cat. From the forest
// floor, up through the roots and across a thorny hollow, up the trunk of a great root to the canopy,
// and over the treetops to the portal.
//
// It's designed as a series of sections, each teaching one thing safely before testing it, with the
// stakes rising: (1) running, jumping and the first enemy; (2) ladders and islands, and the minigun;
// (3) the first gunner; (4) a bottomless hollow, with an optional higher route; (5) a climb up a
// tower of islands under fire; (6) the canopy's long jumps; (7) the guarded portal. A checkpoint
// starts each of the hardest parts, and every coin, crystal and pickup can be reached: tests check
// the routes (systems/adventureRoutes.js). To see the level as a picture, run
// node tools/adventure-preview.mjs <out.png> 0 --routes
//
// Letters (see systems/adventureMap.js): # ground, = island, - bridge, H ladder, ^ spikes, o coin,
// * crystal, + heart, k key, T chest, ? bonus block, B crate, X stone, C checkpoint, E portal,
// @ start, w the minigun, a e z ammunition crates (standard, explosive, laser), m rage mushroom,
// enemies g goon, c cone head, v spiky, gunners 1 blaster, 2 ray gun, 3 rifle, and scenery
// R earth pillar (under a low island), b bush, p plant, s statue, > and / signs.
import { mapBuilder } from './mapBuilder.js';

const COLS = 160;
const ROWS = 34;
const FLOOR = 30; // the forest floor's surface row: the cat stands on row 29

const level = mapBuilder(COLS, ROWS).ground(0, COLS - 1, FLOOR);

// ----- 1. The Root Path: a safe start. A stone to jump, a small spike pit, the first goon to land
// on, and crates to climb.
level.put(2, 29, '@').put(4, 29, '>').put(8, 29, 'b')
  .coins(6, 9, 28)
  .put(12, 29, 'X').arc(11, 13, 27, 1)
  .ground(16, 17, 33).put(16, 32, '^').put(17, 32, '^').arc(15, 18, 27, 2) // a pit, two spikes deep
  .put(22, 29, 'g').put(20, 29, 'p')
  .put(26, 29, 'B').put(27, 29, 'B').put(27, 28, 'B').coins(26, 27, 26);

// ----- 2. Up the Roots: the first ladder, islands, a ? block, and the minigun, then a cone head to
// try it on.
level.island(30, 36, 25).ladder(31, 25, 29).put(34, 26, 'R')
  .coins(32, 35, 24)
  .island(39, 44, 22).put(41, 18, '?').put(43, 21, 'w').put(39, 21, '/')
  .arc(37, 38, 22, 1)
  .put(49, 29, 'c').coins(46, 48, 28);

// ----- 3. The Gunner's Ledge: a raised ledge with a checkpoint. A blaster gunner shoots down from
// an island above it, which a ladder climbs to, with a crate of rounds for whoever gets there.
level.put(53, 29, 'B').ground(54, 69, 26)
  .put(56, 25, 'C').coins(57, 59, 24).put(60, 25, 'g').put(68, 25, 'b')
  .island(62, 67, 20).ladder(62, 20, 25).put(65, 19, '1').put(67, 19, 'a');

// ----- 4. Thorn Hollow: no floor at all, crossed on islands and a bridge. A spiky enemy holds the
// narrow middle island, a cone head the last, and a ray gun fires down from above. Above the spiky
// one, a step leads up to the gunner's island, with a rage mushroom and a crystal.
level.gap(70, 97)
  .island(72, 75, 27).arc(70, 71, 26, 1)
  .bridge(78, 81, 27).coins(78, 81, 25)
  .island(84, 87, 24).put(86, 23, 'v')
  .island(91, 94, 27).put(93, 26, 'c').coins(95, 96, 26)
  .island(88, 89, 21) // the step up
  .island(78, 84, 18).put(82, 17, '2').put(80, 17, 'm').put(78, 17, '*').coins(79, 79, 17);

// ----- 5. The Great Root: a checkpoint and a heart, then a tower of islands zigzagging up, a goon
// and a cone head on the way, under a rifle gunner. Its top ledge, off the route, has the key and a
// crystal.
level.put(100, 29, 'C').put(102, 29, '+').put(99, 29, 'b')
  .island(104, 108, 26).ladder(104, 26, 29).put(107, 27, 'R').coins(105, 107, 25)
  .island(111, 116, 22).put(114, 21, 'g').arc(109, 110, 22, 2)
  .island(104, 109, 18).put(105, 17, 'e').coins(107, 109, 17)
  .island(110, 115, 14).put(113, 13, 'c')
  .island(103, 108, 10).put(104, 9, '3').put(106, 9, 'k').put(108, 9, '*')
  .put(118, 29, 'p').put(110, 29, 'g');

// ----- 6. The Canopy: high islands with the level's longest jumps. A laser crate to start, a cone
// head, a blaster guarding the chest, and a spiky one. A ladder climbs back up from the floor below
// for whoever falls.
level.island(117, 122, 10).put(118, 9, 'C').put(120, 9, 'z')
  .island(127, 131, 8).put(129, 7, 'c').put(129, 4, '*').arc(123, 126, 9, 2)
  .island(133, 140, 11).ladder(134, 11, 29).put(137, 10, '1').put(139, 10, 'T').arc(132, 132, 9, 0)
  .island(143, 147, 7).put(145, 6, 'v').coins(141, 142, 8)
  .put(130, 29, 'g').put(142, 29, 'c').put(126, 29, '+').coins(136, 140, 28);

// ----- 7. The Portal Tree: one last jump to the portal, past a goon.
level.island(151, 157, 6).put(152, 5, 's').put(154, 5, 'g').put(156, 5, 'E').arc(148, 150, 6, 1)
  .put(158, 29, 'b');

export const WOOD_LEVEL = {
  id: 'wood-1',
  title: 'Into the Roots',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  map: level.rows(),
};
