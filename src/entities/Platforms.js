import { COLLAPSE, GAME } from '../config/gameConfig.js';
import { outline } from '../ui/Outline.js';

const THICKNESS = 34;
const LANDING_TOLERANCE = 10;
const TEXTURES = { awning: 'platform-awning', collapsing: 'platform-awning', plank: 'platform-plank', leafy: 'platform-leafy', hay: 'platform-hay', rooftop: 'platform-roof', barnRoof: 'platform-barn' };
const BUILDING_WALLS = { rooftop: 'roof-wall', barnRoof: 'barn-wall' }; // these ledges have a building under them
const WALL_BURIED = 10; // the wall goes a little way into the road, so it looks planted
const ROPE_LENGTH = 1200; // reaches past the top of the screen, even with the camera raised
const ROPE_INSET = 24;
const ROPE_COLOR = 0x6b4a2b;
const SHAKE_RATE = 0.06;
const FALL_DISTANCE = 900;
const SHADOW = { gap: 2, height: 12, alpha: 0.16, color: 0x1d1a44 }; // a soft shade under each ledge

// Floating ledges. The cat jumps up through them and lands on top, so they never block it.
// A `lift` rises and falls on the clock, and a `collapse` ledge falls soon after the cat lands.
export class Platforms {
  constructor(scene, level, startX = 0) {
    this.scene = scene;
    this.clockMs = 0;
    this.rider = null;
    this.creaked = () => {};
    this.collapsed = () => {};
    this.items = (level.platforms ?? [])
      .filter(({ at, width }) => at + width > startX)
      .map((entry) => this.createLedge(entry));
  }

  createLedge({ at, width, height, style, lift, collapse }) {
    const { scene } = this;
    const top = GAME.GROUND_Y - height;
    const item = scene.add.tileSprite(at + width / 2, top + THICKNESS / 2, width, THICKNESS, TEXTURES[style]);
    item.setDepth(4);
    outline(item);
    // A building's roof needs none, because its wall is right under it.
    if (!BUILDING_WALLS[style]) {
      item.shadow = scene.add.rectangle(item.x, top + THICKNESS + SHADOW.gap, width - 12, SHADOW.height, SHADOW.color, SHADOW.alpha)
        .setOrigin(0.5, 0).setDepth(3.9);
    }
    // The cat on the road runs in front of the building's wall.
    if (BUILDING_WALLS[style]) {
      const wallHeight = height - THICKNESS + WALL_BURIED;
      scene.add.tileSprite(at + width / 2, top + THICKNESS + wallHeight / 2, width, wallHeight, BUILDING_WALLS[style]).setDepth(3);
    }
    const moving = Boolean(lift || collapse);
    scene.physics.add.existing(item, !moving);
    if (moving) {
      item.body.setAllowGravity(false);
      item.body.setImmovable(true);
      item.body.moves = false; // update() places it directly
    }
    item.baseX = item.x;
    item.baseY = item.y;
    item.lift = lift;
    item.collapse = Boolean(collapse);
    item.collapseMs = null;
    item.fallen = false;
    if (lift) {
      item.ropes = [-1, 1].map((side) => scene.add
        .rectangle(item.x + side * (width / 2 - ROPE_INSET), item.y, 5, ROPE_LENGTH, ROPE_COLOR)
        .setOrigin(0.5, 1)
        .setDepth(3));
    }
    return item;
  }

  // Only catches a cat coming down from above, unless it's deliberately dropping through.
  onLand(cat) {
    if (this.items.length === 0) return;
    this.scene.physics.add.collider(
      cat,
      this.items,
      (_cat, item) => {
        cat.onPlatform = true;
        this.rider = item;
        if (item.collapse && item.collapseMs === null) {
          item.collapseMs = COLLAPSE.DELAY_MS;
          this.creaked();
        }
      },
      (_cat, item) => {
        const previousBottom = cat.body.prev.y + cat.body.height;
        return !item.fallen && !cat.isDropping && cat.body.velocity.y >= 0 && previousBottom <= item.body.top + LANDING_TOLERANCE;
      },
    );
  }

  // `onCreak` runs when a collapsing ledge starts to give way, and `onCollapse` when it falls.
  onCollapseEvents(onCreak, onCollapse) {
    this.creaked = onCreak;
    this.collapsed = onCollapse;
  }

  update(ms, cat) {
    this.clockMs += ms;
    if (!cat.onGround) this.rider = null;
    for (const item of this.items) {
      if (item.lift) this.moveLift(item, cat);
      if (item.collapseMs !== null && !item.fallen) this.shakeOrFall(item, ms);
    }
  }

  // Carries a riding cat with it, so it doesn't leave the ground while the lift goes down.
  moveLift(item, cat) {
    const wave = Math.sin((this.clockMs / (item.lift.seconds * 1000)) * Math.PI * 2);
    const y = item.baseY + wave * item.lift.travel;
    if (this.rider === item) cat.y += y - item.y;
    item.y = y;
    if (item.shadow) item.shadow.y = y + THICKNESS / 2 + SHADOW.gap;
    for (const rope of item.ropes) rope.y = y;
  }

  shakeOrFall(item, ms) {
    item.collapseMs -= ms;
    item.x = item.baseX + Math.sin(this.clockMs * SHAKE_RATE) * COLLAPSE.SHAKE;
    if (item.shadow) item.shadow.x = item.x;
    if (item.collapseMs > 0) return;
    item.fallen = true;
    item.x = item.baseX;
    item.body.enable = false;
    if (this.rider === item) this.rider = null;
    item.shadow?.destroy();
    this.scene.tweens.add({
      targets: item,
      y: item.y + FALL_DISTANCE,
      angle: 8,
      alpha: 0,
      duration: COLLAPSE.FALL_MS,
      ease: 'Quad.easeIn',
    });
    this.collapsed();
  }
}
