// Stand-ins for the forest's gates (data/adventure/gates.js), drawn as SVG, into the wood world's
// art: the round stone start gate and its swirl, the checkpoint's flag pole and its two flags, and
// the portal's arch, swirl and flame post. They're in the art's cartoon style, with a thick dark
// outline. When the owner's gates sheet is there (images/levels/forest/gates.png, from
// prompts/forest-level/08-gates.md), it's cut into these pictures instead (tools/adventure-gates-cut.mjs),
// and what it measures is printed, for the fractions in gates.js.
// Run: node tools/adventure-gates-art.mjs [folder for a review picture] (part of npm run assets).
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';
import { cutGates } from './adventure-gates-cut.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'adventure', 'wood');
const REVIEW = process.argv[2];
const SHEET = join(ROOT, 'images', 'levels', 'forest', 'gates.png');
const OUTLINE = '#1f2a1c';
const STONE = ['#a3ab98', '#8e9886', '#7b8573'];
const MOSS = ['#8fd13a', '#5fae2e'];
const line = `stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round"`;

// A ring of stones round (cx, cy), from radius r1 to r2, in n blocks with mortar gaps, moss on top.
function stoneRing(cx, cy, r1, r2, n) {
  const at = (r, a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  let out = '';
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2 + 0.03, a2 = ((i + 1) / n) * Math.PI * 2 - 0.03;
    out += `<path d="M${at(r1, a1)} L${at(r2, a1)} A${r2} ${r2} 0 0 1 ${at(r2, a2)} L${at(r1, a2)} A${r1} ${r1} 0 0 0 ${at(r1, a1)} Z" fill="${STONE[i % 3]}" ${line}/>`;
  }
  // Moss over the top stones, and a highlight along the inside.
  out += `<path d="M${at(r2 + 2, Math.PI * 1.15)} A${r2 + 2} ${r2 + 2} 0 0 1 ${at(r2 + 2, Math.PI * 1.7)} Q${at((r1 + r2) / 2, Math.PI * 1.55)} ${at((r1 + r2) / 2 + 4, Math.PI * 1.35)} Z" fill="${MOSS[0]}" ${line}/>`;
  out += `<path d="M${at(r2 + 2, Math.PI * 1.75)} A${r2 + 2} ${r2 + 2} 0 0 1 ${at(r2 + 2, Math.PI * 1.95)} Q${at(r1 + 10, Math.PI * 1.88)} ${at(r1 + 12, Math.PI * 1.78)} Z" fill="${MOSS[1]}" ${line}/>`;
  return out;
}

// A swirl of green magic, w across: a glowing disc with spiral arms and a rune in the middle.
function swirl(w, rune) {
  const c = w / 2, r = w / 2 - 2;
  let arms = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 360;
    arms += `<path d="M${c} ${c} Q${c + r * 0.55} ${c - r * 0.15} ${c + r * 0.8} ${c + r * 0.45}" stroke="#d9ffb0" stroke-width="${w / 28}" fill="none" stroke-linecap="round" opacity="0.8" transform="rotate(${a} ${c} ${c})"/>`;
  }
  return `<defs><radialGradient id="g"><stop offset="0" stop-color="#f4ffd8"/><stop offset="0.35" stop-color="#8cf05a"/><stop offset="0.8" stop-color="#2fae5a" stop-opacity="0.85"/><stop offset="1" stop-color="#1d7a4a" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${c}" cy="${c}" r="${r}" fill="url(#g)"/>${arms}
    ${rune ? `<path d="M${c} ${c - r * 0.28} L${c + r * 0.2} ${c} L${c} ${c + r * 0.28} L${c - r * 0.2} ${c} Z M${c} ${c - r * 0.28} L${c} ${c + r * 0.28}" stroke="#ffffff" stroke-width="${w / 40}" fill="none" stroke-linejoin="round"/>` : ''}`;
}

// A stone slab (a base or a step), with a top edge of moss.
const slab = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" ${line}/>`;

const PICTURES = {
  // The start gate: a ring of stones on a stone base. Its hole: middle (100, 115), 116 across.
  'gate-ring': { w: 200, h: 250, svg: `${slab(30, 210, 140, 38, STONE[2])}${slab(50, 190, 100, 26, STONE[1])}${stoneRing(100, 115, 58, 92, 11)}` },
  'gate-swirl': { w: 128, h: 128, svg: swirl(128, true) },
  // The checkpoint: a wooden pole on a stone base; the flags hang from its right side (x 30).
  'flag-pole': {
    w: 60, h: 210, svg: `<rect x="22" y="10" width="9" height="180" rx="3" fill="#9a6a3a" ${line}/>
      <circle cx="26.5" cy="10" r="7" fill="#ffd34a" ${line}/>${slab(4, 180, 52, 28, STONE[1])}`,
  },
  'flag-down': { w: 44, h: 70, svg: `<path d="M2 4 L30 4 Q34 24 28 40 Q24 56 14 66 Q10 48 6 34 Q2 20 2 4 Z" fill="#9aa096" ${line}/><path d="M10 10 Q16 30 14 54" stroke="#7a8076" stroke-width="3" fill="none"/>` },
  'flag-up': {
    w: 96, h: 64, svg: `<path d="M2 4 Q30 -2 52 8 Q74 18 92 10 Q82 30 92 50 Q72 58 52 48 Q30 38 2 46 Z" fill="#e8413a" ${line}/>
      <path d="M8 12 Q30 8 50 16" stroke="#ff8a6a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g fill="#ffd34a" stroke="${OUTLINE}" stroke-width="2"><ellipse cx="46" cy="32" rx="9" ry="7"/><circle cx="36" cy="21" r="4"/><circle cx="44" cy="17" r="4"/><circle cx="53" cy="18" r="4"/><circle cx="59" cy="25" r="4"/></g>`,
  },
  // The portal: a big ring on two pillars, on steps, with a glowing keystone. Hole: (130, 140), 160 across.
  'portal-arch': {
    w: 260, h: 330, svg: `${slab(8, 296, 244, 32, STONE[2])}${slab(28, 270, 204, 30, STONE[1])}
      <rect x="12" y="130" width="40" height="144" rx="4" fill="${STONE[0]}" ${line}/><rect x="208" y="130" width="40" height="144" rx="4" fill="${STONE[0]}" ${line}/>
      <path d="M20 160 L44 160 M20 200 L44 200 M20 240 L44 240 M216 170 L240 170 M216 215 L240 215" stroke="${OUTLINE}" stroke-width="3"/>
      <path d="M12 140 Q4 190 18 230 L30 230 Q20 190 26 150 Z" fill="${MOSS[1]}" ${line}/>
      ${stoneRing(130, 140, 80, 120, 13)}
      <path d="M114 6 L146 6 L140 36 L120 36 Z" fill="${STONE[0]}" ${line}/><path d="M130 12 L136 21 L130 30 L124 21 Z" fill="#9dff6a" stroke="${OUTLINE}" stroke-width="2"/>`,
  },
  'portal-swirl': { w: 160, h: 160, svg: swirl(160, false) },
  // A short stone post with a bowl of green flame on top.
  'portal-post': {
    w: 70, h: 140, svg: `${slab(8, 116, 54, 22, STONE[2])}<rect x="20" y="56" width="30" height="62" rx="3" fill="${STONE[0]}" ${line}/>
      <path d="M8 46 L62 46 Q58 62 35 62 Q12 62 8 46 Z" fill="${STONE[1]}" ${line}/>
      <path d="M35 4 Q50 22 50 34 Q50 46 35 46 Q20 46 20 34 Q20 22 35 4 Z" fill="#5cf08a" ${line}/>
      <path d="M35 18 Q43 30 42 36 Q40 44 35 44 Q30 44 28 36 Q27 30 35 18 Z" fill="#e6ffb0"/>`,
  },
};

mkdirSync(OUT, { recursive: true });
if (existsSync(SHEET)) {
  const measured = await cutGates(SHEET, OUT);
  console.log('The forest\'s gates, cut from the owner\'s sheet into public/assets/adventure/wood. For gates.js:');
  console.log(JSON.stringify(measured));
} else {
  for (const [name, { w, h, svg }] of Object.entries(PICTURES)) {
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`)).png({ compressionLevel: 9 }).toFile(join(OUT, `${name}.png`));
  }
  console.log(`The forest's ${Object.keys(PICTURES).length} gate stand-ins, in public/assets/adventure/wood`);
}

if (REVIEW) {
  mkdirSync(REVIEW, { recursive: true });
  let x = 20;
  const pieces = [];
  for (const name of Object.keys(PICTURES)) {
    const { width: w, height: h } = await sharp(join(OUT, `${name}.png`)).metadata();
    pieces.push({ input: join(OUT, `${name}.png`), left: x, top: 360 - h });
    x += w + 30;
  }
  await sharp({ create: { width: x, height: 380, channels: 3, background: '#4f7f4c' } }).composite(pieces).png().toFile(join(REVIEW, 'gates.png'));
}
