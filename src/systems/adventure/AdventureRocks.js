import { TILE } from '../adventureMap.js';
import { ROCK, ROCK_ART } from '../../data/adventure/rocks.js';
import { rockLayout } from './rockLayout.js';

// A level's rocks (data/adventure/rocks.js), drawn from the world's rock kit as rockLayout works
// them out: the fill, lined up with the world so its boxes join without a seam; the sides, the
// waterline and the top over it; the corners over the top's ends; and the decoration last. A world
// without the kit's fill draws none. Scenery: nothing here collides.
const LAYER = { fill: 0, sides: 0.001, water: 0.002, top: 0.003, corners: 0.004, decor: 0.005 };

export class AdventureRocks {
  // art: the level's pictures by name.
  constructor(scene, rocks, { art }) {
    const has = (name) => scene.textures.exists(art(name));
    if (!rocks.length || !has(ROCK_ART.fill)) return;
    const at = (layer) => ROCK.depth + LAYER[layer];
    for (const rock of rocks) {
      const { fills, tops, sides, waterline, decor } = rockLayout(rock);
      for (const { cols: [c0, c1], rows: [r0, r1] } of fills) {
        const [x, y] = [c0 * TILE, r0 * TILE];
        scene.add.tileSprite(x, y, (c1 - c0 + 1) * TILE, (r1 - r0 + 1) * TILE, art(ROCK_ART.fill))
          .setOrigin(0, 0).setTilePosition(x, y).setDepth(at('fill'));
      }
      if (has(ROCK_ART.side)) {
        for (const { col, from, to, side } of sides) {
          const { width, out } = ROCK.side;
          const x = side < 0 ? col * TILE - out : (col + 1) * TILE + out - width;
          scene.add.tileSprite(x, from * TILE, width, (to - from + 1) * TILE, art(ROCK_ART.side))
            .setOrigin(0, 0).setTilePosition(0, from * TILE).setFlipX(side > 0).setDepth(at('sides'));
        }
      }
      if (has(ROCK_ART.water)) {
        for (const { row, from, to } of waterline) {
          const { height, up } = ROCK.water;
          scene.add.tileSprite(from * TILE, (row + 1) * TILE - up, (to - from + 1) * TILE, height, art(ROCK_ART.water))
            .setOrigin(0, 0).setTilePosition(from * TILE, 0).setDepth(at('water'));
        }
      }
      for (const { row, from, to, left, right } of tops) {
        const y = row * TILE - ROCK.top.lip;
        if (has(ROCK_ART.top)) {
          scene.add.tileSprite(from * TILE, y, (to - from + 1) * TILE, ROCK.top.height, art(ROCK_ART.top))
            .setOrigin(0, 0).setTilePosition(from * TILE, 0).setDepth(at('top'));
        }
        // An outer corner reaches out over the side's bulge; an inner one sits in the step's angle.
        const { corners } = ROCK_ART;
        const ends = [
          { name: left === 'outer' ? corners.outerLeft : corners.innerLeft, x: from * TILE - (left === 'outer' ? ROCK.side.out : 0), originX: left === 'outer' ? 0 : 0.5 },
          { name: right === 'outer' ? corners.outerRight : corners.innerRight, x: (to + 1) * TILE + (right === 'outer' ? ROCK.side.out : 0), originX: right === 'outer' ? 1 : 0.5 },
        ];
        for (const { name, x, originX } of ends) {
          if (!has(name)) continue;
          scene.add.image(x, y, art(name)).setOrigin(originX, 0).setDisplaySize(ROCK.corner.size, ROCK.corner.size).setDepth(at('corners'));
        }
      }
      for (const { col, row, place, picture } of decor) {
        if (!has(picture)) continue;
        const x = col * TILE + TILE / 2;
        const image = place === 'underTop'
          ? scene.add.image(x, row * TILE - ROCK.top.lip / 2, art(picture)).setOrigin(0.5, 0) // hangs from the moss
          : place === 'onTop'
            ? scene.add.image(x, row * TILE, art(picture)).setOrigin(0.5, 1) // stands on the top
            : scene.add.image(x, row * TILE + TILE / 2, art(picture)).setOrigin(0.5, 0.5);
        image.setDepth(at('decor'));
      }
    }
  }
}
