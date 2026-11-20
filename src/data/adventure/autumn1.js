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

// ----- 1. Village Entrance: out of the cottage (smoke from its chimney, a START sign), a pumpkin to
// stomp, a small ledge by the cottage with a heart, its vine hanging to the ground, the minigun on the
// first island (up a ladder), a ? block over it with a crystal on top, and a boar on the island
// beyond, a high ledge of coins over it up a ladder, as in the owner's picture. A bounce mushroom
// is a second way up. Then cracked floor on the raised ground, with coins on it so a
// player stops there: it breaks, and he falls down a shaft into a cave deep in the earth, as in the
// owner's picture, lit by lanterns, with the silver key. A step at its far end leads out onto the
// bank of the mill pool.
level.put(2, 26, '@').put(9, 26, '>')
  .coins(5, 8, 25)
  .put(12, 26, 'P')
  .trap('mushroom', 13, 26)
  .island(3, 6, 21).vine(4, 21, 26).coins(3, 5, 20).put(6, 20, '+') // the ledge by the cottage
  .island(10, 16, 19).ladder(10, 19, 26).put(11, 18, 'w')
  .put(13, 15, '?').put(13, 14, '*')
  .island(20, 25, 20).put(23, 19, 'V').coins(21, 22, 19)
  .island(21, 24, 15).ladder(24, 15, 19).coins(21, 23, 14) // the high ledge over the boar
  .trap('mushroom', 26, 24) // a second bounce mushroom, by the mill
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
  .bird('diver', 58, 21, { wake: 52, look: 'owl' }) // over the pier's end, past the fish (never both at once), below the rope bridge's reach
  // The high way, as in the owner's picture: up the waterfall cliff's ledges, jumping across the
  // falling water, to its top, then over a rope bridge to the ruins. The middle ledge, reached from
  // the pier; the top ledge in two, a fall between them to jump across; the rope bridge from it.
  .island(39, 42, 20)
  .island(44, 46, 17).island(49, 49, 17)
  .ropeBridge(50, 67, 17)
  .coins(39, 41, 19).arc(46, 49, 15, 1).coins(55, 64, 16);

// ----- 3. Forest Outpost: firm ground again, a checkpoint, and a long island climbed by a ladder,
// its pumpkin well away from the ladder's top. On it, under the ruins, the silver chest (its key is
// in the village's secret cave), with candles and a lantern, as in the owner's picture. A vine from
// it climbs to the ruins.
level.ground(59, 80, 26)
  .put(61, 25, 'C')
  .island(64, 75, 22).ladder(64, 22, 25).coins(65, 66, 21).put(68, 21, 'U').put(73, 21, 'P')
  .put(79, 25, '/');

// ----- 4. The Ruined Bridge, as in the owner's picture: the vine up to the ruins, a cliff of earth
// with two stone arches and a crystal between them. At their end, the switch: it lets down a rope
// bridge high across to the spiked ball's island (a drawbridge, systems/adventure/drawbridges.js),
// the switch's lesson, both on screen together. On that island, too high to reach otherwise, the
// gold key and a ? block. Below, the moving stone block ferries the cat over the chasm, the spiked
// ball swinging down over its path from the island above.
level.island(68, 76, 18).vine(70, 18, 21)
  .put(72, 17, '*').coins(73, 74, 17) // the crystal between the arches
  .drawbridge(76, 17, 77, 82, 18, { look: 'rope-plank' }) // the rope bridge, high
  .island(83, 87, 15).put(85, 14, 'k').put(84, 11, '?').coins(86, 87, 14) // the spiked ball's island, out of reach from the block below: the key
  .gap(81, 94)
  .mover(80, 22, { across: 10, picture: 'move-block' }) // the moving block, across the chasm
  .trap('mace', 86, 16, { hanging: true, chain: 239, swingDeg: 35 }) // swinging down over the block's path
  .arc(88, 91, 20, 1);

// ----- 5. The Mineshaft: two ways on. Over a hill, as in the owner's picture, stone stairs up and
// down its sides, spikes on its top and two crushers slamming in turn, the mine's stamps, with coins
// under them. Or down a hole in the path into the mine: a chamber under the
// ground, as in the owner's picture, with beams, a minecart and lanterns, a crate of freeze rounds,
// a mole popping out of its floor and a squirrel throwing acorns down its length. It opens at its far
// end onto the low meadow. Cracked floor in the mine, coins on it, breaks into a secret room deeper
// still, with a heart and a crystal; its way out is up through a trapdoor in the mine's floor.
level.ground(95, 127, 26).ground(104, 121, 24) // the path, and the hill over the mine
  .hollow(98, 127, 28, 31).hollow(98, 99, 26, 27) // the mine, under the path, and the hole down into it
  .put(97, 25, 'C')
  .trap('crusher', 107, 16, { phaseMs: 0 }).trap('crusher', 118, 16, { phaseMs: 1100 })
  .coins(106, 108, 22).coins(117, 119, 22)
  .put(112, 23, '^').put(113, 23, '^').arc(111, 114, 21, 1) // spikes on the hill's top
  .put(102, 31, 'f').coins(103, 106, 30).put(110, 31, 'M')
  .put(124, 31, '4') // the squirrel, throwing down the mine at whoever comes in
  .cracked(118, 119, 32).coins(118, 119, 31)
  .hollow(118, 119, 33, 33).hollow(113, 126, 34, 35) // the secret room, under the mine's floor
  .hollow(125, 126, 32, 33).island(125, 126, 32) // the trapdoor: jumped up through from below, stood on from above
  .put(115, 35, '+').put(121, 35, '*').coins(122, 124, 35);

// ----- 6. The Guardian Gate: the low meadow, level with the mine's floor, a spike pit, then the vine up
// a tall cliff to the gold chest, with an owl diving at it, as in the owner's picture. A step up to the gate's high ground: a
// checkpoint, a boar, and a spike pit, as in the owner's picture: its wooden bridge is a drawbridge
// whose switch is on the far side, so it must be shot from across (the switch, learnt at the ruins,
// now tested). Fall in, and the near end of the pit is safe to climb out from. Past it, the gate: its
// door opens only with the key, found on the spiked ball's island. It stands raised, up stairs, on
// a rock wall hung with paw banners, as in the owner's picture.
level.ground(128, 141, 32)
  .put(132, 31, '^').put(133, 31, '^').arc(131, 134, 29, 2)
  .island(135, 141, 18).vine(138, 18, 31).put(136, 17, 'T').coins(139, 141, 17)
  .island(140, 141, 28) // the step up to the gate's high ground
  .bird('diver', 140, 11, { look: 'owl' })
  .ground(142, COLS - 1, 26)
  .put(148, 25, 'C').put(151, 25, 'V').coins(149, 152, 24)
  .gap(155, 164).ground(155, 164, 29) // the spike pit, three cells deep
  .put(156, 28, '^').put(157, 28, '^').put(158, 28, '^').put(159, 28, '^').put(160, 28, '^')
  .put(161, 28, '^').put(162, 28, '^').put(163, 28, '^').put(164, 28, '^')
  .drawbridge(165, 25, 155, 164, 26, { shot: true })
  .ground(169, COLS - 1, 24) // the gate's raised stone step, stairs up to it
  .put(174, 23, 'E');

export const AUTUMN_VILLAGE_LEVEL = {
  id: 'autumn-1',
  title: 'The Forgotten Village',
  world: 'autumn',
  cat: { speed: 420 },
  hearts: 3,
  hint: 'The Forgotten Village\nFind the gold key: the Guardian Gate is locked',
  keyHint: 'The gold key! It opens the Guardian Gate, and the gold chest',
  // A hint at the spike pit's edge: its bridge is down only once the switch across it is shot.
  hintsAt: [{ col: 152, text: 'The bridge is up!\nShoot the switch across the pit' }],
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
  // The waterfalls pour down the tall stepped rock cliff rising out of the pool, high over the mill
  // house, as in the owner's picture (their spill and landing pieces are props, on the cliff's
  // ledges), between the ledges the cat climbs. Each starts under its piece (head: false), with the
  // owner's splash at its foot. Each strip starts behind its piece's solid part, so its top doesn't
  // show through where the piece fades out.
  // The waterfall cliff's ledges the cat stands on are islands, but the cliff's own rock shows them:
  // their tiles are hidden (the middle ledge, and the top ledge's two halves).
  hiddenTiles: [{ cols: [39, 42], row: 20 }, { cols: [44, 46], row: 17 }, { cols: [49, 49], row: 17 }],
  waterfalls: [
    { col: 38, top: 21, bottom: WATER, width: 112, head: false, foamAt: [23, RAISED] }, // off the middle ledge, past the lowest, by the mill's wheel
    { col: 43, top: 18, bottom: 21, width: 130, head: false, splash: false }, // off the top ledge, onto the middle one
    { col: 43, top: 20, bottom: WATER, width: 140, head: false }, // and on, from its foam, into the pool
    { col: 48, top: 18, bottom: WATER, width: 140, head: false, foamAt: [RAISED] }, // between the top ledge's two halves
  ],
  // The caves' insides, deep in the earth: the village cave and its shaft, the mine and the hole down
  // into it, and the secret room under it, its shaft and its trapdoor.
  caves: [
    { cols: [22, 33], rows: [28, 31] }, { cols: [28, 29], rows: [25, 27] }, // the cracked floor's cells too: once broken, the cave shows through
    { cols: [98, 127], rows: [28, 31] }, { cols: [98, 99], rows: [26, 27] },
    { cols: [113, 126], rows: [34, 35] }, { cols: [118, 119], rows: [32, 33] }, { cols: [125, 126], rows: [32, 33] },
  ],
  // The secret caves, hidden under the earth until the cat is inside: the village's cave and its
  // shaft, and the secret room under the mine (systems/adventure/AdventureScenery.js).
  secrets: [{ cols: [22, 33], rows: [26, 31] }, { cols: [113, 126], rows: [33, 35] }],
  // The owner's scenery (images/levels/autumn, cut by tools/adventure-autumn-scenery.mjs) and the
  // pack's trees, fences and barrels.
  // Earth columns behind the level, holding its islands up from the ground, as in the owner's
  // picture (systems/adventure/AdventureScenery.js): scenery only, the cat passes in front.
  columns: [
    { col: 12, width: 3, top: 20, bottom: 27 }, // under the minigun's island
    { col: 22, width: 2, top: 21, bottom: 25 }, // under the boar's island
    { col: 69, width: 3, top: 23, bottom: 26 }, // under the outpost's island
    { col: 68, width: 3, top: 19, bottom: 21 }, // the ruins' cliff, down to the outpost's island
    { col: 71, width: 3, top: 19, bottom: 21 },
    { col: 74, width: 3, top: 19, bottom: 21 },
    { col: 22, width: 2, top: 16, bottom: 19 }, // under the high ledge, down to the boar's island
    { col: 139, width: 3, top: 19, bottom: 32 }, // under the key's island, down to the meadow
  ],
  // Stone stairs the cat walks up (systems/adventure/stairSteps.js): the village's step, up and down
  // the mine's hill, and up to the gate.
  stairs: [
    { at: 18, row: 26, dir: 1 },
    { at: 104, row: 25, dir: 1 },
    { at: 122, row: 25, dir: -1 },
    { at: 169, row: 25, dir: 1, width: 170 }, // narrower, clear of the switch
  ],
  props: [
    { picture: 'big-tree', col: 3, row: 26, back: true }, // behind the cottage
    { picture: 'cottage', col: 5, row: 26, back: true, smoke: { x: 0.33, y: 0.08 } }, // its chimney smokes
    { picture: 'start-sign', col: 1, row: 26 },
    { picture: 'lamp-post', col: 8, row: 26 },
    { picture: 'barrel', col: 22, row: 24 },
    { picture: 'boulder-big', col: 34, row: 29 }, // on the pool's bank
    { picture: 'fall-mist', col: 37, row: 30, dy: 40, back: true, free: true }, // at the falls' foot
    { picture: 'fall-mist', col: 43, row: 30, dy: 40, back: true, free: true },
    { picture: 'fall-mist', col: 48, row: 30, dy: 40, back: true, free: true },
    { picture: 'fall-trickle', col: 53, row: 30, dy: 10, inWater: true }, // a trickle at the cliff's end
    // A rock column holding up the spiked ball's island, from the chasm's water to its underside, as
    // the rock pillars hold up the high bridge in the owner's picture (behind the moving block).
    { picture: 'rock-column', col: 85, row: 30, stack: 15, back: true, free: true },
    { picture: 'bush-1', col: 36, row: 29 },
    { picture: 'mill-house', col: 30, row: 24, back: true }, // the mill: the house on the ground, its wheel at its side over the pool
    { picture: 'hang-lantern', col: 25, row: 28, hang: true, glow: true },
    { picture: 'hang-lantern', col: 30, row: 28, hang: true, glow: true },
    { picture: 'crystal-purple', col: 24, row: 31 },
    { picture: 'crystal-purple', col: 32, row: 29 },
    // The waterfall cliff, drawn big by the owner (prompt 15), rising to the right towards the ruins:
    // its ledges at about 53%, 28% and 3% of its height (measured), across its left quarter, from a
    // quarter to over half way, and its right part. 1095 x 768 px, its left at 2160 px, so its middle
    // ledge is at row 20 and its top one at row 17, where the cat stands; its foot 151 px over the
    // pool, mossy rocks along the waterline under it.
    { picture: 'big-cliff', col: 41, row: 30, dx: 51, dy: -151, fromWater: true },
    ...[37, 41, 45, 49].map((col) => ({ picture: 'pool-rocks', col, row: 30, inWater: true })),
    { picture: 'fall-spill', col: 37, row: 22, dx: 38, dy: -30, back: true, free: true }, // off the middle ledge
    { picture: 'fall-spill', col: 42, row: 19, dx: 38, dy: -30, back: true, free: true }, // off the top ledge
    { picture: 'fall-spill', col: 47, row: 19, dx: 38, dy: -30, back: true, free: true }, // between the top ledge's halves
    { picture: 'fall-landing', col: 43, row: 21, dx: -8, dy: -21, back: true, free: true }, // on the middle ledge
    // Growing on the cliff's top between its falls, as in the owner's picture: between the two
    // spills' rocks, and after them, so its trunk stands in front of them.
    { picture: 'big-tree', col: 45, row: 16, back: true, free: true },
    { picture: 'mill-wheel', col: 35, row: 24, back: true, width: 300, spinMs: 9000 }, // fixed to the mill house's side, at the pier
    { picture: 'big-tree', col: 62, row: 25, back: true },
    { picture: 'ruin-arch', col: 70, row: 17, back: true }, // two arches, the crystal between them
    { picture: 'ruin-arch', col: 74, row: 17, back: true },
    { picture: 'post-candle', col: 66, row: 21, glow: true }, // by the silver chest under the ruins
    { picture: 'hang-lantern', col: 71, row: 19, hang: true, glow: true },
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
    // Stone stairs up the village's step, wooden posts along the ledges (one with a lit candle),
    // and boulders half-buried in the earth, as in the owner's picture.
    { picture: 'post-rope', col: 31, row: 24 },
    { picture: 'stake-tall', col: 35, row: 29 },
    { picture: 'stake-small', col: 36, row: 29 },
    { picture: 'post-cross', col: 60, row: 25 },
    { picture: 'post-candle', col: 117, row: 35, glow: true },
    { picture: 'post-cross', col: 134, row: 31 },
    { picture: 'stake-tall', col: 144, row: 25 },
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
    // The gate: stairs up to its step, the rock wall behind it hung with paw banners, its fire bowls.
    { picture: 'cliff', col: 171, row: 23, back: true, width: 371 },
    { picture: 'cliff', col: 177, row: 23, back: true, width: 371 },
    { picture: 'banner-open', col: 169, row: 19, hang: true },
    { picture: 'banner-open', col: 179, row: 19, hang: true },
    { picture: 'fire-bowl', col: 171, row: 23, glow: true },
    { picture: 'fire-bowl', col: 177, row: 23, glow: true },
  ],
  // Places to start at while developing, with /adventure.html?at=<name> (systems/adventure/devPlaces.js).
  places: {
    village: { col: 8, row: 26 },
    secretCave: { col: 26, row: 31 },
    mill: { col: 32, row: 24 },
    cliff: { col: 40, row: 19 }, // the waterfall cliff's middle ledge
    cliffTop: { col: 45, row: 16 }, // the top ledge's first half
    bridgeStart: { col: 49, row: 16 }, // the top ledge's second half, at the rope bridge
    ropeBridge: { col: 60, row: 16 },
    arches: { col: 73, row: 17 }, // the ruins (named so, as the Wood world has a place called ruins)
    keyIsland: { col: 86, row: 14 },
    mineInside: { col: 106, row: 31 },
    meadow: { col: 130, row: 31 },
    goldChest: { col: 139, row: 17 }, // on top of the vine's cliff
    spikePit: { col: 153, row: 25 },
    gateStep: { col: 171, row: 23 },
    outpost: { col: 61, row: 25 },
    mine: { col: 97, row: 25 },
    gate: { col: 148, row: 25 },
  },
};
