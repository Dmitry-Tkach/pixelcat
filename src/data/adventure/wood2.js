// The second adventure level: Mill Falls, in the Wood world, from the owner's painting
// (images/levels/forest/level2-example). Across old ruins over a river, where waterfalls turn
// great wooden water wheels.
//
// Its star is the water wheel (systems/adventure/wheels.js): seats round its rim stay level as it
// turns, and the cat rides them up and across. Built up the way level 1 built up the mace: (2) a
// small wheel in a dry dip, the only way up a cliff, where a fall costs nothing; (3) the big
// waterfall wheel over the river, with a secret above it; (4) a wheel a dart idol fires across;
// (5) a breather from wheels: hanging crushers and spikes, and a crusher to freeze into a step;
// (6) the peak: two wheels, a dart idol between them firing across the second, and a gunner above;
// the hub, the freeze and the jump are all answers; then a small one up to the cliff; (7) the portal cliff, and a last small wheel up to the
// portal, so the level begins and ends with a little wheel; a cave under the cliff for the silver
// chest. A checkpoint starts each hard part. Tests check the routes and blind drops, as for every
// level: they count a wheel's whole ring as somewhere to stand, as he can wait for a seat. A wheel's
// green hub is a target: a round turns the wheel the other way, three freeze rounds stop it.
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
// top seat is the only way up. A fall lands in the dip, and he climbs out to try again. One of its
// seats is rotten: it looks like the rest, but breaks under him (systems/adventure/wheels.js), so
// rotten seats are met first here, safely; they come back on the wheels over the river. A step in
// the dip, level with the hub, teaches the hub: shoot it, and the wheel turns the other way.
const LITTLE = { radius: 3, seats: 4, periodMs: 10000 };
level.ground(31, 42, 39) // the dip, three cells down
  .wheel(38, 34, { ...LITTLE, broken: [1] }) // one rotten seat, met first where a fall costs nothing
  // A step in the dip, level with the hub: from it he can shoot the hub, and see the wheel turn
  // back, where a mistake costs nothing. (It's too low to reach the cliff from.)
  .ground(31, 33, 34)
  .coins(37, 39, 29) // over the top seat
  .ground(43, 54, CLIFF);

// ----- 3. The Waterfall Wheel: the painting's big wheel, over the river. From the cliff onto a
// seat, round, and off onto the far bank. A bonus: from the top seat, a jump straight up reaches a
// branch high in the leaves, with a crystal and the silver key (a coin just above the seat hints at
// it), hidden behind leaves that fade as he climbs in. Then a bridge, with a cone head on it.
level.put(47, 27, 'C').put(52, 27, '/')
  .gap(55, 70)
  .wheel(62, 30, { dir: 1, broken: [1, 4] }).arc(68, 70, 28, 1) // coins from its right-hand seat to the far bank
  .put(62, 23, 'o').island(61, 63, 21).put(62, 20, '*').put(61, 20, 'j')
  .ground(71, 82, CLIFF).put(77, 27, 'c').coins(72, 75, 26)
  .gap(83, 88).bridge(83, 88, CLIFF).coins(84, 85, 26).put(86, 27, 'v'); // a spiky: no stomping him on a narrow bridge

// ----- 4. Idol Ruins: a wheel turning the other way, and a dart idol on a rock in the river firing
// across its lower seats, which he rides through. Three answers: jump the darts; freeze the idol
// (three rounds, as taught in level 1, from the crate by the checkpoint) from a low ledge left of
// the wheel, out of the darts' reach and under the hub; or, riding an upper left seat, shoot the
// wheel's green hub, which turns it the other way, up and over the top, above the darts. Then a
// mace on a gallows, alone, as in level 1, and a heart.
level.ground(89, 93, CLIFF).put(90, 27, 'C').put(92, 27, 'f')
  .gap(94, 108)
  .wheel(101, 30, { dir: -1, broken: [3] })
  .island(94, 95, 33) // the low ledge to freeze the idol from
  .island(107, 108, 33).trap('idol', 108, 32, { facing: -1 })
  .ground(109, 124, CLIFF)
  .trap('mace', 114, 27).put(117, 27, '+');

// ----- 5. Crusher Canopy: no wheels, a change of pace. A goon by the checkpoint, islands over the
// river, one with spikes, then two crushers hanging under a ruined slab, out of step, slamming onto
// the island under it; the first stands back, so the landing past the spikes is safe. Crumbling
// leaves lead up and on. The slab's top, with a crystal, is reached from the leaves, or by riding a
// crusher up as it lifts (a coin under it hints at it), and hopping up through the slab.
level.put(120, 27, 'C').put(119, 27, 'g') // he patrols into the mace's swing: lure him in
  .gap(125, 149)
  .island(127, 131, 27).put(130, 26, '^').put(131, 26, '^').coins(127, 129, 25)
  .island(133, 139, 27).trap('crusher', 135, 19, { phaseMs: 0 }).trap('crusher', 138, 19, { phaseMs: 1100 })
  .coins(136, 137, 26).put(135, 21, 'o')
  .island(133, 139, 18).put(136, 17, '*')
  .put(141, 23, '%').put(142, 23, '%')
  .island(146, 149, 26).coins(146, 149, 24);

// ----- 6. Twin Wheels: the peak, where the level's tricks meet. Two wheels side by side, the second
// turning the other way, and a dart idol on a rock between them firing across the second wheel's
// low seats: the cat lands on it and is carried down through the darts. Three answers: from the
// first wheel, shoot the second's hub to turn it back, and ride up and over the top, clear of the
// darts but under the blaster; freeze the idol from behind it (the crate by the checkpoint); or ride
// through, jumping the darts. A blaster on a rock in the waterfall fires on the wheels' upper
// halves; the rock is also a higher way across. A heart by the checkpoint, for the hardest part.
// Then a small wheel lifts him to the cliff.
level.ground(150, 153, CLIFF).put(151, 27, 'C').put(152, 27, '+').put(153, 27, 'f')
  .gap(154, 185)
  .wheel(159, 30, { dir: 1, broken: [2] })
  .wheel(172, 30, { dir: -1, seats: 4, periodMs: 11000 })
  .island(165, 166, 33).trap('idol', 166, 32, { facing: 1 }) // its darts cross the second wheel's low seats
  .island(165, 167, 22).put(166, 21, '1').coins(165, 166, 29)
  .wheel(181, 27, { ...LITTLE, dir: 1 });

// ----- 7. Portal Cliff: a checkpoint on the cliff, a goon, a crusher over the path, and a last small
// wheel lifting him to the portal, under a ray gun's fire. Under the cliff, at the river, a cave with the silver chest
// and a crystal, four cells high with a ledge in front, reached by dropping off the small wheel's
// lowest seat. (The owner's waterfall will hide it.)
level.ground(186, COLS - 1, 23)
  .gap(186, 190).ground(186, 190, 34).fill(186, 190, 23, 29) // the cave: four cells high, under the cliff
  .ground(184, 185, 34) // a ledge in front of it, to catch a short drop
  .put(184, 33, 'o').put(187, 33, 'o').put(189, 33, 'U').put(190, 33, '*')
  .put(188, 22, 'C').put(190, 22, 'g')
  .trap('crusher', 193, 15) // the last hazard before the wheel
  .wheel(199, 18, { ...LITTLE, dir: 1 })
  .island(204, 209, 16).put(206, 15, 'E') // clear of the wheel's seats, with room for the portal's flame posts
  .put(209, 15, '2'); // a ray gun firing on the last wheel's top as he climbs: shoot back from the top seat

export const WOOD_MILL_LEVEL = {
  id: 'wood-2',
  title: 'Mill Falls',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  hint: 'Mill Falls\nRide the wheels: shoot a green hub to turn it back',
  // Water in the river's gaps, its surface a row under the bank (data/adventure/water.js).
  water: { row: FLOOR + 1 },
  map: level.rows(),
  movers: level.movers(),
  wheels: level.wheels(),
  traps: level.traps(),
  // Its set dressing (systems/adventure/AdventureScenery.js): waterfalls behind the wheels, a veil of
  // water over the cave, the cave's dark inside, leaves hiding the branch over the big wheel, and
  // stakes in the river.
  waterfalls: [
    { col: 24, top: 14, bottom: FLOOR + 1 }, // on the first screen, into the narrow gap: the mill starts at once
    { col: 62, top: 9, bottom: FLOOR + 1 },
    { col: 101, top: 11, bottom: FLOOR + 1 },
    { col: 165, top: 10, bottom: FLOOR + 1 },
    { col: 186, top: 23, bottom: 34, veil: true },
  ],
  caves: [{ cols: [186, 190], rows: [30, 33] }],
  props: [
    { picture: 'mill-leaves', col: 62, row: 21, front: true }, // over the branch with the crystal and key
    { picture: 'mill-cave', col: 188, row: 33, width: 340 },
    { picture: 'mill-lantern', col: 189, row: 30, hang: true },
    { picture: 'mill-stakes', col: 127, row: FLOOR + 1, inWater: true },
    { picture: 'mill-stakes', col: 147, row: FLOOR + 1, inWater: true },
    { picture: 'mill-stakes', col: 96, row: FLOOR + 1, inWater: true },
  ],
  // Places to start at while developing, with /adventure.html?at=<name> (systems/adventure/devPlaces.js).
  places: {
    bigWheel: { col: 47, row: 27 },
    portal: { col: 188, row: 22 },
    idol: { col: 90, row: 27 },
    crushers: { col: 120, row: 27 },
    twins: { col: 151, row: 27 },
  },
};
