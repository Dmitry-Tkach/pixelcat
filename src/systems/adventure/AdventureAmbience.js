import Phaser from 'phaser';

// Draws a world's moving life (data/adventure/ambience.js): fireflies and falling leaves around
// where the camera looks, and the decoration swaying. The particle emitters stay at the world's
// corner and pick each new firefly's or leaf's spot from the camera's view, so once made, they stay
// where they are in the world as the camera moves on.
export class AdventureAmbience {
  // ambience: the world's settings, or undefined for none. decor: the decoration's images, each with
  // `hang` (a vine) set on it.
  constructor(scene, ambience, decor = []) {
    this.scene = scene;
    this.ambience = ambience;
    if (!ambience) return;
    const view = () => scene.cameras.main.worldView;
    // Somewhere in the camera's view (or along its top, for leaves).
    const inView = { getRandomPoint: (p) => { const v = view(); p.x = v.x + Math.random() * v.width; p.y = v.y + Math.random() * v.height; } };
    const alongTop = { getRandomPoint: (p) => { const v = view(); p.x = v.x + Math.random() * v.width * 1.3; p.y = v.y - 30; } };
    const { fireflies, leaves, sway } = ambience;
    if (fireflies) {
      this.fireflies = scene.add.particles(0, 0, 'fx-dot', {
        frequency: fireflies.everyMs, lifespan: { min: fireflies.lifeMs[0], max: fireflies.lifeMs[1] },
        speed: { min: fireflies.drift * 0.3, max: fireflies.drift }, angle: { min: 0, max: 360 },
        scale: { min: fireflies.size[0], max: fireflies.size[1] }, tint: fireflies.colours, blendMode: 'ADD',
        // Fading in, glowing, and fading out, with a little flicker.
        alpha: { onEmit: () => 0, onUpdate: (particle, key, t) => Math.sin(t * Math.PI) * (0.75 + 0.25 * Math.sin(t * 40)) },
        emitZone: { type: 'random', source: inView },
      }).setDepth(fireflies.depth);
    }
    if (leaves) {
      this.leaves = scene.add.particles(0, 0, 'fx-leaf', {
        frequency: leaves.everyMs, lifespan: { min: leaves.lifeMs[0], max: leaves.lifeMs[1] },
        speedY: { min: leaves.fall[0], max: leaves.fall[1] }, speedX: { min: leaves.across[0], max: leaves.across[1] },
        scale: { min: leaves.size[0], max: leaves.size[1] }, tint: leaves.colours, rotate: { start: 0, end: 540 },
        alpha: { onEmit: () => 1, onUpdate: (particle, key, t) => (t > 0.85 ? (1 - t) / 0.15 : 1) },
        emitZone: { type: 'random', source: alongTop },
      }).setDepth(leaves.depth);
    }
    // Each piece of decoration sways at its own pace, from its own starting point.
    this.swaying = sway ? decor.map((image) => ({
      image,
      degrees: image.hang ? sway.vineDegrees : sway.plantDegrees,
      periodMs: Phaser.Math.Between(sway.periodMs[0], sway.periodMs[1]),
      phase: Math.random() * Math.PI * 2,
    })) : [];
  }

  // Each frame: the decoration in view sways (out of view, it's left as it is).
  update(time) {
    const view = this.scene.cameras.main.worldView;
    for (const { image, degrees, periodMs, phase } of this.swaying) {
      if (image.x < view.x - 100 || image.x > view.right + 100 || image.y < view.y - 200 || image.y > view.bottom + 200) continue;
      image.setAngle(degrees * Math.sin((time / periodMs) * Math.PI * 2 + phase));
    }
  }
}
