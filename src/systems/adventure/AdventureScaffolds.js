import { TILE } from '../adventureMap.js';
import { SCAFFOLD, SCAFFOLD_ART } from '../../data/adventure/scaffolds.js';
import { scaffoldLayout } from './scaffoldLayout.js';

// A level's timber walkways (data/adventure/scaffolds.js), drawn from the world's scaffold kit as
// scaffoldLayout works them out: the beam along the walkway, an end cap at each end over it, the
// posts down to what they stand on, and a brace between posts. The walkway's cells are the map's
// bridge cells, still stood on (one-way), their own tile hidden. Every piece is shown at the size it
// was cut but the brace, made smaller to fit its posts. A world without the kit shows the bridge tile.
export class AdventureScaffolds {
  // art: the level's pictures by name. groundLayer: the level's tiles. tiles: readAdventureMap's.
  constructor(scene, walkways, { art, groundLayer, tiles }) {
    const has = (name) => scene.textures.exists(art(name));
    if (!walkways.length || !has(SCAFFOLD_ART.beam)) return;
    const size = (name) => scene.textures.get(art(name)).getSourceImage();
    const post = size(SCAFFOLD_ART.post), beam = size(SCAFFOLD_ART.beam);
    for (const walkway of walkways) {
      const { from, to, row } = walkway;
      for (let c = from; c <= to; c++) groundLayer.getTileAt(c, row)?.setVisible(false);
      const left = from * TILE, right = (to + 1) * TILE, deck = row * TILE - SCAFFOLD.lip;
      scene.add.tileSprite(left, deck, right - left, beam.height, art(SCAFFOLD_ART.beam))
        .setOrigin(0, 0).setTilePosition(left, 0).setDepth(SCAFFOLD.depth.beam);
      scene.add.image(left, deck, art(SCAFFOLD_ART.endLeft)).setOrigin(0, 0).setDepth(SCAFFOLD.depth.ends);
      scene.add.image(right, deck, art(SCAFFOLD_ART.endRight)).setOrigin(1, 0).setDepth(SCAFFOLD.depth.ends);
      const { posts, braces } = scaffoldLayout(walkway, tiles);
      // A post runs from inside the beam (its deck's bottom) to the top of the row it stands on.
      const postTop = deck + beam.height * 0.6;
      for (const { col, bottom } of posts) {
        const x = col * TILE + TILE / 2 - post.width / 2;
        scene.add.tileSprite(x, postTop, post.width, bottom * TILE - postTop, art(SCAFFOLD_ART.post))
          .setOrigin(0, 0).setDepth(SCAFFOLD.depth.posts);
      }
      if (!has(SCAFFOLD_ART.brace)) continue;
      for (const { from: a, to: b, top, rows } of braces) {
        const x0 = a * TILE + TILE / 2, x1 = b * TILE + TILE / 2;
        scene.add.image((x0 + x1) / 2, top * TILE, art(SCAFFOLD_ART.brace)).setOrigin(0.5, 0)
          .setDisplaySize(x1 - x0, rows * TILE).setDepth(SCAFFOLD.depth.braces);
      }
    }
  }
}
