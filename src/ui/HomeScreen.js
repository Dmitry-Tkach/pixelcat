import { VIEW } from '../config/gameConfig.js';

// The home screen's picture is laid out on a 1280 by 720 stage, then scaled to fill the window.
const STAGE = { w: 1280, h: 720 };
const DEPTH = 30; // over the paused level and its HUD, under the menu
const BATH = { x: 30, y: 300 };
const DUCK = { x: 250, y: 316 };

// Bath day: a still picture of the bathroom, with the bath run and the door open onto the park.
// Nothing in it moves, so the menu's animation is the one thing that does.
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
}
