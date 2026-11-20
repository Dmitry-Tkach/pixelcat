import { TILE } from '../adventureMap.js';
import { landsFromAbove } from '../adventurePlatformLanding.js';
import { DRAWBRIDGE, drawbridgeCells, hitsSwitch } from './drawbridges.js';

// A level's drawbridges (systems/adventure/drawbridges.js): each switch stands in its cell, and its
// bridge isn't there until the cat shoots the switch or touches it. Then the gem lights up and the
// planks drop into place one by one, as islands he lands on from above and jumps up through. Once
// down, a bridge stays down.
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
      const { col, row } = bridge.switch;
      const look = scene.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, art('switch-off')).setDepth(DRAWBRIDGE.switchDepth);
      const planks = drawbridgeCells(bridge).map((cell) => {
        const plank = this.planks.create(cell.col * TILE + TILE / 2, cell.row * TILE, art(own ? plankPicture : 'bridge')).setDepth(DRAWBRIDGE.depth);
        if (!own) plank.setDisplaySize(TILE, TILE);
        plank.setY(cell.row * TILE + plank.displayHeight / 2).refreshBody();
        plank.home = plank.y;
        plank.disableBody(false, true); // not there yet
        return plank;
      });
      return { ...bridge, look, planks, art, down: false };
    });
    scene.physics.add.collider(cat, this.planks, null, (cat_, plank) => canLand() && landsFromAbove({
      bottom: cat.body.bottom, prevBottom: cat.body.prev.y + cat.body.height, top: plank.body.top, vy: cat.body.velocity.y,
    }));
  }

  // Rounds into a switch, and the cat touching one, open its bridge.
  update(cat, shots) {
    for (const bridge of this.bridges) {
      if (bridge.down) continue;
      if (hitsSwitch(bridge.switch, cat.body.center.x, cat.body.center.y, TILE)) { this.lower(bridge); continue; }
      const shot = shots.find((round) => round.active && hitsSwitch(bridge.switch, round.x, round.y, TILE));
      if (shot) {
        this.spend(shot);
        this.lower(bridge);
      }
    }
  }

  // The gem lights, and the planks drop in one after another, nearest the switch first.
  lower(bridge) {
    bridge.down = true;
    bridge.look.setTexture(bridge.art('switch-on'));
    const { scene } = this;
    scene.audio.playSfx('creak');
    scene.tweens.add({ targets: bridge.look, scale: 1.15, duration: 120, yoyo: true });
    const nearFirst = bridge.switch.col <= bridge.from ? bridge.planks : [...bridge.planks].reverse();
    nearFirst.forEach((plank, i) => {
      scene.time.delayedCall(i * DRAWBRIDGE.plankMs, () => {
        plank.setPosition(plank.x, plank.home - DRAWBRIDGE.dropPx).setVisible(true).setAlpha(0);
        scene.tweens.add({
          targets: plank, y: plank.home, alpha: 1, duration: DRAWBRIDGE.dropMs, ease: 'Bounce.easeOut',
          onComplete: () => plank.enableBody(true, plank.x, plank.home, true, true),
        });
      });
    });
    scene.time.delayedCall(nearFirst.length * DRAWBRIDGE.plankMs + DRAWBRIDGE.dropMs, () => scene.audio.playSfx('bump'));
  }
}
