// The adventure's hero, the grey battle cat, in his two looks: with the minigun (`battleCat`) and
// with bare paws (`battleCatPaws`), as he starts a level. data/characters.js lists them with every
// other character, so they load and play like the rest. Both are cut by tools/cut-battle-cat.mjs.
// The new Adventure Paws cat (`pawsCat`), at the bottom, now starts the levels in his place.
//
// `file` is the frame name prefix, `frames` the frame count. `frameList` plays only those frames.
// `face` is where the face is in the first idle frame, for the HUD's little portrait.

const BATTLE_CAT_LOOKS = {
  // The test character for new levels and worlds, tried with ?cat=battle (see data/player.js). Cut by
  // tools/cut-battle-cat.mjs from the user's second sheet, shown at the size it's drawn. The frames he
  // plays as the cat are all one size with his feet on one line, so the hitboxes match the cat's.
  battleCat: {
    folder: 'battle-cat',
    scale: 1,
    face: { x: 68, y: 40, size: 84 },
    // From his sheet with the minigun (images/sprites/cat-version-2/cat-v-2-sprite.png).
    anims: {
      // Standing with the minigun, redrawn as a slow 8-frame loop.
      idle: { file: 'idle', frames: 8, fps: 6, repeat: -1 },
      // A redrawn 8-frame run, the legs taking turns (see tools/cut-battle-cat.mjs).
      run: { file: 'run', frames: 8, fps: 12, repeat: -1 },
      // Take-off and rising; the last frame, coming down, is the fall.
      jump: { file: 'jump', frames: 4, frameList: [1, 2, 3], fps: 12, repeat: 0 },
      fall: { file: 'jump', frames: 4, frameList: [4], fps: 1, repeat: 0 },
      slide: { file: 'slide', frames: 4, fps: 12, repeat: -1 },
      hurt: { file: 'hit', frames: 3, fps: 10, repeat: 0 },
      caught: { file: 'defeated', frames: 5, fps: 8, repeat: 0 },
      // His sheet has no victory pose, so he stands proud with his minigun.
      victory: { file: 'idle', frames: 8, fps: 6, repeat: -1 },
      // His other moves, for the adventure. The redrawn shoot: frame 1 is him still, 2 the barrel
      // spinning up, 3 to 7 firing, 8 cooling down. A tap plays it once from the spin-up (in the
      // time a tap shows, SHOOT.tapMs in systems/AdventureMoves.js); a burst loops the firing.
      shoot: { file: 'shoot', frames: 8, frameList: [2, 3, 4, 5, 6, 7, 8], fps: 19, repeat: 0 },
      burst: { file: 'shoot', frames: 8, frameList: [3, 4, 5, 6, 7], fps: 16, repeat: -1 },
      rage: { file: 'rage', frames: 4, fps: 10, repeat: -1 },
      dash: { file: 'dash', frames: 4, fps: 14, repeat: 0 },
      // Climbing, seen from behind, the same for both: he puts the minigun away to climb. Holding
      // still on a ladder, he hangs; at the top he pulls himself up and stands.
      climb: { file: 'climb', frames: 6, fps: 10, repeat: -1 },
      climbUp: { file: 'climbup', frames: 4, fps: 8, repeat: 0 },
      climbDown: { file: 'climbdown', frames: 6, fps: 10, repeat: -1 },
      hang: { file: 'hang', frames: 1, fps: 1, repeat: 0 },
      // He charges up, then holds the last frame while the beam the game draws fires (see
      // data/adventure/beams.js). beamFrame: where in the frame list, counting from 1, it fires.
      special: { file: 'special', frames: 4, frameList: [1, 2, 3, 4, 4, 4, 4, 4], fps: 8, repeat: 0, beamFrame: 4 },
      specialEnd: { file: 'specialend', frames: 3, fps: 8, repeat: 0 },
    },
    // The same size on screen as the cat's, so levels play the same. His frames are 236x171, with
    // him in the middle and his feet at 158.
    hitboxes: {
      run: { x: 89, y: 46, w: 58, h: 113 },
      slide: { x: 86, y: 86, w: 64, h: 73 },
    },
  },

  // The battle cat with bare paws, as he starts an adventure level, from
  // images/sprites/cat-version-2/grey_cat_development_assets/source_redrawn_sheet.png. His frames are the same size as his frames
  // with the minigun, with him in the same place, so finding it swaps one for the other mid-run.
  battleCatPaws: {
    folder: 'battle-cat-paws',
    scale: 1,
    face: { x: 68, y: 40, size: 84 },
    anims: {
      idle: { file: 'idle', frames: 4, fps: 8, repeat: -1 },
      run: { file: 'run', frames: 8, fps: 12, repeat: -1 },
      jump: { file: 'jump', frames: 4, frameList: [1, 2, 3], fps: 12, repeat: 0 },
      fall: { file: 'jump', frames: 4, frameList: [4], fps: 1, repeat: 0 },
      slide: { file: 'slide', frames: 4, fps: 12, repeat: -1 },
      hurt: { file: 'hit', frames: 3, fps: 10, repeat: 0 },
      caught: { file: 'defeated', frames: 3, fps: 6, repeat: 0 },
      victory: { file: 'idle', frames: 4, fps: 8, repeat: -1 },
      rage: { file: 'rage', frames: 4, fps: 10, repeat: -1 },
      dash: { file: 'dash', frames: 4, fps: 14, repeat: 0 },
      // Climbing, seen from behind, the same for both: he puts the minigun away to climb. Holding
      // still on a ladder, he hangs; at the top he pulls himself up and stands.
      climb: { file: 'climb', frames: 6, fps: 10, repeat: -1 },
      climbUp: { file: 'climbup', frames: 4, fps: 8, repeat: 0 },
      climbDown: { file: 'climbdown', frames: 6, fps: 10, repeat: -1 },
      hang: { file: 'hang', frames: 1, fps: 1, repeat: 0 },
      special: { file: 'special', frames: 3, frameList: [1, 2, 3, 3, 3, 3, 3, 3], fps: 8, repeat: 0, beamFrame: 3 },
      specialEnd: { file: 'specialend', frames: 3, fps: 8, repeat: 0 },
    },
    hitboxes: {
      run: { x: 89, y: 46, w: 58, h: 113 },
      slide: { x: 86, y: 86, w: 64, h: 73 },
    },
  },
};

// The new cat's frames: the battle cats' frame with PAWS_FRAME.pad rows more on top, as he
// stretches taller when he jumps. tools/cut-paws-cat.mjs cuts his strips to it, at the battle cat's
// height, his feet on row `feet` and his middle on column `middle`. tools/prepare-assets.mjs pads the
// battle cat's frames to it for the moves the new cat hasn't got yet.
export const PAWS_FRAME = { w: 236, h: 235, pad: 64, feet: 224, middle: 117 };

// A battle cat look moved down into the taller frame: the same moves, from `folder`.
function padded(look, folder) {
  const down = ({ x, y, w, h }) => ({ x, y: y + PAWS_FRAME.pad, w, h });
  return {
    ...look,
    folder,
    face: { ...look.face, y: look.face.y + PAWS_FRAME.pad },
    hitboxes: { run: down(look.hitboxes.run), slide: down(look.hitboxes.slide) },
  };
}

const PAWS_CAT_PAWS = padded(BATTLE_CAT_LOOKS.battleCatPaws, 'paws-cat');
// The new cat's claw swipe, in both his looks.
const CLAW_SWIPE = { file: 'swipe', frames: 4, fps: 14, repeat: 0 };

// Every look of the hero, for data/characters.js and the adventure's loading.
export const BATTLE_CATS = {
  ...BATTLE_CAT_LOOKS,

  // The new Adventure Paws cat: the home screen's grey tabby with the red scarf, drawn by the owner
  // with ChatGPT and cut by tools/cut-paws-cat.mjs, at the battle cat's height, with his hitboxes.
  // His own idle, run and jump are in; his other moves are the bare-pawed battle cat's, padded into
  // the same frame, until they're drawn.
  pawsCat: {
    ...PAWS_CAT_PAWS,
    face: { x: 72, y: 30 + PAWS_FRAME.pad, size: 98 },
    anims: {
      ...PAWS_CAT_PAWS.anims,
      idle: { file: 'idle', frames: 6, fps: 7, repeat: -1 },
      run: { file: 'run', frames: 8, fps: 13, repeat: -1 },
      // Pushing off and rising; the last frame, coming down, is the fall. The crouch (frame 1) isn't
      // played: he's already rising the moment the key is pressed, so it would look like a dip.
      jump: { file: 'jump', frames: 4, frameList: [2, 3], fps: 10, repeat: 0 },
      fall: { file: 'jump', frames: 4, frameList: [4], fps: 1, repeat: 0 },
      victory: { file: 'idle', frames: 6, fps: 7, repeat: -1 },
      // Losing a life: he falls back, lands with a bump, and lies knocked out, his eyes swirls.
      caught: { file: 'defeated', frames: 5, fps: 8, repeat: 0 },
      // The magic bolt: he gathers it, thrusts his paws forward, then holds the last frame while the
      // bolt the game draws flies (data/adventure/beams.js).
      special: { file: 'special', frames: 4, frameList: [1, 2, 3, 4, 4, 4, 4, 4], fps: 8, repeat: 0, beamFrame: 4 },
      // His claw swipe, X with bare paws (systems/adventure/clawSwipe.js): played once, quickly.
      swipe: CLAW_SWIPE,
    },
  },

  // With the minigun: the battle cat's armed frames in the new cat's frame, until the new cat's are
  // drawn (if he keeps the minigun).
  // With the minigun out of rounds he swipes too: with his bare-pawed frames for now, the minigun
  // gone for that moment, until he has a swipe drawn with it.
  pawsCatArmed: (() => {
    const look = padded(BATTLE_CAT_LOOKS.battleCat, 'paws-cat-armed');
    return { ...look, anims: { ...look.anims, swipe: CLAW_SWIPE } };
  })(),
};
