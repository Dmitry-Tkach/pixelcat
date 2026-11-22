import Phaser from 'phaser';
import { FREEZE, TRAP_FREEZE, iceAfter } from '../../data/adventure/freeze.js';
import { ICE_BROKEN } from './iceBlocks.js';
import { shotKey } from './shotLook.js';

// The ice on a frozen trap (a mace, a crusher or a dart idol: data/adventure/freeze.js, TRAP_FREEZE).
// A frozen trap keeps trap.frozen: how long it has left, the ice block drawn over it, its pictures
// (tinted icy while frozen), and what to do when it thaws. AdventureTraps keeps it still and
// harmless while updateTrapIce says it's frozen. When it thaws, shards fly (ICE_BROKEN, drawn by
// ShotEffects).

// Freezes it, or makes its ice last again. rect: where the ice goes ({ left, top, right, bottom }).
export function freezeTrap(scene, trap, { looks, rect, depth, onThaw }) {
  if (trap.frozen) {
    trap.frozen.msLeft = TRAP_FREEZE.ms;
    trap.frozen.image.setAlpha(FREEZE.alpha);
    return;
  }
  const image = scene.add.image(0, 0, shotKey('ice')).setDepth(depth).setAlpha(FREEZE.alpha);
  for (const look of looks) look.setTint(FREEZE.tint);
  trap.frozen = { msLeft: TRAP_FREEZE.ms, image, looks, onThaw };
  placeIce(image, rect, 0);
}

// Each frame: counts its ice down, shaking it while it cracks, and thaws it at the end. Returns
// whether it's still frozen.
export function updateTrapIce(scene, trap, ms, rect) {
  const ice = trap.frozen;
  if (!ice) return false;
  const { left, cracking, thawed } = iceAfter(ice.msLeft, ms, TRAP_FREEZE);
  ice.msLeft = left;
  if (thawed) {
    scene.events.emit(ICE_BROKEN, (rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2, FREEZE.thawShards);
    ice.image.destroy();
    for (const look of ice.looks) look.clearTint();
    ice.onThaw?.();
    trap.frozen = null;
    return false;
  }
  placeIce(ice.image, rect, cracking ? Phaser.Math.FloatBetween(-FREEZE.shakePx, FREEZE.shakePx) : 0);
  if (cracking) ice.image.setAlpha(FREEZE.alpha * Phaser.Math.FloatBetween(0.7, 1));
  return true;
}

// The block over it, a little bigger each way, shaken `shake` px across.
function placeIce(image, rect, shake) {
  const { pad } = TRAP_FREEZE;
  image.setPosition((rect.left + rect.right) / 2 + shake, (rect.top + rect.bottom) / 2)
    .setDisplaySize(rect.right - rect.left + pad * 2, rect.bottom - rect.top + pad * 2);
}
