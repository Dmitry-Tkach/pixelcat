// The third adventure level: Heart of the Tree, the Wood world's boss level. Up into the giant tree,
// through its branches and the old ruins in it, to the Rootbreaker (data/adventure/rootbreaker.js),
// the stone guardian of the forest's heart, and past him to the portal. Longer than levels 1 and 2.
// (A second path, through caves under the tree to a troll, was tried and dropped by the owner; the
// arrow stones it used stay in systems/adventure/arrowStones.js for another level.)
//
// The map: the forest floor's surface at row 34, a river in the gap after the start. Letters as in
// wood.js and wood2.js.
import { mapBuilder } from './mapBuilder.js';

const COLS = 240;
const ROWS = 40;
const SURFACE = 34; // the forest floor's surface row: the cat stands on row 33

const level = mapBuilder(COLS, ROWS).ground(0, COLS - 1, SURFACE);

// ----- The start: on the forest floor, the minigun, a crate of rounds and a goon. Then a river: the
// way on is up the ladder, into the branches.
level.put(2, 33, '@').put(4, 33, '>').put(7, 33, 'b')
  .put(8, 33, 'w').coins(10, 13, 31).put(15, 33, 'a')
  .put(19, 33, 'g').put(22, 33, 'p')
  .put(27, 33, '/') // up
  .gap(30, 47); // the river

// ===== The jungle path: up the ladder by the signpost, across the river on branches, and on in the
// trees. Its star is the spore bud (systems/adventure/sporeBuds.js):
// a closed green bud that a round opens into a bounce mushroom for a few seconds. Built up:
// (J1) a bounce mushroom to play with, then the first bud, the only way over a trunk; (J2) thorn pits,
// crumbling leaves and a dart idol, a crystal on an arch a bud reaches; (J3) a breather in old ruins:
// maces swinging under arches, a rifle gunner, a heart; (J4) buds in a chain, high over a floor of
// thorns, a pterodactyl over the gap, a crystal on the chain and a secret one out of sight above.
// Then the Rootbreaker's arena, and on to the Heart of the Tree.
const thorns = (from, to) => { // a thorn pit in the ground: two cells deep, spikes at its bottom
  level.hollow(from, to, SURFACE, SURFACE + 1);
  for (let c = from; c <= to; c++) level.put(c, SURFACE + 1, '^');
};

// ----- J0. Up the ladder, and across the river on branches.
level.island(25, 29, 26).ladder(28, 26, 33)
  .island(32, 35, 25).island(38, 41, 24).island(44, 47, 26)
  .island(33, 36, 31).island(41, 45, 30) // low branches over the river: somewhere to land, in view from the edges
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
level.put(189, 33, 'C').put(191, 33, 'e')
  .island(196, 198, 31).island(211, 213, 31).put(197, 30, 'a');

// ----- The Heart of the Tree: past his door, the portal.
level.put(229, 33, 'b').put(234, 33, 'E');

export const WOOD_HEART_LEVEL = {
  id: 'wood-3',
  title: 'Heart of the Tree',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  hint: 'Heart of the Tree\nGreen means shoot it: open the spore buds',
  water: { row: SURFACE + 1 },
  map: level.rows(),
  movers: level.movers(),
  traps: level.traps(),
  birds: level.birds(),
  // The boss (AdventureScene buildBoss): he waits in his arena until the cat walks in; beating him
  // crumbles his door.
  bosses: [
    {
      // His arena is one screen wide (20 cells), so the camera frames it whole; a gate shuts behind
      // the cat as he wakes.
      kind: 'rootbreaker', col: 204, floor: SURFACE, arena: { left: 195, right: 214 },
      gate: { col: 194, rows: [SURFACE - 8, SURFACE - 1] }, door: { col: 215, rows: [SURFACE - 8, SURFACE - 1] },
      hint: 'The Rootbreaker!\nMake him miss a smash, then hit his core',
    },
  ],
  places: {
    jungle: { col: 67, row: 33 },
    ruins: { col: 110, row: 33 },
    sporeLift: { col: 145, row: 33 },
    rootbreaker: { col: 189, row: 33 },
  },
};
