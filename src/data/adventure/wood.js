// The first adventure level: the Wood world (World Tree Roots), for the battle cat. Forward along the
// forest floor, then up from island to island by ladders and jumps, to a portal at the top.
//
// The map is drawn one character per 64px tile, top row first:
//   #  ground: soil with a grassy top          =  a floating island: jump up through it, stand on top
//   -  a bridge: like an island, thin          H  a ladder: hold Up or Down on it to climb. On an
//                                                 island's row it is also part of the island
//   ^  spikes                                   ?  a ? block: jump into it from below for coins
//   B  a crate to stand on                      X  a stone block to stand on
//   o  a coin    *  a crystal    +  a heart     k  the key, which opens the chest  T
//   C  a checkpoint lantern                     E  the portal: the end of the level
//   m  a rage mushroom: the cat turns red for a while, shoots faster and knocks out what he touches
//   @  where the cat starts
//   Enemies, which walk to and fro: g a goon in a cap, c a cone head (faster), v a spiky helmet
//   (can't be jumped on: slide into it or jump over it). See data/adventure/enemies.js.
//   Gunners, which stand still and shoot at the cat: 1 a blaster, 2 a ray gun, 3 a rifle (from far
//   away). See data/adventure/gunners.js.
//   Scenery, which nothing touches: R roots under an island, b bush, p plant, s statue... see
//   SCENERY in scenes/AdventureScene.js.
export const WOOD_LEVEL = {
  id: 'wood-1',
  title: 'Into the Roots',
  world: 'wood',
  cat: { speed: 380 },
  hearts: 3,
  map: [
    '........................................................................',
    '........................................................................',
    '..........................................................ooo...........',
    '........................................................................',
    '........................................................S*.g.E..........',
    '.......................................................========.........',
    '....................................................oo....R.............',
    '....................................................==..................',
    '.......................................?......Cm.T2.....................',
    '...............................*............=H=====.....................',
    '...............................o.............H.R........................',
    '..............................o.o............H..........................',
    '.....................o...C../1.....g.^^....b.H..........................',
    '.....................o.H======...========H=====.........................',
    '.....................o.H..R............R.H..............................',
    '................+....o.H.................H..............................',
    '........k.....B.X..c.o.H.................H..............................',
    '........?.....====H======................H..............................',
    '..................HR.....................H..............................',
    '..................H......................H..............................',
    '.......o.o.o......H......................H..............................',
    '......====H=......H......................H..............................',
    '........R.H.......H......................H............ooo...............',
    '..........H.......H......................H..............................',
    '..........H.......H......................H.........B....................',
    '..@.>.....H..b.g..H.....p..s.............H....c...BB........p...v.b...3.',
    '##############################------####################################',
    '##############################......####################################',
    '##############################^^^^^^####################################',
    '########################################################################',
  ],
};
