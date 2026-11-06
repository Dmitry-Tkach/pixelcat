// Character manifests. To swap a character's art, replace its frames in public/assets/sprites
// and update its entry here. Game code only uses the role names (run, catch, lose, ...).
//
// `file` is the frame name prefix, `frames` the frame count. `frameList` plays only those frames.
// Optional hug roles: `hug` plays when they catch the cat, and `hugLoop` follows it, if present.

export const CHARACTERS = {
  // A boss. Boss.js places him by his feet, so he needs no originY.
  crownCat: {
    folder: 'crown-cat',
    scale: 1,
    anims: {
      idle: { file: 'idle', frames: 4, fps: 5, repeat: -1 },
      run: { file: 'run', frames: 8, fps: 16, repeat: -1 },
      crouch: { file: 'crouch', frames: 4, fps: 8, repeat: 0 },
      leap: { file: 'leap', frames: 5, fps: 9, repeat: 0 },
      land: { file: 'land', frames: 4, fps: 10, repeat: 0 },
      clawReady: { file: 'clawready', frames: 4, fps: 8, repeat: 0 },
      claw: { file: 'claw', frames: 7, fps: 16, repeat: 0 },
      hit: { file: 'hit', frames: 9, fps: 12, repeat: 0 },
      dizzy: { file: 'dizzy', frames: 5, fps: 6, repeat: -1 },
    },
  },

  cat: {
    folder: 'cat',
    scale: 0.72,
    anims: {
      idle: { file: 'idle', frames: 10, fps: 12, repeat: -1 },
      run: { file: 'run', frames: 8, fps: 16, repeat: -1 },
      jump: { file: 'jump', frames: 8, fps: 16, repeat: 0 },
      fall: { file: 'fall', frames: 8, fps: 16, repeat: -1 },
      slide: { file: 'slide', frames: 10, fps: 18, repeat: -1 },
      hurt: { file: 'hurt', frames: 10, fps: 24, repeat: 0 },
      caught: { file: 'dead', frames: 10, fps: 14, repeat: 0 },
    },
    // Hitboxes in texture pixels, measured from the frame's top-left corner.
    hitboxes: {
      run: { x: 90, y: 34, w: 100, h: 194 },
      slide: { x: 60, y: 103, w: 110, h: 125 },
    },
  },

  owner: {
    folder: 'owner',
    scale: 1.45,
    originY: 0.97, // the feet sit this far down the frame
    anims: {
      idle: { file: 'idle', frames: 4, fps: 5, repeat: -1 },
      run: { file: 'run', frames: 6, fps: 14, repeat: -1 },
      hop: { file: 'jump', frames: 3, fps: 8, repeat: 0 },
      catch: { file: 'lunge', frames: 1, fps: 1, repeat: 0 },
      stumble: { file: 'hurt', frames: 1, fps: 1, repeat: 0 },
      lose: { file: 'down', frames: 1, fps: 1, repeat: 0 },
      // Optional: she holds the cat in these frames, so the cat sprite is hidden while they play.
      hug: { file: 'hug', frames: 12, fps: 6, repeat: -1, scale: 1.05, originY: 0.985 },
    },
  },

  boy: {
    folder: 'boy',
    scale: 1.4,
    originY: 0.96,
    anims: {
      idle: { file: 'idle', frames: 4, fps: 5, repeat: -1 },
      run: { file: 'run', frames: 6, fps: 16, repeat: -1 },
      hop: { file: 'jump', frames: 3, fps: 8, repeat: 0 },
      catch: { file: 'lunge', frames: 1, fps: 1, repeat: 0 },
      stumble: { file: 'hurt', frames: 1, fps: 1, repeat: 0 },
      lose: { file: 'down', frames: 1, fps: 1, repeat: 0 },
      // Reaches out, catches the cat and hugs it, then keeps cuddling with hearts.
      hug: { file: 'hug', frames: 4, fps: 3, repeat: 0, scale: 0.72, originY: 0.98 },
      hugLoop: { file: 'hug', frames: 4, frameList: [3, 4], fps: 2.5, repeat: -1, scale: 0.72, originY: 0.98 },
    },
  },

  // Her art has running, lunging and hugging frames, so her other poses use a run frame leaned over.
  grandma: {
    folder: 'grandma',
    scale: 0.9,
    originY: 0.985,
    poseAngles: { stumble: -14, lose: 82 },
    poseLifts: { stumble: 14, lose: 34 }, // leaning this far would otherwise put her partly below the road
    waddle: { height: 4, tilt: 1, periodMs: 360 },
    anims: {
      idle: { file: 'run', frames: 6, frameList: [1], fps: 1, repeat: 0 },
      run: { file: 'run', frames: 6, fps: 11, repeat: -1 },
      hop: { file: 'run', frames: 6, frameList: [1], fps: 1, repeat: 0 },
      catch: { file: 'lunge', frames: 4, fps: 12, repeat: -1 },
      stumble: { file: 'run', frames: 6, frameList: [3], fps: 1, repeat: 0 },
      lose: { file: 'run', frames: 6, frameList: [1], fps: 1, repeat: 0 },
      // Lifts the cat up and pulls it in close, then keeps cuddling.
      hug: { file: 'hug', frames: 6, fps: 6, repeat: 0 },
      hugLoop: { file: 'hug', frames: 6, frameList: [5, 6], fps: 2.5, repeat: -1 },
    },
  },

  dog: {
    folder: 'dog',
    anims: {
      run: { file: 'run', frames: 11, fps: 20, repeat: -1 },
      leap: { file: 'leap', frames: 9, fps: 16, repeat: -1 },
    },
  },

  bird: {
    folder: 'bird',
    anims: {
      fly: { file: 'fly', frames: 4, fps: 14, repeat: -1 },
    },
  },

  flock: {
    folder: 'flock',
    anims: {
      fly: { file: 'fly', frames: 4, fps: 14, repeat: -1 },
    },
  },
};

export const animKey = (character, role) => `${character}-${role}`;
export const frameKey = (character, file, index) => `${character}-${file}-${index}`;
