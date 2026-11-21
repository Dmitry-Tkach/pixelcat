import { TILE } from '../adventureMap.js';
import { landsFromAbove } from '../adventurePlatformLanding.js';
import { BRIDGE_HOLD, DRAWBRIDGE, PLANK_FALL, drawbridgeCells, hitsSwitch } from './drawbridges.js';

// A level's drawbridges (systems/adventure/drawbridges.js): each switch stands in its cell, and its
// bridge isn't there until the cat shoots the switch or touches it. Then the gem lights up and the
// planks drop into place one by one, as islands he lands on from above and jumps up through. Once
// down, a bridge stays down; unless its planks fall (falls: each gives way a moment after he lands
// on it, and comes back), or it's timed (holdMs: it rises again, its switch reset).
// The scene calls update every frame, with the cat's rounds in flight.
export class AdventureDrawbridges {
  // art: the level's pictures by name. canLand(): whether the cat may land on a plank now (not while
  // he climbs). spend(round): uses up a round that hit a switch.
  constructor(scene, cat, bridges, { art, canLand, spend }) {
    this.scene = scene;
    this.spend = spend;
    this.planks = scene.physics.add.staticGroup();
    // The world's drawbridge plank (the Autumn world's, the owner's), its top at the top of its cell;
    // or, in a world with none, the bridge tile.
    this.bridges = bridges.map((bridge) => {
      // Its own planks (bridge.look: a rope bridge's), or the world's drawbridge plank.
      const plankPicture = bridge.look ?? 'drawbridge';
      const own = scene.textures.exists(art(plankPicture));
      // No switch: down from the start.
      const look = bridge.switch
        ? scene.add.image(bridge.switch.col * TILE + TILE / 2, bridge.switch.row * TILE + TILE / 2, art('switch-off')).setDepth(DRAWBRIDGE.switchDepth)
        : null;
      const planks = drawbridgeCells(bridge).map((cell) => {
        const plank = this.planks.create(cell.col * TILE + TILE / 2, cell.row * TILE, art(own ? plankPicture : 'bridge')).setDepth(DRAWBRIDGE.depth);
        if (!own) plank.setDisplaySize(TILE, TILE);
        plank.setY(cell.row * TILE + plank.displayHeight / 2).refreshBody();
        plank.home = plank.y;
        plank.homeX = plank.x;
        if (bridge.switch) plank.disableBody(false, true); // not there yet
        return plank;
      });
      const made = { ...bridge, look, planks, art, down: !bridge.switch, rising: false };
      for (const plank of planks) plank.bridge = made;
      return made;
    });
    scene.physics.add.collider(cat, this.planks, (cat_, plank) => this.stoodOn(plank), (cat_, plank) => canLand() && landsFromAbove({
      bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height, top: plank.body.top, vy: cat.body.velocity.y,
    }));
  }

  // The cat landed on a plank: one of a falling bridge shakes, gives way, and comes back later.
  stoodOn(plank) {
    if (!plank.bridge.falls || plank.falling) return;
    plank.falling = true;
    const { scene } = this;
    const shake = scene.tweens.add({ targets: plank, x: plank.homeX + PLANK_FALL.shakePx, duration: 45, yoyo: true, repeat: -1 });
    scene.time.delayedCall(PLANK_FALL.afterMs, () => {
      shake.stop();
      plank.disableBody(false, false);
      plank.setX(plank.homeX);
      scene.audio.playSfx('creak');
      scene.tweens.add({ targets: plank, y: plank.home + PLANK_FALL.dropPx, alpha: 0, angle: 18, duration: PLANK_FALL.dropMs, ease: 'Quad.easeIn' });
      scene.time.delayedCall(PLANK_FALL.backMs, () => this.dropIn(plank, () => { plank.falling = false; }));
    });
  }

  // A plank drops into its place from above, and can be stood on once there.
  dropIn(plank, done) {
    plank.setPosition(plank.homeX, plank.home - DRAWBRIDGE.dropPx).setAngle(0).setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: plank, y: plank.home, alpha: 1, duration: DRAWBRIDGE.dropMs, ease: 'Bounce.easeOut',
      onComplete: () => { plank.enableBody(true, plank.homeX, plank.home, true, true); done?.(); },
    });
  }

  // Rounds into a switch, the magic bolt passing it (bolt: its picture, while it flies), and the cat
  // touching one, open its bridge. A round is spent; the bolt flies on.
  update(cat, shots, bolt) {
    for (const bridge of this.bridges) {
      if (bridge.down || bridge.rising) continue;
      if (hitsSwitch(bridge.switch, cat.body.center.x, cat.body.center.y, TILE)) { this.lower(bridge); continue; }
      if (bolt && hitsSwitch(bridge.switch, bolt.x, bolt.y, TILE)) { this.lower(bridge); continue; }
      const shot = shots.find((round) => round.active && hitsSwitch(bridge.switch, round.x, round.y, TILE));
      if (shot) {
        this.spend(shot);
        this.lower(bridge);
      }
    }
  }

  // The gem lights, and the planks drop in one after another, nearest the switch first. A timed
  // bridge (holdMs) shakes its warning before its time is up, then rises.
  lower(bridge) {
    bridge.down = true;
    bridge.look.setTexture(bridge.art('switch-on'));
    const { scene } = this;
    scene.audio.playSfx('creak');
    scene.tweens.add({ targets: bridge.look, scale: 1.15, duration: 120, yoyo: true });
    const nearFirst = bridge.switch.col <= bridge.from ? bridge.planks : [...bridge.planks].reverse();
    nearFirst.forEach((plank, i) => scene.time.delayedCall(i * DRAWBRIDGE.plankMs, () => this.dropIn(plank)));
    scene.time.delayedCall(nearFirst.length * DRAWBRIDGE.plankMs + DRAWBRIDGE.dropMs, () => scene.audio.playSfx('bump'));
    if (!bridge.holdMs) return;
    scene.time.delayedCall(bridge.holdMs - BRIDGE_HOLD.warnMs, () => {
      scene.audio.playSfx('creak');
      bridge.shakes = bridge.planks.map((plank) => scene.tweens.add({ targets: plank, x: plank.homeX + BRIDGE_HOLD.shakePx, duration: 50, yoyo: true, repeat: -1 }));
    });
    scene.time.delayedCall(bridge.holdMs, () => this.raise(bridge));
  }

  // A timed bridge's time is up: its planks rise away, farthest from the switch first (behind a cat
  // running for it, a chase he can just win), and its gem goes dark; then it can be set off again.
  raise(bridge) {
    const { scene } = this;
    bridge.rising = true;
    for (const shake of bridge.shakes ?? []) shake.stop();
    bridge.look.setTexture(bridge.art('switch-off'));
    scene.audio.playSfx('creak');
    const farFirst = bridge.switch.col <= bridge.from ? [...bridge.planks].reverse() : bridge.planks;
    farFirst.forEach((plank, i) => scene.time.delayedCall(i * BRIDGE_HOLD.riseEveryMs, () => {
      plank.disableBody(false, false);
      plank.setX(plank.homeX);
      scene.tweens.add({ targets: plank, y: plank.home - DRAWBRIDGE.dropPx, alpha: 0, duration: BRIDGE_HOLD.riseMs, ease: 'Quad.easeIn', onComplete: () => plank.setVisible(false) });
    }));
    scene.time.delayedCall(farFirst.length * BRIDGE_HOLD.riseEveryMs + BRIDGE_HOLD.riseMs, () => { bridge.down = false; bridge.rising = false; });
  }
}
