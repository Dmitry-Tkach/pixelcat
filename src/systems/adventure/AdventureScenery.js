import Phaser from 'phaser';
import { TILE } from '../adventureMap.js';
import { caveRuns } from './caveFill.js';
import { columnSpan } from './earthColumns.js';
import { WATERFALL } from '../../data/adventure/millArt.js';
import { makeStandIn } from '../../entities/AdventureBird.js';
import { PTERO_LOOKS } from '../../data/adventure/birds.js';

// A level's set dressing that isn't on its map (Mill Falls' art, data/adventure/millArt.js):
//   waterfalls: { col, top, bottom, veil, width, foamAt, head, splash }: water pouring from a mossy lip (or, in the
//     Autumn world, spilling over a cliff's edge under foam) at row `top` down to row
//     `bottom`, in the middle of column col, flowing, with a splash at its foot. Behind the wheels;
//     a veil is thin water in front of the cat instead, hiding what's behind it. width: the fall's
//     own width (px). foamAt: rows where it hits something on its way down (the pier), with foam.
//     head: false for no head or lip (a spill piece over its top); splash: false for none at its foot.
//   props: { picture, col, row, hang, front, back, inGround, fromWater, width, stack, spinMs, glow, smoke, dy }: a picture
//     standing on the bottom
//     of its cell (or, hang, hanging from its top), in the middle of column col. front: in front of
//     the cat, as a cover. back: behind the ground, for big scenery (a house, a tree). inGround: in
//     the earth, just in front of the ground (a boulder half-buried). fromWater: rising out of the
//     water, behind the waterfalls (a cliff they pour from). stack: the picture repeated up `stack`
//     rows tall, at its width (a pier's post, from the water up to the deck). smoke: { x, y }, where
//     on the picture (shares of its width and height) a chimney's smoke rises from (CHIMNEY_SMOKE).
//     dx, dy: moved this far (px) across and down. free: placed on something drawn (a waterfall's
//     rocks), not on the map's ground (the scenery test lets it be). width: shown
//     this wide (px), if not its own size. spinMs: it turns round its middle, at the middle of its
//     cell, once in this long (a mill's wheel turning as scenery). glow: a lantern's warm light round
//     it, flickering, lighting the cave wall behind it (LANTERN_GLOW).
//   columns: { col, width, top, bottom }: an earth column behind the level, holding an island up
//     from the ground: `width` cells wide (2 or 3, the world's column-<width> picture) from column
//     col, from row top to row bottom. Scenery only: the cat passes in front of it.
//   caves: { cols: [from, to], rows: [from, to] }: the dark inside of a cave in a cliff: the world's
//     'cave-back' picture repeated, or a dark wash in a world without one.
//   flybys: { col, row, wake, dir, look }: a harmless pterodactyl that takes off from (col, row) as
//     the cat passes column `wake`, and flies away up and to `dir` (-1 left, 1 right): birds live
//     here. look: 'orange' or 'green' (data/adventure/birds.js, PTERO_LOOKS).
// A cover (a veil, or a prop in front) fades while the cat is behind it, so he can see himself, and
// whoever looks closely finds what it hides.
const DEPTH = { behind: 1.6, front: 7, cave: 1.55, prop: 2.1, inWater: 1.97, column: 1.7, inGround: 2.05, fromWater: 1.59 };
const COVER = { alpha: 1, seen: 0.35, fadePerMs: 0.004 }; // seen: its alpha while he's behind it
const VEIL_ALPHA = 0.85;
const CAVE = { colour: 0x0f1a12, alpha: 0.88 };
// A lantern's or a torch's glow: a soft round light (drawn once, GLOW_KEY), this wide (px) and warm
// (tint), where its flame is (at `flame` of a hanging lantern's height from its top, standingFlame of
// a standing torch's), between the cave wall and the
// ground. It flickers between its two brightnesses, each flicker taking between flickerMs.
const LANTERN_GLOW = { size: 300, tint: 0xffa63d, alpha: [0.42, 0.62], flickerMs: [600, 1200], flame: 0.72, standingFlame: 0.2, depth: 1.58 };
const GLOW_KEY = 'adventure-lantern-glow';
// A chimney's smoke: soft grey puffs rising and drifting, growing and fading. everyMs: how often a
// puff comes; lifeMs: how long it lasts; rise and drift: px a second; size: its scale, from and to.
const CHIMNEY_SMOKE = { everyMs: 260, lifeMs: 2600, rise: [30, 50], drift: [6, 22], size: [0.5, 1.6], tint: 0xd8d0c8, alpha: 0.45, depth: 1.62 };
const FLYBY = { ms: 2600, across: 900, up: 700, scale: 0.85, flapMs: 110, depth: 1.5 }; // behind the level

export class AdventureScenery {
  constructor(scene, level, art) {
    this.scene = scene;
    this.art = art;
    this.flybys = (level.flybys ?? []).map((flyby) => ({ ...flyby, gone: false }));
    this.covers = [];
    this.flows = [];
    const has = (name) => scene.textures.exists(art(name));
    for (const { col, top, bottom, veil, width: shown, foamAt = [], head = true, splash: splashes = true } of level.waterfalls ?? []) {
      if (!has('fall-middle')) break;
      const x = col * TILE + TILE / 2, topY = top * TILE, bottomY = bottom * TILE;
      const depth = veil ? DEPTH.front : DEPTH.behind;
      const parts = [];
      const middle = veil ? 'fall-veil' : 'fall-middle';
      const own = scene.textures.get(art(middle)).getSourceImage().width;
      const width = shown ?? own; // shown: a fall's own width (px), its water stretched across
      // A world with a soft head (the Autumn world's) has the water spill over the cliff's edge,
      // fading in under foam, the flow starting under it; another, a mossy lip the water pours from.
      // head: false starts the water at `top` with no head or lip (a spill piece placed over it).
      const soft = has('fall-head');
      const lip = head ? scene.add.image(x, topY, art(soft ? 'fall-head' : 'fall-top')).setOrigin(0.5, 0).setDepth(depth + 0.01) : null;
      if (lip && soft) lip.setDisplaySize(width, lip.height);
      const from = lip ? topY + lip.height * (soft ? WATERFALL.headFlow : 0.8) : topY;
      const flow = scene.add.tileSprite(x, from, width, Math.max(1, bottomY - from), art(middle)).setOrigin(0.5, 0).setDepth(depth)
        .setTileScale(width / own, 1);
      const splash = splashes ? scene.add.image(x, bottomY + 10, art('fall-splash')).setOrigin(0.5, 1).setDepth(depth + 0.02) : null;
      parts.push(...[lip, flow, splash].filter(Boolean));
      // Foam where the fall hits something on its way down (foamAt: the rows it hits, at their top).
      for (const row of has('fall-foam') ? foamAt : []) {
        const foam = scene.add.image(x, row * TILE + 4, art('fall-foam')).setOrigin(0.5, 1).setDepth(depth + 0.03);
        foam.setScale((width * 1.4) / foam.width);
        parts.push(foam);
      }
      for (const part of parts) part.setAlpha(veil ? VEIL_ALPHA : WATERFALL.alpha);
      this.flows.push(flow);
      if (veil) this.covers.push({ parts, full: VEIL_ALPHA, box: { left: x - width / 2, right: x + width / 2, top: topY, bottom: bottomY } });
    }
    for (const column of level.columns ?? []) {
      if (!has(`column-${column.width}`)) continue;
      const { x, y, w, h } = columnSpan(column, level.map, TILE); // into the island and the ground, behind them
      scene.add.tileSprite(x, y, w, h, art(`column-${column.width}`)).setOrigin(0, 0).setTilePosition(0, y).setDepth(DEPTH.column);
    }
    // A world with its own cave wall picture (the Autumn world's dark earth and stones) has it
    // repeated over the cave, lined up across the whole level so the strips join; another, a dark
    // wash. It reaches under the ground round the cave, filling the gaps at its wavy edges
    // (systems/adventure/caveFill.js).
    for (const { row, from, to } of caveRuns(level.map, level.caves)) {
      const [x, y, w] = [from * TILE, row * TILE, (to - from + 1) * TILE];
      const cave = has('cave-back')
        ? scene.add.tileSprite(x, y, w, TILE, art('cave-back')).setTilePosition(x, y)
        : scene.add.rectangle(x, y, w, TILE, CAVE.colour, CAVE.alpha);
      cave.setOrigin(0, 0).setDepth(DEPTH.cave);
    }
    for (const { picture, col, row, hang, front, back, inWater, inGround, fromWater, width, stack, spinMs, glow, smoke, dx = 0, dy = 0 } of level.props ?? []) {
      if (!has(picture)) continue;
      const x = col * TILE + TILE / 2;
      const image = stack
        ? scene.add.tileSprite(x, (row + 1) * TILE, scene.textures.get(art(picture)).getSourceImage().width, stack * TILE, art(picture)).setOrigin(0.5, 1)
        : spinMs
        ? scene.add.image(x, row * TILE + TILE / 2, art(picture))
        : scene.add.image(x, hang ? row * TILE : (row + 1) * TILE, art(picture)).setOrigin(0.5, hang ? 0 : 1);
      image.setDepth(front ? DEPTH.front : inWater ? DEPTH.inWater : inGround ? DEPTH.inGround : fromWater ? DEPTH.fromWater : back ? DEPTH.behind : DEPTH.prop);
      if (width && !stack) image.setScale(width / image.width);
      if (spinMs) scene.tweens.add({ targets: image, angle: 360, duration: spinMs, repeat: -1 });
      image.x += dx;
      if (dy) image.y += dy;
      if (glow) this.glowAround(image, hang);
      if (smoke) this.smokeFrom(image, smoke);
      if (front) {
        const b = image.getBounds();
        this.covers.push({ parts: [image], full: COVER.alpha, box: { left: b.left, right: b.right, top: b.top, bottom: b.bottom } });
      }
    }
  }

  // Smoke rising from a chimney at { x, y } on a standing picture (shares of its width and height).
  smokeFrom(house, { x, y }) {
    const { scene } = this;
    if (!scene.textures.exists(GLOW_KEY)) this.glowAround(house, false, false); // makes the soft round puff
    const { everyMs, lifeMs, rise, drift, size, tint, alpha, depth } = CHIMNEY_SMOKE;
    const left = house.x - house.displayWidth / 2, top = house.y - house.displayHeight;
    scene.add.particles(left + x * house.displayWidth, top + y * house.displayHeight, GLOW_KEY, {
      frequency: everyMs, lifespan: lifeMs, speedY: { min: -rise[1], max: -rise[0] }, speedX: { min: drift[0], max: drift[1] },
      scale: { start: size[0] * 0.3, end: size[1] * 0.3 }, alpha: { start: alpha, end: 0 }, tint,
    }).setDepth(depth);
  }

  // A lantern's warm light: the soft round glow, added light, flickering like a flame.
  // show: false only makes the glow's picture, for the smoke's puffs.
  glowAround(lantern, hang, show = true) {
    const { scene } = this;
    if (!scene.textures.exists(GLOW_KEY)) {
      const size = 128, canvas = scene.textures.createCanvas(GLOW_KEY, size, size);
      const ctx = canvas.getContext();
      const light = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      light.addColorStop(0, 'rgba(255,255,255,1)');
      light.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      light.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, size, size);
      canvas.refresh();
    }
    if (!show) return;
    const top = hang ? lantern.y : lantern.y - lantern.displayHeight;
    const { size, tint, alpha, flickerMs, flame, standingFlame, depth } = LANTERN_GLOW;
    const glow = scene.add.image(lantern.x, top + lantern.displayHeight * (hang ? flame : standingFlame), GLOW_KEY)
      .setDisplaySize(size, size).setTint(tint).setAlpha(alpha[0]).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
    const flicker = () => scene.tweens.add({
      targets: glow, alpha: Phaser.Math.FloatBetween(alpha[0], alpha[1]), duration: Phaser.Math.Between(flickerMs[0], flickerMs[1]),
      ease: 'Sine.easeInOut', onComplete: flicker,
    });
    flicker();
  }

  // A harmless pterodactyl takes off and flies away, flapping, behind the level.
  takeOff(flyby) {
    flyby.gone = true;
    const { scene } = this;
    const dir = flyby.dir ?? -1;
    const x = flyby.col * TILE + TILE / 2, y = flyby.row * TILE + TILE / 2;
    // The owner's pterodactyl, flapping through its fly frames; without it, the stand-in drawn in code.
    const prefix = PTERO_LOOKS[flyby.look] ?? PTERO_LOOKS.orange;
    const drawn = scene.textures.exists(this.art(`${prefix}-fly-0`));
    const bird = (drawn ? scene.add.image(x, y, this.art(`${prefix}-fly-0`)) : scene.add.image(x, y, makeStandIn(scene), 'up'))
      .setScale(FLYBY.scale).setDepth(FLYBY.depth).setFlipX(dir > 0);
    let frame = 0;
    const flap = scene.time.addEvent({
      delay: FLYBY.flapMs,
      loop: true,
      callback: () => {
        frame += 1;
        if (drawn) bird.setTexture(this.art(`${prefix}-fly-${frame % 6}`));
        else bird.setFrame(frame % 2 ? 'down' : 'up');
      },
    });
    scene.tweens.add({
      targets: bird, x: bird.x + dir * FLYBY.across, y: bird.y - FLYBY.up, duration: FLYBY.ms, ease: 'Sine.easeIn',
      onComplete: () => { flap.remove(); bird.destroy(); },
    });
  }

  // Something in front that fades away completely while the cat is in `box` (px): a secret cave's
  // cover (the scene builds it from the ground's tiles, AdventureScene.buildSecretCovers).
  addCover(parts, box) {
    this.covers.push({ parts, full: 1, seen: 0, box });
  }

  // Each frame: the water flows down, and covers fade while he's behind them.
  update(ms, cat) {
    for (const flow of this.flows) flow.tilePositionY -= (WATERFALL.speed * ms) / 1000;
    for (const flyby of this.flybys) if (!flyby.gone && cat.x >= flyby.wake * TILE) this.takeOff(flyby);
    const { body } = cat;
    for (const cover of this.covers) {
      const { box } = cover;
      const behind = body.right > box.left && body.left < box.right && body.bottom > box.top && body.top < box.bottom;
      const target = behind ? cover.seen ?? COVER.seen : cover.full;
      for (const part of cover.parts) {
        const step = COVER.fadePerMs * ms;
        part.setAlpha(part.alpha + Math.max(-step, Math.min(step, target - part.alpha)));
      }
    }
  }
}
