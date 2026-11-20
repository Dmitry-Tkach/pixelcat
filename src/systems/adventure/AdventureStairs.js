import { TILE } from '../adventureMap.js';
import { STAIRS, stairBox, stairSteps, stepsUp } from './stairSteps.js';

// A level's stairs (systems/adventure/stairSteps.js): the world's staircase picture (stairs-up-right
// or stairs-up-left) over its invisible steps. The cat lands on the steps and walks into them; one
// low enough, he steps up onto, so he walks up the stairs. Enemies stop at them, as at a wall.
export class AdventureStairs {
  // art: the level's pictures by name. canStand(): whether the cat stands on them now (not while he
  // climbs a ladder).
  constructor(scene, cat, stairs, { art, enemies, canStand }) {
    this.steps = scene.physics.add.staticGroup();
    for (const flight of stairs) {
      const { left, right, bottom } = stairBox(flight, TILE);
      const picture = flight.dir > 0 ? 'stairs-up-right' : 'stairs-up-left';
      if (scene.textures.exists(art(picture))) {
        scene.add.image((left + right) / 2, bottom, art(picture)).setOrigin(0.5, 1)
          .setDisplaySize(right - left, bottom - stairBox(flight, TILE).top).setDepth(STAIRS.depth);
      }
      for (const step of stairSteps(flight, TILE)) {
        const zone = scene.add.zone(step.left + step.width / 2, step.top + step.height / 2, step.width, step.height);
        this.steps.add(zone);
      }
    }
    scene.physics.add.collider(cat, this.steps, null, (cat_, step) => {
      if (!canStand()) return false;
      const rise = stepsUp({ feet: cat.body.bottom, vy: cat.body.velocity.y }, step.body.top);
      if (rise) {
        cat.y -= rise;
        cat.body.y -= rise;
      }
      return true;
    });
    if (enemies) scene.physics.add.collider(enemies, this.steps);
  }
}
