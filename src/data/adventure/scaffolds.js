// The wooden scaffold kit (systems/adventure/scaffoldLayout.js, AdventureScaffolds.js): the timber
// walkways on posts round the Hidden Dam's water wheel, as in the owner's level picture. Built from
// pieces the owner drew (prompt hidden-dam/08), the way 2D games build them: a beam repeated as long
// as the walkway, an end cap at each end, posts repeated down to what's under them, and an X brace
// between two posts.
//
// A level lists them as walkways: [{ from, to, row, posts }] (the map builder's walkway() puts
// them on the map): the cat stands on row `row` from column `from` to `to`, one-way as an island
// (he jumps up through it); posts: the columns its posts stand at (its two ends if not given), each
// down to the first ground, island or pool floor under it. Its cells are the map's bridge cells,
// drawn by the kit instead of the bridge tile; a ladder may climb to its deck (its top cell is then
// part of the deck).

// The pictures, by name in the world's art.
export const SCAFFOLD_ART = {
  beam: 'scaffold-beam',
  endLeft: 'scaffold-end-left',
  endRight: 'scaffold-end-right',
  post: 'scaffold-post',
  brace: 'scaffold-brace',
  trough: 'scaffold-trough',
};

// A world's kit: its sheet in images/levels/<world>, its pieces (in rows as found on the sheet,
// left to right), and the scale they're cut at: the beam's deck about a tile thick. The brace is cut
// bigger (braceScale), as it's shown at any size between two posts and must only ever be made smaller.
export const SCAFFOLD_KITS = {
  autumn: {
    sheet: 'wooden-scaffold', scale: 0.5, braceScale: 0.8,
    pieces: [[SCAFFOLD_ART.beam], [SCAFFOLD_ART.endLeft, SCAFFOLD_ART.endRight], [SCAFFOLD_ART.post], [SCAFFOLD_ART.brace, SCAFFOLD_ART.trough]],
  },
};

// How the pieces line up. The cutting tool (tools/adventure-scaffold-kit.mjs) pads the beam and the
// ends so their deck's top is `lip` px under their top (moss rises over it), so the drawing code needs
// no numbers of its own. braceMin, braceMax: the gap between two posts (cells) a brace fits; its
// height is the gap's width, kept inside the posts' height. depth: the beam and ends in front of the
// ground's tiles (2), the posts and braces behind them, so the ground's edge covers their feet.
export const SCAFFOLD = { lip: 14, braceMin: 2, braceMax: 6, depth: { beam: 2.06, ends: 2.07, posts: 1.96, braces: 1.95 } };

// Every picture a world's scaffold kit gives it (for its art list).
export const scaffoldKitArt = (world) => (SCAFFOLD_KITS[world] ? Object.values(SCAFFOLD_ART) : []);
