import { TILE } from '../adventureMap.js';
import { DAM_ART, damLayout } from '../../data/adventure/dam.js';

// The Grand Dam (data/adventure/dam.js): its wall, and behind it a door in each arch, shut. open(i)
// raises gate i's door (its open picture, rising into place) and the water pours from under it down
// the arch to the dam's foot, flowing.
export class AdventureDam {
  constructor(scene, dam, { art }) {
    this.scene = scene;
    this.flows = [];
    if (!dam || !scene.textures.exists(art(DAM_ART.wall))) { this.gates = []; return; }
    const wallImage = scene.textures.get(art(DAM_ART.wall)).getSourceImage();
    const layout = damLayout(dam, { w: wallImage.width, h: wallImage.height }, TILE);
    scene.add.image(layout.left, layout.top, art(DAM_ART.wall)).setOrigin(0, 0).setDepth(DAM_ART.depth);
    this.art = art;
    this.layout = layout;
    this.gates = layout.gates.map((gate) => ({
      ...gate, opened: false,
      door: scene.add.image(gate.x, layout.foot, art(DAM_ART.closed)).setOrigin(0.5, 1).setDepth(DAM_ART.depth - 0.02),
    }));
  }

  // Gate i opens: its door shows open, rising from where it was shut, and the water appears from
  // under it, flowing down to the dam's foot.
  open(i) {
    const gate = this.gates[i];
    if (!gate || gate.opened) return;
    gate.opened = true;
    const { scene, art, layout } = this;
    const { fall } = DAM_ART;
    gate.door.setTexture(art(DAM_ART.open)).setY(layout.foot + gate.door.height * 0.3);
    scene.tweens.add({ targets: gate.door, y: layout.foot, duration: fall.riseMs, ease: 'Quad.easeOut' });
    const from = layout.foot - gate.door.height * (1 - DAM_ART.doorGap);
    if (!scene.textures.exists(art('fall-middle'))) return;
    const own = scene.textures.get(art('fall-middle')).getSourceImage().width;
    const water = scene.add.tileSprite(gate.x, from, fall.width, layout.foot - from, art('fall-middle')).setOrigin(0.5, 0)
      .setTileScale(fall.width / own, 1).setDepth(DAM_ART.depth - 0.01).setAlpha(0);
    scene.tweens.add({ targets: water, alpha: 0.95, duration: fall.appearMs, delay: fall.riseMs * 0.6 });
    this.flows.push(water);
    scene.audio.playSfx('splash');
  }

  update(ms) {
    for (const flow of this.flows) flow.tilePositionY -= (260 * ms) / 1000;
  }
}
