import Phaser from 'phaser';
import { enemyAnimKey } from '../data/adventure/enemies.js';
import { isFrozen, updateIce } from '../systems/adventure/iceBlocks.js';
import { updateBurn } from '../systems/adventure/burning.js';
import { AdventureEnemy } from './AdventureEnemy.js';
import { MOLE, moleStep } from '../systems/adventure/moleLogic.js';

// The mole miner (data/adventure/enemies.js, mole): an enemy that burrows instead of walking. It
// waits under its mound, only its helmet showing, where it can't be hit. When the cat comes near, at
// about its level, it pops up, turns to him and swings its pickaxe when he's close in front (as the
// walking enemies swipe: the scene hurts him on its 'swipe'). After a while up, or a few swings, it
// sinks back, and waits before it can pop up again. The steps are plain code
// (systems/adventure/moleLogic.js); this plays them.
export class AdventureMole extends AdventureEnemy {
  constructor(scene, x, feetY, kind, options) {
    super(scene, x, feetY, kind, options);
    this.mole = { state: 'hidden', ms: 0, swings: 0 };
    this.hide();
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
      if (anim.key === enemyAnimKey(kind, 'attack')) this.mole.swings += 1;
    });
  }

  // Under its mound: only the first frame of its rise (its helmet in the dirt), and no body, so
  // nothing touches or hits it.
  hide() {
    this.attacking = false;
    this.anims.stop();
    this.setFrame('rise-0');
    this.body.enable = false;
  }

  update(cat, ms) {
    if (this.dead) return;
    if (updateIce(this, ms)) return; // frozen up, it stays as it is
    if (updateBurn(this, ms)) return;
    this.setVelocityX(0);
    this.cooldownMs = Math.max(0, this.cooldownMs - ms);
    const near = Math.abs(cat.body.center.x - this.x) < MOLE.sees && Math.abs(cat.body.bottom - this.y) < MOLE.levelWithin;
    const { state, changed } = moleStep(this.mole, ms, { near, attacking: this.attacking });
    this.mole = state;
    if (changed === 'rising') {
      this.face(Math.sign(cat.body.center.x - this.x) || this.direction);
      this.play(enemyAnimKey(this.kind, 'rise'));
    } else if (changed === 'up') {
      this.body.enable = true;
      this.play(enemyAnimKey(this.kind, 'idle'));
    } else if (changed === 'sinking') {
      this.body.enable = false;
      this.playReverse(enemyAnimKey(this.kind, 'rise'));
    } else if (changed === 'hidden') {
      this.hide();
    }
    if (this.mole.state !== 'up' || this.attacking) return;
    this.face(Math.sign(cat.body.center.x - this.x) || this.direction);
    if (this.cooldownMs === 0 && this.catInFront(cat, MOLE.swingSees)) {
      this.attacking = true;
      this.play(enemyAnimKey(this.kind, 'attack'));
    } else {
      this.play(enemyAnimKey(this.kind, 'idle'), true);
    }
  }

  // It doesn't walk, so the walking enemy's ending of its attack (back to walking) shows it idle.
  halt() {
    if (this.dead || this.mole.state === 'hidden' || isFrozen(this)) return;
    super.halt();
  }
}
