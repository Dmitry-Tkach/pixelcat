// How each adventure boss fights: his health, his attacks, his parts, and the damage he takes. The
// boss's brain (systems/adventure/bosses/bossBrain.js) reads it; his art is in bosses.js, under the
// same name. The design and the reasons are in docs/adventure-boss-troll.md. Times are in seconds,
// distances in px. These are starting numbers, to tune in playtests.
//
// The fight:
//   health: his full health. introSeconds, roarSeconds: his entrance, and the roar at a new part,
//     when he can't be hurt. staggerSeconds: how long a big hit staggers him.
//   nearRange: how close the cat must be, across, for "near" attacks.
//   damage: what each of the cat's attacks does to him, by name: the ammo kinds (data/adventure/
//     ammo.js), the bolt, a jump on his head (`stomp`, only in his weak moments), dash, rage and
//     the claw swipe (`claw`).
//   outsideWeakShare: the share of that damage he takes outside his weak moments.
//   staggeredBy: the attacks that stagger him, cancelling a warning.
//   assist: after this many losses in a row, the easier try gives him this share of his health.
// Each attack:
//   range: when he picks it: 'near' or 'far' (the cat on the floor, close or not), 'high' (the cat up
//     on an island), or 'any'. A part can give an attack another range.
//   windup: the warning. active: the attack itself, or null when his body says it's over (the
//     charge ends at a wall, the jump on landing), with maxActive as a limit.
//   recover: what follows: `kind` (the pose: stuck, dizzy, landing, turn), how long, and whether
//     it's a weak moment (full damage, and jumps on his head count). `onlyIf` needs his body to report
//     it (the charge only dizzies him if he hit a wall); otherwise `missed` follows.
//   cooldown: how long before he picks it again. weight: how often, against the others (default 1).
//   clubHurts: his club hurts while it lands. touchHurts: touching him hurts during the attack.
//   The rest is for his body: shockWave, stones.
// Each part:
//   from: it starts when his health falls to this share. pause: the time between attacks.
//   walkSpeed: px a second, walking to the cat. attacks: what he can do, by name, or
//   { attack, range } to change when. chains: pairs he can do back to back, chainChance how often,
//   chainGap the moment between them. goblins: small enemies dropping in, for the arena.
export const BOSS_FIGHTS = {
  troll1: {
    name: 'The Troll',
    // In rounds: the minigun fires about 8 a second, so a weak moment of shooting takes about 10,
    // and the fight about 90 seconds. With bare paws, about 15 jumps on his head.
    health: 120,
    introSeconds: 2.5,
    roarSeconds: 1.5,
    staggerSeconds: 0.6,
    nearRange: 220,
    damage: { standard: 1, laser: 1, explosive: 3, bolt: 20, stomp: 8, dash: 0, rage: 0, claw: 1 },
    outsideWeakShare: 0.5,
    staggeredBy: ['bolt'],
    assist: { afterLosses: 3, healthShare: 0.75 },
    attacks: {
      quickSmash: {
        range: 'near', windup: 0.5, active: 0.25, cooldown: 1.5, clubHurts: true,
        recover: { kind: 'stuck', seconds: 0.8, weak: true },
      },
      bigSmash: {
        range: 'far', windup: 0.9, active: 0.25, cooldown: 3.5, clubHurts: true, shockWave: true,
        recover: { kind: 'stuck', seconds: 1.5, weak: true },
      },
      stoneBurst: {
        range: 'any', windup: 1.0, active: 0.25, cooldown: 6, clubHurts: true,
        stones: { min: 5, max: 7, gapTiles: 2 },
        recover: { kind: 'stuck', seconds: 1.2, weak: true },
      },
      charge: {
        range: 'far', windup: 0.7, active: null, maxActive: 3, cooldown: 5, touchHurts: true,
        recover: { kind: 'dizzy', seconds: 2, weak: true, onlyIf: 'hitWall' },
        missed: { kind: 'turn', seconds: 0.5, weak: false },
      },
      jumpSlam: {
        range: 'any', windup: 0.7, active: null, maxActive: 3, cooldown: 5, touchHurts: true,
        recover: { kind: 'landing', seconds: 1, weak: true },
      },
    },
    phases: [
      // Part 1: the two smashes. He jumps only at a cat up on an island.
      { from: 1, pause: 1.2, walkSpeed: 70, attacks: ['quickSmash', 'bigSmash', { attack: 'jumpSlam', range: 'high' }] },
      // Part 2: angry. The stone burst and the charge, and goblins to earn the bolt from.
      {
        from: 0.7, pause: 0.9, walkSpeed: 100,
        attacks: ['quickSmash', 'bigSmash', 'stoneBurst', 'charge', { attack: 'jumpSlam', range: 'high' }],
        goblins: { everySeconds: 9, max: 2 },
      },
      // Part 3: the jump slam anywhere, and attacks back to back.
      {
        from: 0.35, pause: 0.7, walkSpeed: 120,
        attacks: ['quickSmash', 'bigSmash', 'stoneBurst', 'charge', 'jumpSlam'],
        chains: [['bigSmash', 'stoneBurst'], ['jumpSlam', 'charge']], chainChance: 0.5, chainGap: 0.4,
        goblins: { everySeconds: 12, max: 2 },
      },
    ],
  },
};
