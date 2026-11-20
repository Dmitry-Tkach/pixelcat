// Each adventure world's backdrop: the pictures behind the level, back to front, each moving at its
// own speed as the camera moves, so the level looks deep; light rays and fog drawn over them; and
// leaves passing in front of the cat. systems/adventure/AdventureBackdrop.js draws it.
//
// layers, back to front:
//   picture: the world's art of that name (data/adventure/index.js lists it, tools prepare it).
//   drift: how far it moves across for each px the camera moves (0 still, 1 with the world).
//   rise: how far it moves up and down for each px the camera climbs or drops, at most ROOM of
//   the screen's height either way. A layer with rise 0 stays put: it's shown exactly as tall as
//   the screen, sitting on its bottom, not stretched (for a picture drawn to sit on the bottom). depth: its order behind the level (tiles are at 2).
//   tint, alpha: optional, to blend a picture into the others (as shadows in the mist).
// rays: soft light rays from above, glowing (added light): their tint, how bright, how long one
//   slow breath takes (they brighten and fade), and how far they sway. Drawn by
//   tools/adventure-backdrop-art.mjs.
// fog: mist drifting low across the screen: its tint, how bright, how tall (a share of the
//   screen), how fast it drifts on its own (px a second), and how much it moves with the camera.
// front: leaves in front of everything but the HUD, at the bottom of the screen, moving faster
//   than the world (drift above 1), so they feel close. null for none yet.
export const BACKDROPS = {
  wood: {
    // The owner's painted layers (images/levels/forest): the sky, its leaves cut off, with its misty
    // trees and ruins (it's the far layer too), and the middle: big trees, ruined arches and two
    // waterfalls. They replaced the pack's flat trees, which stood in as misty shadows.
    layers: [
      { picture: 'layer-sky', drift: 0.08, rise: 0.03, depth: -10 },
      { picture: 'layer-middle', drift: 0.3, rise: 0.07, depth: -9 },
    ],
    // Softer than they'd be alone: the sky has rays painted in.
    rays: { tint: 0xf2ffb8, alpha: 0.18, breatheMs: 5200, swayPx: 18, depth: -7 },
    fog: { tint: 0xd9f6ea, alpha: 0.4, height: 0.3, speed: 14, drift: 0.5, depth: -8 },
    front: null,
  },
  // The Autumn Forest: the owner's painted layers (images/levels/autumn, prompts/autumn-level 01
  // and 02): the golden misty sky with its far trees, and the big orange trees in front of it. Warm
  // rays, softer than alone, as the sky has rays painted in, and peach mist.
  autumn: {
    layers: [
      { picture: 'layer-sky', drift: 0.08, rise: 0.03, depth: -10 },
      { picture: 'layer-middle', drift: 0.3, rise: 0.07, depth: -9 },
    ],
    rays: { tint: 0xffd59a, alpha: 0.14, breatheMs: 5200, swayPx: 18, depth: -7 },
    fog: { tint: 0xffe0c0, alpha: 0.35, height: 0.3, speed: 14, drift: 0.5, depth: -8 },
    front: null,
  },
};

// The share of the screen's height each layer is drawn taller than the screen, so it has room to
// move up and down as the camera climbs, without showing its edge.
export const ROOM = 0.12;

// The FX pictures, drawn by tools/adventure-backdrop-art.mjs, by name.
export const BACKDROP_FX = { rays: 'light-rays', fog: 'fog' };
export const BACKDROP_FX_PATH = 'assets/adventure/fx/backdrop';
export const backdropFxKey = (name) => `adventure-${BACKDROP_FX[name]}`;

// How far a layer moves up or down (px on screen) with the camera this far (px) from where it
// started: against the camera, by `rise` of it, but never more than `room` px either way. Plain
// numbers, so it can be tested.
export function layerRise(climbed, rise, room) {
  return Math.max(-room, Math.min(room, -climbed * rise));
}
