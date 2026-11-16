// The Rootbreaker, the jungle path's boss in level 3 (Heart of the Tree): an ancient stone guardian
// whose body is part of the mountain, from the owner's design (images/levels/forest/levelel3-example
// boss-guardian.png and fight-flow.png). He stands behind his arena, facing the cat, and never walks;
// his two fists float and fight on their own. Only his core crystal, in his chest, can be hurt, and
// only while it's open:
//   phase 1, Awakening (100-66%): one fist at a time slams down where the cat is; a missed smash
//     sticks in the ground, and his core opens for a while. His mouth blasts balls of green energy.
//   phase 2, Enraged (66-33%): a fist sweeps low across the arena, and his eyes fire a laser across
//     it, high or low; a stuck fist's seal (the green ring at its wrist) can be shot, and with both
//     seals broken his core opens.
//   phase 3, Overload (33-0%): everything faster, rocks fall from above, and every smash opens his
//     core.
// His parts are cut from the owner's sheet by tools/adventure-rootbreaker-art.mjs. Plain numbers and
// code, no Phaser, so the fight's rules can be tested; entities/AdventureRootbreaker.js plays it.

// The sheet's pieces, in the rows the tool finds them in.
export const RB_PIECES = [
  ['rb-body'],
  ['rb-face-calm', 'rb-face-warn', 'rb-face-blast'],
  ['rb-core-closed', 'rb-core-opening', 'rb-core-open', 'rb-core-shattered'],
  ['rb-fist', 'rb-hand', 'rb-seal', 'rb-seal-cracked'],
  ['rb-ball', 'rb-laser', 'rb-rock-1', 'rb-rock-2'],
];
export const RB_ART = RB_PIECES.flat();
export const rbKey = (name) => `adventure-${name}`;
export const rbPath = (name) => `assets/adventure/bosses/rootbreaker/${name}.png`;

export const ROOTBREAKER = {
  name: 'The Rootbreaker',
  health: 60,
  // How he's shown: his body and face, and his fists, as shares of their drawn size.
  scale: { body: 1.5, fist: 1.0, ball: 0.7, rock: 0.8 },
  // Where his face and his core sit on his body (shares of the body picture), measured by the tool.
  faceAt: { x: 0.513, y: 0.259 },
  coreAt: { x: 0.521, y: 0.685 },
  // Each fist floats beside him, this far out from his middle and this far up from his feet (px).
  fistRest: { out: 330, up: 330 },
  // Damage to his open core, by the kind of round or move that hits it.
  damage: { standard: 1, explosive: 4, laser: 1, freeze: 1, fire: 1, beam: 6, stomp: 2, dash: 2, rage: 3 },
  // The phases, by the share of his health left.
  phases: [
    { from: 1, name: 'Awakening', attacks: ['smash', 'blast', 'smash'], speed: 1 },
    { from: 0.66, name: 'Enraged', attacks: ['sweep', 'smash', 'laser', 'smash'], speed: 1.15 },
    { from: 0.33, name: 'Overload', attacks: ['smash', 'rockfall', 'laser', 'sweep', 'smash', 'blast'], speed: 1.35 },
  ],
  // His attacks (ms, px, px a second). Each starts with a tell the cat can read.
  smash: { tellMs: 900, follow: 0.9, dropSpeed: 1700, stuckMs: 2400, waveMs: 320, waveReach: 520 },
  blast: { tellMs: 800, balls: 3, spreadDeg: 18, speed: 380, everyMs: 260 },
  sweep: { tellMs: 900, speed: 780, height: 70 }, // height: px over the floor its middle passes
  laser: { tellMs: 1000, fireMs: 700, heights: [60, 200], thick: 26 }, // over the floor (px): one jumped, one passed under
  rockfall: { tellMs: 900, rocks: 5, everyMs: 300, fallSpeed: 760 },
  restMs: 900, // between attacks
  coreOpenMs: { phase1: 2400, phase2: 3600, phase3: 2600 },
  sealHits: 3, // rounds to crack a fist's seal, in phase 2
  dieMs: 1800,
};

// The phase he's in, with this share of his health left: its number (0, 1, 2) and its settings.
export function rootbreakerPhase(share, { phases } = ROOTBREAKER) {
  let index = 0;
  phases.forEach((phase, i) => { if (share <= phase.from) index = i; });
  return { index, ...phases[index] };
}

// The attack after `count` attacks in this phase: its list, in turn.
export const nextAttack = (phase, count) => phase.attacks[count % phase.attacks.length];

// What a hit does to his core: the damage, or 0 if it's closed.
export function coreDamage(kind, open, { damage } = ROOTBREAKER) {
  return open ? damage[kind] ?? 1 : 0;
}
