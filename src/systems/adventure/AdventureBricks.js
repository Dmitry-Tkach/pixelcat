import { TILE } from '../adventureMap.js';
import { BRICK, BRICK_ART } from '../../data/adventure/bricks.js';
import { brickLayout } from './brickLayout.js';

// A level's masonry (data/adventure/bricks.js), drawn from the world's stone brick kit as
// brickLayout works it out, in place of the earth tiles of its cells (still solid ground):
//   a wall: its fill (lined up with the world, so boxes side by side join with no seam), its side
//     strips and their caps, and its top strip over them;
//   a pillar: its trunk repeated down its cells, its wet foot at the bottom, its head on top.
// Every piece is shown at the size it was cut (tools/adventure-brick-kit.mjs), lined up by BRICK's
// numbers. A world without the kit keeps its earth tiles.
const LAYER = { fill: 0, sides: 0.001, top: 0.002, caps: 0.003 };

export class AdventureBricks {
  // art: the level's pictures by name. groundLayer: the level's tiles.
  constructor(scene, masonry, { art, groundLayer }) {
    const has = (name) => scene.textures.exists(art(name));
    if (!masonry.length || !has(BRICK_ART.fill)) return;
    const size = (name) => scene.textures.get(art(name)).getSourceImage();
    const depth = (layer) => BRICK.depth + LAYER[layer];
    const solid = (c, r) => { const t = groundLayer.getTileAt(c, r); return !!t && t.collideDown; };
    for (const box of masonry) {
      const layout = brickLayout(box, solid);
      const { cols: [c0, c1], rows: [r0, r1] } = box;
      for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) groundLayer.getTileAt(c, r)?.setVisible(false);
      const x = c0 * TILE, y = r0 * TILE, w = (c1 - c0 + 1) * TILE, h = (r1 - r0 + 1) * TILE;
      if (layout.look === 'pillar') {
        const head = size(BRICK_ART.pillarHead), foot = size(BRICK_ART.pillarFoot), trunk = size(BRICK_ART.pillar);
        const mid = x + w / 2, footTop = y + h - foot.height;
        if (footTop > y) {
          scene.add.tileSprite(mid, y, trunk.width, footTop - y, art(BRICK_ART.pillar)).setOrigin(0.5, 0).setDepth(depth('fill'));
        }
        scene.add.image(mid, y + h, art(BRICK_ART.pillarFoot)).setOrigin(0.5, 1).setDepth(depth('sides'));
        scene.add.image(mid, y - BRICK.lip, art(BRICK_ART.pillarHead)).setOrigin(0.5, 0).setDepth(depth('caps'));
        continue;
      }
      scene.add.tileSprite(x, y, w, h, art(BRICK_ART.fill)).setOrigin(0, 0).setTilePosition(x, y).setDepth(depth('fill'));
      const side = size(BRICK_ART.side), cap = has(BRICK_ART.sideCap) ? size(BRICK_ART.sideCap) : null;
      for (const { col, side: dir, from, to, cap: capped } of layout.sides) {
        const sx = dir < 0 ? col * TILE - BRICK.out : (col + 1) * TILE + BRICK.out - side.width;
        scene.add.tileSprite(sx, from * TILE, side.width, (to - from + 1) * TILE, art(BRICK_ART.side))
          .setOrigin(0, 0).setTilePosition(0, from * TILE).setFlipX(dir > 0).setDepth(depth('sides'));
        if (capped && cap) scene.add.image(sx, from * TILE - BRICK.lip, art(BRICK_ART.sideCap)).setOrigin(0, 0).setFlipX(dir > 0).setDepth(depth('caps'));
      }
      const top = size(BRICK_ART.top);
      for (const { from, to, row } of layout.tops) {
        scene.add.tileSprite(from * TILE, row * TILE - BRICK.lip, (to - from + 1) * TILE, top.height, art(BRICK_ART.top))
          .setOrigin(0, 0).setTilePosition(from * TILE, 0).setDepth(depth('top'));
      }
    }
  }
}
