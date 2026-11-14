import Phaser from 'phaser';
import { BURN, fireAfter } from '../../data/adventure/fire.js';
import { isFrozen } from './iceBlocks.js';

// Setting an enemy, walker or gunner, on fire (the fire round, data/adventure/fire.js). Its own
// update calls updateBurn after the ice, and does nothing else while it burns. The scene hears
// FLAMES, with where, for ShotEffects to draw flames rising off it, and BURNED_OUT, with the enemy,
// when the fire takes its last hit point, for the moves to knock it out.

export const FLAMES = 'adventure-flames';
export const BURNED_OUT = 'adventure-burned-out';

export const isBurning = (enemy) => (enemy.burnMs ?? 0) > 0;

// Sets it alight, or keeps it burning longer. Not while it's frozen in ice.
export function igniteEnemy(enemy) {
  if (enemy.dead || isFrozen(enemy)) return;
  enemy.burnMs = BURN.ms;
  enemy.flamesMs = 0;
  enemy.attacking = false;
  enemy.shooting = false;
}

// Each frame: the fire burns down, hurts it each tick, flickers it, and sends up flames. A walker
// runs in a panic, turning at edges and walls. Returns whether it's still burning, so its update
// knows to do nothing else.
export function updateBurn(enemy, ms) {
  if (!isBurning(enemy)) return false;
  const { left, ticks, out } = fireAfter(enemy.burnMs, ms);
  enemy.burnMs = left;
  const { scene } = enemy;
  for (let i = 0; i < ticks && !enemy.dead; i++) {
    if (enemy.takeShot()) scene.events.emit(BURNED_OUT, enemy);
  }
  if (enemy.dead || !enemy.active) return true;
  if (out) {
    enemy.clearTint();
    return false;
  }
  enemy.setTint(Math.floor(left / 120) % 2 ? BURN.tint : BURN.flickerTint);
  enemy.flamesMs -= ms;
  if (enemy.flamesMs <= 0) {
    enemy.flamesMs = BURN.flamesEveryMs;
    const { body } = enemy;
    scene.events.emit(FLAMES, Phaser.Math.Between(body.left, body.right), Phaser.Math.Between(body.top, body.bottom));
  }
  if (enemy.walk && enemy.wayBlocked) {
    if (enemy.body.blocked.down && enemy.wayBlocked()) enemy.face(-enemy.direction);
    enemy.walk(enemy.info.speed * BURN.panicSpeed);
  } else {
    enemy.setVelocityX(0);
  }
  return true;
}

// Two enemies touching: if one is burning, the other catches fire.
export function spreadFire(a, b) {
  if (isBurning(a) && !isBurning(b)) igniteEnemy(b);
  else if (isBurning(b) && !isBurning(a)) igniteEnemy(a);
}

// The fire goes out (it's knocked out, or frozen).
export function putOut(enemy) {
  enemy.burnMs = 0;
}
