import Phaser from 'phaser';
import { FREEZE, iceAfter } from '../../data/adventure/freeze.js';
import { shotKey } from './shotLook.js';

// Freezing an enemy, walker or gunner, in a block of ice (the freeze round, data/adventure/freeze.js):
// it stops still in its tracks, tinted icy, inside a see-through block the size of its body, and
// can't be pushed, so the cat can stand on it (the scene's collider). Its own update calls updateIce
// first and does nothing else while it's frozen. When the ice breaks, thawing or shattering, the
// scene hears ICE_BROKEN, with where and how many shards fly, and ShotEffects draws them.

export const ICE_BROKEN = 'adventure-ice-broken';

export const isFrozen = (enemy) => (enemy.frozenMs ?? 0) > 0;

// Freezes it, or makes its ice last again.
export function freezeEnemy(enemy) {
  if (enemy.dead) return;
  enemy.frozenMs = FREEZE.ms;
  enemy.burnMs = 0; // the ice puts out any fire (adventure/burning.js)
  enemy.attacking = false;
  enemy.shooting = false;
  enemy.setVelocityX(0);
  enemy.anims.pause();
  enemy.setTint(FREEZE.tint);
  enemy.body.setImmovable(true);
  enemy.body.pushable = false;
  if (!enemy.ice) {
    enemy.ice = enemy.scene.add.image(0, 0, shotKey('ice')).setDepth(enemy.depth + 0.1);
    enemy.once(Phaser.GameObjects.Events.DESTROY, () => clearIce(enemy));
  }
  enemy.ice.setAlpha(FREEZE.alpha);
  placeIce(enemy, 0);
}

// Each frame: counts its ice down, shaking it while it cracks, and thaws it at the end. Returns
// whether it's still frozen, so its update knows to keep it still.
export function updateIce(enemy, ms) {
  if (!isFrozen(enemy)) return false;
  const { left, cracking, thawed } = iceAfter(enemy.frozenMs, ms);
  enemy.frozenMs = left;
  if (thawed) {
    breakIce(enemy, FREEZE.thawShards);
    return false;
  }
  enemy.setVelocityX(0);
  placeIce(enemy, cracking ? Phaser.Math.FloatBetween(-FREEZE.shakePx, FREEZE.shakePx) : 0);
  if (cracking) enemy.ice.setAlpha(FREEZE.alpha * Phaser.Math.FloatBetween(0.7, 1));
  return true;
}

// The ice breaks, thawing or shattering: shards fly, and the enemy moves again (or, shattered, is
// knocked out by its own knockOut).
export function breakIce(enemy, shards) {
  if (!enemy.ice) return;
  const { x, y } = enemy.body.center;
  enemy.scene.events.emit(ICE_BROKEN, x, y, shards);
  clearIce(enemy);
  enemy.anims.resume();
  enemy.clearTint();
  enemy.body.setImmovable(false);
  enemy.body.pushable = true;
}

export function clearIce(enemy) {
  enemy.frozenMs = 0;
  enemy.ice?.destroy();
  enemy.ice = null;
}

// The block over its body, a little bigger each way, shaken `shake` px across.
function placeIce(enemy, shake) {
  const { body, ice } = enemy;
  ice.setPosition(body.center.x + shake, body.center.y)
    .setDisplaySize(body.width + FREEZE.pad * 2, body.height + FREEZE.pad * 2);
}
