// The stone brick kit (systems/adventure/brickLayout.js, AdventureBricks.js): the old stone walls
// beside the Grand Dam and the brick pillars standing in the water, as in the owner's level picture.
// Built from pieces the owner drew (prompt hidden-dam/09) the way the rock kit builds cliffs: a
// seamless brick fill, a mossy cap strip along a wall's top, side strips down its open sides, and a
// pillar's own head, trunk (repeated) and wet foot.
//
// A level lists them as masonry: [{ cols: [from, to], rows: [top, bottom], look }] (the map
// builder's wall() and brickPillar() put them on the map): solid ground, drawn as brick instead of earth.
//   look: 'wall' (the default): the fill, its top and open sides; 'pillar': a free-standing pillar,
//     its head at the top (the cat stands on it), its trunk, and its wet foot at the bottom.

// The pictures, by name in the world's art.
export const BRICK_ART = {
  fill: 'brick-fill',
  top: 'brick-top',
  side: 'brick-side',
  sideCap: 'brick-side-cap',
  pillarHead: 'brick-pillar-head',
  pillar: 'brick-pillar',
  pillarFoot: 'brick-pillar-foot',
  ledge: 'brick-ledge',
};

// A world's kit: its sheet, the pieces on it (in rows as found, left to right), and the scale they're
// cut at, so its bricks are the size of the Grand Dam's (data/adventure/dam.js). The pillar is cut at
// its own scale, its trunk pillarWidth px wide: a little wider than its two cells, so it covers them.
export const BRICK_KITS = {
  autumn: {
    sheet: 'stone-brick-kit', scale: 0.42, pillarWidth: 140,
    pieces: [['top'], ['fill'], ['sideA', 'sideB', 'pillar'], ['ledge']],
  },
};

// How the pieces line up. The cutting tool (tools/adventure-brick-kit.mjs) measures each piece and
// pads it so these hold:
//   lip: px from the top of the top strip, of a side's cap and of a pillar's head, down to the
//     wall's surface (moss and plants rise over it);
//   out: px from the outer edge of a side strip to the wall's side line (worn bricks bulge past it).
// fade: px over which a side's cap fades into the side strip under it. pillarHeadRows, pillarFootRows: how
// much of the pillar picture (share of its height) is its head and its wet foot; the rest repeats.
// depth: in front of the ground's tiles (2), as it is ground.
export const BRICK = { lip: 30, out: 10, fade: 28, pillarHead: 0.17, pillarFoot: 0.26, depth: 2.03 };

// Every picture a world's brick kit gives it (for its art list).
export const brickKitArt = (world) => (BRICK_KITS[world] ? Object.values(BRICK_ART) : []);
