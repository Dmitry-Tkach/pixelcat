import Phaser from 'phaser';
import { VIEW } from '../config/gameConfig.js';
import { animKey, frameKey } from '../data/characters.js';

// The home screen's picture is laid out on a 1280 by 720 stage, then scaled to fill the window.
const STAGE = { w: 1280, h: 720 };
const DEPTH = 30; // over the paused level and its HUD, under the menu
const BATH = { x: 30, y: 300 };
const DUCK = { x: 250, y: 316 };

// Now and then the family chases the cat along the bottom of the screen, from left to right.
// `figure` is each one's height in its run frames, without the space around it, and `bottom` where
// their feet are, so they can all be drawn the same height with their feet on the same line.
const CHASE = {
  feet: 712,
  familyHeight: 150,
  catHeight: 100,
  speed: 340, // stage pixels a second
  gap: 135, // between one runner and the next
  pauseMs: { min: 3500, max: 6000 }, // off screen, before they come round again
  firstDelayMs: 900,
};
const RUNNERS = [
  { character: 'cat', figure: 217, bottom: 230, frameHeight: 237 },
  { character: 'owner', figure: 155, bottom: 173, frameHeight: 180, extraGap: 40 },
  { character: 'boy', figure: 126, bottom: 147, frameHeight: 154 },
  { character: 'grandma', figure: 255, bottom: 258, frameHeight: 262 },
];

// Bath day: a still picture of the bathroom, with the bath run and the door open onto the park.
// Every so often the family chases the cat across the bottom of it.
export function showHomeScreen(scene) {
  const scale = Math.max(VIEW.WIDTH / STAGE.w, VIEW.HEIGHT / STAGE.h);
  const left = VIEW.LEFT_OFFSET;
  const top = VIEW.TOP + (VIEW.HEIGHT - STAGE.h * scale) / 2;
  // Fixed sideways, and following the camera's height like the game's own sky, so it lines up.
  const place = (object, x, y, depth = 0) => object
    .setOrigin(0)
    .setScrollFactor(0, 1)
    .setPosition(left + x * scale, top + y * scale)
    .setScale(scale)
    .setDepth(DEPTH + depth);

  place(scene.add.image(0, 0, 'home-bathroom'), 0, 0);
  place(scene.add.image(0, 0, 'home-bath'), BATH.x, BATH.y, 1);
  place(scene.add.image(0, 0, 'home-duck'), DUCK.x, DUCK.y, 1.1);
  runChase(scene, { scale, left, top });
}

// The cat in front, then the girl, the boy and grandma, all running. They cross the screen, wait off
// to the right a while, and come round again from the left.
function runChase(scene, { scale, left, top }) {
  let x = 0;
  const runners = RUNNERS.map(({ character, figure, bottom, frameHeight, extraGap = 0 }) => {
    const height = character === 'cat' ? CHASE.catHeight : CHASE.familyHeight;
    const sprite = scene.add.sprite(0, 0, frameKey(character, 'run', 1))
      .setOrigin(0.5, bottom / frameHeight)
      .setScrollFactor(0, 1)
      .setScale((height / figure) * scale)
      .setDepth(DEPTH + 2);
    sprite.play(animKey(character, 'run'));
    x -= extraGap;
    const offset = x;
    x -= CHASE.gap;
    return { sprite, offset };
  });
  const tail = -x;
  const y = top + CHASE.feet * scale;
  const width = VIEW.WIDTH / scale; // the stage width the window shows
  const startX = -CHASE.gap;
  const endX = width + tail + CHASE.gap;
  const lap = { x: startX };
  const place = () => {
    for (const { sprite, offset } of runners) sprite.setPosition(left + (lap.x + offset) * scale, y);
  };
  const run = () => {
    lap.x = startX;
    place();
    scene.tweens.add({
      targets: lap,
      x: endX,
      duration: ((endX - startX) / CHASE.speed) * 1000,
      onUpdate: place,
      onComplete: () => scene.time.delayedCall(Phaser.Math.Between(CHASE.pauseMs.min, CHASE.pauseMs.max), run),
    });
  };
  place();
  scene.time.delayedCall(CHASE.firstDelayMs, run);
}
