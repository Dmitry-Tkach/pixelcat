import { TILE } from '../adventureMap.js';
import { WATERFALL } from '../../data/adventure/millArt.js';
import { makeStandIn } from '../../entities/AdventureBird.js';
import { PTERO_LOOKS } from '../../data/adventure/birds.js';

// A level's set dressing that isn't on its map (Mill Falls' art, data/adventure/millArt.js):
//   waterfalls: { col, top, bottom, veil }: water pouring from a mossy lip at row `top` down to row
//     `bottom`, in the middle of column col, flowing, with a splash at its foot. Behind the wheels;
//     a veil is thin water in front of the cat instead, hiding what's behind it.
//   props: { picture, col, row, hang, front, back, width, spinMs }: a picture standing on the bottom
//     of its cell (or, hang, hanging from its top), in the middle of column col. front: in front of
//     the cat, as a cover. back: behind the ground, for big scenery (a house, a tree). width: shown
//     this wide (px), if not its own size. spinMs: it turns round its middle, at the middle of its
//     cell, once in this long (a mill's wheel turning as scenery).
//   caves: { cols: [from, to], rows: [from, to] }: the dark inside of a cave in a cliff.
//   flybys: { col, row, wake, dir, look }: a harmless pterodactyl that takes off from (col, row) as
//     the cat passes column `wake`, and flies away up and to `dir` (-1 left, 1 right): birds live
//     here. look: 'orange' or 'green' (data/adventure/birds.js, PTERO_LOOKS).
// A cover (a veil, or a prop in front) fades while the cat is behind it, so he can see himself, and
// whoever looks closely finds what it hides.
const DEPTH = { behind: 1.6, front: 7, cave: 1.55, prop: 2.1, inWater: 1.97 };
const COVER = { alpha: 1, seen: 0.35, fadePerMs: 0.004 }; // seen: its alpha while he's behind it
const VEIL_ALPHA = 0.85;
const CAVE = { colour: 0x0f1a12, alpha: 0.88 };
const FLYBY = { ms: 2600, across: 900, up: 700, scale: 0.85, flapMs: 110, depth: 1.5 }; // behind the level

export class AdventureScenery {
  constructor(scene, level, art) {
    this.scene = scene;
    this.art = art;
    this.flybys = (level.flybys ?? []).map((flyby) => ({ ...flyby, gone: false }));
    this.covers = [];
    this.flows = [];
    const has = (name) => scene.textures.exists(art(name));
    for (const { col, top, bottom, veil } of level.waterfalls ?? []) {
      if (!has('fall-middle')) break;
      const x = col * TILE + TILE / 2, topY = top * TILE, bottomY = bottom * TILE;
      const depth = veil ? DEPTH.front : DEPTH.behind;
      const parts = [];
      const lip = scene.add.image(x, topY, art('fall-top')).setOrigin(0.5, 0).setDepth(depth + 0.01);
      const from = topY + lip.height * 0.8;
      const middle = veil ? 'fall-veil' : 'fall-middle';
      const width = scene.textures.get(art(middle)).getSourceImage().width;
      const flow = scene.add.tileSprite(x, from, width, Math.max(1, bottomY - from), art(middle)).setOrigin(0.5, 0).setDepth(depth);
      const splash = scene.add.image(x, bottomY + 10, art('fall-splash')).setOrigin(0.5, 1).setDepth(depth + 0.02);
      parts.push(lip, flow, splash);
      for (const part of parts) part.setAlpha(veil ? VEIL_ALPHA : WATERFALL.alpha);
      this.flows.push(flow);
      if (veil) this.covers.push({ parts, full: VEIL_ALPHA, box: { left: x - width / 2, right: x + width / 2, top: topY, bottom: bottomY } });
    }
    for (const { cols, rows } of level.caves ?? []) {
      scene.add.rectangle(cols[0] * TILE, rows[0] * TILE, (cols[1] - cols[0] + 1) * TILE, (rows[1] - rows[0] + 1) * TILE, CAVE.colour, CAVE.alpha)
        .setOrigin(0, 0).setDepth(DEPTH.cave);
    }
    for (const { picture, col, row, hang, front, back, inWater, width, spinMs } of level.props ?? []) {
      if (!has(picture)) continue;
      const x = col * TILE + TILE / 2;
      const image = spinMs
        ? scene.add.image(x, row * TILE + TILE / 2, art(picture))
        : scene.add.image(x, hang ? row * TILE : (row + 1) * TILE, art(picture)).setOrigin(0.5, hang ? 0 : 1);
      image.setDepth(front ? DEPTH.front : inWater ? DEPTH.inWater : back ? DEPTH.behind : DEPTH.prop);
      if (width) image.setScale(width / image.width);
      if (spinMs) scene.tweens.add({ targets: image, angle: 360, duration: spinMs, repeat: -1 });
      if (front) {
        const b = image.getBounds();
        this.covers.push({ parts: [image], full: COVER.alpha, box: { left: b.left, right: b.right, top: b.top, bottom: b.bottom } });
      }
    }
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

  // Each frame: the water flows down, and covers fade while he's behind them.
  update(ms, cat) {
    for (const flow of this.flows) flow.tilePositionY -= (WATERFALL.speed * ms) / 1000;
    for (const flyby of this.flybys) if (!flyby.gone && cat.x >= flyby.wake * TILE) this.takeOff(flyby);
    const { body } = cat;
    for (const cover of this.covers) {
      const { box } = cover;
      const behind = body.right > box.left && body.left < box.right && body.bottom > box.top && body.top < box.bottom;
      const target = behind ? COVER.seen : cover.full;
      for (const part of cover.parts) {
        const step = COVER.fadePerMs * ms;
        part.setAlpha(part.alpha + Math.max(-step, Math.min(step, target - part.alpha)));
      }
    }
  }
}
