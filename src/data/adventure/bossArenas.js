// The adventure bosses' arenas, by boss, for trying each fight on its own while developing: open the
// page with ?boss=troll1. They're levels like any other (see wood.js for the letters), with a `boss`
// in place of a portal: beating him finishes it. `test` keeps them off the road map and out of the
// player's progress. The troll's real arena will be the top of Wood 3 (docs/adventure-boss-troll.md).
import { mapBuilder } from './mapBuilder.js';

// The troll's arena: a little over one screen wide, so it's all in view, with a solid floor, a wall
// at each end for his charge, and an island on each side, safe from his shock wave: three tiles up,
// so he walks under them (he's about three tiles tall), and the cat double-jumps onto them. The minigun
// and ammunition are by the start, so the fight can be tried straight away.
const COLS = 24;
const ROWS = 12;
const FLOOR = 10; // the floor's surface row: the cat stands on row 9

const troll = mapBuilder(COLS, ROWS).ground(0, COLS - 1, FLOOR).ground(0, 0, 1).ground(COLS - 1, COLS - 1, 1);
troll.put(2, 9, '@').put(4, 9, 'w').put(6, 9, 'a')
  .island(3, 6, 6).put(5, 5, 'a')
  .island(17, 20, 6).put(18, 5, 'e')
  .put(11, 9, 'b').put(13, 9, 'p');

export const BOSS_ARENAS = {
  troll1: {
    id: 'troll-arena',
    title: 'The Troll',
    world: 'wood',
    test: true,
    cat: { speed: 380 },
    hearts: 3,
    music: { track: 'chase', bpm: 138 },
    sky: '#86c98a',
    hint: 'The Troll!\nGrab the minigun. Jump his shock waves,\nand hit him hard while his club is stuck.',
    // Where he stands at the start, on the floor at this column, and the arena's first and last open
    // columns, inside its walls.
    boss: { kind: 'troll1', col: 18, arena: { left: 1, right: COLS - 2 } },
    map: troll.rows(),
  },
};
