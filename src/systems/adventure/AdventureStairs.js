import { TILE } from '../adventureMap.js';
import { STAIRS, feetOnStairs, holdsOnStairs, stairBox, stairPicture, stairWall } from './stairSteps.js';

// A level's stairs (systems/adventure/stairSteps.js): the world's staircase picture (stairs-up-right
// or stairs-up-left) over a smooth slope. Each frame, after the physics, a cat on the slope has his
// feet put on it and counts as standing, so he walks up and down, jumps off, and lands on it. Enemies
// walk the floor under it.
export class AdventureStairs {
  // art: the level's pictures by name. ground: the level's ground layer.
  constructor(scene, stairs, { art, ground }) {
    this.stairs = stairs;
    this.wasOn = false;
    for (const flight of stairs) {
      // The higher ground's side behind the stairs is no wall (stairWall), its top still solid.
      for (const { col, row, side } of stairWall(flight)) {
        const tile = ground?.getTileAt(col, row);
        if (tile) tile.setCollision(side === 'right', side === 'left', true, true, false);
      }
      const { left, right, top, bottom } = stairPicture(flight, TILE);
      const picture = flight.dir > 0 ? 'stairs-up-right' : 'stairs-up-left';
      if (!scene.textures.exists(art(picture))) continue;
      scene.add.image((left + right) / 2, bottom, art(picture)).setOrigin(0.5, 1)
        .setDisplaySize(right - left, bottom - top).setDepth(STAIRS.depth);
    }
  }

  // Puts the cat on the stairs he's on, if any. Not while he climbs a ladder.
  update(cat) {
    const { body } = cat;
    const prevFeet = body.prev.y + body.height;
    for (const flight of this.stairs) {
      const surface = feetOnStairs(flight, body, TILE);
      const onFloor = body.blocked.down && !this.wasOn; // standing on the floor, not on the slope
      const { bottom: floor } = stairBox(flight, TILE);
      if (!holdsOnStairs({ feet: body.bottom, prevFeet, vy: body.velocity.y, wasOn: this.wasOn, onFloor }, surface, floor)) continue;
      // As the moving logs do: his picture is moved, and the physics takes it up on its next step.
      cat.y -= body.bottom - surface;
      body.velocity.y = 0;
      body.blocked.down = true;
      this.wasOn = true;
      return;
    }
    this.wasOn = false;
  }
}
