// The Grand Dam (level 2, The Hidden Dam; systems/adventure/AdventureDam.js): the owner's stone wall
// with three arched gates (prompts/hidden-dam/03), its wooden doors behind it (04), so its arches
// frame them. A level sets dam: { col, row }: its middle on column col's middle, its foot on row's
// floor. Pulling lever i opens gate i: its door rises and the water pours out of the arch.
//   arches: each arch's opening, as shares of the wall picture's width (left, right) and height
//   (top), measured by tools/adventure-autumn-scenery.mjs. doorGap: where the open door's lower edge
//   is, as a share of its height (the water pours from under it). The door's foot is the wall's.
//   depth: the wall; the doors and the water from them just behind it. All in front of a pool's
//   back water (POOL.back.depth, 1.95), so the dam shows through the risen water's see-through front,
//   and behind the ground's tiles (2), so its ledges are in front of it.
//   width: how wide the wall is shown (px), as in the owner's picture, where it fills its section:
//   smaller than drawn (1536), and sized so its walkway's top (top, a share of its height down from
//   its top) is on a tile row's top when its foot is on another's. doorHeight: its doors, to match
//   (they were cut for a 960 px wall at 381 px).
//   fall: the water from an open gate: its width (px, a little under the arch's), how long it takes
//   to appear (ms), and the door's rise (ms).
const WIDTH = 1376;
export const DAM_ART = {
  wall: 'grand-dam', closed: 'dam-door-closed', open: 'dam-door-open',
  width: WIDTH, doorHeight: Math.round((381 * WIDTH) / 960), top: 28 / 519,
  arches: [{ left: 0.236, right: 0.373, top: 0.355 }, { left: 0.432, right: 0.568, top: 0.355 }, { left: 0.628, right: 0.764, top: 0.355 }],
  doorGap: 148 / 381,
  depth: 1.98,
  fall: { width: Math.round((104 * WIDTH) / 960), appearMs: 700, riseMs: 900 },
};

// Where the dam's pieces go, in px (plain, for tests and the level preview). wall: its picture's
// size { w, h }. Returns the wall's left and top, and each gate's middle x and door top.
export function damLayout({ col, row }, wall, tile) {
  const middle = col * tile + tile / 2, foot = (row + 1) * tile;
  const left = middle - wall.w / 2, top = foot - wall.h;
  return {
    left, top, foot,
    gates: DAM_ART.arches.map((arch) => ({ x: left + ((arch.left + arch.right) / 2) * wall.w, archTop: top + arch.top * wall.h, width: (arch.right - arch.left) * wall.w })),
  };
}
