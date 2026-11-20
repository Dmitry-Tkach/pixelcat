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
const ROWS = 34;
const VILLAGE = 27; // the village's ground row: the cat stands on row 26
const RAISED = 25; // the raised ground past the village, level with the mill's walkway
const WATER = 31; // the mill pool's and the chasm's water surface

const level = mapBuilder(COLS, ROWS).ground(0, 17, VILLAGE).ground(18, 33, RAISED);

// ----- 1. Village Entrance: out of the cottage, a pumpkin to stomp, the minigun on the first island
// (up a ladder), a ? block over it with a crystal on top, and a boar on the island beyond. A
// bounce mushroom is a second way up. Then cracked floor on the raised ground, with coins on it so a
// player stops there: it breaks into a cave with the silver key, which opens onto the mill pool.
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
  .cracked(28, 29, RAISED).coins(28, 29, 24)
  .hollow(28, 29, 26, 26).hollow(22, 33, 27, 29)
  .put(23, 29, 'j').coins(25, 27, 28).put(31, 29, 'a')
  .put(32, 24, 'C');

// ----- 2. The Old Mill: the walkway from the raised ground across the pool, broken in three by two
// gaps, the mill house on its first stretch and the wheel turning in the first gap. Fish leap: the
// first beside the walkway, where it's seen in safety, then one in the first gap, timed with the
// jump. A pumpkin on the middle stretch, and an owl over the second gap (no fish there, so the two
// never come together). Below, the pool's bank (outside the secret cave) and stepping stones back
// up, a low fish between them.
level.gap(34, 60)
  .bridge(34, 41, RAISED).bridge(46, 51, RAISED).bridge(56, 58, RAISED)
  .ground(34, 36, 30) // the bank outside the cave
  .ground(40, 41, 29).ground(46, 47, 29).ground(52, 53, 28).ground(57, 58, 27) // stepping stones
  .coins(40, 41, 27).coins(46, 47, 27).coins(52, 53, 26)
  .put(38, 24, 'a').put(49, 24, 'P')
  .arc(42, 45, 23, 1).arc(52, 55, 23, 1)
  .bird('diver', 57, 18, { wake: 50, look: 'owl' }); // within 7 cells above the walkway: it can dive at it

// ----- 3. Forest Outpost: firm ground again, a checkpoint, and a long island climbed by a ladder,
// its pumpkin well away from the ladder's top. A vine from it climbs to the ruins.
level.ground(59, 80, 26)
  .put(61, 25, 'C')
  .island(64, 75, 22).ladder(64, 22, 25).coins(65, 67, 21).put(73, 21, 'P')
  .put(79, 25, '/');

// ----- 4. The Ruined Bridge: the vine up to the ruins, and at their end, the switch: it lowers the
// drawbridge across the chasm below (systems/adventure/drawbridges.js). The ruins are low enough
// that the bridge is on screen as it comes down. The chasm is too wide to jump without it. A mace
// hangs from a small high island over the bridge, too high to reach from it; a crystal waits on top,
// a brave leap from the ruins' end, with the bridge already down to catch a miss.
level.island(68, 76, 18).vine(70, 18, 21)
  .coins(72, 74, 17)
  .drawbridge(76, 17, 81, 94, 26)
  .gap(81, 94)
  .island(83, 86, 19).put(84, 18, '*') // the mace's roof, seven cells over the bridge
  .trap('mace', 86, 20, { hanging: true, chain: 237, swingDeg: 30 });

// ----- 5. The Mineshaft: a hill with a tunnel through it, and two ways on. Below, in the tunnel, a
// checkpoint at its mouth, a crate of freeze rounds, a mole popping out of the ground, and a squirrel throwing acorns down
// its length. Above, along the hill's top, two crushers slamming in turn, the mine's stamps, with
// coins under them. (In the tunnel they'd have no room to swing up from.) Cracked floor
// in the tunnel, coins on it, breaks into a secret room with the silver chest and a crystal, its way
// out on the low meadow beyond.
level.ground(95, 127, 26)
  .ground(100, 126, 18).hollow(100, 126, 20, 25) // the hill, two cells thick over a tunnel tall enough for crushers
  .island(96, 97, 23).island(98, 99, 20) // steps up onto the hill
  .put(101, 25, 'C').put(102, 25, 'f').coins(103, 106, 24).put(110, 25, 'M')
  .put(117, 25, '4') // the squirrel, throwing down the tunnel at whoever comes in
  .trap('crusher', 108, 10, { phaseMs: 0 }).trap('crusher', 116, 10, { phaseMs: 1100 })
  .coins(107, 109, 16).coins(115, 117, 16).coins(120, 122, 16)
  .cracked(119, 120, 26).coins(119, 120, 25)
  .hollow(118, 127, 27, 29).hollow(119, 120, 26, 26)
  .put(121, 29, 'U').put(123, 29, '*').coins(124, 126, 29);

// ----- 6. The Guardian Gate: the low meadow, a spike pit, then the vine up to the gold key's island,
// with an owl diving at it. Up on the gate's high ground, a checkpoint, a boar, and a last chasm: its
// drawbridge's switch is on the far side, so it must be shot from across (the switch, learnt at the
// ruins, now tested). Past it, the gate: its door opens only with the key.
level.ground(128, 141, 30)
  .put(132, 29, '^').put(133, 29, '^').arc(131, 134, 27, 2)
  .island(135, 141, 18).vine(138, 18, 29).put(136, 17, 'k').coins(139, 141, 17)
  .bird('diver', 140, 11, { look: 'owl' })
  .ground(142, COLS - 1, 26)
  .put(148, 25, 'C').put(151, 25, 'V').coins(149, 152, 24)
  .gap(155, 164).drawbridge(166, 25, 155, 164, 26, { shot: true })
  .put(169, 25, 'V')
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
  // The waterfalls pour from high above the walkway, out of sight.
  waterfalls: [
    { col: 48, top: 6, bottom: WATER },
    { col: 51, top: 7, bottom: WATER },
  ],
  caves: [{ cols: [22, 33], rows: [27, 29] }, { cols: [28, 29], rows: [26, 26] }, { cols: [100, 126], rows: [20, 25] }, { cols: [118, 127], rows: [27, 29] }],
  // The owner's scenery (images/levels/autumn, cut by tools/adventure-autumn-scenery.mjs) and the
  // pack's trees, fences and barrels.
  props: [
    { picture: 'cottage', col: 5, row: 26, back: true },
    { picture: 'lamp-post', col: 8, row: 26 },
    { picture: 'fence', col: 18, row: 26 },
    { picture: 'barrel', col: 26, row: 24 },
    { picture: 'hang-lantern', col: 26, row: 27, hang: true },
    { picture: 'crystal-purple', col: 24, row: 29 },
    { picture: 'crystal-purple', col: 32, row: 29 },
    { picture: 'mill-house', col: 37, row: 24, back: true },
    { picture: 'mill-wheel', col: 44, row: 27, back: true, width: 300, spinMs: 9000 },
    { picture: 'tree-1', col: 62, row: 25, back: true },
    { picture: 'ruin-pillar', col: 68, row: 17, back: true },
    { picture: 'ruin-arch', col: 73, row: 17, back: true },
    { picture: 'tree-2', col: 90, row: 25, back: true },
    { picture: 'mine-frame', col: 100, row: 25, width: 640, back: true },
    { picture: 'mine-rail', col: 104, row: 25 },
    { picture: 'minecart', col: 104, row: 25 },
    { picture: 'hang-lantern', col: 106, row: 20, hang: true },
    { picture: 'crystal-blue', col: 111, row: 25 },
    { picture: 'hang-lantern', col: 112, row: 20, hang: true },
    { picture: 'crystal-blue', col: 122, row: 29 },
    { picture: 'mine-frame', col: 126, row: 25, width: 640, back: true },
    { picture: 'tree-1', col: 130, row: 29, back: true },
    { picture: 'lamp-post', col: 146, row: 25 },
    { picture: 'lamp-post', col: 166, row: 25 },
  ],
  // Places to start at while developing, with /adventure.html?at=<name> (systems/adventure/devPlaces.js).
  places: {
    mill: { col: 32, row: 24 },
    outpost: { col: 61, row: 25 },
    mine: { col: 101, row: 25 },
    gate: { col: 148, row: 25 },
  },
};
