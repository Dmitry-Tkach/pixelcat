import { AMMO } from '../../data/adventure/ammo.js';

// The minigun's ammo belt: which kinds of rounds he carries, the key that picks each, and which kind
// he goes on with when one runs out. Plain data and sums, without Phaser, so it can be tested.
// systems/AdventureMoves.js keeps the rounds; ui/AdventureAmmoBelt.js draws the belt.

// Every kind, in the belt's order: the order AMMO lists them. Key 1 picks the first, and so on.
export const BELT_ORDER = Object.keys(AMMO);
export const MAX_SLOT_KEYS = 9; // keys 1 to 9 at most

// The number key that picks this kind.
export const slotKey = (kind) => BELT_ORDER.indexOf(kind) + 1;

// The kind a number key picks, or null for a key past the end of the belt.
export const kindForSlot = (slot) => BELT_ORDER[slot - 1] ?? null;

// The kinds he has rounds for, in the belt's order.
export const heldKinds = (rounds) => BELT_ORDER.filter((kind) => rounds[kind] > 0);

// What's on the belt in the HUD: the kinds he has rounds for, and the one he's on even when it's
// empty, so he can see it's run out.
export const beltKinds = (rounds, current) => BELT_ORDER.filter((kind) => rounds[kind] > 0 || kind === current);

// When a kind runs out: back to standard rounds if he has any, otherwise the next kind he has, in
// the belt's order, or null with none left at all.
export function kindAfterEmpty(rounds, emptied) {
  if (rounds.standard > 0) return 'standard';
  const start = BELT_ORDER.indexOf(emptied);
  for (let i = 1; i <= BELT_ORDER.length; i++) {
    const kind = BELT_ORDER[(start + i) % BELT_ORDER.length];
    if (rounds[kind] > 0) return kind;
  }
  return null;
}
