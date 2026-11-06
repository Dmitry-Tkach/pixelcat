// Bosses. Each is a new character with a fight of its own, at the end of a world. To add one: add
// its frames to data/characters.js and an entry here, then put `boss` in a section of a level.
//
// health:   how many hits beat it
// patterns: the attacks it repeats, for each amount of health left. It gets harsher as it's hurt
// idleSeconds: how long it pauses between attacks, for each amount of health left
// attacks:  windup is the warning before an attack, active is how long it lasts, and recover is how
//           long it's open to a stomp afterward
//   lunge    leaps at where the cat is. `height` is the top of its leap
//   claw     swipes around itself. It reaches `range` either side, up to `reachHeight`
//   charge   runs at `speed` until it hits a wall, then stands there dizzy

export const BOSSES = {
  crownCat: {
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
      lunge: { windup: 0.75, active: 0.7, recover: 1.3, height: 190 },
      claw: { windup: 0.7, active: 0.45, recover: 0.9, range: 250, reachHeight: 130 },
      charge: { windup: 0.6, recover: 2.2, speed: 560 },
    },
  },
};
