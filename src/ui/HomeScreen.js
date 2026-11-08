import { VIEW } from '../config/gameConfig.js';
import { CHARACTERS, animKey, frameKey } from '../data/characters.js';

// The home screen's picture is laid out on a 1280 by 720 stage, then scaled to fill the window.
const STAGE = { w: 1280, h: 720 };
const DEPTH = 30; // over the paused level and its HUD, under the menu
const BUBBLE_EVERY_MS = 260;
const BUBBLE_RISE_MS = { min: 2600, max: 4200 };
// Where everyone is, on the stage: the family chasing the cat out of the bathroom, toward the park.
const CAST = [
  { character: 'grandma', role: 'run', x: 150, feet: 668 },
  { character: 'boy', role: 'run', x: 318, feet: 650 },
  { character: 'owner', role: 'catch', x: 470, feet: 658 },
  { character: 'cat', role: 'run', x: 612, feet: 640 },
];
const BATH = { x: 30, y: 300 };
const DUCK = { x: 250, y: 316 };
const CAT_BUBBLES = [[-34, -150, 0.38], [12, -170, 0.3], [40, -128, 0.24]];

// Bath day: the family chases a soapy cat out of the bathroom, toward the park through the open
// door. It stays behind the start menu until the scene restarts.
export function showHomeScreen(scene) {
  const scale = Math.max(VIEW.WIDTH / STAGE.w, VIEW.HEIGHT / STAGE.h);
  const left = VIEW.LEFT_OFFSET;
  const top = VIEW.TOP + (VIEW.HEIGHT - STAGE.h * scale) / 2;
  // Fixed sideways, and following the camera's height like the game's own sky, so it lines up.
  const place = (object, x, y, size = 1, depth = 0) => object
    .setScrollFactor(0, 1)
    .setPosition(left + x * scale, top + y * scale)
    .setScale(size * scale)
    .setDepth(DEPTH + depth);

  place(scene.add.image(0, 0, 'home-bathroom').setOrigin(0), 0, 0);
  for (const { character, role, x, feet } of CAST) {
    const { anims, scale: size, originY = 0.97 } = CHARACTERS[character];
    const { file, frameList } = anims[role];
    const sprite = scene.add.sprite(0, 0, frameKey(character, file, frameList?.[0] ?? 1)).setOrigin(0.5, originY);
    place(sprite, x, feet, size, 2);
    sprite.play(animKey(character, role));
    if (character === 'cat') {
      // Still soapy: a few bubbles ride along on its fur.
      for (const [dx, dy, bubbleSize] of CAT_BUBBLES) {
        const bubble = place(scene.add.image(0, 0, 'home-bubble'), x + dx, feet + dy, bubbleSize, 3);
        scene.tweens.add({ targets: bubble, y: bubble.y - 6 * scale, duration: 300 + Math.abs(dx) * 4, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }
  // The bath stands at the back, behind the chase.
  place(scene.add.image(0, 0, 'home-bath').setOrigin(0), BATH.x, BATH.y, 1, 1);
  const duck = place(scene.add.image(0, 0, 'home-duck'), DUCK.x, DUCK.y, 1, 1.1);
  scene.tweens.add({ targets: duck, y: duck.y - 6 * scale, angle: 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // Bubbles float up from the bath and drift across the room.
  scene.time.addEvent({
    delay: BUBBLE_EVERY_MS,
    loop: true,
    callback: () => {
      const size = 0.25 + Math.random() * 0.55;
      const bubble = place(scene.add.image(0, 0, 'home-bubble'), BATH.x + 40 + Math.random() * 280, BATH.y + 60, size, 4);
      scene.tweens.add({
        targets: bubble,
        x: bubble.x + (80 + Math.random() * 520) * scale,
        y: bubble.y - (220 + Math.random() * 260) * scale,
        alpha: { from: 1, to: 0 },
        duration: BUBBLE_RISE_MS.min + Math.random() * (BUBBLE_RISE_MS.max - BUBBLE_RISE_MS.min),
        ease: 'Sine.easeOut',
        onComplete: () => bubble.destroy(),
      });
    },
  });
}
