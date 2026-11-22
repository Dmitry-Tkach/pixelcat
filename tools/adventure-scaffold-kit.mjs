// Cuts a world's wooden scaffold kit (data/adventure/scaffolds.js, SCAFFOLD_KITS) from the owner's
// sheet into public/assets/adventure/<world>, ready for systems/adventure/AdventureScaffolds.js:
// - every piece at the kit's scale, smaller than drawn, with ChatGPT's haze cleared;
// - the beam made to loop side to side, and the post top to bottom (its mossy top cut off: a post
//   runs on under the beam), where each matches itself best;
// - the beam and the ends padded so their deck's top is SCAFFOLD.lip px under their top;
// - the brace cut bigger (braceScale), as it's shown at any size and only ever made smaller.
// Run: node tools/adventure-scaffold-kit.mjs (part of npm run assets).
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCAFFOLD, SCAFFOLD_ART, SCAFFOLD_KITS } from '../src/data/adventure/scaffolds.js';
import { readSheet } from './sheetPieces.mjs';
import { crop, looped, placed, save, scaled, surfaceRow } from './kitPieces.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POST_CAP = 0.1; // the share of the post picture at its top that is its mossy cap, cut off

// A piece padded (or cut) at its top so its deck's top, measured over columns x0..x1, is `lip` down.
const deckAt = (p, x0, x1) => { const s = surfaceRow(p, x0, x1); return placed(p, p.w, p.h - s + SCAFFOLD.lip, 0, SCAFFOLD.lip - s); };

for (const [world, kit] of Object.entries(SCAFFOLD_KITS)) {
  const file = join(ROOT, 'images', 'levels', world, `${kit.sheet}.png`);
  const OUT = join(ROOT, 'public', 'assets', 'adventure', world);
  if (!existsSync(file)) { console.log(`${world}: no ${kit.sheet}.png yet`); continue; }
  mkdirSync(OUT, { recursive: true });
  const drawn = await readSheet(file, kit.pieces);
  const at = (name, k = kit.scale) => scaled(drawn[name], k);
  const out = async (name, p, note = '') => { await save(p, join(OUT, `${name}.png`)); console.log(`${world} ${name}: ${p.w} x ${p.h}${note}`); };

  { // The beam: looped, its deck's top at lip.
    const { piece, how } = looped(await at(SCAFFOLD_ART.beam), true);
    await out(SCAFFOLD_ART.beam, deckAt(piece, 0, piece.w - 1), `, ${how}`);
  }
  // The ends: their deck measured away from the end post (which rises over the deck).
  const left = await at(SCAFFOLD_ART.endLeft), right = await at(SCAFFOLD_ART.endRight);
  await out(SCAFFOLD_ART.endLeft, deckAt(left, Math.round(left.w * 0.35), left.w - 1));
  await out(SCAFFOLD_ART.endRight, deckAt(right, 0, Math.round(right.w * 0.65)));
  { // The post: its mossy cap cut off, looped top to bottom.
    const post = await at(SCAFFOLD_ART.post);
    const cap = Math.round(post.h * POST_CAP);
    const { piece, how } = looped(crop(post, 0, cap, post.w, post.h - cap), false);
    await out(SCAFFOLD_ART.post, piece, `, ${how}`);
  }
  await out(SCAFFOLD_ART.brace, await at(SCAFFOLD_ART.brace, kit.braceScale));
  await out(SCAFFOLD_ART.trough, await at(SCAFFOLD_ART.trough));
}
