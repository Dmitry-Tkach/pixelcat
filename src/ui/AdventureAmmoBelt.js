import { AMMO } from '../data/adventure/ammo.js';
import { BELT_ORDER, beltKinds, slotKey } from '../systems/adventure/ammoBelt.js';

// The minigun's ammo belt in the adventure's HUD, once he has the minigun: a slot for each kind of
// round he carries (systems/adventure/ammoBelt.js), left to right, with its crate's picture (its
// badge reads better, small, than the thin round), how many are left, and the number key that
// picks it. The kind he's firing is lit up in a gold frame; one that's run out is dimmed, its
// count grey.

// Where the belt starts (its top left, on screen), and each slot's size and gap. icon: the crate's
// picture across. depth: over everything, like the rest of the HUD.
const BELT = { x: 20, y: 146, slotW: 62, slotH: 62, gap: 6, icon: 36, depth: 100 };
const PANEL = { colour: 0x1e2a4a, alpha: 0.55, lit: 0x2c3f6e, litAlpha: 0.85, border: 0xffd34d, radius: 10 };
const EMPTY = { colour: '#9aa3b5', alpha: 0.35 }; // a kind that's run out
const TEXT = { fontFamily: 'Fredoka, sans-serif', fontStyle: '600', color: '#ffffff', stroke: '#1e2a4a', strokeThickness: 5 };

export class AdventureAmmoBelt {
  // art(name): the level's world's picture of that name (the crates are in each world's art).
  constructor(scene, art) {
    const fixed = (object) => object.setScrollFactor(0).setDepth(BELT.depth);
    this.panels = fixed(scene.add.graphics());
    // A slot for every kind, made once; update shows the ones he carries, in order.
    this.slots = Object.fromEntries(BELT_ORDER.map((kind) => {
      const icon = fixed(scene.add.image(0, 0, art(AMMO[kind].crate)));
      return [kind, {
        icon: icon.setScale(BELT.icon / icon.width),
        count: fixed(scene.add.text(0, 0, '', { ...TEXT, fontSize: '18px' }).setOrigin(0.5, 0.5)),
        key: fixed(scene.add.text(0, 0, String(slotKey(kind)), { ...TEXT, fontSize: '13px', strokeThickness: 4 }).setOrigin(0, 0)),
      }];
    }));
    this.update({ armed: false });
  }

  // Draws the belt as it is now: moves is the cat's AdventureMoves (armed, ammo, rounds).
  update({ armed, ammo, rounds }) {
    this.panels.clear();
    const shown = armed ? beltKinds(rounds, ammo) : [];
    for (const [kind, { icon, count, key }] of Object.entries(this.slots)) {
      const at = shown.indexOf(kind);
      const visible = at >= 0;
      icon.setVisible(visible);
      count.setVisible(visible);
      key.setVisible(visible);
      if (!visible) continue;
      const x = BELT.x + at * (BELT.slotW + BELT.gap);
      const lit = kind === ammo;
      this.panels.fillStyle(lit ? PANEL.lit : PANEL.colour, lit ? PANEL.litAlpha : PANEL.alpha)
        .fillRoundedRect(x, BELT.y, BELT.slotW, BELT.slotH, PANEL.radius);
      if (lit) this.panels.lineStyle(3, PANEL.border, 1).strokeRoundedRect(x, BELT.y, BELT.slotW, BELT.slotH, PANEL.radius);
      const middle = x + BELT.slotW / 2;
      const empty = rounds[kind] <= 0;
      icon.setPosition(middle, BELT.y + 25).setAlpha(empty ? EMPTY.alpha : lit ? 1 : 0.75);
      count.setPosition(middle, BELT.y + 50).setText(String(rounds[kind]))
        .setColor(empty ? EMPTY.colour : AMMO[kind].colour);
      key.setPosition(x + 5, BELT.y + 3);
    }
  }
}
