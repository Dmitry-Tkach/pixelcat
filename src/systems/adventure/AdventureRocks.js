import { TILE } from '../adventureMap.js';
import { ROCK, ROCK_ART } from '../../data/adventure/rocks.js';
import { fillBox, rockDecorAt, rockLayout } from './rockLayout.js';

// A level's rocks (data/adventure/rocks.js), drawn from the world's rock kit as rockLayout works
// them out: the fill, lined up with the world so its boxes join without a seam; the sides, the
// waterline and the top over it; the corners over the top's ends; and the decoration last. Every
// piece is shown at the size it was cut (tools/adventure-rock-kit.mjs), and lines up by ROCK's
// numbers. A world without the kit's fill draws none. Scenery: nothing here collides.
// (tools/rockPicture.mjs draws them the same way, for the level preview.)
const LAYER = { fill: 0, sides: 0.001, water: 0.002, top: 0.003, corners: 0.004, decor: 0.005 };

export class AdventureRocks {
  // art: the level's pictures by name.
  // keepClear(c, r): cells kept clear of the rock's decoration (rockLayout).
  constructor(scene, rocks, { art, keepClear }) {
    const has = (name) => scene.textures.exists(art(name));
    if (!rocks.length || !has(ROCK_ART.fill)) return;
    const size = (name) => scene.textures.get(art(name)).getSourceImage();
    const depth = (layer) => ROCK.depth + LAYER[layer];
    for (const rock of rocks) {
      const { fills, tops, sides, waterline, decor } = rockLayout(rock, { keepClear });
      for (const box of fills) {
        const { x, y, w, h } = fillBox(box, TILE);
        scene.add.tileSprite(x, y, w, h, art(ROCK_ART.fill)).setOrigin(0, 0).setTilePosition(x, y).setDepth(depth('fill'));
      }
      if (has(ROCK_ART.side)) {
        // Each side starts with its cap, the strip's start faded in, and goes on with the strip.
        const { width } = size(ROCK_ART.side);
        const cap = has(ROCK_ART.sideCap) ? ROCK.cap : 0;
        for (const { col, from, to, side } of sides) {
          const x = side < 0 ? col * TILE - ROCK.out : (col + 1) * TILE + ROCK.out - width;
          const length = (to - from + 1) * TILE;
          if (cap) {
            scene.add.image(x, from * TILE, art(ROCK_ART.sideCap)).setOrigin(0, 0).setFlipX(side > 0)
              .setCrop(0, 0, width, Math.min(cap, length)).setDepth(depth('sides') + 0.0005); // no longer than the side
          }
          if (length > cap) {
            scene.add.tileSprite(x, from * TILE + cap, width, length - cap, art(ROCK_ART.side))
              .setOrigin(0, 0).setTilePosition(0, cap).setFlipX(side > 0).setDepth(depth('sides'));
          }
        }
      }
      if (has(ROCK_ART.water)) {
        const { height } = size(ROCK_ART.water);
        for (const { row, from, to } of waterline) {
          scene.add.tileSprite(from * TILE, (row + 1) * TILE + ROCK.sink - height, (to - from + 1) * TILE, height, art(ROCK_ART.water))
            .setOrigin(0, 0).setTilePosition(from * TILE, 0).setDepth(depth('water'));
        }
      }
      const { corners } = ROCK_ART;
      for (const { row, from, to, left, right } of tops) {
        const y = row * TILE - ROCK.lip;
        if (has(ROCK_ART.top)) {
          scene.add.tileSprite(from * TILE, y, (to - from + 1) * TILE, size(ROCK_ART.top).height, art(ROCK_ART.top))
            .setOrigin(0, 0).setTilePosition(from * TILE, 0).setDepth(depth('top'));
        }
        // An outer corner reaches out over the side's bulge; an inner one has its wall on the line.
        const ends = [
          left === 'outer' ? { name: corners.outerLeft, x: from * TILE - ROCK.out, ox: 0 } : { name: corners.innerLeft, x: from * TILE, ox: 0.5 },
          right === 'outer' ? { name: corners.outerRight, x: (to + 1) * TILE + ROCK.out, ox: 1 } : { name: corners.innerRight, x: (to + 1) * TILE, ox: 0.5 },
        ];
        for (const { name, x, ox } of ends) {
          if (has(name)) scene.add.image(x, y, art(name)).setOrigin(ox, 0).setDepth(depth('corners'));
        }
      }
      for (const { col, row, place, picture } of decor) {
        if (!has(picture)) continue;
        const { x, y, ox, oy } = rockDecorAt({ col, row, place }, TILE);
        scene.add.image(x, y, art(picture)).setOrigin(ox, oy).setDepth(depth('decor'));
      }
    }
  }
}

