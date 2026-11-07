// Draws the bright city street as seamless parallax layers, plus obstacle sprites.
// Run: npm run assets
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'city');
mkdirSync(OUT, { recursive: true });

const TILE = 2048;
const HEIGHT = 720;
const STREET_TOP = 520; // where the buildings meet the sidewalk

// Small seeded generator, so the street looks the same on every run.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function save(name, inner, w = TILE, h = HEIGHT) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  writeFileSync(join(OUT, `${name}.png`), new Resvg(svg).render().asPng());
}

// Splits TILE into widths that sum to it exactly, so the layer repeats without a seam.
function widths(rand, min, max) {
  const out = [];
  let left = TILE;
  while (left > 0) {
    let w = Math.round(min + rand() * (max - min));
    if (left - w < min) w = left;
    out.push(w);
    left -= w;
  }
  return out;
}

// A morning sky, with the sun's glow in the corner the light comes from.
function sky() {
  const inner = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2FA4F2"/><stop offset="0.55" stop-color="#7CCDF8"/><stop offset="1" stop-color="#DDF4FD"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.86" cy="0.12" r="0.5">
      <stop offset="0" stop-color="#FFF7D6" stop-opacity="0.95"/><stop offset="0.12" stop-color="#FFF2B8" stop-opacity="0.7"/>
      <stop offset="0.45" stop-color="#FFE9A8" stop-opacity="0.18"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="1280" height="720" fill="url(#g)"/><rect width="1280" height="720" fill="url(#sun)"/>
    <circle cx="1100" cy="86" r="44" fill="#FFFBE6"/>`;
  save('sky', inner, 1280, 720);
}

function clouds() {
  const rand = rng(7);
  let inner = '';
  for (let i = 0; i < 8; i++) {
    // Kept clear of the image's edges, so no cloud is cut off where the layer repeats.
    const x = 120 + i * 230 + rand() * 60;
    const y = 90 + rand() * 150;
    const s = 0.7 + rand() * 0.8;
    // A pale blue underside under the white, so each cloud looks round.
    const puff = (dy) => `<circle cx="0" cy="${20 + dy}" r="34"/><circle cx="44" cy="${dy}" r="46"/><circle cx="96" cy="${16 + dy}" r="38"/><circle cx="138" cy="${28 + dy}" r="26"/>
      <rect x="-34" y="${24 + dy}" width="198" height="30" rx="15"/>`;
    inner += `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.94">
      <g fill="#CFE6F7">${puff(6)}</g><g fill="#FFFFFF">${puff(0)}</g>
      <ellipse cx="40" cy="-14" rx="26" ry="12" fill="#FFFFFF"/></g>`;
  }
  save('clouds', inner, TILE, 320);
}

// Distant buildings, pale like anything far away, with a haze rising from the street.
function farCity() {
  const rand = rng(21);
  let x = 0;
  let inner = `<defs><linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#DDF4FD" stop-opacity="0"/><stop offset="1" stop-color="#EAF8FE" stop-opacity="0.85"/>
    </linearGradient></defs>`;
  for (const w of widths(rand, 90, 190)) {
    const h = 260 + rand() * 230;
    const fill = rand() > 0.5 ? '#A8DBF3' : '#BDE4F6';
    const top = STREET_TOP - h;
    inner += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${fill}"/>
      <rect x="${x}" y="${top}" width="${w}" height="6" fill="#CDEBF8"/>`;
    // Now and then something on the roof: an antenna or a water tower.
    const roof = rand();
    if (roof < 0.25) {
      inner += `<rect x="${x + w * 0.6}" y="${top - 46}" width="4" height="46" fill="${fill}"/><rect x="${x + w * 0.6 - 10}" y="${top - 34}" width="24" height="3" fill="${fill}"/>`;
    } else if (roof < 0.45) {
      inner += `<rect x="${x + w * 0.25}" y="${top - 34}" width="34" height="26" rx="4" fill="${fill}"/><rect x="${x + w * 0.25 + 4}" y="${top - 8}" width="4" height="8" fill="${fill}"/><rect x="${x + w * 0.25 + 26}" y="${top - 8}" width="4" height="8" fill="${fill}"/>`;
    }
    for (let wy = top + 22; wy < STREET_TOP - 30; wy += 38) {
      for (let wx = x + 16; wx < x + w - 24; wx += 34) {
        inner += `<rect x="${wx}" y="${wy}" width="16" height="20" rx="2" fill="#D7F0FA"/>`;
      }
    }
    x += w;
  }
  inner += `<rect y="${STREET_TOP - 260}" width="${TILE}" height="260" fill="url(#haze)"/>`;
  save('far', inner, TILE, STREET_TOP);
}

const WALLS = [
  ['#F9B27C', '#E8955C'], ['#F58FAB', '#DD6E8E'], ['#7ED9B6', '#57BE98'],
  ['#FFD568', '#EDB83F'], ['#F47F5D', '#D9633F'], ['#B79CEB', '#9A7DD6'],
  ['#FBEBD3', '#E8D2B1'],
];
const STRIPES = ['#E8456E', '#2F9EDF', '#FF8A1E', '#22A67E', '#8B5CF6'];

function building(rand, x, w, wallIndex) {
  const [wall, shade] = WALLS[wallIndex % WALLS.length];
  const h = 250 + Math.floor(rand() * 4) * 55;
  const top = STREET_TOP - h;
  const stripe = STRIPES[Math.floor(rand() * STRIPES.length)];
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${wall}"/>
    <rect x="${x + w - 16}" y="${top}" width="16" height="${h}" fill="${shade}"/>
    <rect x="${x - 6}" y="${top - 16}" width="${w + 12}" height="20" rx="4" fill="${shade}"/>
    <rect x="${x - 6}" y="${top - 16}" width="${w + 12}" height="5" rx="2.5" fill="#FFFFFF" opacity="0.45"/>
    <rect x="${x}" y="${top + 4}" width="${w}" height="10" fill="#000000" opacity="0.08"/>`;
  // Something on the roof: a chimney, an air conditioner or a little garden.
  const roof = rand();
  if (roof < 0.3) {
    s += `<rect x="${x + 24}" y="${top - 52}" width="26" height="38" fill="${shade}"/><rect x="${x + 20}" y="${top - 58}" width="34" height="9" rx="3" fill="#3F4C73"/>`;
  } else if (roof < 0.6) {
    s += `<rect x="${x + w - 92}" y="${top - 44}" width="54" height="30" rx="4" fill="#DCE3F0"/><rect x="${x + w - 92}" y="${top - 44}" width="54" height="6" rx="3" fill="#FFFFFF"/>
      <circle cx="${x + w - 65}" cy="${top - 27}" r="9" fill="#AEB8CE"/>`;
  } else if (roof < 0.8) {
    for (let i = 0; i < 3; i++) s += `<circle cx="${x + 30 + i * 26}" cy="${top - 26}" r="15" fill="${i % 2 ? '#3CC46E' : '#57CF62'}"/>`;
  }

  // Upper-floor windows.
  const shopTop = STREET_TOP - 118;
  const cols = Math.max(2, Math.floor((w - 40) / 72));
  const gap = (w - 16 - cols * 48) / (cols + 1);
  for (let wy = top + 26; wy + 74 < shopTop; wy += 92) {
    for (let c = 0; c < cols; c++) {
      const wx = x + gap + c * (48 + gap);
      s += `<rect x="${wx - 5}" y="${wy - 5}" width="58" height="76" rx="5" fill="#FFFFFF"/>
        <rect x="${wx}" y="${wy}" width="48" height="66" rx="3" fill="#39A6DE"/>
        <path d="M${wx} ${wy + 40} L${wx + 34} ${wy} L${wx + 48} ${wy} L${wx} ${wy + 58} Z" fill="#7FD0F2"/>
        <rect x="${wx + 21}" y="${wy}" width="5" height="66" fill="#FFFFFF"/>
        <rect x="${wx - 8}" y="${wy + 70}" width="64" height="8" rx="3" fill="${shade}"/>
        <rect x="${wx - 8}" y="${wy + 70}" width="64" height="2.5" rx="1" fill="#FFFFFF" opacity="0.5"/>`;
      // A few windows have a box of flowers.
      if (rand() < 0.22) {
        s += `<rect x="${wx - 2}" y="${wy + 56}" width="52" height="14" rx="3" fill="#9B5F33"/>`;
        for (let f = 0; f < 4; f++) s += `<circle cx="${wx + 6 + f * 12}" cy="${wy + 54}" r="6" fill="${['#FF6B8A', '#FFD568', '#FFFFFF', '#FF8A1E'][f]}"/>`;
      }
    }
  }

  // Ground-floor shop with a striped awning.
  const doorX = x + w - 76;
  s += `<rect x="${x + 16}" y="${STREET_TOP - 92}" width="${w - 112}" height="72" rx="4" fill="#BFE9FA"/>
    <path d="M${x + 22} ${STREET_TOP - 30} L${x + 66} ${STREET_TOP - 88} L${x + 96} ${STREET_TOP - 88} L${x + 52} ${STREET_TOP - 30} Z" fill="#E4F7FE"/>
    <rect x="${doorX}" y="${STREET_TOP - 92}" width="46" height="92" rx="4" fill="${stripe}"/>
    <rect x="${doorX + 8}" y="${STREET_TOP - 84}" width="30" height="40" rx="3" fill="#BFE9FA"/>
    <circle cx="${doorX + 37}" cy="${STREET_TOP - 34}" r="4" fill="#FFD568"/>`;
  const awningY = STREET_TOP - 120;
  const stripeW = 24;
  for (let i = 0; i * stripeW < w - 16; i++) {
    const sx = x + i * stripeW;
    const sw = Math.min(stripeW, w - 16 - i * stripeW);
    const color = i % 2 ? '#FFFFFF' : stripe;
    s += `<path d="M${sx} ${awningY} h${sw} v30 a${sw / 2} 9 0 0 1 ${-sw} 0 Z" fill="${color}"/>`;
  }
  // The awning's shadow on the shop window, and the building's shadow where it meets the street.
  s += `<rect x="${x}" y="${awningY + 34}" width="${w - 16}" height="14" fill="#000000" opacity="0.12"/>
    <rect x="${x}" y="${awningY}" width="${w - 16}" height="4" fill="#000000" opacity="0.15"/>
    <rect x="${x}" y="${STREET_TOP - 10}" width="${w}" height="10" fill="#000000" opacity="0.1"/>`;
  return s;
}

function tree(x, rand) {
  const h = 110 + rand() * 40;
  const base = STREET_TOP + 8;
  const green = rand() > 0.5 ? ['#3CC46E', '#25A358', '#7BE39A'] : ['#57CF62', '#35AE4B', '#9CEB8F'];
  return `<rect x="${x - 9}" y="${base - h}" width="18" height="${h}" rx="6" fill="#9B5F33"/>
    <rect x="${x + 1}" y="${base - h}" width="8" height="${h}" rx="4" fill="#7E4A25"/>
    <ellipse cx="${x}" cy="${base - h - 42}" rx="66" ry="74" fill="${green[1]}"/>
    <ellipse cx="${x - 7}" cy="${base - h - 50}" rx="58" ry="64" fill="${green[0]}"/>
    <ellipse cx="${x - 24}" cy="${base - h - 76}" rx="22" ry="17" fill="${green[2]}"/>`;
}

function lamp(x) {
  const base = STREET_TOP + 8;
  return `<rect x="${x - 5}" y="${base - 190}" width="10" height="190" rx="4" fill="#3F4C73"/>
    <rect x="${x - 12}" y="${base - 14}" width="24" height="14" rx="4" fill="#2C3657"/>
    <rect x="${x - 15}" y="${base - 228}" width="30" height="40" rx="9" fill="#FFE27A"/>
    <rect x="${x - 19}" y="${base - 236}" width="38" height="11" rx="5" fill="#3F4C73"/>`;
}

function nearCity() {
  const rand = rng(1234);
  let x = 0;
  let inner = '';
  widths(rand, 210, 330).forEach((w, i) => {
    inner += building(rand, x, w, i);
    x += w;
  });
  for (let tx = 150; tx < TILE - 60; tx += 340) inner += tree(tx, rand);
  for (let lx = 320; lx < TILE - 60; lx += 680) inner += lamp(lx);
  save('near', inner, TILE, STREET_TOP + 20);
}

// Paving slabs, a bevelled kerb and a textured road. The cats and chasers run on the road.
function street() {
  const rand = rng(99);
  const SLAB = 128;
  const ROWS = [STREET_TOP + 8, STREET_TOP + 39];
  let inner = `<defs><linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3D3873"/><stop offset="0.45" stop-color="#4A4585"/><stop offset="1" stop-color="#3F3A78"/>
    </linearGradient></defs>
    <rect y="${STREET_TOP}" width="${TILE}" height="70" fill="#E3D8EF"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="8" fill="#C9BCDD"/>`;
  // Two rows of slabs, offset like real paving, each with a lit top edge and a shaded bottom one.
  ROWS.forEach((rowY, row) => {
    const offset = row ? SLAB / 2 : 0;
    for (let x = -offset; x < TILE; x += SLAB) {
      const tint = rand() < 0.3 ? '#DDD0EA' : '#E6DCF1';
      inner += `<rect x="${x + 2}" y="${rowY + 1}" width="${SLAB - 4}" height="29" rx="3" fill="${tint}"/>
        <rect x="${x + 2}" y="${rowY + 1}" width="${SLAB - 4}" height="3" rx="1.5" fill="#F7F2FC"/>
        <rect x="${x + 2}" y="${rowY + 27}" width="${SLAB - 4}" height="3" rx="1.5" fill="#C9BCDD"/>`;
      if (rand() < 0.12) inner += `<path d="M${x + 30 + rand() * 50} ${rowY + 8} l10 7 l-4 6 l9 6" stroke="#C9BCDD" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
  });
  // Weeds in a few cracks between slabs.
  for (let x = 90; x < TILE; x += 300 + Math.floor(rand() * 200)) {
    const y = ROWS[1];
    inner += `<path d="M${x} ${y + 2} q-3 -10 -8 -14 M${x} ${y + 2} q1 -12 4 -16 M${x} ${y + 2} q5 -8 10 -10" stroke="#4FB960" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  // The kerb: a bright top, its painted face, then the shadow it throws on the road.
  inner += `<rect y="${STREET_TOP + 70}" width="${TILE}" height="14" fill="#FFFFFF"/>
    <rect y="${STREET_TOP + 70}" width="${TILE}" height="4" fill="#FFFFFF"/>
    <rect y="${STREET_TOP + 80}" width="${TILE}" height="4" fill="#E9E4F2"/>
    <rect y="${STREET_TOP + 84}" width="${TILE}" height="9" fill="#FF8A1E"/>
    <rect y="${STREET_TOP + 84}" width="${TILE}" height="2" fill="#FFB061"/>
    <rect y="${STREET_TOP + 93}" width="${TILE}" height="${HEIGHT - STREET_TOP - 93}" fill="url(#road)"/>
    <rect y="${STREET_TOP + 93}" width="${TILE}" height="16" fill="#2E2A5E" opacity="0.75"/>
    <rect y="${STREET_TOP + 109}" width="${TILE}" height="6" fill="#2E2A5E" opacity="0.3"/>`;
  // Asphalt grain.
  for (let i = 0; i < 900; i++) {
    const gx = rand() * TILE;
    const gy = STREET_TOP + 100 + rand() * (HEIGHT - STREET_TOP - 104);
    inner += `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${(2 + rand() * 3).toFixed(1)}" height="2" rx="1" fill="${rand() < 0.5 ? '#5A5596' : '#332F68'}" opacity="0.7"/>`;
  }
  // Lane markings, slightly worn, with a shadow line under each.
  for (let x = 40; x < TILE; x += 256) {
    inner += `<rect x="${x}" y="684" width="136" height="12" rx="6" fill="#28245A" opacity="0.5"/>
      <rect x="${x}" y="682" width="136" height="12" rx="6" fill="#FFFFFF"/>
      <rect x="${x + 6}" y="683" width="124" height="3" rx="1.5" fill="#FFFFFF" opacity="0.9"/>
      <rect x="${x + 30 + rand() * 60}" y="686" width="${10 + rand() * 18}" height="6" rx="3" fill="#D9D4EC"/>`;
  }
  save('street', `<g transform="translate(0 -${STREET_TOP})">${inner}</g>`, TILE, HEIGHT - STREET_TOP);
}

function obstacles() {
  save('cone', `
    <rect x="8" y="96" width="84" height="16" rx="6" fill="#D9531E"/>
    <path d="M38 6 C42 0 58 0 62 6 L84 98 L16 98 Z" fill="#FF8A1E"/>
    <path d="M30 40 L70 40 L76 66 L24 66 Z" fill="#FFFFFF"/>
    <path d="M62 6 L84 98 L68 98 L52 2 Z" fill="#000000" opacity="0.1"/>`, 100, 116);
  save('bin', `
    <path d="M12 26 L88 26 L80 128 L20 128 Z" fill="#22A67E"/>
    <path d="M70 26 L88 26 L80 128 L66 128 Z" fill="#17835F"/>
    <rect x="4" y="12" width="92" height="18" rx="7" fill="#17835F"/>
    <rect x="38" y="2" width="24" height="12" rx="5" fill="#17835F"/>
    <path d="M34 42 L38 114 M50 42 L50 114 M66 42 L62 114" stroke="#17835F" stroke-width="6" stroke-linecap="round" fill="none"/>`, 100, 130);
  save('boxes', `
    <rect x="4" y="50" width="86" height="72" rx="3" fill="#D9A066"/>
    <rect x="4" y="50" width="86" height="14" fill="#C4874B"/>
    <rect x="40" y="50" width="14" height="72" fill="#F0CC96"/>
    <rect x="58" y="4" width="66" height="50" rx="3" fill="#E3B27A"/>
    <rect x="84" y="4" width="13" height="50" fill="#F5D8A8"/>
    <rect x="92" y="60" width="50" height="62" rx="3" fill="#C98F54"/>
    <rect x="92" y="60" width="50" height="12" fill="#AE7A42"/>`, 146, 124);

  // A low scaffold board: its bottom edge sits 128px above the ground, so the cat slides under.
  let stripes = '';
  for (let x = -50; x < 170; x += 44) {
    stripes += `<path d="M${x} 162 L${x + 56} 48 L${x + 78} 48 L${x + 22} 162 Z" fill="#23264A"/>`;
  }
  save('scaffold', `
    <defs><clipPath id="board"><rect x="6" y="48" width="158" height="114" rx="8"/></clipPath></defs>
    <rect x="14" y="10" width="14" height="280" rx="4" fill="#59648F"/>
    <rect x="142" y="10" width="14" height="280" rx="4" fill="#59648F"/>
    <rect x="6" y="48" width="158" height="114" rx="8" fill="#FFC531"/>
    <g clip-path="url(#board)">${stripes}</g>
    <rect x="6" y="48" width="158" height="114" rx="8" fill="none" stroke="#23264A" stroke-width="6"/>
    <path d="M68 176 L85 196 L102 176 M68 198 L85 218 L102 198" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 176 L85 196 L102 176 M68 198 L85 218 L102 198" fill="none" stroke="#E8456E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`, 170, 290);

  save('hydrant', `
    <rect x="6" y="84" width="58" height="16" rx="5" fill="#A61E2E"/>
    <rect x="16" y="26" width="38" height="62" rx="6" fill="#E8344A"/>
    <rect x="42" y="26" width="12" height="62" fill="#B8253A"/>
    <rect x="2" y="44" width="16" height="20" rx="5" fill="#C42A3E"/>
    <rect x="52" y="44" width="16" height="20" rx="5" fill="#A61E2E"/>
    <path d="M14 28 C14 6 56 6 56 28 Z" fill="#F0556A"/>
    <rect x="29" y="2" width="12" height="12" rx="4" fill="#C42A3E"/>
    <circle cx="35" cy="55" r="7" fill="#FFD568"/>`, 70, 100);

  save('bench', `
    <rect x="14" y="58" width="12" height="32" rx="3" fill="#3F4C73"/>
    <rect x="124" y="58" width="12" height="32" rx="3" fill="#3F4C73"/>
    <rect x="18" y="8" width="10" height="46" rx="3" fill="#3F4C73"/>
    <rect x="122" y="8" width="10" height="46" rx="3" fill="#3F4C73"/>
    <rect x="6" y="10" width="138" height="12" rx="4" fill="#C98F54"/>
    <rect x="6" y="28" width="138" height="12" rx="4" fill="#B57C43"/>
    <rect x="2" y="50" width="146" height="14" rx="4" fill="#D9A066"/>`, 150, 90);

  let barrierStripes = '';
  for (let x = -16; x < 130; x += 34) {
    barrierStripes += `<path d="M${x} 44 L${x + 18} 8 L${x + 34} 8 L${x + 16} 44 Z" fill="#E8456E"/>`;
  }
  save('barrier', `
    <defs><clipPath id="rail"><rect x="4" y="8" width="122" height="36" rx="6"/></clipPath></defs>
    <path d="M22 44 L8 96 L20 96 L32 44 Z" fill="#59648F"/>
    <path d="M108 44 L122 96 L110 96 L98 44 Z" fill="#59648F"/>
    <rect x="22" y="66" width="86" height="8" rx="3" fill="#59648F"/>
    <rect x="4" y="8" width="122" height="36" rx="6" fill="#FFFFFF"/>
    <g clip-path="url(#rail)">${barrierStripes}</g>`, 130, 96);

  // A shop banner between two poles. Like the scaffold, its lower edge is 128px above the ground.
  let bunting = '';
  for (let x = 16; x < 150; x += 28) {
    bunting += `<path d="M${x} 112 L${x + 28} 112 L${x + 14} 162 Z" fill="${(x - 16) / 28 % 2 ? '#FFC531' : '#2F9EDF'}"/>`;
  }
  save('banner', `
    <rect x="10" y="10" width="12" height="280" rx="4" fill="#59648F"/>
    <rect x="148" y="10" width="12" height="280" rx="4" fill="#59648F"/>
    <rect x="14" y="44" width="142" height="70" rx="5" fill="#E8456E"/>
    <rect x="14" y="44" width="142" height="12" fill="#C72F58"/>
    ${bunting}
    <g transform="translate(85 84)" fill="#FFFFFF">
      <ellipse cx="0" cy="7" rx="13" ry="10"/>
      <circle cx="-13" cy="-6" r="5"/><circle cx="-5" cy="-13" r="5"/>
      <circle cx="5" cy="-13" r="5"/><circle cx="13" cy="-6" r="5"/>
    </g>
    <path d="M68 180 L85 200 L102 180 M68 202 L85 222 L102 202" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 180 L85 200 L102 180 M68 202 L85 222 L102 202" fill="none" stroke="#E8456E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`, 170, 290);

  // Warning icons for moving obstacles: they show the move that avoids the obstacle.
  const warning = (chevrons) => `
    <circle cx="44" cy="44" r="38" fill="#F0455F" stroke="#FFFFFF" stroke-width="7"/>
    <path d="${chevrons}" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  save('warn-jump', warning('M26 44 L44 26 L62 44 M26 66 L44 48 L62 66'), 88, 88);
  save('warn-slide', warning('M26 22 L44 40 L62 22 M26 44 L44 62 L62 44'), 88, 88);
  save('warn-stay', warning('M24 44 H64'), 88, 88);

  // A delivery van, too tall for one jump, with a flat roof to land on.
  save('van', `
    <rect x="6" y="28" width="250" height="232" rx="10" fill="#FFFFFF"/>
    <rect x="6" y="28" width="250" height="16" rx="6" fill="#D5DCE8"/>
    <rect x="6" y="146" width="250" height="24" fill="#2F9EDF"/>
    <g transform="translate(112 96)" fill="#2F9EDF">
      <ellipse cx="0" cy="12" rx="24" ry="19"/>
      <circle cx="-24" cy="-12" r="9.5"/><circle cx="-9" cy="-25" r="9.5"/>
      <circle cx="9" cy="-25" r="9.5"/><circle cx="24" cy="-12" r="9.5"/>
    </g>
    <path d="M256 84 H292 C312 84 326 118 332 156 L334 260 H256 Z" fill="#F4F6FB"/>
    <path d="M268 100 H290 C304 100 314 126 318 152 H268 Z" fill="#7FD0F2"/>
    <rect x="272" y="176" width="24" height="8" rx="3" fill="#59648F"/>
    <rect x="2" y="246" width="334" height="22" rx="6" fill="#3F4C73"/>
    <circle cx="74" cy="266" r="34" fill="#23264A"/><circle cx="74" cy="266" r="15" fill="#C7CFDF"/>
    <circle cx="272" cy="266" r="34" fill="#23264A"/><circle cx="272" cy="266" r="15" fill="#C7CFDF"/>`, 340, 300);

  save('pot', `
    <path d="M16 38 C6 14 24 2 34 18 C40 0 62 4 54 38 Z" fill="#37C871"/>
    <circle cx="36" cy="16" r="9" fill="#F58FAB"/><circle cx="36" cy="16" r="4" fill="#FFD568"/>
    <rect x="8" y="34" width="54" height="12" rx="3" fill="#C9552F"/>
    <path d="M12 46 H58 L52 84 H18 Z" fill="#E36B3F"/>`, 70, 84);

  save('pot-broken', `
    <path d="M12 44 C18 22 70 22 78 44 Z" fill="#6E4A2A"/>
    <path d="M2 44 L10 22 L28 30 L24 44 Z" fill="#E36B3F"/>
    <path d="M60 44 L66 18 L86 28 L88 44 Z" fill="#C9552F"/>
    <path d="M34 26 C30 8 46 4 46 22 Z" fill="#37C871"/>
    <circle cx="45" cy="10" r="7" fill="#F58FAB"/>`, 90, 44);

  save('crate', `
    <rect x="4" y="4" width="122" height="106" rx="6" fill="#D9A066"/>
    <rect x="4" y="4" width="122" height="16" fill="#A8743F"/>
    <rect x="4" y="94" width="122" height="16" fill="#A8743F"/>
    <path d="M18 20 L112 94 M112 20 L18 94" stroke="#A8743F" stroke-width="12" stroke-linecap="round"/>
    <rect x="52" y="0" width="26" height="12" rx="4" fill="#3F4C73"/>`, 130, 110);

  // The Super Paw: a box to collect, and the springy paw it fires.
  const pawPrint = (x, y, s, fill) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">
      <ellipse cx="0" cy="8" rx="17" ry="14"/>
      <circle cx="-18" cy="-8" r="7"/><circle cx="-6" cy="-18" r="7"/>
      <circle cx="6" cy="-18" r="7"/><circle cx="18" cy="-8" r="7"/>
    </g>`;
  save('paw-box', `
    <rect x="5" y="5" width="86" height="86" rx="14" fill="#FFC531" stroke="#FFFFFF" stroke-width="7"/>
    <rect x="5" y="66" width="86" height="25" rx="10" fill="#E8A41C"/>
    ${pawPrint(48, 48, 1.3, '#E8456E')}`, 96, 96);
  save('paw-head', `
    <circle cx="66" cy="66" r="56" fill="#8E96A3" stroke="#23264A" stroke-width="7"/>
    <circle cx="48" cy="70" r="30" fill="#E7E9EE"/>
    <g fill="#F58FAB">
      <ellipse cx="52" cy="78" rx="19" ry="16"/>
      <circle cx="26" cy="58" r="8"/><circle cx="38" cy="42" r="8"/>
      <circle cx="58" cy="38" r="8"/><circle cx="74" cy="50" r="8"/>
    </g>`, 132, 132);
  save('paw-spring', `
    <path d="M0 24 L8 4 L16 44 L24 4 L32 24" fill="none" stroke="#23264A" stroke-width="7" stroke-linejoin="round"/>
    <path d="M0 24 L8 4 L16 44 L24 4 L32 24" fill="none" stroke="#C7CFDF" stroke-width="3" stroke-linejoin="round"/>`, 32, 48);
  save('paw-icon', `
    <circle cx="28" cy="28" r="26" fill="#FFC531" stroke="#FFFFFF" stroke-width="4"/>
    ${pawPrint(28, 29, 0.85, '#E8456E')}`, 56, 56);
  save('star', `<path d="M24 2 L30 17 L46 18 L34 28 L38 44 L24 35 L10 44 L14 28 L2 18 L18 17 Z" fill="#FFD568" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>`, 48, 48);

  // Round opening in the road, seen from the side, with its lid tipped up.
  // Cars seen from the front, as they drive across the road toward the camera.
  const car = (body, shade) => `
    <rect x="6" y="88" width="24" height="52" rx="8" fill="#23264A"/><rect x="120" y="88" width="24" height="52" rx="8" fill="#23264A"/>
    <path d="M30 62 L42 22 C44 14 50 10 58 10 H92 C100 10 106 14 108 22 L120 62 Z" fill="${shade}"/>
    <path d="M40 60 L50 26 C51 22 54 20 58 20 H92 C96 20 99 22 100 26 L110 60 Z" fill="#BFE7F7"/>
    <rect x="8" y="58" width="134" height="62" rx="16" fill="${body}"/>
    <rect x="8" y="100" width="134" height="20" rx="8" fill="${shade}"/>
    <circle cx="32" cy="82" r="13" fill="#FFF3C4"/><circle cx="118" cy="82" r="13" fill="#FFF3C4"/>
    <rect x="52" y="74" width="46" height="18" rx="4" fill="#23264A" opacity="0.75"/>
    <rect x="56" y="104" width="38" height="11" rx="2" fill="#FFFFFF"/>`;
  save('car-1', car('#E2483D', '#B5301F'), 150, 140);
  save('car-2', car('#3C7FD9', '#2A5FA8'), 150, 140);
  save('car-3', car('#FFC531', '#D69A1C'), 150, 140);
  const zebra = Array.from({ length: 6 }, (_, i) => {
    const y = 6 + i * 21;
    const inset = 44 - i * 8;
    return `<rect x="${inset}" y="${y}" width="${340 - inset * 2}" height="12" rx="2" fill="#FFFFFF" opacity="0.9"/>`;
  }).join('');
  save('zebra-crossing', zebra, 340, 130);
  const trafficLight = (redOn) => `
    <rect x="34" y="96" width="12" height="164" fill="#3F4C73"/>
    <rect x="12" y="4" width="56" height="102" rx="14" fill="#23264A"/>
    <circle cx="40" cy="31" r="17" fill="${redOn ? '#FF3B30' : '#5A2A2E'}"/>
    <circle cx="40" cy="77" r="17" fill="${redOn ? '#22503A' : '#36E06B'}"/>`;
  save('traffic-light-red', trafficLight(true), 80, 260);
  save('traffic-light-green', trafficLight(false), 80, 260);

  save('manhole', `
    <ellipse cx="65" cy="20" rx="58" ry="11" fill="#14122E"/>
    <ellipse cx="65" cy="18" rx="50" ry="7" fill="#050413"/>
    <path d="M7 20 A58 11 0 0 0 123 20" fill="none" stroke="#8E96A3" stroke-width="5"/>
    <g transform="rotate(-24 118 14)">
      <rect x="84" y="9" width="48" height="10" rx="4" fill="#59648F"/>
      <rect x="92" y="6" width="8" height="4" fill="#3F4C73"/><rect x="112" y="6" width="8" height="4" fill="#3F4C73"/>
    </g>`, 150, 32);

  save('barrel', `
    <circle cx="50" cy="50" r="46" fill="#B4692F" stroke="#5F3515" stroke-width="6"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="#8E96A3" stroke-width="7"/>
    <path d="M50 8 V92 M8 50 H92 M21 21 L79 79 M79 21 L21 79" stroke="#7F4A20" stroke-width="5"/>
    <circle cx="50" cy="50" r="11" fill="#8E96A3" stroke="#59648F" stroke-width="4"/>`, 100, 100);

  // The sprinkler's base, with the water drawn separately so it can rise and fall.
  save('sprinkler', `
    <rect x="34" y="136" width="32" height="24" rx="6" fill="#22A67E"/>
    <rect x="41" y="122" width="18" height="18" rx="4" fill="#3F4C73"/>
    <circle cx="50" cy="121" r="7" fill="#8E96A3"/>`, 100, 160);
  save('sprinkler-water', `
    <path d="M42 130 C36 90 22 50 12 18 C30 2 70 2 88 18 C78 50 64 90 58 130 Z" fill="#6FD0F7" opacity="0.85"/>
    <path d="M47 130 C44 90 38 55 34 22 C44 14 56 14 66 22 C62 55 56 90 53 130 Z" fill="#D8F4FF"/>
    <circle cx="14" cy="34" r="6" fill="#A5E3FB"/><circle cx="86" cy="32" r="6" fill="#A5E3FB"/>
    <circle cx="24" cy="10" r="5" fill="#D8F4FF"/><circle cx="76" cy="9" r="5" fill="#D8F4FF"/>`, 100, 130);

  // Clothes on a line between two poles, with the same low edge as the scaffold and banner.
  const clothes = [
    { x: 24, c: '#E8456E', d: 'M0 0 H34 V70 H0 Z' },
    { x: 66, c: '#FFD568', d: 'M0 0 H40 L46 22 L36 26 V70 H10 V26 L0 22 Z' },
    { x: 118, c: '#7ED9B6', d: 'M0 0 H30 V72 H16 V30 H14 V72 H0 Z' },
  ].map(({ x, c, d }) => `<path transform="translate(${x} 88)" d="${d}" fill="${c}"/>`).join('');
  save('washing-line', `
    <rect x="10" y="10" width="12" height="280" rx="4" fill="#8E6A42"/>
    <rect x="148" y="10" width="12" height="280" rx="4" fill="#8E6A42"/>
    <path d="M16 56 Q85 104 154 56" fill="none" stroke="#FFFFFF" stroke-width="5"/>
    ${clothes}
    <path d="M68 172 L85 192 L102 172 M68 194 L85 214 L102 194" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 172 L85 192 L102 172 M68 194 L85 214 L102 194" fill="none" stroke="#E8456E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`, 170, 290);

  // Repeating tiles for floating ledges.
  // Each has a lit top edge to land on, and a shaded underside.
  save('platform-awning', `
    <path d="M0 0 H64 V20 A16 8 0 0 1 32 20 A16 8 0 0 1 0 20 Z" fill="#FFFFFF"/>
    <path d="M0 0 H32 V20 A16 8 0 0 1 0 20 Z" fill="#E8456E"/>
    <path d="M0 14 H64 V20 A16 8 0 0 1 32 20 A16 8 0 0 1 0 20 Z" fill="#000000" opacity="0.12"/>
    <path d="M6 8 V18 M38 8 V18" stroke="#FFFFFF" stroke-width="3" opacity="0.35" stroke-linecap="round"/>
    <rect width="64" height="6" fill="#3F4C73"/>
    <rect width="64" height="2" fill="#7A87B0"/>`, 64, 34);
  save('platform-plank', `
    <rect y="2" width="64" height="24" fill="#D9A066"/>
    <rect y="2" width="64" height="6" fill="#F0CC96"/>
    <rect y="2" width="64" height="2" fill="#FFE6BF"/>
    <path d="M4 15 Q20 12 34 16 T62 15" stroke="#C4874B" stroke-width="1.5" fill="none"/>
    <rect y="22" width="64" height="8" fill="#A8743F"/>
    <rect y="28" width="64" height="4" fill="#7E5530"/>
    <rect x="62" y="2" width="2" height="28" fill="#A8743F"/>
    <circle cx="8" cy="14" r="2.5" fill="#6E4A2A"/><circle cx="54" cy="14" r="2.5" fill="#6E4A2A"/>`, 64, 34);

  // Light coming down through the morning air, drawn over the buildings but behind the street.
  let beams = '';
  [[760, 150], [930, 110], [1060, 170], [1210, 90]].forEach(([x, w], i) => {
    beams += `<path d="M${x} -20 L${x + w} -20 L${x + w - 520} 760 L${x - 760} 760 Z" fill="url(#beam)" opacity="${[0.55, 0.4, 0.5, 0.35][i]}"/>`;
  });
  save('sunbeams', `<defs><linearGradient id="beam" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF6D0" stop-opacity="0.9"/><stop offset="0.7" stop-color="#FFF6D0" stop-opacity="0.15"/><stop offset="1" stop-color="#FFF6D0" stop-opacity="0"/>
    </linearGradient></defs>${beams}`, 1280, 720);

  // A gold fish coin: a soft glow, saturated gold with a darker rim, and a drop shadow.
  save('fish', `
    <defs>
      <radialGradient id="coinGlow"><stop offset="0.55" stop-color="#FFD400" stop-opacity="0.55"/><stop offset="1" stop-color="#FFB000" stop-opacity="0"/></radialGradient>
      <radialGradient id="coinGold" cx="0.4" cy="0.32" r="0.8"><stop offset="0" stop-color="#FFEF5C"/><stop offset="0.55" stop-color="#FFC400"/><stop offset="1" stop-color="#FF8A00"/></radialGradient>
      <filter id="coinShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <circle cx="38" cy="36" r="36" fill="url(#coinGlow)"/>
    <ellipse cx="38" cy="66" rx="21" ry="5" fill="#2A1A4A" opacity="0.5" filter="url(#coinShadow)"/>
    <circle cx="38" cy="36" r="25" fill="#D95F00"/>
    <circle cx="38" cy="34" r="25" fill="#F07A00"/>
    <circle cx="38" cy="33" r="21.5" fill="url(#coinGold)"/>
    <circle cx="38" cy="33" r="17.5" fill="none" stroke="#F09000" stroke-width="2"/>
    <path d="M47 33 C42 25 31 25 25 33 C31 41 42 41 47 33 Z" fill="#B23C00"/>
    <path d="M45 33 L54 26 L52 33 L54 40 Z" fill="#B23C00"/>
    <circle cx="31" cy="31" r="2" fill="#FFE98A"/>
    <path d="M24 22 A18 18 0 0 1 38 15" fill="none" stroke="#FFF9C9" stroke-width="3" stroke-linecap="round"/>`, 76, 74);

  save('checkpoint-flag', `
    <rect x="10" y="4" width="10" height="176" rx="4" fill="#3F4C73"/>
    <path d="M20 10 L104 34 L20 58 Z" fill="#37C871" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="15" cy="178" rx="20" ry="6" fill="#2C3657"/>`, 112, 186);

  // The escape point: a garden gate left open, with daylight and a paw sign.
  let planks = '';
  for (let x = 0; x < 360; x += 40) {
    planks += `<path d="M${x + 3} 96 L${x + 19} 76 L${x + 35} 96 L${x + 35} 340 L${x + 3} 340 Z" fill="${(x / 40) % 2 ? '#C98F54' : '#D9A066'}"/>`;
  }
  save('gate', `
    ${planks}
    <rect x="0" y="136" width="360" height="16" fill="#A8743F"/>
    <rect x="0" y="266" width="360" height="16" fill="#A8743F"/>
    <path d="M104 340 V176 A76 76 0 0 1 256 176 V340 Z" fill="#6E4A2A"/>
    <path d="M118 340 V180 A62 62 0 0 1 242 180 V340 Z" fill="#FFF6C2"/>
    <path d="M118 340 V290 C160 270 200 270 242 290 V340 Z" fill="#7BE39A"/>
    <rect x="130" y="4" width="100" height="72" rx="14" fill="#22A67E" stroke="#FFFFFF" stroke-width="6"/>
    <g transform="translate(180 44)" fill="#FFFFFF">
      <ellipse cx="0" cy="8" rx="16" ry="13"/>
      <circle cx="-17" cy="-7" r="6.5"/><circle cx="-6" cy="-16" r="6.5"/>
      <circle cx="6" cy="-16" r="6.5"/><circle cx="17" cy="-7" r="6.5"/>
    </g>`, 360, 340);
}

sky();
clouds();
farCity();
nearCity();
street();
obstacles();
console.log('City art drawn in public/assets/city');
