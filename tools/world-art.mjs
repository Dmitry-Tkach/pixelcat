// Draws the village, farm and sunset worlds: repeating background layers, obstacles and gates.
// Run: npm run assets
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'worlds');
mkdirSync(OUT, { recursive: true });

const TILE = 2048;
const STREET_TOP = 520;
const HEIGHT = 720;

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

// Splits the tile into widths that sum to it exactly, so the layer repeats without a seam.
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

// A hill line that repeats seamlessly: its waves fit the tile width exactly.
function hills(base, waves, fill) {
  let d = `M0 ${STREET_TOP} L0 ${base}`;
  for (let x = 0; x <= TILE; x += 16) {
    let y = base;
    for (const [count, height, shift] of waves) y -= height * Math.sin((2 * Math.PI * count * x) / TILE + shift);
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return `<path d="${d} L${TILE} ${STREET_TOP} Z" fill="${fill}"/>`;
}

function sky(name, stops) {
  const gradient = stops.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('');
  save(name, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${gradient}</linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/>`, 1280, 720);
}

function tree(x, rand, palette, base = STREET_TOP + 8) {
  const h = 90 + rand() * 50;
  const [dark, mid, light] = palette[Math.floor(rand() * palette.length)];
  return `<rect x="${x - 10}" y="${base - h}" width="20" height="${h}" rx="6" fill="#8E5A30"/>
    <rect x="${x + 1}" y="${base - h}" width="9" height="${h}" rx="4" fill="#6F4522"/>
    <ellipse cx="${x}" cy="${base - h - 46}" rx="74" ry="78" fill="${dark}"/>
    <ellipse cx="${x - 8}" cy="${base - h - 54}" rx="64" ry="68" fill="${mid}"/>
    <ellipse cx="${x - 28}" cy="${base - h - 82}" rx="24" ry="18" fill="${light}"/>`;
}

function flowers(rand, y, spread, colors) {
  let out = '';
  for (let x = 20; x < TILE - 20; x += 40 + rand() * 60) {
    const fy = y + rand() * spread;
    const color = colors[Math.floor(rand() * colors.length)];
    out += `<circle cx="${x}" cy="${fy}" r="5" fill="${color}"/><circle cx="${x}" cy="${fy}" r="2" fill="#FFF3B0"/>`;
  }
  return out;
}

// ----- Village -----

function cottage(rand, x, w) {
  const WALLS = [['#FFF2D6', '#EBD7AE'], ['#FCE3C4', '#E9C79D'], ['#E8F2D8', '#CCDDB3'], ['#FBD9C9', '#EDBBA6']];
  const ROOFS = [['#E2483D', '#B8322B'], ['#D9622B', '#AE4A1E'], ['#C93F5E', '#A02E49']];
  const [wall, shade] = WALLS[Math.floor(rand() * WALLS.length)];
  const [roof, roofDark] = ROOFS[Math.floor(rand() * ROOFS.length)];
  const h = 120 + Math.floor(rand() * 3) * 34;
  const top = STREET_TOP - h;
  const roofH = 86;
  let s = `<rect x="${x + 14}" y="${top}" width="${w - 28}" height="${h}" fill="${wall}"/>
    <rect x="${x + w - 34}" y="${top}" width="20" height="${h}" fill="${shade}"/>
    <rect x="${x + w * 0.68}" y="${top - roofH - 8}" width="24" height="60" fill="#A0604A"/>
    <path d="M${x - 2} ${top + 4} L${x + w / 2} ${top - roofH} L${x + w + 2} ${top + 4} Z" fill="${roof}"/>
    <path d="M${x + w / 2} ${top - roofH} L${x + w + 2} ${top + 4} L${x + w * 0.72} ${top + 4} Z" fill="${roofDark}"/>`;
  const doorX = x + w / 2 - 22;
  s += `<path d="M${doorX} ${STREET_TOP} V${STREET_TOP - 70} A22 22 0 0 1 ${doorX + 44} ${STREET_TOP - 70} V${STREET_TOP} Z" fill="#2F9E8F"/>
    <circle cx="${doorX + 36}" cy="${STREET_TOP - 44}" r="4" fill="#FFD568"/>`;
  for (const wx of [x + 34, x + w - 92]) {
    s += `<rect x="${wx - 4}" y="${STREET_TOP - 94}" width="66" height="60" rx="4" fill="#FFFFFF"/>
      <rect x="${wx}" y="${STREET_TOP - 90}" width="58" height="52" rx="3" fill="#57B7E0"/>
      <rect x="${wx + 26}" y="${STREET_TOP - 90}" width="5" height="52" fill="#FFFFFF"/>
      <rect x="${wx - 6}" y="${STREET_TOP - 36}" width="70" height="14" rx="4" fill="#9B5F33"/>
      <circle cx="${wx + 8}" cy="${STREET_TOP - 38}" r="7" fill="#F0556A"/><circle cx="${wx + 28}" cy="${STREET_TOP - 40}" r="7" fill="#FFC531"/><circle cx="${wx + 48}" cy="${STREET_TOP - 38}" r="7" fill="#F0556A"/>`;
  }
  return s;
}

function villageArt() {
  const GREENS = [['#2FA65A', '#4CC96F', '#8CEB9B'], ['#3C9E48', '#5CC15C', '#A2E88D']];
  sky('park-sky', [[0, '#1E9CF0'], [0.6, '#76D0F8'], [1, '#E2F8E8']]);
  save('park-far', [
    hills(345, [[2, 40, 0], [5, 16, 1]], '#A9E3A5'),
    hills(405, [[3, 30, 2], [7, 10, 0.4]], '#7FD27F'),
  ].join(''), TILE, STREET_TOP);

  const rand = rng(77);
  let near = hills(470, [[4, 16, 1.2]], '#4FC065');
  let x = 0;
  widths(rand, 260, 360).forEach((w, i) => {
    if (i % 3 === 2) {
      near += tree(x + w / 2, rand, GREENS);
    } else {
      near += cottage(rand, x + 16, w - 32);
    }
    x += w;
  });
  for (let tx = 110; tx < TILE - 110; tx += 460) near += tree(tx, rand, GREENS); // clear of the tile's edges
  for (let hx = 0; hx < TILE; hx += 64) {
    near += `<ellipse cx="${hx + 32}" cy="${STREET_TOP + 4}" rx="38" ry="22" fill="#2F9E4F"/>`;
  }
  save('park-near', near, TILE, STREET_TOP + 20);

  const r2 = rng(5);
  let ground = `<rect y="${STREET_TOP}" width="${TILE}" height="86" fill="#5FCB5B"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="9" fill="#8CE678"/>
    ${flowers(r2, STREET_TOP + 18, 56, ['#FFFFFF', '#F58FAB', '#FFD568'])}
    <rect y="${STREET_TOP + 86}" width="${TILE}" height="${HEIGHT - STREET_TOP - 86}" fill="#A9ABB8"/>
    <rect y="${STREET_TOP + 86}" width="${TILE}" height="12" fill="#7D7F92"/>`;
  for (let row = 0; row < 3; row++) {
    for (let cx = (row % 2) * -32; cx < TILE; cx += 64) { // odd rows start off the edge, so the seam stays filled
      ground += `<rect x="${cx + 3}" y="${STREET_TOP + 104 + row * 32}" width="58" height="26" rx="7" fill="${row % 2 ? '#BBBDC9' : '#B3B5C2'}"/>`;
    }
  }
  save('park-street', `<g transform="translate(0 -${STREET_TOP})">${ground}</g>`, TILE, HEIGHT - STREET_TOP);
}

// ----- Farm -----

function barn(x) {
  return `<rect x="${x}" y="${STREET_TOP - 210}" width="280" height="210" fill="#D8402F"/>
    <rect x="${x + 250}" y="${STREET_TOP - 210}" width="30" height="210" fill="#AE2F22"/>
    <path d="M${x - 16} ${STREET_TOP - 206} L${x + 50} ${STREET_TOP - 300} H${x + 230} L${x + 296} ${STREET_TOP - 206} Z" fill="#5B4037"/>
    <rect x="${x + 96}" y="${STREET_TOP - 122}" width="88" height="122" fill="#FFF3D6"/>
    <path d="M${x + 96} ${STREET_TOP - 122} L${x + 184} ${STREET_TOP} M${x + 184} ${STREET_TOP - 122} L${x + 96} ${STREET_TOP}" stroke="#D8402F" stroke-width="10"/>
    <circle cx="${x + 140}" cy="${STREET_TOP - 178}" r="26" fill="#FFF3D6"/><circle cx="${x + 140}" cy="${STREET_TOP - 178}" r="18" fill="#6E4A2A"/>`;
}

function silo(x) {
  return `<rect x="${x}" y="${STREET_TOP - 270}" width="96" height="270" fill="#C7CFDF"/>
    <rect x="${x + 68}" y="${STREET_TOP - 270}" width="28" height="270" fill="#A5AFC4"/>
    <path d="M${x} ${STREET_TOP - 270} A48 44 0 0 1 ${x + 96} ${STREET_TOP - 270} Z" fill="#E2483D"/>
    <path d="M${x} ${STREET_TOP - 200} H${x + 96} M${x} ${STREET_TOP - 130} H${x + 96} M${x} ${STREET_TOP - 60} H${x + 96}" stroke="#8E96A3" stroke-width="4"/>`;
}

function windmill(x) {
  let blades = '';
  for (const angle of [15, 105, 195, 285]) {
    blades += `<rect x="-11" y="-102" width="22" height="94" rx="3" fill="#FFF8E7" transform="rotate(${angle})"/>`;
  }
  return `<path d="M${x - 44} ${STREET_TOP} L${x - 26} ${STREET_TOP - 210} H${x + 26} L${x + 44} ${STREET_TOP} Z" fill="#E9D2A6"/>
    <path d="M${x + 10} ${STREET_TOP} L${x + 8} ${STREET_TOP - 210} H${x + 26} L${x + 44} ${STREET_TOP} Z" fill="#CFB585"/>
    <path d="M${x - 34} ${STREET_TOP - 208} L${x} ${STREET_TOP - 252} L${x + 34} ${STREET_TOP - 208} Z" fill="#8E5A30"/>
    <g transform="translate(${x} ${STREET_TOP - 214})">${blades}<circle r="11" fill="#6F4522"/></g>`;
}

function hayStack(x, base = STREET_TOP + 6) {
  return `<path d="M${x - 50} ${base} C${x - 50} ${base - 70} ${x + 50} ${base - 70} ${x + 50} ${base} Z" fill="#F2C440"/>
    <path d="M${x - 26} ${base - 6} C${x - 22} ${base - 34} ${x - 10} ${base - 44} ${x - 2} ${base - 50} M${x + 18} ${base - 6} C${x + 18} ${base - 26} ${x + 22} ${base - 34} ${x + 28} ${base - 40}" stroke="#CC9620" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

function farmArt() {
  const GREENS = [['#3C9E48', '#65C451', '#A9E879']];
  sky('farm-sky', [[0, '#35A5EC'], [0.6, '#A9DDF2'], [1, '#FFF3C4']]);
  let far = hills(380, [[2, 36, 1], [5, 12, 0.3]], '#D8D977');
  far += hills(430, [[3, 26, 0.2], [7, 8, 2]], '#F0C94F');
  for (let row = 0; row < 2; row++) {
    for (let cx = row * 60; cx < TILE; cx += 120) {
      far += `<path d="M${cx} ${470 + row * 22} q30 -10 60 0" stroke="#D3A62F" stroke-width="5" fill="none"/>`;
    }
  }
  save('farm-far', far, TILE, STREET_TOP);

  const rand = rng(303);
  let near = hills(474, [[4, 12, 0.8]], '#8CD45B');
  near += barn(90) + silo(400) + windmill(680) + barn(1010) + silo(1320) + windmill(1640);
  for (const hx of [560, 860, 1500, 1880]) near += hayStack(hx);
  for (const tx of [960, 1460, 1930]) near += tree(tx, rand, GREENS); // clear of the tile's edges
  for (let fx = 0; fx < TILE; fx += 64) {
    near += `<rect x="${fx + 26}" y="${STREET_TOP - 42}" width="12" height="58" rx="3" fill="#B5854F"/>`;
  }
  near += `<rect y="${STREET_TOP - 30}" width="${TILE}" height="10" fill="#C99A62"/><rect y="${STREET_TOP - 8}" width="${TILE}" height="10" fill="#C99A62"/>`;
  save('farm-near', near, TILE, STREET_TOP + 20);

  const r2 = rng(19);
  let ground = `<rect y="${STREET_TOP}" width="${TILE}" height="86" fill="#7FCF4E"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="9" fill="#A9E879"/>`;
  for (let gx = 12; gx < TILE - 12; gx += 26 + r2() * 30) {
    const gy = STREET_TOP + 22 + r2() * 50;
    ground += `<path d="M${gx} ${gy} l-5 -12 M${gx} ${gy} l0 -15 M${gx} ${gy} l5 -12" stroke="#59A838" stroke-width="3" stroke-linecap="round"/>`;
  }
  ground += `<rect y="${STREET_TOP + 86}" width="${TILE}" height="${HEIGHT - STREET_TOP - 86}" fill="#B9794A"/>
    <rect y="${STREET_TOP + 86}" width="${TILE}" height="12" fill="#8F5A33"/>`;
  for (let tx = 16; tx < TILE; tx += 128) {
    ground += `<rect x="${tx}" y="${STREET_TOP + 122}" width="84" height="8" rx="4" fill="#9C6238"/>
      <rect x="${tx + 58}" y="${STREET_TOP + 164}" width="58" height="8" rx="4" fill="#9C6238"/>`;
  }
  save('farm-street', `<g transform="translate(0 -${STREET_TOP})">${ground}</g>`, TILE, HEIGHT - STREET_TOP);
}

// ----- Sunset, by the vet's -----

function duskBuilding(rand, x, w) {
  const WALLS = [['#7A4C87', '#5E3A6B'], ['#A0526B', '#7D3F55'], ['#C7674F', '#9F4F3B'], ['#5F5A94', '#494576']];
  const [wall, shade] = WALLS[Math.floor(rand() * WALLS.length)];
  const h = 240 + Math.floor(rand() * 4) * 50;
  const top = STREET_TOP - h;
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${wall}"/>
    <rect x="${x + w - 16}" y="${top}" width="16" height="${h}" fill="${shade}"/>
    <rect x="${x - 6}" y="${top - 14}" width="${w + 12}" height="18" rx="4" fill="${shade}"/>`;
  const cols = Math.max(2, Math.floor((w - 30) / 68));
  const gap = (w - 16 - cols * 44) / (cols + 1);
  for (let wy = top + 24; wy < STREET_TOP - 80; wy += 84) {
    for (let c = 0; c < cols; c++) {
      const lit = rand() > 0.3;
      s += `<rect x="${x + gap + c * (44 + gap)}" y="${wy}" width="44" height="58" rx="3" fill="${lit ? '#FFD76A' : '#33305C'}"/>`;
    }
  }
  return s;
}

function vetClinic(x) {
  return `<rect x="${x}" y="${STREET_TOP - 300}" width="340" height="300" fill="#F6F1FA"/>
    <rect x="${x + 310}" y="${STREET_TOP - 300}" width="30" height="300" fill="#CFC6DC"/>
    <rect x="${x - 8}" y="${STREET_TOP - 314}" width="356" height="20" rx="4" fill="#26A69A"/>
    <rect x="${x + 40}" y="${STREET_TOP - 282}" width="260" height="68" rx="10" fill="#26A69A"/>
    <text x="${x + 170}" y="${STREET_TOP - 232}" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700" fill="#FFFFFF" text-anchor="middle">VET</text>
    <path d="M${x + 62} ${STREET_TOP - 248} h14 v-14 h12 v14 h14 v12 h-14 v14 h-12 v-14 h-14 Z" fill="#FFFFFF"/>
    <path d="M${x + 238} ${STREET_TOP - 248} h14 v-14 h12 v14 h14 v12 h-14 v14 h-12 v-14 h-14 Z" fill="#FFFFFF"/>
    <rect x="${x + 36}" y="${STREET_TOP - 186}" width="96" height="100" rx="5" fill="#FFD76A"/>
    <rect x="${x + 208}" y="${STREET_TOP - 186}" width="96" height="100" rx="5" fill="#FFD76A"/>
    <rect x="${x + 136}" y="${STREET_TOP - 124}" width="68" height="124" rx="5" fill="#26A69A"/>
    <rect x="${x + 146}" y="${STREET_TOP - 114}" width="48" height="50" rx="4" fill="#FFD76A"/>
    <circle cx="${x + 194}" cy="${STREET_TOP - 54}" r="5" fill="#FFFFFF"/>`;
}

function sunsetArt() {
  sky('vet-sky', [[0, '#3B2A78'], [0.4, '#A5448E'], [0.72, '#F2765F'], [1, '#FFC163']]);
  const clouds = rng(11);
  let cloudArt = '';
  for (let i = 0; i < 8; i++) {
    const x = 120 + i * 230 + clouds() * 60;
    const y = 90 + clouds() * 150;
    const s = 0.7 + clouds() * 0.8;
    cloudArt += `<g transform="translate(${x} ${y}) scale(${s})" fill="#FFB3A0" opacity="0.85">
      <circle cx="0" cy="20" r="34"/><circle cx="44" cy="0" r="46"/><circle cx="96" cy="16" r="38"/><circle cx="138" cy="28" r="26"/>
      <rect x="-34" y="24" width="198" height="30" rx="15"/></g>`;
  }
  save('vet-clouds', cloudArt, TILE, 320);

  const farRand = rng(45);
  let far = '';
  let fx = 0;
  for (const w of widths(farRand, 90, 190)) {
    const h = 240 + farRand() * 220;
    far += `<rect x="${fx}" y="${STREET_TOP - h}" width="${w}" height="${h}" fill="${farRand() > 0.5 ? '#7B4A92' : '#8D5499'}"/>`;
    fx += w;
  }
  save('vet-far', far, TILE, STREET_TOP);

  const rand = rng(901);
  let near = '';
  let x = 0;
  const parts = widths(rand, 210, 320);
  const clinicAt = Math.floor(parts.length / 2);
  parts.forEach((w, i) => {
    near += duskBuilding(rand, x, w);
    x += w;
    if (i === clinicAt) near += vetClinic(x - w + (w - 340) / 2);
  });
  for (let lx = 200; lx < TILE - 60; lx += 500) {
    near += `<rect x="${lx - 5}" y="${STREET_TOP - 182}" width="10" height="190" rx="4" fill="#2C2650"/>
      <circle cx="${lx}" cy="${STREET_TOP - 206}" r="42" fill="#FFD76A" opacity="0.25"/>
      <rect x="${lx - 15}" y="${STREET_TOP - 222}" width="30" height="40" rx="9" fill="#FFE99A"/>
      <rect x="${lx - 19}" y="${STREET_TOP - 230}" width="38" height="11" rx="5" fill="#2C2650"/>`;
  }
  save('vet-near', near, TILE, STREET_TOP + 20);

  let ground = `<rect y="${STREET_TOP}" width="${TILE}" height="70" fill="#B88FA8"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="8" fill="#E0B6C0"/>`;
  for (let gx = 0; gx < TILE; gx += 128) ground += `<rect x="${gx}" y="${STREET_TOP + 8}" width="4" height="62" fill="#94708A"/>`;
  ground += `<rect y="${STREET_TOP + 70}" width="${TILE}" height="14" fill="#F4D8C8"/>
    <rect y="${STREET_TOP + 84}" width="${TILE}" height="9" fill="#FF8A1E"/>
    <rect y="${STREET_TOP + 93}" width="${TILE}" height="${HEIGHT - STREET_TOP - 93}" fill="#332A63"/>
    <rect y="${STREET_TOP + 93}" width="${TILE}" height="14" fill="#271F4E"/>`;
  for (let dx = 40; dx < TILE; dx += 256) ground += `<rect x="${dx}" y="682" width="136" height="12" rx="6" fill="#FFD76A"/>`;
  save('vet-street', `<g transform="translate(0 -${STREET_TOP})">${ground}</g>`, TILE, HEIGHT - STREET_TOP);
}

// ----- Obstacles. Each matches the size and hitbox of the city obstacle it replaces. -----

const slideArrows = (y) => `<path d="M68 ${y} L85 ${y + 20} L102 ${y} M68 ${y + 22} L85 ${y + 42} L102 ${y + 22}" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M68 ${y} L85 ${y + 20} L102 ${y} M68 ${y + 22} L85 ${y + 42} L102 ${y + 22}" fill="none" stroke="#E8456E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;

function villageObstacles() {
  save('rock', `
    <path d="M10 112 C4 70 22 28 50 26 C80 26 96 70 90 112 Z" fill="#9B9DAD"/>
    <path d="M58 28 C80 34 96 70 90 112 H64 C72 80 70 50 58 28 Z" fill="#787A8E"/>
    <path d="M26 66 C32 52 42 44 52 42" stroke="#C7C9D6" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M6 112 H94 V116 H6 Z" fill="#5C5E73"/>`, 100, 116);
  save('stump', `
    <path d="M10 100 L14 22 H56 L60 100 Z" fill="#8E5A30"/>
    <path d="M42 22 H56 L60 100 H44 Z" fill="#6F4522"/>
    <ellipse cx="35" cy="22" rx="24" ry="11" fill="#E0B878"/>
    <ellipse cx="35" cy="22" rx="14" ry="6" fill="none" stroke="#B5854F" stroke-width="3"/>
    <path d="M24 42 V88 M36 48 V94" stroke="#6F4522" stroke-width="4" stroke-linecap="round"/>`, 70, 100);
  save('hedge', `
    <rect x="6" y="30" width="118" height="66" rx="16" fill="#2F9E4F"/>
    <circle cx="26" cy="32" r="22" fill="#3CB460"/><circle cx="60" cy="24" r="24" fill="#46C46B"/><circle cx="98" cy="32" r="24" fill="#3CB460"/>
    <circle cx="44" cy="46" r="6" fill="#F58FAB"/><circle cx="84" cy="52" r="6" fill="#FFD568"/><circle cx="62" cy="30" r="5" fill="#FFFFFF"/>
    <rect x="6" y="84" width="118" height="12" rx="4" fill="#23803F"/>`, 130, 96);
  save('log-pile', `
    <g stroke="#6F4522" stroke-width="4">
      <circle cx="34" cy="92" r="30" fill="#E0B878"/><circle cx="96" cy="92" r="30" fill="#D8AC6A"/>
      <circle cx="66" cy="40" r="30" fill="#E0B878"/>
    </g>
    <g fill="none" stroke="#B5854F" stroke-width="3">
      <circle cx="34" cy="92" r="15"/><circle cx="96" cy="92" r="15"/><circle cx="66" cy="40" r="15"/>
    </g>`, 146, 124);
  save('mud', `
    <ellipse cx="65" cy="20" rx="60" ry="12" fill="#5F3515"/>
    <ellipse cx="62" cy="18" rx="50" ry="8" fill="#7F4A20"/>
    <ellipse cx="44" cy="15" rx="12" ry="3" fill="#A06A38"/>
    <circle cx="108" cy="10" r="6" fill="#7F4A20"/><circle cx="16" cy="9" r="4" fill="#7F4A20"/>`, 150, 32);
  save('branch', `
    <rect x="12" y="10" width="14" height="280" rx="5" fill="#8E5A30"/>
    <rect x="144" y="10" width="14" height="280" rx="5" fill="#8E5A30"/>
    <rect x="6" y="64" width="158" height="26" rx="12" fill="#8E5A30"/>
    <ellipse cx="46" cy="96" rx="44" ry="42" fill="#2F9E4F"/><ellipse cx="85" cy="82" rx="48" ry="46" fill="#46C46B"/><ellipse cx="126" cy="98" rx="42" ry="42" fill="#3CB460"/>
    <circle cx="60" cy="118" r="9" fill="#E2483D"/><circle cx="112" cy="122" r="9" fill="#E2483D"/>
    ${slideArrows(176)}`, 170, 290);
  save('ice-cream-van', `
    <rect x="6" y="28" width="250" height="232" rx="10" fill="#FFD1E0"/>
    <rect x="6" y="28" width="250" height="16" rx="6" fill="#F58FAB"/>
    <rect x="30" y="70" width="170" height="90" rx="8" fill="#FFF3D6"/>
    <rect x="22" y="58" width="186" height="20" rx="6" fill="#E8456E"/>
    <g transform="translate(115 150)">
      <path d="M-14 -22 L0 12 L14 -22 Z" fill="#E0A85F"/><circle cy="-34" r="17" fill="#FFF8F0"/><circle cx="-5" cy="-46" r="10" fill="#F58FAB"/>
    </g>
    <path d="M256 84 H292 C312 84 326 118 332 156 L334 260 H256 Z" fill="#FFE6EE"/>
    <path d="M268 100 H290 C304 100 314 126 318 152 H268 Z" fill="#7FD0F2"/>
    <rect x="2" y="246" width="334" height="22" rx="6" fill="#B23C5F"/>
    <circle cx="74" cy="266" r="34" fill="#23264A"/><circle cx="74" cy="266" r="15" fill="#FFD1E0"/>
    <circle cx="272" cy="266" r="34" fill="#23264A"/><circle cx="272" cy="266" r="15" fill="#FFD1E0"/>`, 340, 300);
  save('mushroom', `
    <path d="M36 60 H64 L70 128 H30 Z" fill="#FFF3D6"/>
    <path d="M52 60 H64 L70 128 H54 Z" fill="#E9D2A6"/>
    <path d="M2 66 C2 22 26 6 50 6 C74 6 98 22 98 66 C70 56 30 56 2 66 Z" fill="#E2483D"/>
    <circle cx="30" cy="34" r="10" fill="#FFFFFF"/><circle cx="62" cy="24" r="8" fill="#FFFFFF"/><circle cx="76" cy="46" r="7" fill="#FFFFFF"/>`, 100, 130);
  save('tire-swing', `
    <circle cx="65" cy="58" r="37" fill="none" stroke="#2C2F45" stroke-width="26"/>
    <circle cx="65" cy="58" r="24" fill="none" stroke="#14162A" stroke-width="4"/>
    <path d="M28 28 A50 50 0 0 1 60 12" stroke="#59607F" stroke-width="7" fill="none" stroke-linecap="round"/>
    <rect x="52" y="0" width="26" height="12" rx="4" fill="#8E5A30"/>`, 130, 110);
  save('apple', `
    <path d="M35 30 C20 14 2 30 6 54 C10 74 26 84 35 76 C44 84 60 74 64 54 C68 30 50 14 35 30 Z" fill="#E2483D"/>
    <path d="M48 26 C62 30 68 42 64 54 C60 74 44 84 35 76 C50 66 54 44 48 26 Z" fill="#B8322B"/>
    <path d="M35 30 C34 22 36 14 42 8" stroke="#6F4522" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M40 16 C48 6 60 8 62 12 C56 20 46 22 40 16 Z" fill="#46C46B"/>`, 70, 84);
  save('apple-splat', `
    <path d="M4 44 C12 24 28 30 34 16 C42 28 56 8 62 26 C72 22 86 30 86 44 Z" fill="#E2483D"/>
    <path d="M22 44 C28 32 44 28 52 32 C60 34 66 38 68 44 Z" fill="#FFF3D6"/>
    <circle cx="44" cy="38" r="4" fill="#5F3515"/>`, 90, 44);
  save('platform-leafy', `
    <rect y="8" width="64" height="16" rx="6" fill="#8E5A30"/>
    <ellipse cx="16" cy="11" rx="20" ry="11" fill="#3CB460"/><ellipse cx="46" cy="10" rx="22" ry="11" fill="#46C46B"/>
    <rect y="0" width="64" height="6" fill="#2F9E4F"/>`, 64, 34);
  save('park-gate', `
    <rect x="0" y="60" width="360" height="280" rx="30" fill="#2F9E4F"/>
    <circle cx="44" cy="74" r="44" fill="#3CB460"/><circle cx="130" cy="58" r="50" fill="#46C46B"/><circle cx="230" cy="58" r="50" fill="#3CB460"/><circle cx="316" cy="74" r="44" fill="#46C46B"/>
    <path d="M104 340 V176 A76 76 0 0 1 256 176 V340 Z" fill="#1F6E37"/>
    <path d="M118 340 V180 A62 62 0 0 1 242 180 V340 Z" fill="#FFF6C2"/>
    <path d="M118 340 V290 C160 270 200 270 242 290 V340 Z" fill="#8CE678"/>
    <circle cx="70" cy="170" r="9" fill="#F58FAB"/><circle cx="300" cy="200" r="9" fill="#FFD568"/><circle cx="56" cy="270" r="8" fill="#FFFFFF"/><circle cx="312" cy="290" r="8" fill="#F58FAB"/>`, 360, 340);
}

const TRACTOR = `
    <rect x="28" y="112" width="210" height="130" rx="12" fill="#2FA65A"/>
    <rect x="28" y="196" width="210" height="46" fill="#23803F"/>
    <path d="M164 28 H284 V160 H164 Z" fill="#7FD0F2" stroke="#23803F" stroke-width="12" stroke-linejoin="round"/>
    <rect x="240" y="150" width="96" height="92" rx="10" fill="#2FA65A"/>
    <rect x="310" y="60" width="14" height="94" rx="5" fill="#59648F"/>
    <circle cx="96" cy="230" r="68" fill="#23264A"/><circle cx="96" cy="230" r="32" fill="#FFC531"/>
    <circle cx="296" cy="262" r="38" fill="#23264A"/><circle cx="296" cy="262" r="16" fill="#FFC531"/>`;

// One wagon of hay, with a flat top the cat can run along. Its top is 100px down the texture.
function hayCar(x, width) {
  const strands = Array.from({ length: Math.floor(width / 34) }, (_, i) => {
    const sx = x + 16 + i * 34;
    const y = 112 + (i % 3) * 16;
    return `<path d="M${sx} ${y} V${y + 22}" stroke="#C4921E" stroke-width="5" stroke-linecap="round"/>`;
  }).join('');
  const tufts = Array.from({ length: Math.floor(width / 48) }, (_, i) => {
    const sx = x + 14 + i * 48;
    return `<path d="M${sx} 102 l6 -11 l6 11 l6 -9 l6 9 Z" fill="#F2C440"/>`;
  }).join('');
  return `
    ${tufts}
    <rect x="${x}" y="100" width="${width}" height="84" rx="12" fill="#F2C440"/>
    <rect x="${x}" y="160" width="${width}" height="24" fill="#D6A42A"/>
    ${strands}
    <rect x="${x - 6}" y="180" width="${width + 12}" height="26" rx="5" fill="#B5854F"/>
    <path d="M${x - 6} 194 H${x + width + 6}" stroke="#7F4A20" stroke-width="5"/>
    <circle cx="${x + 62}" cy="212" r="29" fill="#23264A"/><circle cx="${x + 62}" cy="212" r="12" fill="#FFC531"/>
    <circle cx="${x + width - 62}" cy="212" r="29" fill="#23264A"/><circle cx="${x + width - 62}" cy="212" r="12" fill="#FFC531"/>`;
}

function farmObstacles() {
  save('pumpkin', `
    <path d="M50 44 C50 34 54 28 62 24" stroke="#59A838" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="22" cy="78" rx="18" ry="36" fill="#E8761E"/><ellipse cx="78" cy="78" rx="18" ry="36" fill="#D9620F"/>
    <ellipse cx="36" cy="78" rx="18" ry="38" fill="#FF8A1E"/><ellipse cx="64" cy="78" rx="18" ry="38" fill="#F07A10"/>
    <ellipse cx="50" cy="78" rx="16" ry="38" fill="#FF9A33"/>`, 100, 116);
  save('milk-can', `
    <path d="M12 100 V48 C12 38 22 36 24 26 H46 C48 36 58 38 58 48 V100 Z" fill="#C7CFDF"/>
    <path d="M46 30 C48 38 58 38 58 48 V100 H44 Z" fill="#9DA7BC"/>
    <rect x="20" y="10" width="30" height="16" rx="5" fill="#8E96A3"/>
    <rect x="8" y="66" width="54" height="10" fill="#E2483D"/>`, 70, 100);
  save('fence', `
    <rect x="16" y="10" width="16" height="86" rx="3" fill="#B5854F"/>
    <rect x="98" y="10" width="16" height="86" rx="3" fill="#9C6F3D"/>
    <rect x="4" y="26" width="122" height="14" rx="3" fill="#D3A566"/>
    <rect x="4" y="58" width="122" height="14" rx="3" fill="#C4955A"/>`, 130, 96);
  save('hay-stack', `
    <path d="M6 124 C6 40 30 10 72 8 C114 10 140 40 140 124 Z" fill="#F2C440"/>
    <path d="M100 18 C124 34 140 66 140 124 H110 C116 80 112 44 100 18 Z" fill="#D6A42A"/>
    <path d="M34 110 C36 70 46 44 62 28 M72 116 C72 80 76 52 86 34 M104 112 C106 88 106 70 102 56" stroke="#C4921E" stroke-width="6" fill="none" stroke-linecap="round"/>`, 146, 124);
  save('trough', `
    <rect x="16" y="56" width="14" height="34" rx="3" fill="#7F4A20"/><rect x="120" y="56" width="14" height="34" rx="3" fill="#7F4A20"/>
    <path d="M2 16 H148 L136 64 H14 Z" fill="#B5854F"/>
    <path d="M6 16 H144 L140 30 H10 Z" fill="#57B7E0"/>
    <path d="M14 48 H136" stroke="#7F4A20" stroke-width="5"/>`, 150, 90);
  save('farm-sign', `
    <rect x="14" y="10" width="14" height="280" rx="4" fill="#8E5A30"/>
    <rect x="142" y="10" width="14" height="280" rx="4" fill="#8E5A30"/>
    <rect x="6" y="48" width="158" height="114" rx="8" fill="#E9C27D"/>
    <path d="M6 86 H164 M6 124 H164" stroke="#B5854F" stroke-width="5"/>
    <g transform="translate(85 104)">
      <ellipse rx="34" ry="24" fill="#FFFFFF"/><circle cx="34" cy="-14" r="16" fill="#FFFFFF"/>
      <circle cx="38" cy="-17" r="3" fill="#23264A"/><path d="M-30 -8 C-22 -18 -12 -10 -16 -2 Z" fill="#23264A"/><circle cx="4" cy="6" r="8" fill="#23264A"/>
    </g>
    ${slideArrows(176)}`, 170, 290);
  save('tractor', `
    <rect x="12" y="30" width="152" height="92" rx="14" fill="#F2C440"/>
    <rect x="12" y="96" width="152" height="26" fill="#D6A42A"/>
    <path d="M34 44 V84 M70 40 V76 M106 44 V88 M140 40 V72" stroke="#C4921E" stroke-width="5" stroke-linecap="round"/>
    <rect x="28" y="112" width="210" height="130" rx="12" fill="#2FA65A"/>
    <rect x="28" y="196" width="210" height="46" fill="#23803F"/>
    <rect x="164" y="34" width="110" height="150" rx="8" fill="#FFFFFF" opacity="0.2"/>
    <path d="M164 28 H284 V160 H164 Z" fill="#7FD0F2" stroke="#23803F" stroke-width="12" stroke-linejoin="round"/>
    <rect x="240" y="150" width="96" height="92" rx="10" fill="#2FA65A"/>
    <rect x="310" y="60" width="14" height="94" rx="5" fill="#59648F"/>
    <circle cx="96" cy="230" r="68" fill="#23264A"/><circle cx="96" cy="230" r="32" fill="#FFC531"/>
    <circle cx="296" cy="262" r="38" fill="#23264A"/><circle cx="296" cy="262" r="16" fill="#FFC531"/>`, 340, 300);
  save('hay-bale', `
    <rect x="6" y="12" width="88" height="116" rx="12" fill="#F2C440"/>
    <rect x="66" y="12" width="28" height="116" rx="10" fill="#D6A42A"/>
    <path d="M6 48 H94 M6 92 H94" stroke="#B5301F" stroke-width="7"/>
    <path d="M22 24 V40 M40 58 V82 M26 102 V118 M58 22 V40 M54 100 V116" stroke="#C4921E" stroke-width="4" stroke-linecap="round"/>`, 100, 130);
  save('bucket', `
    <path d="M12 26 H118 L104 106 H26 Z" fill="#9DA7BC"/>
    <path d="M90 26 H118 L104 106 H82 Z" fill="#7C86A0"/>
    <ellipse cx="65" cy="26" rx="53" ry="12" fill="#57B7E0" stroke="#7C86A0" stroke-width="5"/>
    <path d="M12 26 C20 -6 110 -6 118 26" stroke="#59648F" stroke-width="6" fill="none"/>
    <rect x="52" y="0" width="26" height="10" rx="4" fill="#3F4C73"/>`, 130, 110);
  save('rolling-hay', `
    <circle cx="50" cy="50" r="47" fill="#F2C440" stroke="#C4921E" stroke-width="5"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke="#D6A42A" stroke-width="6"/>
    <circle cx="50" cy="50" r="14" fill="none" stroke="#C4921E" stroke-width="5"/>
    <path d="M50 4 V22 M50 78 V96 M4 50 H22 M78 50 H96" stroke="#B5301F" stroke-width="6"/>`, 100, 100);
  save('big-hay', `
    <circle cx="65" cy="65" r="61" fill="#F2C440" stroke="#C4921E" stroke-width="6"/>
    <circle cx="65" cy="65" r="42" fill="none" stroke="#D6A42A" stroke-width="7"/>
    <circle cx="65" cy="65" r="22" fill="none" stroke="#C4921E" stroke-width="6"/>
    <circle cx="65" cy="65" r="6" fill="#C4921E"/>
    <path d="M65 5 V30 M65 100 V125 M5 65 H30 M100 65 H125" stroke="#B5301F" stroke-width="7"/>`, 130, 130);
  save('mud-pool', `
    <ellipse cx="160" cy="26" rx="158" ry="24" fill="#5E3A1E"/>
    <ellipse cx="156" cy="23" rx="142" ry="18" fill="#7A4F2A"/>
    <ellipse cx="96" cy="20" rx="44" ry="6" fill="#94643A"/>
    <ellipse cx="214" cy="27" rx="30" ry="4" fill="#94643A"/>
    <circle cx="150" cy="17" r="5" fill="#94643A"/><circle cx="256" cy="18" r="4" fill="#94643A"/><circle cx="60" cy="30" r="3" fill="#94643A"/>`, 320, 52);
  save('hay-wagon', `
    <rect x="340" y="186" width="50" height="10" fill="#7F4A20"/>
    <rect x="710" y="186" width="60" height="10" fill="#7F4A20"/>
    ${hayCar(0, 345)}
    ${hayCar(375, 345)}
    <g transform="translate(740 0) scale(0.8)">${TRACTOR}</g>`, 1020, 250);
  save('platform-hay', `
    <rect y="2" width="64" height="30" rx="6" fill="#F2C440"/>
    <rect y="22" width="64" height="10" fill="#D6A42A"/>
    <path d="M10 6 V20 M28 8 V18 M46 6 V20 M58 10 V18" stroke="#C4921E" stroke-width="4" stroke-linecap="round"/>`, 64, 34);
  save('farm-gate', `
    <path d="M0 340 V70 L180 4 L360 70 V340 Z" fill="#D8402F"/>
    <path d="M0 70 L180 4 L360 70" fill="none" stroke="#FFF3D6" stroke-width="12"/>
    <rect x="96" y="120" width="168" height="220" fill="#6E2A1E"/>
    <rect x="110" y="134" width="140" height="206" fill="#FFF6C2"/>
    <path d="M110 340 V296 C150 276 210 276 250 296 V340 Z" fill="#A9E879"/>
    <circle cx="180" cy="74" r="24" fill="#FFF3D6"/>
    <g transform="translate(180 76) scale(0.7)" fill="#D8402F">
      <ellipse cx="0" cy="8" rx="16" ry="13"/><circle cx="-17" cy="-7" r="6.5"/><circle cx="-6" cy="-16" r="6.5"/><circle cx="6" cy="-16" r="6.5"/><circle cx="17" cy="-7" r="6.5"/>
    </g>`, 360, 340);
}

function vetGate() {
  save('vet-gate', `
    <rect x="30" y="20" width="16" height="320" rx="4" fill="#2C2650"/>
    <rect x="314" y="20" width="16" height="320" rx="4" fill="#2C2650"/>
    <rect x="10" y="30" width="340" height="96" rx="12" fill="#26A69A" stroke="#FFFFFF" stroke-width="6"/>
    <text x="180" y="96" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="700" fill="#FFFFFF" text-anchor="middle">FREEDOM</text>
    <path d="M60 340 V190 H300 V340 Z" fill="#FFD76A" opacity="0.35"/>
    <path d="M60 340 C110 290 250 290 300 340 Z" fill="#8CE678"/>`, 360, 340);
}

// A low layer that passes in front of the cat. The tile repeats without a seam, and everything
// sits in the bottom 40px, below the cat's feet.
function foregroundArt() {
  const W = 2048;
  const H = 48;
  const repeat = (step, draw) => Array.from({ length: Math.floor(W / step) }, (_, i) => draw(i * step, i)).join('');
  // City: a railing.
  save('city-fore', `
    <rect y="22" width="${W}" height="6" fill="#23264A"/>
    <rect y="40" width="${W}" height="8" fill="#23264A"/>
    ${repeat(128, (x) => `<rect x="${x + 20}" y="14" width="10" height="34" rx="3" fill="#23264A"/>`)}`, W, H);
  // Village: a rounded hedge.
  save('park-fore', `
    <rect y="30" width="${W}" height="18" fill="#2F8A3F"/>
    ${repeat(64, (x, i) => `<circle cx="${x + 32}" cy="${34 + (i % 3) * 3}" r="${26 - (i % 3) * 3}" fill="${i % 2 ? '#2F8A3F' : '#37994A'}"/>`)}`, W, H);
  // Farm: a low wooden fence and grass.
  save('farm-fore', `
    <rect y="20" width="${W}" height="7" fill="#7F4A20"/>
    ${repeat(160, (x) => `<rect x="${x + 30}" y="10" width="12" height="38" rx="3" fill="#7F4A20"/>`)}
    ${repeat(32, (x, i) => `<path d="M${x} 48 L${x + 8} ${34 - (i % 3) * 5} L${x + 16} 48 Z" fill="${i % 2 ? '#4E9C2E' : '#5FB038'}"/>`)}`, W, H);
  // Sunset: a dark hedge, with a street lamp's post now and then.
  save('vet-fore', `
    <rect y="32" width="${W}" height="16" fill="#2A2350"/>
    ${repeat(64, (x, i) => `<circle cx="${x + 32}" cy="${38 + (i % 3) * 3}" r="${22 - (i % 3) * 3}" fill="#2A2350"/>`)}`, W, H);
}

// The City, Village and Farm's own hazards, and the hidden toy mouse.
function journeyArt() {
  // ----- Farm: a tractor seen from the front, and flags instead of traffic lights -----
  save('tractor-front', `
    <rect x="4" y="74" width="34" height="66" rx="10" fill="#23264A"/><rect x="112" y="74" width="34" height="66" rx="10" fill="#23264A"/>
    <rect x="46" y="4" width="58" height="56" rx="6" fill="#7FD0F2" stroke="#23803F" stroke-width="8"/>
    <rect x="30" y="56" width="90" height="62" rx="10" fill="#2FA65A"/>
    <rect x="30" y="98" width="90" height="20" fill="#23803F"/>
    <circle cx="50" cy="76" r="10" fill="#FFF3C4"/><circle cx="100" cy="76" r="10" fill="#FFF3C4"/>
    <rect x="62" y="84" width="26" height="24" rx="3" fill="#1C5C30"/>
    <rect x="66" y="118" width="18" height="22" fill="#59648F"/>`, 150, 140);
  const dirtRuts = Array.from({ length: 5 }, (_, i) => {
    const y = 12 + i * 26;
    return `<path d="M${40 - i * 8} ${y} H${300 + i * 8}" stroke="#8C5A32" stroke-width="10" stroke-linecap="round" stroke-dasharray="26 18"/>`;
  }).join('');
  save('dirt-crossing', dirtRuts, 340, 130);
  const flag = (color, shade) => `
    <rect x="16" y="20" width="10" height="240" fill="#8E5A30"/>
    <path d="M26 24 H100 L84 56 L100 88 H26 Z" fill="${color}"/>
    <path d="M26 66 H90 L100 88 H26 Z" fill="${shade}"/>`;
  save('farm-flag-red', flag('#FF3B30', '#C42A22'), 110, 260);
  save('farm-flag-green', flag('#36E06B', '#22A04A'), 110, 260);

  // ----- Village: a market stall, and what falls from above -----
  const awning = Array.from({ length: 6 }, (_, i) => {
    const x = 10 + i * 28.4;
    return `<path d="M${x} 42 H${x + 28.4} V72 A14.2 14.2 0 0 1 ${x} 72 Z" fill="${i % 2 ? '#FFFFFF' : '#E2483D'}"/>`;
  }).join('');
  save('market-stall', `
    <rect x="22" y="60" width="12" height="120" fill="#8E5A30"/><rect x="156" y="60" width="12" height="120" fill="#8E5A30"/>
    <rect x="28" y="124" width="134" height="56" rx="4" fill="#B5854F"/>
    <rect x="28" y="124" width="134" height="12" fill="#D3A566"/>
    <circle cx="52" cy="118" r="10" fill="#E2483D"/><circle cx="74" cy="118" r="10" fill="#FF8A1E"/><circle cx="96" cy="118" r="10" fill="#FFC531"/><circle cx="118" cy="118" r="10" fill="#7CC943"/><circle cx="140" cy="118" r="10" fill="#E2483D"/>
    <g transform="translate(0 20)">
      ${awning}
      <path d="M10 44 H180" stroke="#8E2C21" stroke-width="5" stroke-linecap="round"/>
    </g>`, 190, 180);
  save('fruit-crate', `
    <rect x="6" y="28" width="58" height="52" rx="4" fill="#B5854F"/>
    <path d="M6 46 H64 M6 64 H64" stroke="#7F4A20" stroke-width="4"/>
    <circle cx="20" cy="22" r="11" fill="#E2483D"/><circle cx="36" cy="18" r="11" fill="#FF8A1E"/><circle cx="52" cy="22" r="11" fill="#7CC943"/>`, 70, 84);
  save('fruit-splat', `
    <path d="M6 42 L14 22 L40 18 L76 22 L84 42 Z" fill="#B5854F"/>
    <path d="M14 34 L74 30" stroke="#7F4A20" stroke-width="4"/>
    <circle cx="26" cy="16" r="10" fill="#E2483D"/><circle cx="50" cy="12" r="10" fill="#FF8A1E"/><circle cx="68" cy="20" r="8" fill="#7CC943"/>`, 90, 44);
  save('laundry-bundle', `
    <path d="M8 76 C2 50 8 22 34 16 C60 12 68 42 62 76 Z" fill="#7FD0F2"/>
    <path d="M14 66 C24 44 44 34 58 40 L62 76 H12 Z" fill="#FFFFFF"/>
    <path d="M24 16 C28 6 42 6 46 14 C40 20 30 22 24 16 Z" fill="#F4779F"/>`, 70, 84);
  save('laundry-pile', `
    <ellipse cx="45" cy="30" rx="42" ry="14" fill="#7FD0F2"/>
    <ellipse cx="34" cy="22" rx="24" ry="11" fill="#FFFFFF"/>
    <ellipse cx="62" cy="20" rx="18" ry="9" fill="#F4779F"/>`, 90, 44);

  // ----- City: rooftops -----
  save('platform-roof', `
    <rect y="0" width="64" height="12" fill="#59648F"/>
    <rect y="12" width="64" height="22" fill="#3F4C73"/>
    <path d="M8 0 V12 M24 0 V12 M40 0 V12 M56 0 V12" stroke="#7C86A0" stroke-width="3"/>`, 64, 34);
  save('roof-wall', `
    <rect width="128" height="128" fill="#C98C6A"/>
    <rect x="20" y="22" width="34" height="46" rx="3" fill="#2FA4F2"/><rect x="74" y="22" width="34" height="46" rx="3" fill="#2FA4F2"/>
    <path d="M26 60 L46 30 M80 60 L100 30" stroke="#BFE7F7" stroke-width="6"/>
    <path d="M0 96 H128 M0 112 H128 M32 96 V112 M96 96 V112 M64 112 V128" stroke="#B37557" stroke-width="3"/>`, 128, 128);

  // ----- Solid walls for each world, built so they look like they'd stop a cat -----
  const WALLS = {
    stone: { dark: '#5F646C', a: '#8F949C', b: '#A5AAB2', c: '#9A9FA7', cap: '#C4C8CE', moss: '#6FA23F' },
    brick: { dark: '#6E3A2C', a: '#B5563F', b: '#C96B4F', c: '#A94E3A', cap: '#D9D2C5', moss: '#6E3A2C' },
    wood: { dark: '#5C3A1E', a: '#A8743E', b: '#BE8A4E', c: '#946232', cap: '#D3A566', moss: '#F2C440' },
  };
  const stones = (height, colors) => {
    const courses = Math.floor((height - 16) / 30);
    return Array.from({ length: courses }, (_, row) => {
      const y = 16 + row * 30;
      const blocks = row % 2
        ? [[4, 50, colors.a], [56, 50, colors.b]]
        : [[4, 30, colors.b], [36, 38, colors.a], [76, 30, colors.c]];
      return blocks.map(([x, w, fill]) => `<rect x="${x}" y="${y}" width="${w}" height="28" rx="4" fill="${fill}" stroke="${colors.dark}" stroke-width="2"/>`).join('');
    }).join('');
  };
  const wall = (name, height, colors) => save(name, `
    <rect x="2" y="8" width="106" height="${height - 8}" rx="4" fill="${colors.dark}"/>
    ${stones(height, colors)}
    <rect x="0" y="4" width="110" height="14" rx="5" fill="${colors.cap}" stroke="${colors.dark}" stroke-width="2"/>
    <path d="M8 18 C14 30 24 18 30 26 C36 18 46 22 52 18 Z" fill="${colors.moss}"/>`, 110, height);
  for (const [material, colors] of Object.entries(WALLS)) {
    wall(`${material}-wall`, 128, colors);
    wall(`${material}-wall-tall`, 280, colors);
    wall(`${material}-wall-gate`, 480, colors);
  }

  // ----- Farm: a barn to climb -----
  save('platform-barn', `
    <rect y="0" width="64" height="12" fill="#7C3B2C"/>
    <rect y="12" width="64" height="22" fill="#5C2C20"/>
    <path d="M8 0 V12 M24 0 V12 M40 0 V12 M56 0 V12" stroke="#A85A44" stroke-width="3"/>`, 64, 34);
  save('barn-wall', `
    <rect width="128" height="128" fill="#B8432F"/>
    <path d="M32 0 V128 M64 0 V128 M96 0 V128" stroke="#8F3122" stroke-width="4"/>
    <rect x="44" y="30" width="40" height="40" fill="#F4EAD2" stroke="#8F3122" stroke-width="4"/>
    <path d="M44 30 L84 70 M84 30 L44 70" stroke="#8F3122" stroke-width="4"/>`, 128, 128);

  // ----- The hidden collectible -----
  save('toy-mouse', `
    <path d="M60 46 C74 48 84 40 86 28" stroke="#F4779F" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="38" cy="42" rx="26" ry="18" fill="#FFFFFF" stroke="#1E2A4A" stroke-width="3"/>
    <circle cx="22" cy="24" r="10" fill="#FFB3C7" stroke="#1E2A4A" stroke-width="3"/>
    <circle cx="20" cy="42" r="3.5" fill="#1E2A4A"/>
    <circle cx="11" cy="48" r="4" fill="#F4779F"/>`, 92, 64);
}

villageArt();
farmArt();
sunsetArt();
villageObstacles();
farmObstacles();
vetGate();
journeyArt();
foregroundArt();
console.log('World art drawn in public/assets/worlds');
