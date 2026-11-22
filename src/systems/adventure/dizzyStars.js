// Stars going round the cat's head as he lies knocked out, when the level is lost (AdventureScene's
// gameOver). Like the troll's when he's dizzy (entities/adventureBossAttacks/charge.js).

// afterMs: when they appear, once he's landed (his defeat's 5 frames at 8 a second).
// head: where his head is in his last defeat frame, facing right, in his frame's pixels: across from
// his middle, and up from his feet (tools/cut-paws-cat.mjs puts his feet on PAWS_FRAME.feet).
// count, rx, ry: how many stars, and how wide and how tall the ring they go round in.
// turnsPerSecond: how fast. scale: the star picture's size. fadeInMs: how quickly they appear.
export const DIZZY_STARS = {
  afterMs: 600, head: { x: -40, up: 80 }, count: 3, rx: 30, ry: 8, turnsPerSecond: 1.1,
  scale: 0.38, fadeInMs: 200, depth: 10,
};

// Puts the stars round the knocked-out cat's head, turning until the scene ends.
export function showDizzyStars(scene, cat, look = DIZZY_STARS) {
  scene.time.delayedCall(look.afterMs, () => {
    const facing = cat.flipX ? -1 : 1;
    const x = cat.x + facing * look.head.x * cat.scaleX;
    const y = cat.body.bottom - look.head.up * cat.scaleY;
    const stars = Array.from({ length: look.count }, () =>
      scene.add.image(x, y, 'star').setScale(look.scale).setDepth(look.depth).setAlpha(0));
    scene.tweens.add({ targets: stars, alpha: 1, duration: look.fadeInMs });
    let ms = 0;
    const turn = (_, delta) => {
      ms += delta;
      const angle = (ms / 1000) * look.turnsPerSecond * Math.PI * 2;
      stars.forEach((star, i) => {
        const a = angle + (i / look.count) * Math.PI * 2;
        star.setPosition(x + Math.cos(a) * look.rx, y + Math.sin(a) * look.ry);
        // The ones at the back of the ring go behind him.
        star.setDepth(Math.sin(a) < 0 ? cat.depth - 1 : look.depth);
      });
    };
    scene.events.on('update', turn);
    scene.events.once('shutdown', () => scene.events.off('update', turn));
  });
}
