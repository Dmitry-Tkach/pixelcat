import Phaser from 'phaser';
import { portalPosts } from './gatePlacement.js';

// Builds a world's gates (data/adventure/gates.js) and moves them:
// - the start gate: the cat comes out of its glowing swirl as the level begins;
// - the checkpoints: a flag post whose limp grey flag runs up the pole, red, when he reaches it;
// - the portal: a stone arch round a spinning swirl, with green-flame posts beside it, that draws
//   him in at the end.
// Every picture stands with its bottom at (x, y + sink), y being the top of the ground it stands on.
const POST_SPARKS = { tint: [0x9dff6a, 0x5cf08a, 0xe6ffb0], lifespan: 900, frequency: 140, rise: 70 };
// A locked portal's door (level.portalLocked): it covers the swirl a little past its edge (cover),
// shakes when the cat tries it without the key, and sinks into the ground as the key opens it.
const DOOR = { cover: 1.06, shakePx: 4, openMs: 900, depth: 1.85 };

export class AdventureGates {
  // gates: the world's settings. layout: the level's map (systems/adventureMap.js readAdventureMap).
  constructor(scene, gates, layout) {
    this.scene = scene;
    this.gates = gates;
    this.layout = layout;
    // How visible the cat is as he comes out of the start gate, 0 to 1. The scene sets his alpha
    // every frame (he blinks when hurt), so it multiplies by this rather than being tweened itself.
    this.catAlpha = 1;
  }

  art(name) {
    return this.scene.art(name);
  }

  // A picture standing on the ground at (x, y), shown `height` px tall. Returns it, with its top left.
  stand(name, x, y, height, sink, depth) {
    const image = this.scene.add.image(x, y + sink, this.art(name)).setOrigin(0.5, 1).setDepth(depth);
    image.setScale(height / image.height);
    return image;
  }

  // A swirl filling the hole of a gate picture: hole is its middle and size as fractions.
  swirlIn(frame, name, hole, depth) {
    const w = frame.displayWidth, h = frame.displayHeight;
    const left = frame.x - w / 2, top = frame.y - h;
    const swirl = this.scene.add.image(left + hole.x * w, top + hole.y * h, this.art(name)).setDepth(depth)
      .setBlendMode(Phaser.BlendModes.ADD);
    swirl.setScale((hole.size * w) / swirl.width);
    swirl.baseScale = swirl.scale;
    return swirl;
  }

  spin(swirl, ms) {
    this.scene.tweens.add({ targets: swirl, angle: 360, duration: ms, repeat: -1 });
  }

  // The start gate at (x, y). The cat comes out of it: open() once he's made.
  buildStart(x, y) {
    const s = this.gates.start;
    this.startRing = this.stand(s.ring, x, y, s.height, s.sink, s.depth);
    this.startSwirl = this.swirlIn(this.startRing, s.swirl, s.hole, s.depth - 0.01);
    this.spin(this.startSwirl, s.spinMs);
  }

  // The swirl shines as the cat fades in out of it, then settles to a soft glow.
  open(cat) {
    const s = this.gates.start, swirl = this.startSwirl;
    if (!swirl) return;
    const { tweens } = this.scene;
    swirl.setScale(swirl.baseScale * 1.15);
    tweens.add({ targets: swirl, scale: swirl.baseScale, alpha: s.idleAlpha, delay: s.openMs * 0.4, duration: s.openMs * 0.6, ease: 'Sine.easeOut' });
    this.catAlpha = 0;
    tweens.add({ targets: this, catAlpha: 1, duration: s.catFadeMs });
  }

  // A checkpoint's flag post at (x, y). Returns the zone he touches, with its pictures on it.
  buildCheckpoint(x, y) {
    const c = this.gates.checkpoint;
    const pole = this.stand(c.pole, x, y, c.height, c.sink, c.depth);
    const left = pole.x - pole.displayWidth / 2, top = pole.y - pole.displayHeight;
    const flagX = left + c.flag.x * pole.displayWidth;
    const at = (fraction) => top + fraction * pole.displayHeight;
    const down = this.scene.add.image(flagX, at(c.flag.downY), this.art(c.down)).setOrigin(0, 0).setDepth(c.depth + 0.01).setScale(pole.scale);
    const up = this.scene.add.image(flagX, at(c.flag.downY), this.art(c.up)).setOrigin(0, 0).setDepth(c.depth + 0.01).setScale(pole.scale).setAlpha(0);
    const zone = this.scene.add.zone(x, y - c.hit.h / 2, c.hit.w, c.hit.h);
    this.scene.physics.add.existing(zone, true);
    zone.flags = { down, up, upY: at(c.flag.upY), scale: pole.scale };
    return zone;
  }

  // The flag runs up the pole: the grey one goes, the red one unfurls and keeps waving.
  raise(zone) {
    const c = this.gates.checkpoint;
    const { down, up, upY, scale } = zone.flags;
    const { tweens } = this.scene;
    tweens.add({ targets: down, y: upY, alpha: 0, duration: c.raiseMs, ease: 'Sine.easeIn' });
    up.setScale(scale * 0.2, scale);
    tweens.add({
      targets: up, y: upY, alpha: 1, scaleX: scale, duration: c.raiseMs, ease: 'Back.easeOut',
      onComplete: () => tweens.add({ targets: up, scaleX: scale * 0.88, duration: c.waveMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
    });
  }

  // The portal at (x, y), in cell `cell`: the arch, its swirl, and the flame posts that fit beside it.
  buildPortal(x, y, cell) {
    const p = this.gates.portal;
    const arch = this.stand(p.arch, x, y, p.height, p.sink, p.depth);
    this.portalSwirl = this.swirlIn(arch, p.swirl, p.hole, p.depth - 0.01);
    this.spin(this.portalSwirl, p.spinMs);
    this.scene.tweens.add({ targets: this.portalSwirl, alpha: 0.75, duration: p.pulseMs, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    for (const postX of portalPosts(this.layout, cell, p)) {
      const post = this.stand(p.post, postX, y, p.postHeight, p.sink, p.depth);
      // Green sparks rising from its flame.
      this.scene.add.particles(postX, post.y - post.displayHeight * 0.85, 'fx-dot', {
        lifespan: POST_SPARKS.lifespan, frequency: POST_SPARKS.frequency, speedY: { min: -POST_SPARKS.rise, max: -POST_SPARKS.rise / 2 },
        speedX: { min: -12, max: 12 }, scale: { start: 0.35, end: 0 }, tint: POST_SPARKS.tint, blendMode: 'ADD',
      }).setDepth(p.depth + 0.02);
    }
  }

  // A locked portal: a door over the swirl, until the gold key opens it.
  lockPortal() {
    const swirl = this.portalSwirl;
    if (!swirl) return;
    this.door = this.scene.add.image(swirl.x, swirl.y, this.art('gate-door')).setDepth(DOOR.depth);
    this.door.setScale((swirl.displayWidth * DOOR.cover) / this.door.width);
    this.doorHome = this.door.y;
  }

  // Tried without the key: the door rattles.
  rattleDoor() {
    if (!this.door) return;
    this.scene.tweens.add({ targets: this.door, x: this.door.x + DOOR.shakePx, duration: 50, yoyo: true, repeat: 3 });
  }

  // The key turns: the door sinks down out of sight, fading, and the swirl shines through. opened()
  // is called once it's gone.
  openDoor(opened) {
    const door = this.door;
    if (!door) { opened(); return; }
    this.door = null;
    this.scene.tweens.add({
      targets: door, y: this.doorHome + door.displayHeight, alpha: 0, duration: DOOR.openMs, ease: 'Quad.easeIn',
      onComplete: () => { door.destroy(); opened(); },
    });
  }

  // At the end: the swirl flares and the cat fades into it.
  enter(cat) {
    const p = this.gates.portal, swirl = this.portalSwirl;
    if (!swirl) return;
    const { tweens } = this.scene;
    tweens.add({ targets: swirl, scale: swirl.baseScale * 1.35, duration: p.enterMs, ease: 'Back.easeOut' });
    tweens.add({ targets: cat, alpha: 0, delay: p.enterMs * 0.5, duration: p.enterMs });
  }
}
