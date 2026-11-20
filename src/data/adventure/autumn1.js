// World 2, the Autumn Forest, level 1: "The Forgotten Village", from the owner's picture
// (images/levels/autumn/Level 1_ The Forgotten Village.png). Six parts, left to right, as the
// picture's "level flow" has them:
//   1. Village Entrance: the cottage, a safe start, the minigun, a ? block with a crystal over it,
//      and a secret: cracked floor that breaks into a cave with the silver key.
//   2. The Old Mill: a wooden walkway past the mill and its turning wheel, over the mill pool, with
//      stepping stones in the pool below (the way on from the secret cave). Fish leap out of the
//      pool, up through the walkway: they hurt, and a round knocks one out (data/adventure/fish.js).
//   3. Forest Outpost: tall islands climbed by ladders.
//   4. The Ruined Bridge: a vine up to the stone ruins, where a switch lowers the drawbridge over the
//      chasm. A mace swings over the bridge.
//   5. The Mineshaft: a tunnel through a hill, with a path over its spiky top, and cracked floor in
//      the tunnel breaking into a secret room with the silver chest.
//   6. The Guardian Gate: a vine up to the gold key, guarded by a diving bird, and the gate it opens.
// Every coin, crystal and pickup can be reached, and no edge is a blind drop (tests check the routes:
// systems/adventureRoutes.js). To see the level as a picture, run
// node tools/adventure-preview.mjs <out.png> 3 --routes
//
// Its characters are the owner's (prompts/autumn-level): pumpkins to stomp, spiky boars that charge,
// squirrels throwing acorns, owls diving, and leaping fish. Still stand-ins: the pack's house, and
// the Wood world's statues and gates.
//
// Letters (see systems/adventureMap.js): # ground, = island, - bridge, H ladder, Z cracked floor,
// % crumbling leaves, ^ spikes, o coin, * crystal, + heart, k key, j silver key, U silver chest,
// ? bonus block, B crate, X stone, C checkpoint, E portal, @ start, w the minigun, a f ammunition
// crates (standard, freeze), enemies P pumpkin, V boar, M mole, gunner 4 squirrel, signs > and /.
import { mapBuilder } from './mapBuilder.js';

const COLS = 180;
const ROWS = 38; // deep, for the caves under the ground (the camera still shows four rows of it)
const VILLAGE = 27; // the village's ground row: the cat stands on row 26
const RAISED = 25; // the raised ground past the village, level with the mill's walkway
const WATER = 31; // the mill pool's and the chasm's water surface

const level = mapBuilder(COLS, ROWS).ground(0, 17, VILLAGE).ground(18, 33, RAISED);
// A pillar of stone blocks (X) from row `top` down into the water, columns `from` to `to`: a stepping
// stone in the mill pool, as in the owner's picture.
level.stones = (from, to, top) => {
  for (let c = from; c <= to; c++) for (let r = top; r < ROWS; r++) level.put(c, r, 'X');
  return level;
};

// ----- 1. Village Entrance: out of the cottage, a pumpkin to stomp, the minigun on the first island
// (up a ladder), a ? block over it with a crystal on top, and a boar on the island beyond. A
// bounce mushroom is a second way up. Then cracked floor on the raised ground, with coins on it so a
// player stops there: it breaks, and he falls down a shaft into a cave deep in the earth, as in the
// owner's picture, lit by lanterns, with the silver key. A step at its far end leads out onto the
// bank of the mill pool.
level.put(2, 26, '@').put(9, 26, '>')
  .coins(5, 8, 25)
  .put(12, 26, 'P')
  .trap('mushroom', 14, 26)
  .island(10, 16, 19).ladder(10, 19, 26).put(11, 18, 'w').put(13, 18, '+')
  .put(13, 15, '?').put(13, 14, '*')
  .island(20, 25, 20).put(23, 19, 'V').coins(21, 22, 19)
  .put(20, 24, 'X') // a stone at the top of the step
  // The secret: cracked floor, the shaft under it through two rows of earth, and the cave, with a
  // step up at its far end to its way out.
  .cracked(28, 29, RAISED).coins(28, 29, 24)
  .hollow(28, 29, 26, 27).hollow(22, 33, 28, 31).fill(31, 33, 30, 31)
  .put(23, 31, 'j').coins(25, 27, 30).put(31, 29, 'a')
  .put(32, 24, 'C');

// ----- 2. The Old Mill: one long wooden pier from the raised ground across the pool, as in the
// owner's picture, the mill at its start: the house, and its wheel turning under the waterfalls
// pouring from the rocky cliff behind. Fish leap: the first low, beside the pier, where it's seen in safety, then two up through
// the pier, to time the walk past. A pumpkin on the pier, and an owl over its far end. Below, the
// pool's bank (outside the secret cave) and stone pillars back up.
level.gap(34, 60)
  .bridge(34, 58, RAISED) // the pier
  .ground(34, 36, 30) // the bank outside the cave
  .stones(40, 41, 29).stones(46, 47, 29).stones(52, 53, 28).stones(57, 58, 27) // stepping stones: stone pillars standing in the pool
  .coins(40, 41, 27).coins(46, 47, 27).coins(52, 53, 26)
  .put(38, 24, 'a').put(49, 24, 'P')
  .arc(42, 45, 23, 1).arc(52, 55, 23, 1)
  .bird('diver', 60, 18, { wake: 54, look: 'owl' }); // within 7 cells above the pier's end, past the fish: never both at once

// ----- 3. Forest Outpost: firm ground again, a checkpoint, and a long island climbed by a ladder,
// its pumpkin well away from the ladder's top. A vine from it climbs to the ruins.
level.ground(59, 80, 26)
  .put(61, 25, 'C')
  .island(64, 75, 22).ladder(64, 22, 25).coins(65, 67, 21).put(73, 21, 'P')
  .put(79, 25, '/');

// ----- 4. The Ruined Bridge: the vine up to the ruins, and at their end, the switch: it lets down a
// rope bridge across the chasm below (a drawbridge, systems/adventure/drawbridges.js), the switch's
// lesson. The ruins are low enough that the bridge is on screen as it comes down. The chasm is too
// wide to jump without it. The spiked ball hangs from a small high island over the bridge, too high
// to reach from it; a crystal waits on top, reached on the moving stone block from the ruins' end,
// as in the owner's picture, with the bridge already down to catch a fall.
level.island(68, 76, 18).vine(70, 18, 21)
  .coins(72, 74, 17)
  .drawbridge(76, 17, 81, 94, 26, { look: 'rope-plank' })
  .mover(77, 18, { across: 3, picture: 'move-block' }) // the moving block, out to the spiked ball's island
  .gap(81, 94)
  .island(83, 86, 19).put(84, 18, '*') // the mace's roof, seven cells over the bridge
  .trap('mace', 86, 20, { hanging: true, chain: 237, swingDeg: 30 });

// ----- 5. The Mineshaft: two ways on. Along the path, two crushers slamming in turn, the mine's
// stamps, with coins under them. Or down a hole in the path into the mine: a chamber under the
// ground, as in the owner's picture, with beams, a minecart and lanterns, a crate of freeze rounds,
// a mole popping out of its floor and a squirrel throwing acorns down its length. It opens at its far
// end onto the low meadow. Cracked floor in the mine, coins on it, breaks into a secret room deeper
// still, with the silver chest and a crystal; its way out is up through a trapdoor in the mine's floor.
level.ground(95, 127, 26)
  .hollow(98, 127, 28, 31).hollow(99, 100, 26, 27) // the mine, two rows under the path, and the hole down into it
  .put(97, 25, 'C')
  .trap('crusher', 108, 18, { phaseMs: 0 }).trap('crusher', 116, 18, { phaseMs: 1100 })
  .coins(107, 109, 24).coins(115, 117, 24).coins(120, 122, 24)
  .put(102, 31, 'f').coins(103, 106, 30).put(110, 31, 'M')
  .put(124, 31, '4') // the squirrel, throwing down the mine at whoever comes in
  .cracked(118, 119, 32).coins(118, 119, 31)
  .hollow(118, 119, 33, 33).hollow(113, 126, 34, 35) // the secret room, under the mine's floor
  .hollow(125, 126, 32, 33).island(125, 126, 32) // the trapdoor: jumped up through from below, stood on from above
  .put(115, 35, 'U').put(121, 35, '*').coins(122, 124, 35);

// ----- 6. The Guardian Gate: the low meadow, level with the mine's floor, a spike pit, then the vine up
// to the gold key's island, with an owl diving at it. A step up to the gate's high ground: a
// checkpoint, a boar, and a spike pit, as in the owner's picture: its wooden bridge is a drawbridge
// whose switch is on the far side, so it must be shot from across (the switch, learnt at the ruins,
// now tested). Fall in, and the near end of the pit is safe to climb out from. Past it, steps up to
// the gold chest, and the gate: its door opens only with the key.
level.ground(128, 141, 32)
  .put(132, 31, '^').put(133, 31, '^').arc(131, 134, 29, 2)
  .island(135, 141, 18).vine(138, 18, 31).put(136, 17, 'k').coins(139, 141, 17)
  .island(140, 141, 28) // the step up to the gate's high ground
  .bird('diver', 140, 11, { look: 'owl' })
  .ground(142, COLS - 1, 26)
  .put(148, 25, 'C').put(151, 25, 'V').coins(149, 152, 24)
  .gap(155, 164).ground(155, 164, 29) // the spike pit, three cells deep
  .put(156, 28, '^').put(157, 28, '^').put(158, 28, '^').put(159, 28, '^').put(160, 28, '^')
  .put(161, 28, '^').put(162, 28, '^').put(163, 28, '^').put(164, 28, '^')
  .drawbridge(166, 25, 155, 164, 26, { shot: true })
  .island(165, 166, 22).island(167, 169, 19).put(168, 18, 'T').coins(167, 169, 17) // steps up to the gold chest
  .put(167, 25, 'V')
  .put(174, 25, 'E');

export const AUTUMN_VILLAGE_LEVEL = {
  id: 'autumn-1',
  title: 'The Forgotten Village',
  world: 'autumn',
  cat: { speed: 420 },
  hearts: 3,
  hint: 'The Forgotten Village\nFind the gold key: the Guardian Gate is locked',
  keyHint: 'You found the key! Now open the Guardian Gate',
  // Water in the mill pool and the chasm (data/adventure/water.js).
  water: { row: WATER },
  portalLocked: true,
  map: level.rows(),
  traps: level.traps(),
  movers: level.movers(),
  birds: level.birds(),
  // Fish leaping out of the mill pool (data/adventure/fish.js): a low one beside the pier, over the
  // jump from the bank to the first stone pillar, then two high ones up through the pier, taking
  // turns, before the owl's reach.
  fish: [
    { col: 38, rise: 4, across: 2, phaseMs: 0 },
    { col: 43, rise: 8, across: -2, phaseMs: 1000 },
    { col: 49, rise: 8, across: 1, phaseMs: 2000 },
  ],
  vines: level.vines(),
  drawbridges: level.drawbridges(),
  // Its set dressing (systems/adventure/AdventureScenery.js).
  // The waterfalls pour from the top of the rocky cliff rising out of the pool (a prop), behind the
  // mill's wheel, onto it, as in the owner's picture.
  waterfalls: [
    { col: 37, top: 20, bottom: WATER },
    { col: 41, top: 21, bottom: WATER },
  ],
  // The caves' insides, deep in the earth: the village cave and its shaft, the mine and the hole down
  // into it, and the secret room under it, its shaft and its trapdoor.
  caves: [
    { cols: [22, 33], rows: [28, 31] }, { cols: [28, 29], rows: [26, 27] },
    { cols: [98, 127], rows: [28, 31] }, { cols: [99, 100], rows: [26, 27] },
    { cols: [113, 126], rows: [34, 35] }, { cols: [118, 119], rows: [33, 33] }, { cols: [125, 126], rows: [32, 33] },
  ],
  // The owner's scenery (images/levels/autumn, cut by tools/adventure-autumn-scenery.mjs) and the
  // pack's trees, fences and barrels.
  // Earth columns behind the level, holding its islands up from the ground, as in the owner's
  // picture (systems/adventure/AdventureScenery.js): scenery only, the cat passes in front.
  columns: [
    { col: 12, width: 3, top: 20, bottom: 27 }, // under the minigun's island
    { col: 22, width: 2, top: 21, bottom: 25 }, // under the boar's island
    { col: 69, width: 3, top: 23, bottom: 26 }, // under the outpost's island
    { col: 72, width: 3, top: 19, bottom: 22 }, // under the ruins, down to the outpost's island
    { col: 139, width: 3, top: 19, bottom: 32 }, // under the key's island, down to the meadow
  ],
  props: [
    { picture: 'big-tree', col: 3, row: 26, back: true }, // behind the cottage
    { picture: 'cottage', col: 5, row: 26, back: true },
    { picture: 'lamp-post', col: 8, row: 26 },
    { picture: 'fence', col: 17, row: 26 },
    { picture: 'barrel', col: 26, row: 24 },
    { picture: 'mill-house', col: 30, row: 24, back: true }, // the mill: the house on the ground, its wheel at its side over the pool
    { picture: 'hang-lantern', col: 25, row: 28, hang: true, glow: true },
    { picture: 'hang-lantern', col: 30, row: 28, hang: true, glow: true },
    { picture: 'crystal-purple', col: 24, row: 31 },
    { picture: 'crystal-purple', col: 32, row: 29 },
    { picture: 'cliff', col: 40, row: 30, fromWater: true }, // the falls pour from its top
    // The pier's posts, from the water up under the walkway's deck.
    ...[35, 39, 47, 50, 57].map((col) => ({ picture: 'pier-post', col, row: 30, inWater: true, stack: 6 })),
    { picture: 'mill-wheel', col: 35, row: 24, back: true, width: 300, spinMs: 9000 }, // fixed to the mill house's side, at the pier
    { picture: 'big-tree', col: 62, row: 25, back: true },
    { picture: 'ruin-pillar', col: 69, row: 17, back: true },
    { picture: 'ruin-arch', col: 73, row: 17, back: true },
    { picture: 'mine-frame', col: 104, row: 31, width: 420, back: true }, // beams holding up the mine
    { picture: 'mine-frame', col: 117, row: 31, width: 420, back: true },
    { picture: 'mine-rail', col: 106, row: 31 },
    { picture: 'mine-rail', col: 108, row: 31 },
    { picture: 'minecart', col: 107, row: 31 },
    { picture: 'crystal-blue', col: 112, row: 31 },
    { picture: 'hang-lantern', col: 101, row: 28, hang: true, glow: true },
    { picture: 'hang-lantern', col: 110, row: 28, hang: true, glow: true },
    { picture: 'hang-lantern', col: 121, row: 28, hang: true, glow: true },
    { picture: 'hang-lantern', col: 119, row: 34, hang: true, glow: true },
    { picture: 'crystal-blue', col: 123, row: 35 },
    { picture: 'crystal-purple', col: 114, row: 35 },
    { picture: 'small-tree', col: 130, row: 31, back: true },
    { picture: 'lamp-post', col: 146, row: 25 },
    { picture: 'big-tree', col: 152, row: 25, back: true },
    { picture: 'lamp-post', col: 166, row: 25 },
    // Stone stairs up the village's step, wooden posts along the ledges (one with a lit candle),
    // and boulders half-buried in the earth, as in the owner's picture.
    { picture: 'stairs-up-right', col: 17, row: 26, back: true },
    { picture: 'post-rope', col: 31, row: 24 },
    { picture: 'stake-tall', col: 35, row: 29 },
    { picture: 'stake-small', col: 36, row: 29 },
    { picture: 'post-cross', col: 60, row: 25 },
    { picture: 'post-candle', col: 106, row: 25, glow: true },
    { picture: 'post-candle', col: 117, row: 35, glow: true },
    { picture: 'post-cross', col: 134, row: 31 },
    { picture: 'stake-tall', col: 144, row: 25 },
    { picture: 'post-rope', col: 168, row: 25 },
    { picture: 'boulder-big', col: 5, row: 30, inGround: true },
    { picture: 'boulder-small', col: 14, row: 32, inGround: true },
    { picture: 'boulder-small', col: 19, row: 29, inGround: true },
    { picture: 'boulder-big', col: 63, row: 29, inGround: true },
    { picture: 'boulder-small', col: 77, row: 31, inGround: true },
    { picture: 'boulder-big', col: 104, row: 35, inGround: true },
    { picture: 'boulder-small', col: 131, row: 35, inGround: true },
    { picture: 'boulder-big', col: 147, row: 30, inGround: true },
    { picture: 'boulder-small', col: 171, row: 31, inGround: true },
    // Torches and fences on the ledges, lit, as in the owner's picture; fire bowls either side of the
    // gate, between it and its statues.
    { picture: 'torch', col: 15, row: 18, width: 84, glow: true },
    { picture: 'fence-2', col: 24, row: 19 },
    { picture: 'torch', col: 25, row: 24, width: 84, glow: true },
    { picture: 'torch', col: 33, row: 24, width: 84, glow: true },
    { picture: 'fence', col: 59, row: 25 },
    { picture: 'torch', col: 62, row: 25, width: 84, glow: true },
    { picture: 'fence-2', col: 67, row: 21 },
    { picture: 'torch', col: 75, row: 21, width: 84, glow: true },
    { picture: 'torch', col: 68, row: 17, width: 84, glow: true },
    { picture: 'sign-skull', col: 80, row: 25 },
    { picture: 'torch', col: 96, row: 25, width: 84, glow: true },
    { picture: 'sign-warn', col: 129, row: 31 },
    { picture: 'torch', col: 136, row: 31, width: 84, glow: true },
    { picture: 'torch', col: 143, row: 25, width: 84, glow: true },
    { picture: 'fence', col: 150, row: 25 },
    { picture: 'sign-skull', col: 153, row: 25 },
    { picture: 'fire-bowl', col: 171, row: 25, glow: true }, // the gate's fire bowls
    { picture: 'fire-bowl', col: 177, row: 25, glow: true },
  ],
  // Places to start at while developing, with /adventure.html?at=<name> (systems/adventure/devPlaces.js).
  places: {
    mill: { col: 32, row: 24 },
    outpost: { col: 61, row: 25 },
    mine: { col: 97, row: 25 },
    gate: { col: 148, row: 25 },
  },
};
