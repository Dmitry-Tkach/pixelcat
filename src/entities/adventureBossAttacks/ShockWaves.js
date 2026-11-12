// The shock wave of a boss's big smash: a ridge of earth rolling along the floor from where the club
// landed, one each way, until it reaches the arena's wall. The cat jumps over it; touching it hurts.
// The wave is drawn in code, once.
//   speed: px a second. w, h: its hitbox, standing on the floor: low, so a jump clears it.
//   look: its picture's size. dustEveryMs: how often it kicks up dust as it rolls.
const WAVE = { speed: 520, w: 44, h: 46, look: { w: 72, h: 64 }, depth: 6, dustEveryMs: 90, wobbleMs: 120 };
const WAVE_KEY = 'adventure-boss-shockwave';

export class ShockWaves {
  // left, right: the arena's walls, where waves stop. onHit(x): a wave touched the cat, at x.
  constructor(scene, { left, right, onHit }) {
    this.scene = scene;
    this.left = left;
    this.right = right;
    this.onHit = onHit;
    this.waves = [];
    makeWaveTexture(scene);
  }

  // Two waves from x, on the floor at floorY: one rolling each way.
  spawn(x, floorY) {
    for (const dir of [-1, 1]) {
      const sprite = this.scene.add.image(x, floorY, WAVE_KEY).setOrigin(0.5, 1).setDepth(WAVE.depth).setFlipX(dir < 0);
      this.scene.tweens.add({ targets: sprite, scaleY: 0.8, duration: WAVE.wobbleMs, yoyo: true, repeat: -1 });
      this.waves.push({ sprite, dir, x, floorY, dustMs: 0 });
    }
  }

  // Rolls them on, and checks them against the cat's body.
  update(ms, catBody) {
    for (const wave of this.waves.slice()) {
      wave.x += (wave.dir * WAVE.speed * ms) / 1000;
      wave.sprite.setX(wave.x);
      wave.dustMs += ms;
      if (wave.dustMs >= WAVE.dustEveryMs) {
        wave.dustMs = 0;
        this.scene.effects.dust(wave.x, wave.floorY, 2);
      }
      if (wave.x < this.left || wave.x > this.right) {
        this.remove(wave);
        continue;
      }
      const top = wave.floorY - WAVE.h;
      const touches = catBody.right > wave.x - WAVE.w / 2 && catBody.left < wave.x + WAVE.w / 2
        && catBody.bottom > top && catBody.top < wave.floorY;
      if (touches) this.onHit(wave.x);
    }
  }

  remove(wave) {
    this.scene.tweens.killTweensOf(wave.sprite);
    wave.sprite.destroy();
    this.waves.splice(this.waves.indexOf(wave), 1);
  }

  clear() {
    for (const wave of this.waves.slice()) this.remove(wave);
  }
}

// A ridge of earth leaning the way it rolls (right, as drawn): dark soil, lighter on top, with a
// bright crest, and a few clods thrown ahead of it.
function makeWaveTexture(scene) {
  if (scene.textures.exists(WAVE_KEY)) return;
  const { w, h } = WAVE.look;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x5a3a1c, 1).fillEllipse(w * 0.42, h, w * 0.84, h * 1.5);
  g.fillStyle(0x8a5a2b, 1).fillEllipse(w * 0.46, h * 1.02, w * 0.7, h * 1.2);
  g.fillStyle(0xc8904a, 1).fillEllipse(w * 0.52, h * 1.05, w * 0.46, h * 0.9);
  g.fillStyle(0xffe3a0, 0.9).fillEllipse(w * 0.58, h * 0.62, w * 0.18, h * 0.12);
  g.fillStyle(0x5a3a1c, 1).fillCircle(w * 0.86, h * 0.5, 5).fillCircle(w * 0.94, h * 0.72, 4).fillCircle(w * 0.8, h * 0.3, 3);
  g.generateTexture(WAVE_KEY, w, h);
  g.destroy();
}
