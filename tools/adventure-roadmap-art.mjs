// Prepares the adventure's road map (Level Select) from the owner's design, in
// images/Adventure_Vertical_Roadmap_Assets (never changed), into public/assets/ui/adventure-roadmap:
//   map.webp       the vertical map: the eight worlds' islands stacked from the bottom (the first) to
//                  the top (the last), the golden road climbing through them. The website parts
//                  above and below it (logo, menu bar, progress panel) are cut off.
//   backdrop.webp  a small, blurred, darker copy, which the screen stretches behind the map on a
//                  wide window: blurred here once, so the browser never has to blur anything.
// The level buttons are live, drawn over the painted ones (ui/adventureRoadmap.js), at the places
// in ROADMAP_MAP (data/adventure/roadmap.js).
//
// Run: node tools/adventure-roadmap-art.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROADMAP_MAP } from '../src/data/adventure/roadmap.js';

const SOURCE = 'images/Adventure_Vertical_Roadmap_Assets/00_full_references/vertical_roadmap_full_reference.png';
const OUT = 'public/assets/ui/adventure-roadmap';
const QUALITY = 86;
const BACKDROP = { width: 160, blur: 6, brightness: 0.55 };

mkdirSync(OUT, { recursive: true });
const { top, w, h } = ROADMAP_MAP;
const map = await sharp(SOURCE).removeAlpha().extract({ left: 0, top, width: w, height: h }).png().toBuffer();
await sharp(map).webp({ quality: QUALITY }).toFile(join(OUT, 'map.webp'));
await sharp(map).resize({ width: BACKDROP.width }).blur(BACKDROP.blur).modulate({ brightness: BACKDROP.brightness })
  .webp({ quality: QUALITY }).toFile(join(OUT, 'backdrop.webp'));
console.log(`The road map, ${w}x${h}, and its backdrop, in ${OUT}`);
