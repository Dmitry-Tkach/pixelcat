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
// crates (standard, freeze), enemies P pumpkin, V boar, gunner 4 squirrel, signs > and /.
import { mapBuilder } from './mapBuilder.js';

const COLS = 180;
const ROWS = 34;
const VILLAGE = 27; // the village's ground row: the cat stands on row 26
const RAISED = 25; // the raised ground past the village, level with the mill's walkway
const WATER = 31; // the mill pool's and the chasm's water surface

const level = mapBuilder(COLS, ROWS).ground(0, 17, VILLAGE).ground(18, 33, RAISED);

// ----- 1. Village Entrance: out of the cottage, a pumpkin to stomp, the minigun on the first island
// (up a ladder), a ? block over it with a crystal on top, and a boar on the island beyond. A
// bounce mushroom is a second way up. Then cracked floor on the raised ground: it breaks into a cave
// with the silver key, which opens onto the mill pool.
level.put(2, 26, '@').put(9, 26, '>')
  .coins(5, 8, 25)
  .put(12, 26, 'P')
  .trap('mushroom', 14, 26)
  .island(10, 16, 19).ladder(16, 19, 26).put(11, 18, 'w').put(13, 18, '+')
  .put(13, 15, '?').put(13, 14, '*')
  .island(20, 25, 20).put(23, 19, 'V').coins(21, 22, 19)
  .put(20, 24, 'X') // a stone at the top of the step
  // The secret: cracked floor, and the cave under the raised ground. Its way out is to the right,
  // onto the bank of the mill pool.
  .cracked(28, 29, RAISED)
  .hollow(28, 29, 26, 26).hollow(22, 33, 27, 29)
  .put(23, 29, 'j').coins(25, 27, 28).put(31, 29, 'a')
  .put(32, 24, 'C');

// ----- 2. The Old Mill: the walkway from the raised ground across the pool, the mill house on it and
// its wheel turning behind. A pumpkin on the walkway, a crate of rounds, and a diving owl over the far
// end. Below, the pool's bank (outside the secret cave) and stepping stones back up to the walkway.
level.gap(34, 60)
  .bridge(34, 58, RAISED)
  .ground(34, 36, 30) // the bank outside the cave
  .ground(40, 41, 29).ground(46, 47, 29).ground(52, 53, 28).ground(57, 58, 27) // stepping stones
  .coins(40, 41, 27).coins(46, 47, 27).coins(52, 53, 26)
  .put(38, 24, 'a').put(50, 24, 'P')
  .coins(44, 47, 23)
  .island(46, 53, 11) // the rocky ledge the waterfalls pour from, high over the pool
  .bird('diver', 50, 18, { wake: 40, look: 'owl' }); // low enough to dive at the walkway: within 7 cells above it

// ----- 3. Forest Outpost: firm ground again, a checkpoint, and islands climbed by ladders: a low
// one with coins, and a tall one up to the ruins' vine.
level.ground(59, 80, 26)
  .put(61, 25, 'C')
  .island(64, 68, 22).ladder(66, 22, 25).coins(64, 65, 21)
  .island(70, 77, 18).ladder(77, 18, 25).put(71, 17, 'P').coins(73, 75, 17)
  .put(79, 25, '/');

// ----- 4. The Ruined Bridge: a vine up to the ruins, a crystal there, and the switch: it lowers the
// drawbridge across the chasm below (systems/adventure/drawbridges.js). The bridge isn't there until
// then: the chasm is too wide to jump. A mace hangs from an island over the bridge's middle.
level.island(68, 76, 12).vine(72, 12, 17)
  .put(69, 11, '*').coins(73, 74, 11)
  .island(63, 65, 16).put(64, 15, 'o') // a step down from the ruins' left end, in view
  .drawbridge(76, 11, 81, 94, 26)
  .gap(81, 94)
  .island(85, 90, 19) // the mace's roof: seven cells over the bridge, out of reach
  .trap('mace', 87, 20, { hanging: true, chain: 237, swingDeg: 30 })
  .arc(82, 84, 24, 1).arc(91, 93, 24, 1);

// ----- 5. The Mineshaft: a hill with a tunnel through it. In the tunnel, coins, a pumpkin and a crate of
// freeze rounds; over it, a path along the hill's top, past spikes. Cracked floor in the tunnel breaks
// into a secret room with the silver chest and a crystal, its way out on the low meadow beyond.
level.ground(95, 127, 26)
  .ground(100, 126, 20).hollow(100, 126, 22, 25) // the hill, two cells thick over the tunnel
  .put(97, 25, '4') // a squirrel at the far end of the bridge, throwing acorns
  .island(97, 98, 23) // a step up onto the hill
  .coins(103, 107, 24).put(102, 25, 'f').put(112, 25, 'P')
  .put(109, 19, '^').put(110, 19, '^').arc(108, 111, 18, 1).coins(118, 121, 18)
  .cracked(119, 120, 26)
  .hollow(118, 127, 27, 29).hollow(119, 120, 26, 26)
  .put(121, 29, 'U').put(123, 29, '*').coins(124, 126, 29);

// ----- 6. The Guardian Gate: the low meadow, a spike pit, then the vine up to the gold key's island,
// with a bird diving at it. The gate stands on high ground: its door opens only with the key.
level.ground(128, 141, 30)
  .put(132, 29, '^').put(133, 29, '^').arc(131, 134, 27, 2)
  .put(129, 29, 'C')
  .island(135, 141, 18).vine(138, 18, 29).put(136, 17, 'k').coins(139, 141, 17)
  .bird('diver', 140, 11, { look: 'owl' })
  .ground(142, COLS - 1, 26)
  .put(146, 25, 'C').put(152, 25, 'V').coins(150, 155, 24)
  .put(170, 25, 'E');

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
  birds: level.birds(),
  // Fish leaping out of the mill pool (data/adventure/fish.js): a low one over the jump from the bank
  // to the first stepping stone, then two high ones, up through the walkway, taking turns.
  fish: [
    { col: 38, rise: 4, across: 2, phaseMs: 0 },
    { col: 43, rise: 8, across: -2, phaseMs: 1000 },
    { col: 55, rise: 8, across: 2, phaseMs: 2000 },
  ],
  vines: level.vines(),
  drawbridges: level.drawbridges(),
  // Its set dressing (systems/adventure/AdventureScenery.js).
  waterfalls: [
    { col: 48, top: 12, bottom: WATER },
    { col: 51, top: 14, bottom: WATER },
  ],
  caves: [{ cols: [22, 33], rows: [27, 29] }, { cols: [28, 29], rows: [26, 26] }, { cols: [100, 126], rows: [22, 25] }, { cols: [118, 127], rows: [27, 29] }],
  props: [
    { picture: 'house', col: 5, row: 26, back: true },
    { picture: 'torch', col: 8, row: 26 },
    { picture: 'fence', col: 18, row: 26 },
    { picture: 'barrel', col: 26, row: 24 },
    { picture: 'mill-lantern', col: 26, row: 27, hang: true },
    { picture: 'mill-wheel', col: 44, row: 27, back: true, width: 330, spinMs: 9000 },
    { picture: 'tree-1', col: 62, row: 25, back: true },
    { picture: 'tree-2', col: 83, row: 25, back: true },
    { picture: 'standing-stone', col: 70, row: 11 },
    { picture: 'statue', col: 74, row: 11 },
    { picture: 'mill-lantern', col: 106, row: 22, hang: true },
    { picture: 'mill-lantern', col: 116, row: 22, hang: true },
    { picture: 'tree-1', col: 130, row: 29, back: true },
    { picture: 'torch', col: 165, row: 25 },
    { picture: 'statue', col: 167, row: 25 },
    { picture: 'statue', col: 173, row: 25 },
    { picture: 'torch', col: 175, row: 25 },
  ],
  // Places to start at while developing, with /adventure.html?at=<name> (systems/adventure/devPlaces.js).
  places: {
    mill: { col: 32, row: 24 },
    outpost: { col: 61, row: 25 },
    mine: { col: 95, row: 25 },
    gate: { col: 146, row: 25 },
  },
};
