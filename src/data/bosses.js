// Bosses. Each is a new character with a fight of its own, at the end of a world. To add one: add
// its frames to data/characters.js and an entry here, then put `boss` in a section of a level.
// Every boss has a style of his own, with attacks no other boss uses.
//
// style:    how he fights, which picks the code that moves him: 'brawler' (entities/Boss.js),
//           'gunner' (entities/GunnerBoss.js) or 'bomber' (entities/BomberBoss.js)
// health:   how many hits beat it
// patterns: the attacks it repeats, for each amount of health left. It gets harsher as it's hurt
// idleSeconds: how long it pauses between attacks, for each amount of health left
// attacks:  windup is the warning before an attack, active is how long it lasts, and recover is how
//           long it pauses afterward. It's open to a stomp while recovering, unless `stompable` is false.
//           `warnSound` and `sound` play as the warning and the attack begin (null for none).
//           Touching it during an attack hurts, unless `touchHurts` is false.
//
// Brawler attacks:
//   lunge    leaps at where the cat is. `height` is the top of its leap
//   claw     swipes around itself. It reaches `range` either side, up to `reachHeight`
//   charge   runs at `speed` until it hits a wall, then stands there dizzy
// Gunner attacks. Shots fly at `lane` height, 'low' (jump them) or 'high' (slide under them):
//   burst      fires `shots` bullets, `every` seconds apart
//   spray      fires a long stream for `active` seconds, switching lanes every `laneSeconds`. He holds
//              fire for `laneGap` seconds as he switches, long enough to land from a jump and slide
//   beam       charges up, then fires a beam the width of the arena, low enough to jump
//   dash       runs at `speed` past the cat to the far side, low enough to jump
//   slideKick  slides at `speed` to where the cat was, low along the ground
//   leap       jumps to where the cat is, `height` high
//   rage       bursts into flames, reaching `range` either side, up to `reachHeight`
// retreatSpeed: how fast he backs away between attacks, to keep the cat at a distance
// Bomber attacks. Bombs arc to where the cat is, land, and go off after `fuse` seconds, reaching
// `blastRadius` either side, up to `blastHeight`: move away from where they land.
//   bombToss   throws one bomb, taking `flight` seconds to land
//   bombRain   throws `bombs` bombs, `every` seconds apart, `spread` apart around the cat
//   pounce     lunges low along the ground at `speed`, to where the cat was: jump it
//   hop        jumps to the far side of the arena, `height` high, to keep the cat on the move
//   powerHit   powers up, then punches a shockwave along the ground at `waveSpeed`, `waveHeight`
//              high: jump it. Afterward he stops to cheer, sure he's won, which is the time to stomp

export const BOSSES = {
  crownCat: {
    style: 'brawler',
    character: 'crownCat',
    name: 'The Crown Cat',
    startHint: 'This is the Crown Cat\'s street! Stomp him when he\'s tired',
    notYetHint: 'Not yet! Wait until he\'s tired',
    defeatHint: 'The Crown Cat is beaten! Run!',
    beatenMessage: 'The Crown Cat swats you out of his street, right into the family\'s arms. One more try?',
    music: { track: 'finale', bpm: 176 },
    health: 3,
    hurtSeconds: 1,
    introSeconds: 1.4,
    idleSeconds: { 3: 1, 2: 0.7, 1: 0.45 },
    patterns: {
      3: ['lunge', 'lunge', 'claw'],
      2: ['claw', 'charge', 'lunge'],
      1: ['charge', 'lunge', 'claw', 'charge'],
    },
    attacks: {
      lunge: { windup: 0.75, active: 0.7, recover: 1.3, height: 170 },
      claw: { windup: 0.7, active: 0.45, recover: 0.9, range: 180, reachHeight: 100 },
      charge: { windup: 0.6, recover: 2.2, speed: 560 },
    },
  },

  // He lobs bombs and lunges, and he's a show-off: after his big punch he stops to cheer, and that's
  // the only time a stomp counts.
  bomberRat: {
    style: 'bomber',
    character: 'bomberRat',
    name: 'The Bomber Rat',
    startHint: 'The Bomber Rat! Run from his bombs, jump his pounce. Stomp him while he cheers',
    notYetHint: 'Not yet! Wait until he stops to cheer',
    defeatHint: 'The Bomber Rat is out of bombs! Run!',
    beatenMessage: 'The Bomber Rat cheers as you\'re carried home. One more try?',
    music: { track: 'finale', bpm: 172 },
    health: 3,
    hurtSeconds: 0.9,
    introSeconds: 1.4,
    idleSeconds: { 3: 1, 2: 0.75, 1: 0.55 },
    patterns: {
      3: ['bombToss', 'bombToss', 'pounce', 'powerHit'],
      2: ['bombRain', 'hop', 'pounce', 'bombToss', 'powerHit'],
      1: ['bombRain', 'pounce', 'hop', 'bombRain', 'powerHit'],
    },
    attacks: {
      bombToss: { windup: 0.45, active: 0.3, recover: 0.35, stompable: false, touchHurts: false, bombs: 1, every: 0, spread: 0, flight: 0.85, fuse: 0.9, blastRadius: 120, blastHeight: 130, warnSound: null, sound: null },
      // Spread so a gap about 110 wide is left between each pair of blasts, to stand in.
      bombRain: { windup: 0.55, active: 0.9, recover: 0.35, stompable: false, touchHurts: false, bombs: 3, every: 0.3, spread: 300, flight: 0.9, fuse: 0.9, blastRadius: 95, blastHeight: 130, warnSound: null, sound: null },
      pounce: { windup: 0.45, recover: 0.4, stompable: false, speed: 780, sound: 'lungeDash' },
      // Only for getting to the other side: touching him on the way is harmless.
      hop: { windup: 0.3, active: 0.7, recover: 0.3, stompable: false, touchHurts: false, height: 240, sound: 'lungeDash' },
      powerHit: { windup: 0.9, active: 0.35, recover: 2.4, touchHurts: false, waveSpeed: 700, waveHeight: 60, warnSound: 'flameBurst', sound: 'boom' },
    },
  },

  // He keeps his distance and shoots. The cat has to get past his fire, and stomp him while his gun
  // cools down after a spray or the beam.
  orangeCat: {
    style: 'gunner',
    character: 'orangeCat',
    name: 'The Ginger Gunner',
    startHint: 'The Ginger Gunner! Jump low shots, slide under high ones. Stomp him when his gun overheats',
    notYetHint: 'Not yet! Wait until his gun overheats',
    defeatHint: 'The Ginger Gunner is out of ammo! Run!',
    beatenMessage: 'The Ginger Gunner blasts you all the way back to the family. One more try?',
    music: { track: 'finale', bpm: 168 },
    health: 3,
    hurtSeconds: 0.9,
    introSeconds: 1.4,
    idleSeconds: { 3: 1.1, 2: 0.8, 1: 0.6 },
    retreatSpeed: { 3: 230, 2: 280, 1: 340 },
    keepAway: 420, // he backs away from a cat closer than this
    patterns: {
      3: ['burst', 'burst', 'spray'],
      2: ['burst', 'dash', 'slideKick', 'spray'],
      1: ['rage', 'leap', 'beam', 'dash', 'spray', 'slideKick'],
    },
    attacks: {
      // Only what he fires hurts during these, not touching him.
      burst: { windup: 0.55, active: 0.6, recover: 0.5, stompable: false, touchHurts: false, shots: 3, every: 0.2, lane: 'low', shotSpeed: 600, sound: null },
      spray: { windup: 0.5, active: 3.3, recover: 2.4, touchHurts: false, laneSeconds: 1.1, laneGap: 0.8, every: 0.13, shotSpeed: 640, sound: null },
      beam: { windup: 1, active: 0.5, recover: 2.4, touchHurts: false, warnSound: 'beamCharge', sound: 'beam' },
      dash: { windup: 0.5, recover: 0.5, stompable: false, speed: 680, sound: 'lungeDash' },
      slideKick: { windup: 0.4, recover: 0.5, stompable: false, speed: 760, sound: 'lungeDash' },
      leap: { windup: 0.5, active: 0.75, recover: 0.5, stompable: false, height: 240, sound: 'lungeDash' },
      rage: { windup: 0.7, active: 0.7, recover: 0.5, stompable: false, range: 141, reachHeight: 111, warnSound: 'flameBurst', sound: 'flameBurst' },
    },
  },
};
