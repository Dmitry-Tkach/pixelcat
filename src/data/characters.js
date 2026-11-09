// Character manifests. To swap a character's art, replace its frames in public/assets/sprites
// and update its entry here. Game code only uses the role names (run, catch, lose, ...).
//
// `file` is the frame name prefix, `frames` the frame count. `frameList` plays only those frames.
// `face` is where the face is in the first idle frame, as a square, for the HUD's little portraits.
// Optional hug roles: `hug` plays when they catch the cat, and `hugLoop` follows it, if present.

export const CHARACTERS = {
  // A boss. Boss.js places him by his feet, so he needs no originY.
  crownCat: {
    folder: 'crown-cat',
    scale: 0.72,
    face: { x: 85, y: 2, size: 125 },
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

  // A boss, shown at the size his sheet is drawn. `belowFeet` is the room under his feet in his frames.
  orangeCat: {
    folder: 'orange-cat',
    scale: 1,
    face: { x: 61, y: 10, size: 71 },
    belowFeet: 12,
    anims: {
      idle: { file: 'idle', frames: 4, fps: 6, repeat: -1 },
      run: { file: 'run', frames: 6, fps: 14, repeat: -1 },
      aim: { file: 'shoot', frames: 7, frameList: [1, 2], fps: 6, repeat: 0 },
      fire: { file: 'shoot', frames: 7, frameList: [3, 4, 5, 6, 7], fps: 16, repeat: -1 },
      spray: { file: 'spray', frames: 4, fps: 18, repeat: -1 },
      // Steam rising from his head: the first defeated frame, held while his gun cools.
      overheat: { file: 'defeated', frames: 6, frameList: [1], fps: 1, repeat: 0 },
      hit: { file: 'hit', frames: 3, fps: 8, repeat: 0 },
      rageUp: { file: 'rage', frames: 4, frameList: [1, 2], fps: 6, repeat: -1 },
      rageBlast: { file: 'rage', frames: 4, frameList: [3, 4], fps: 8, repeat: -1 },
      defeated: { file: 'defeated', frames: 6, fps: 8, repeat: 0 },
      crouch: { file: 'jump', frames: 4, frameList: [1], fps: 1, repeat: 0 },
      leap: { file: 'jump', frames: 4, frameList: [2, 3], fps: 6, repeat: 0 },
      land: { file: 'jump', frames: 4, frameList: [4], fps: 1, repeat: 0 },
      slide: { file: 'slide', frames: 4, fps: 14, repeat: -1 },
      dash: { file: 'dash', frames: 3, fps: 14, repeat: -1 },
      charge: { file: 'charge', frames: 4, frameList: [1, 2, 3], fps: 8, repeat: -1 },
      beam: { file: 'charge', frames: 4, frameList: [4], fps: 1, repeat: 0 },
      // The beam's blast at his gun, not him.
      beamBlast: { file: 'beam', frames: 1, fps: 1, repeat: 0 },
    },
  },

  // A boss, cut by tools/cut-boss-rat.mjs from his second, fuller sheet, shown at the size it's drawn.
  bomberRat: {
    folder: 'bomber-rat',
    scale: 1,
    belowFeet: 12,
    face: { x: 49, y: 8, size: 79 },
    anims: {
      idle: { file: 'idle', frames: 8, fps: 8, repeat: -1 },
      run: { file: 'run', frames: 9, fps: 15, repeat: -1 },
      crouch: { file: 'jump', frames: 8, frameList: [1], fps: 1, repeat: 0 },
      hop: { file: 'jump', frames: 8, frameList: [2, 3, 4, 5, 6], fps: 10, repeat: 0 },
      land: { file: 'jump', frames: 8, frameList: [7, 8], fps: 10, repeat: 0 },
      // He picks up a bomb and lifts it, then throws.
      windUp: { file: 'throw', frames: 7, frameList: [1, 2, 3], fps: 6, repeat: 0 },
      throw: { file: 'throw', frames: 7, frameList: [6, 7], fps: 10, repeat: 0 },
      pounceReady: { file: 'lunge', frames: 6, frameList: [1], fps: 1, repeat: 0 },
      // A low dash, with claw slashes.
      pounce: { file: 'lunge', frames: 6, frameList: [2, 3, 4, 5], fps: 12, repeat: -1 },
      pounceEnd: { file: 'lunge', frames: 6, frameList: [6], fps: 1, repeat: 0 },
      // Blue power builds around him, then he hits the ground with it.
      powerUp: { file: 'power', frames: 8, frameList: [1, 2, 3, 4], fps: 8, repeat: 0 },
      powerHit: { file: 'power', frames: 8, frameList: [6, 7, 8], fps: 10, repeat: 0 },
      // He stops to cheer, sure he's won: his weak moment.
      cheer: { file: 'won', frames: 5, fps: 7, repeat: -1 },
      hit: { file: 'defeated', frames: 9, frameList: [1], fps: 1, repeat: 0 },
      defeated: { file: 'defeated', frames: 9, frameList: [2, 3, 4, 5, 6, 7, 8, 9], fps: 8, repeat: 0 },
      // Not him: his bomb, and its explosion.
      bomb: { file: 'bomb', frames: 1, fps: 1, repeat: 0 },
      blast: { file: 'blast', frames: 1, fps: 1, repeat: 0 },
    },
  },

  cat: {
    folder: 'cat',
    // A fifth smaller than at first (0.72). Everything aimed at its height (overhead boards, birds,
    // leaping dogs, the swinging crate, the Gunner's high shots) was lowered to match.
    scale: 0.58,
    face: { x: 50, y: 8, size: 146 },
    anims: {
      idle: { file: 'idle', frames: 10, fps: 12, repeat: -1 },
      run: { file: 'run', frames: 8, fps: 16, repeat: -1 },
      // Skips the first two frames, which look like standing, so a jump shows the moment it starts.
      jump: { file: 'jump', frames: 8, frameList: [3, 4, 5, 6, 7, 8], fps: 16, repeat: 0 },
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

  // The test character for new levels and worlds, tried with ?cat=battle (see data/player.js). Cut by
  // tools/cut-battle-cat.mjs from the user's second sheet, shown at the size it's drawn. The frames he
  // plays as the cat are all one size with his feet on one line, so the hitboxes match the cat's.
  battleCat: {
    folder: 'battle-cat',
    scale: 1,
    face: { x: 38, y: 30, size: 88 },
    anims: {
      idle: { file: 'idle', frames: 6, fps: 8, repeat: -1 },
      run: { file: 'run', frames: 8, fps: 14, repeat: -1 },
      // Skips the crouch before take-off and the landing, so the jump shows the moment it starts.
      jump: { file: 'jump', frames: 9, frameList: [2, 3, 4, 5], fps: 12, repeat: 0 },
      fall: { file: 'jump', frames: 9, frameList: [6], fps: 1, repeat: 0 },
      // From the first pack: the second sheet has no slide.
      slide: { file: 'slide', frames: 6, fps: 14, repeat: -1 },
      hurt: { file: 'hit', frames: 6, fps: 14, repeat: 0 },
      caught: { file: 'defeated', frames: 8, fps: 10, repeat: 0 },
      // Not used yet: moves he could have in the new levels.
      cheer: { file: 'cheer', frames: 7, fps: 10, repeat: -1 },
      attack: { file: 'attack', frames: 7, fps: 14, repeat: 0 },
      power: { file: 'power', frames: 10, fps: 12, repeat: 0 },
      victory: { file: 'victory', frames: 6, fps: 10, repeat: -1 },
    },
    // The same size on screen as the cat's, so levels play the same.
    hitboxes: {
      run: { x: 46, y: 33, w: 58, h: 113 },
      slide: { x: 44, y: 73, w: 64, h: 73 },
    },
  },

  owner: {
    folder: 'owner',
    scale: 1.45,
    face: { x: 48, y: 8, size: 92 },
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
    face: { x: 28, y: 10, size: 78 },
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
    face: { x: 72, y: 4, size: 100 },
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

// The texture key of a character's first idle frame, which their `face` is measured on.
export function idleFrameKey(character) {
  const { file, frameList } = CHARACTERS[character].anims.idle;
  return `${character}-${file}-${frameList?.[0] ?? 1}`;
}
export const frameKey = (character, file, index) => `${character}-${file}-${index}`;
