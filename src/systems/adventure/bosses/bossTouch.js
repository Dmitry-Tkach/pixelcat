// What happens when the battle cat touches a boss. Plain code with no Phaser, so vitest can test it;
// the scene does what it says (AdventureScene.meetBoss). See docs/adventure-boss-troll.md.
//
// It answers one of:
//   'stomp'       the cat landed on his head in a weak moment: it hurts him, and the cat bounces up
//   'bounceHead'  landed on his head at another time: too tough, the cat just bounces up
//   'bounceOff'   dashed, slid or raged into him: the cat is knocked back, and nobody is hurt
//   'hurt'        touched him during an attack that hurts on touch (the charge, the jump slam)
//   'push'        any other touch: he's solid, and the cat is pushed out of him
//   'none'        he's beaten, or the cat is up on top of him, rising off his head after a bounce
//
// The cat's state: fromAbove (falling onto him, his feet above the top of the boss's body a moment
// ago), onTop (his feet up at the top of the boss's body now), dashing, sliding, raging.
// The boss's: defeated, weak, invulnerable, touchHurts.
export function bossTouch({ fromAbove, onTop = false, dashing, sliding, raging }, { defeated, weak, invulnerable, touchHurts }) {
  if (defeated) return 'none';
  if (fromAbove) return weak && !invulnerable ? 'stomp' : 'bounceHead';
  if (onTop) return 'none';
  if (dashing || sliding || raging) return 'bounceOff';
  if (touchHurts) return 'hurt';
  return 'push';
}
