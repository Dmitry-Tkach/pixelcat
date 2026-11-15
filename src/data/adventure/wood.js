// The first adventure level: the Wood world (World Tree Roots), for the battle cat. From the forest
// floor, up through the roots and across a thorny hollow, up the trunk of a great root to the canopy,
// and down to the stone guardian before the portal.
//
// Its star is the mace, built up as the best platformers build up one idea: one mace alone on safe
// floor (2), three in a wave under a roof, with a stone to jump among them (3), one across a climb (5),
// one beside a gunner (6), and the stone guardian swinging two, with fire (7). Around it, each other
// thing is taught safely before it's tested, with the stakes rising: (1) running, jumping, the
// mushroom, the first goon and crusher; (2) ladders, islands, the minigun, the first gunner;
// (3) the Mace Ledge; (4) a bottomless hollow, with an optional higher route; (5) a climb up a tower
// of islands under fire, the first dart idol at its foot; (6) the canopy's jumps; (7) the guardian.
// Camera shots show the Mace Ledge and the guardian before the action. A checkpoint
// starts each of the hardest parts, every coin, crystal and pickup can be reached, and no edge is
// a blind drop: from every edge, somewhere to land is in view, and coins mark the way down from the
// high places. Tests check the routes (systems/adventureRoutes.js). To see the level as a picture, run
// node tools/adventure-preview.mjs <out.png> 0 --routes
//
// Letters (see systems/adventureMap.js): # ground, = island, - bridge, H ladder, ^ spikes, o coin,
// * crystal, + heart, k key, T chest, ? bonus block, B crate, X stone, C checkpoint, E portal,
// @ start, w the minigun, a e z f h ammunition crates (standard, explosive, laser, freeze, fire), m rage
// mushroom, enemies g goon, c cone head, v spiky, gunners 1 blaster, 2 ray gun, 3 rifle, and scenery
// R earth pillar (under a low island), b bush, p plant, s statue, > and / signs.
import { mapBuilder } from './mapBuilder.js';

const COLS = 180;
const ROWS = 34;
const FLOOR = 30; // the forest floor's surface row: the cat stands on row 29

const level = mapBuilder(COLS, ROWS).ground(0, COLS - 1, FLOOR);

// ----- 1. The Root Path: a safe start, each thing met alone. A bounce mushroom to play with, and a
// secret: a high island only the mushroom reaches, with a crystal, coins hinting at it. A stone to
// jump, a small spike pit, the first goon to land on, the first crusher, slamming onto the safe
// floor over a line of coins, and crates to climb.
level.put(2, 29, '@').put(4, 29, '>').put(8, 29, 'b')
  .coins(6, 9, 28)
  .trap('mushroom', 10, 29).coins(10, 10, 25).coins(10, 10, 23).island(9, 11, 21).put(10, 20, '*')
  .put(12, 29, 'X').arc(11, 13, 27, 1)
  .ground(16, 17, 33).put(16, 32, '^').put(17, 32, '^').arc(15, 18, 27, 2) // a pit, two spikes deep
  .put(22, 29, 'g').put(20, 29, 'p')
  .trap('crusher', 24, 22).coins(23, 25, 28) // the first crusher: time the run under it for the coins
  .put(26, 29, 'B').put(27, 29, 'B').put(27, 28, 'B').coins(26, 27, 26);

// ----- 2. Up the Roots: the first ladder, islands, a ? block, and the minigun, then the first
// gunner to try it on: he shoots back. He stands out of sight of the Mace Ledge's checkpoint.
level.island(30, 36, 25).ladder(31, 25, 29).put(34, 26, 'R')
  .coins(32, 35, 24)
  .island(39, 44, 22).put(41, 18, '?').put(43, 21, 'w').put(39, 21, '/')
  .arc(37, 38, 22, 1)
  .put(47, 29, '1').coins(47, 49, 28)
  // The first mace, alone, over the safe floor under the minigun's island: met before the wave.
  .trap('mace', 42, 23, { hanging: true, chain: 300, swingDeg: 30 });

// ----- 3. The Mace Ledge: the level's star. A raised ledge with a checkpoint and a crate of rounds,
// then three maces in a row: two on long chains from a root roof too high to reach (so there's no way
// over them), and one on a gallows at the ledge's end, which smashes a stack of crates as the player
// arrives. They swing as a wave, each a little behind the one before (MACE_WAVE), so they never touch.
// A stone among them stops a slide, so it's not one slide through: run, wait, slide, jump.
const MACE_WAVE = { periodMs: 3200, lagMs: 360 };
level.put(53, 29, 'B').ground(54, 69, 26)
  .put(54, 25, 'a').put(55, 25, 'C').put(68, 25, 'b')
  .island(57, 64, 19) // the roof: seven cells above the ledge, out of reach
  .trap('mace', 59, 20, { hanging: true, chain: 237, swingDeg: 30, periodMs: MACE_WAVE.periodMs, phaseMs: 0 })
  .trap('mace', 62, 20, { hanging: true, chain: 237, swingDeg: 30, periodMs: MACE_WAVE.periodMs, phaseMs: -MACE_WAVE.lagMs })
  .trap('mace', 67, 25, { facing: -1, crate: true, periodMs: MACE_WAVE.periodMs, phaseMs: -2 * MACE_WAVE.lagMs })
  .put(61, 25, 'X') // a stone where the two hanging maces' swings meet: a slide stops at it, so jump it in time
  .arc(60, 61, 23, 1).arc(64, 65, 23, 1); // coins between the swings, for the brave

// ----- 4. Thorn Hollow: no floor at all, crossed on islands and a bridge. A crate of freeze rounds
// on the first island, for the spiky enemy who holds the narrow middle island (he can't be stomped),
// a cone head the last, and a blaster fires down from above. A crusher, met safely in the Root Path,
// hangs under the gunner's island and slams onto the bridge. Above the spiky one, a step leads up
// to the gunner's island, with a rage mushroom and a crystal.
level.gap(70, 97)
  .island(72, 75, 27).arc(70, 71, 26, 1).put(74, 26, 'f')
  .bridge(78, 81, 27).coins(78, 81, 25)
  .trap('crusher', 80, 19) // hanging high under the gunner's island, it slams down onto the bridge
  .island(84, 87, 24).put(86, 23, 'v')
  .island(91, 94, 27).put(93, 26, 'c').coins(95, 96, 26)
  .island(88, 89, 21) // the step up
  .island(78, 84, 18).put(82, 17, '1').put(80, 17, 'm').put(78, 17, '*').coins(79, 79, 17)
  // The way back down from up there, marked in coins: onto the step, then the last island.
  .put(86, 18, 'o').put(87, 19, 'o').put(90, 22, 'o').put(90, 24, 'o');

// ----- 5. The Great Root: a checkpoint, a heart and a crate of fire rounds, and the first dart idol,
// alone on the floor, its darts reaching the foot of the ladder: time the climb. Then a tower of
// islands zigzagging up, a goon and a cone head on the way, under a rifle gunner. The root's trunk, a wall
// from the canopy to the floor, means the climb is the only way on. Its top ledge, off the route,
// has the key and a crystal.
level.put(100, 29, 'C').put(102, 29, '+').put(99, 29, 'b').put(103, 29, 'h')
  .island(104, 108, 26).ladder(104, 26, 29).put(107, 27, 'R').coins(105, 107, 25)
  .island(111, 116, 22).put(114, 21, 'g').arc(109, 110, 22, 2)
  .island(104, 109, 18).put(105, 17, 'e').coins(107, 109, 17)
  .island(110, 115, 14).put(113, 13, 'c')
  .trap('mace', 112, 15, { hanging: true, chain: 300, swingDeg: 30 }) // swinging across the climb
  .island(103, 108, 10).put(104, 9, '3').put(106, 9, 'k').put(108, 9, '*').put(102, 9, 'X')
  // The way down from the top ledge, and on up to the canopy, marked in coins.
  .put(109, 11, 'o').put(110, 12, 'o').put(116, 12, 'o').put(116, 11, 'o')
  .put(110, 29, 'g').trap('idol', 113, 29, { facing: -1 })
  .ground(117, 118, 11); // the trunk, under the canopy's first island: the floor below can't skip the climb

// ----- 6. The Canopy: high islands and wide jumps. A laser crate to start, a cone head, and a
// blaster at the far end of the chest's island, with a mace on a gallows swinging over the chest. A ladder climbs back up from the floor
// below for whoever falls, past spikes.
level.island(117, 122, 10).put(118, 9, 'C').put(120, 9, 'z')
  .island(127, 131, 8).put(129, 7, 'c').arc(123, 126, 9, 2)
  .island(133, 142, 11).ladder(134, 11, 29).put(142, 10, '1').put(137, 10, 'T')
  .trap('mace', 139, 10, { facing: -1 }) // beside the gunner, over the chest.arc(132, 132, 9, 0).put(133, 10, 'o')
  .coins(141, 142, 8)
  .put(130, 29, 'g').put(138, 29, 'c').put(126, 29, '+').coins(136, 140, 28);

// ----- 7. The Guardian: the finale, over water. Down from the canopy on crumbling leaves and a step
// with a checkpoint, to a long stone path. Over it, on a stone platform, stands a giant stone
// guardian, solid from his feet to his head, so there's no way over him, who wakes and roars as he comes into view, and swings a mace on a chain in each
// hand down onto the path, in turn: each arm winds up outward (the warning) and strikes back down.
// Past his left mace, safe under his platform, past his right one, to the portal. The level's maces,
// learnt alone, then as a wave, end on him.
level.gap(142, COLS - 1).put(141, 29, 'X') // the floor ends at a stone: water from here to the end
  .put(144, 14, '%').put(145, 14, '%').put(146, 14, '%')
  .island(148, 150, 18).put(149, 17, 'C') // out of the maces' reach
  .island(152, COLS - 1, 22)
  .put(160, 17, 'X').put(161, 17, 'X').put(162, 17, 'X').put(163, 17, 'X') // his platform, five cells up: his solid body fills it
  .trap('guardian', 162, 16)
  .coins(161, 162, 20) // under him
  .put(162, 21, 'X') // a stone under his fire: a slide stops at it, so the middle must be crossed in time
  .put(175, 21, 'E');

export const WOOD_LEVEL = {
  id: 'wood-1',
  title: 'Into the Roots',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  // Water in its bottomless gaps, its surface a row under the forest floor (data/adventure/water.js).
  water: { row: FLOOR + 1 },
  // No moods (data/adventure/moods.js): the owner didn't like the light changing from one part of
  // the level to the next, so it's the same all through.
  map: level.rows(),
  traps: level.traps(),
  // The camera's moments (systems/adventure/AdventureCameraShots.js): it shows the Mace Ledge's maces
  // as the cat steps onto it, and the guardian, who wakes on camera, from the checkpoint before him;
  // and it frames the guardian whole, from his head to the path, while the cat is near him.
  camera: {
    shots: [
      { when: { cols: [54, 56], rows: [24, 25] }, look: { col: 62.5, row: 22.5 }, panMs: 1400, holdMs: 2600 },
      { when: { cols: [148, 150], rows: [17, 17] }, look: { col: 162, row: 16.35 }, panMs: 1900, holdMs: 3200 },
    ],
    zones: [{ cols: [151, COLS - 1], rows: [12, 23], middleRow: 16.35 }],
  },
  // Places to start at while developing, with /adventure.html?at=<name> (systems/adventure/devPlaces.js).
  places: {
    maces: { col: 55, row: 25 }, // the Mace Ledge's checkpoint
    guardian: { col: 149, row: 17 }, // the checkpoint before the stone guardian
  },
};
