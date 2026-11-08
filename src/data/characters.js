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

  // A boss. His frames are enlarged when they're prepared (tools/prepare-assets.mjs), so he plays at
  // scale 1. `belowFeet` is the room under his feet in those frames.
  orangeCat: {
    folder: 'orange-cat',
    scale: 1,
    face: { x: 82, y: 14, size: 96 },
    belowFeet: 16,
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

  // A boss, cut by tools/cut-boss-rat.mjs and enlarged when prepared, so he plays at scale 1.
  bomberRat: {
    folder: 'bomber-rat',
    scale: 1,
    belowFeet: 16,
    face: { x: 72, y: 48, size: 60 },
    anims: {
      idle: { file: 'idle', frames: 4, fps: 6, repeat: -1 },
      run: { file: 'run', frames: 6, fps: 14, repeat: -1 },
      crouch: { file: 'jump', frames: 4, frameList: [1], fps: 1, repeat: 0 },
      hop: { file: 'jump', frames: 4, frameList: [2, 3], fps: 6, repeat: 0 },
      land: { file: 'jump', frames: 4, frameList: [4], fps: 1, repeat: 0 },
      windUp: { file: 'throw', frames: 3, frameList: [1, 2], fps: 6, repeat: 0 },
      throw: { file: 'throw', frames: 3, frameList: [3], fps: 1, repeat: 0 },
      pounceReady: { file: 'lunge', frames: 4, frameList: [1], fps: 1, repeat: 0 },
      pounce: { file: 'lunge', frames: 4, frameList: [2, 3], fps: 10, repeat: -1 },
      pounceEnd: { file: 'lunge', frames: 4, frameList: [4], fps: 1, repeat: 0 },
      powerUp: { file: 'power', frames: 4, frameList: [1, 2, 3], fps: 7, repeat: 0 },
      powerHit: { file: 'power', frames: 4, frameList: [3], fps: 1, repeat: 0 },
      // He stops to cheer, sure he's won: his weak moment.
      cheer: { file: 'won', frames: 4, fps: 7, repeat: -1 },
      hit: { file: 'defeated', frames: 5, frameList: [1], fps: 1, repeat: 0 },
      defeated: { file: 'defeated', frames: 5, frameList: [2, 3, 4, 5], fps: 6, repeat: 0 },
      // Not him: his bomb, and its explosion.
      bomb: { file: 'bomb', frames: 1, fps: 1, repeat: 0 },
      blast: { file: 'blast', frames: 1, fps: 1, repeat: 0 },
    },
  },

  cat: {
    folder: 'cat',
    scale: 0.72,
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

  // A possible new look for the player's cat, tried with ?cat=battle (see data/player.js). Cut by
  // tools/cut-battle-cat.mjs and enlarged when prepared, so he plays at scale 1. Every frame is the
  // same size with his feet on the same line, so the hitboxes match the cat's on screen.
  battleCat: {
    folder: 'battle-cat',
    scale: 1,
    face: { x: 96, y: 16, size: 108 },
    anims: {
      idle: { file: 'idle', frames: 6, fps: 8, repeat: -1 },
      run: { file: 'run', frames: 8, fps: 14, repeat: -1 },
      // Skips the crouch before take-off and the landing, so the jump shows the moment it starts.
      jump: { file: 'jump', frames: 7, frameList: [3, 4, 5], fps: 12, repeat: 0 },
      fall: { file: 'jump', frames: 7, frameList: [6], fps: 1, repeat: 0 },
      slide: { file: 'slide', frames: 6, fps: 14, repeat: -1 },
      hurt: { file: 'hit', frames: 4, fps: 10, repeat: 0 },
      caught: { file: 'defeated', frames: 6, fps: 8, repeat: 0 },
      // Not used yet: moves he could have, if he becomes the cat.
      lunge: { file: 'lunge', frames: 7, fps: 15, repeat: 0 },
      punch: { file: 'punch', frames: 6, fps: 15, repeat: 0 },
      power: { file: 'power', frames: 9, fps: 12, repeat: 0 },
      throw: { file: 'throw', frames: 6, fps: 12, repeat: 0 },
      laugh: { file: 'laugh', frames: 5, fps: 8, repeat: -1 },
      happy: { file: 'happy', frames: 5, fps: 8, repeat: -1 },
      victory: { file: 'victory', frames: 7, fps: 10, repeat: 0 },
    },
    // The same size on screen as the cat's, so levels play the same.
    hitboxes: {
      run: { x: 107, y: 38, w: 72, h: 140 },
      slide: { x: 98, y: 88, w: 79, h: 90 },
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
