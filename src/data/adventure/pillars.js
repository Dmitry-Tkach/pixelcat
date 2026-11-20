// The earth pillar kit (systems/adventure/pillarLayout.js, drawn by AdventureScenery): the earth
// trunks that hold a level's islands up (its columns), as in the owner's level picture. Each is
// built from three pieces the owner drew (prompt 20): a flared top meeting the island over it, a
// trunk repeated as tall as the pillar is, and a foot spreading on the ground or island under it.
// The tool that cuts them (tools/adventure-pillar-kit.mjs) saves each piece cropped to its drawing,
// so a flare's width is its top's, a foot's its bottom's, and fades their ends into the trunk.

// The pieces, by name in the world's art, and each world's sheet of them (in rows, top to bottom).
export const PILLAR_ART = { top: 'pillar-top', trunk: 'pillar-trunk', foot: 'pillar-foot' };
export const PILLAR_KITS = {
  autumn: { sheet: 'earth-pillar', pieces: [[PILLAR_ART.top], [PILLAR_ART.trunk], [PILLAR_ART.foot]] },
};

// How a pillar is fitted. Each is shown as big as its cells allow (its trunk `bulge` px wider than
// them), but smaller if its flare wouldn't fit under the island over it or its foot on what's under
// it (`margin` px short of either end), or if it's too short for its flare and foot (they may
// overlap by `overlap` of their height). The cut pieces are at the biggest size a pillar can be
// (`cutScale` of drawn, for a trunk 3 cells wide), so in the game they're only ever made smaller.
// fade: px (as cut) over which the flare's and the foot's ends fade into the trunk.
export const PILLAR = { bulge: 24, margin: 24, overlap: 0.25, cutScale: 0.82, fade: 48 };

// Every picture a world's pillar kit gives it (for its art list).
export const pillarKitArt = (world) => (PILLAR_KITS[world] ? Object.values(PILLAR_ART) : []);
