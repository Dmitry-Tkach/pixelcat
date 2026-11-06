const SWIPE_DISTANCE = 30;
const MOVE_SLOP = 10; // movement smaller than this is finger wobble, not the start of a swipe
const TAP_HOLD_MS = 130; // a press held this long while staying still counts as a jump

// Turns touch, mouse and keyboard input into jump, slide and pause actions.
export class InputController {
  constructor(scene, { onJump, onSlide, onPause, onPaw }) {
    this.scene = scene;
    this.onJump = onJump;
    this.onSlide = onSlide;
    this.press = null;
    this.left = false;
    this.right = false;

    scene.input.on('pointerdown', (pointer, over) => {
      if (over.length > 0) return; // the press landed on a HUD button
      this.press = { id: pointer.id, startY: pointer.y, dy: 0, at: scene.time.now };
    });
    scene.input.on('pointermove', (pointer) => this.readSwipe(pointer));
    scene.input.on('pointerup', (pointer) => {
      if (this.press?.id !== pointer.id) return;
      // A short downward flick that ends before the swipe distance still means slide.
      this.finish(this.press.dy > MOVE_SLOP ? this.onSlide : this.onJump);
    });

    const keyboard = scene.input.keyboard;
    if (keyboard) {
      keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
      for (const key of ['LEFT', 'A']) {
        keyboard.on(`keydown-${key}`, () => { this.left = true; });
        keyboard.on(`keyup-${key}`, () => { this.left = false; });
      }
      for (const key of ['RIGHT', 'D']) {
        keyboard.on(`keydown-${key}`, () => { this.right = true; });
        keyboard.on(`keyup-${key}`, () => { this.right = false; });
      }
      keyboard.on('keydown-SPACE', () => this.onJump());
      keyboard.on('keydown-UP', () => this.onJump());
      keyboard.on('keydown-W', () => this.onJump());
      keyboard.on('keydown-DOWN', () => this.onSlide());
      keyboard.on('keydown-S', () => this.onSlide());
      keyboard.on('keydown-E', () => onPaw());
      keyboard.on('keydown-ESC', () => onPause());
      keyboard.on('keydown-P', () => onPause());
    }
  }

  // -1 for left, 1 for right, and 0 for neither or both.
  get steer() {
    return Number(this.right) - Number(this.left);
  }

  // A key released while the game is paused or out of focus never reports its release.
  releaseSteering() {
    this.left = false;
    this.right = false;
  }

  readSwipe(pointer) {
    if (this.press?.id !== pointer.id) return;
    this.press.dy = pointer.y - this.press.startY;
    if (this.press.dy > SWIPE_DISTANCE) this.finish(this.onSlide);
    else if (this.press.dy < -SWIPE_DISTANCE) this.finish(this.onJump);
  }

  finish(action) {
    this.press = null;
    action();
  }

  // Waiting for release would make every jump feel late, so a brief still hold also jumps.
  // A finger that has started moving is left alone, so slow swipes aren't mistaken for jumps.
  update(time) {
    if (!this.press || Math.abs(this.press.dy) > MOVE_SLOP) return;
    if (time - this.press.at > TAP_HOLD_MS) this.finish(this.onJump);
  }
}
