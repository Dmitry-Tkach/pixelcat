import { GAME } from '../config/gameConfig.js';
import { OBSTACLES } from '../data/obstacles.js';
import { createMovingObstacle } from './MovingObstacle.js';

const PASSED_MARGIN = 90; // how far behind the cat an obstacle must be to count as avoided
const LANDING_TOLERANCE = 8;
const ROAD_TOLERANCE = 4;
const ZONE_BELOW_FEET = 12; // zones lie on the road, a little in front of where the cat's feet land

// Places a level's obstacles, moves the ones that move, and reports hits, landings and clean passes.
export class ObstacleField {
  constructor(scene, level, startX = 0) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
    this.walls = scene.physics.add.staticGroup();
    this.wallHit = () => {};
    this.movers = [];
    this.alert = () => {};
    this.avoided = () => {};
    this.splash = () => {};
    this.zones = [];
    // The cat can stop, so swings, sprinklers and traffic keep time on their own. Their motion
    // follows this steadily moving point, rather than the cat.
    this.clockPoint = { x: 0 };
    this.clockSpeed = level.cat.speed;
    // Restarting from a checkpoint skips what's already behind the cat.
    this.items = level.obstacles.filter((entry) => entry.at > startX).map((entry) => {
      const definition = OBSTACLES[entry.type];
      if (definition.motion) {
        const mover = createMovingObstacle(scene, entry, definition, level.cat.speed);
        this.movers.push(mover);
        return mover;
      }
      if (definition.zone) return this.placeZone(definition, entry.at);
      return this.placeStatic(definition, entry.at, definition.solid ? this.walls : this.group);
    });
  }

  placeStatic(type, at, group) {
    const item = group.create(at, GAME.GROUND_Y + GAME.GROUND_OVERLAP, type.texture);
    item.setOrigin(0.5, 1).setDepth(4);
    const { x, y, w, h } = type.hitbox;
    item.refreshBody();
    item.body.setSize(w, h, false);
    item.body.setOffset(x, y);
    item.avoid = type.avoid;
    item.penalty = type.penalty;
    item.landable = Boolean(type.landable);
    item.bounce = type.bounce;
    item.heavy = Boolean(type.heavy);
    item.solid = Boolean(type.solid);
    item.stuckHint = type.stuckHint;
    item.wasHit = false;
    return item;
  }

  // Lies flat on the road. It has no physics body, because the cat runs through it.
  placeZone(type, at) {
    const item = this.scene.add.image(at, GAME.GROUND_Y + ZONE_BELOW_FEET, type.texture);
    item.setOrigin(0.5, 1).setDepth(2);
    item.avoid = type.avoid;
    item.zone = type.zone;
    item.wasHit = false;
    this.zones.push(item);
    return item;
  }

  // How fast the ground under the cat lets it run. Touching a zone also loses credit for a clean
  // pass, without ending the streak.
  terrainUnder(cat) {
    const x = cat.body.center.x;
    const onRoad = cat.onGround && Math.abs(GAME.GROUND_Y - cat.body.bottom) <= ROAD_TOLERANCE;
    const zone = onRoad && this.zones.find((item) => Math.abs(item.x - x) <= item.zone.width / 2);
    if (!zone) {
      this.inZone = null;
      return 1;
    }
    if (this.inZone !== zone) {
      this.inZone = zone;
      zone.wasHit = true;
      this.splash();
    }
    return zone.zone.speedMultiplier;
  }

  // True when the cat's feet were at or above the obstacle's top on the previous physics step.
  cameFromAbove(cat, item) {
    const previousBottom = cat.body.prev.y + cat.body.height;
    return previousBottom <= item.body.top + LANDING_TOLERANCE;
  }

  // Landing from above is safe. Touching any other part counts as a hit, once per obstacle.
  onHit(cat, callback) {
    const { physics } = this.scene;
    physics.add.collider(
      cat,
      this.group,
      (_cat, item) => {
        if (item.bounce) cat.bounce(item.bounce);
      },
      (_cat, item) => item.landable && !item.wasHit && cat.body.velocity.y >= 0 && this.cameFromAbove(cat, item),
    );

    const handle = (_cat, item) => {
      item.wasHit = true;
      if (item.reactToHit) item.reactToHit();
      else this.knockOver(item);
      callback(item);
    };
    const isHit = (_cat, item) => !item.wasHit && !(item.landable && this.cameFromAbove(cat, item));
    physics.add.overlap(cat, this.group, handle, isHit);
    if (this.movers.length > 0) physics.add.overlap(cat, this.movers, handle, isHit);

    // Walls are solid: running into one stops the cat, and the top is safe to land on.
    physics.add.collider(cat, this.walls, (_cat, item) => {
      if (item.wasHit || !cat.body.blocked.right) return;
      item.wasHit = true;
      this.wallHit(item);
    });
  }

  // `callback` runs once for each wall the cat runs into.
  onWallHit(callback) {
    this.wallHit = callback;
  }

  // `callback` receives the name of a sound when a moving obstacle needs to be heard.
  onAlert(callback) {
    this.alert = callback;
  }

  // `callback` runs when the cat runs into a zone.
  onSplash(callback) {
    this.splash = callback;
  }

  // `callback` runs once for each obstacle the cat gets past without hitting.
  onAvoided(callback) {
    this.avoided = callback;
  }

  update(ms, cat) {
    this.clockPoint.x += this.clockSpeed * (ms / 1000);
    for (const mover of this.movers) {
      mover.tick(ms, mover.keepsTime ? this.clockPoint : cat, this.alert, cat);
    }
    for (const item of this.items) {
      if (item.wasHit || item.passed || item.phase === 'waiting') continue;
      if (item.x + PASSED_MARGIN + (item.zone ? item.zone.width / 2 : 0) < cat.x) {
        item.passed = true;
        this.avoided(item);
      }
    }
  }

  stopMovers() {
    for (const mover of this.movers) mover.stop();
  }

  knockOver(item) {
    this.scene.tweens.add({
      targets: item,
      angle: item.heavy ? 0 : item.avoid === 'jump' ? 75 : 12,
      alpha: 0.55,
      duration: 220,
      ease: 'Quad.easeOut',
    });
  }
}
