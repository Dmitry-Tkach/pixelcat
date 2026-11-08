// Draws the village, farm and sunset worlds: repeating background layers, obstacles and gates.
// They follow the City's English look: a village, the countryside, and the town again at dusk.
// Run: npm run assets
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DUSK_FILTER, farTown, parkGate, townRow, townStreet } from './english-town.mjs';

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
  // System fonts, for the lettering on signs.
  writeFileSync(join(OUT, `${name}.png`), new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Georgia' } }).render().asPng());
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

function flowers(rand, y, spread, colors) {
  let out = '';
  for (let x = 20; x < TILE - 20; x += 40 + rand() * 60) {
    const fy = y + rand() * spread;
    const color = colors[Math.floor(rand() * colors.length)];
    out += `<circle cx="${x}" cy="${fy}" r="5" fill="${color}"/><circle cx="${x}" cy="${fy}" r="2" fill="#FFF3B0"/>`;
  }
  return out;
}

// A sky with a sun and its glow. `sun` is { x, y, r, glow } in screen pixels, or nothing.
function sky(name, stops, sun) {
  const gradient = stops.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('');
  let inner = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${gradient}</linearGradient>`;
  if (sun) {
    inner += `<radialGradient id="sunGlow" cx="${sun.x / 1280}" cy="${sun.y / 720}" r="${sun.spread ?? 0.5}">
      <stop offset="0" stop-color="${sun.glow}" stop-opacity="0.95"/><stop offset="0.15" stop-color="${sun.glow}" stop-opacity="0.6"/>
      <stop offset="0.5" stop-color="${sun.glow}" stop-opacity="0.16"/><stop offset="1" stop-color="${sun.glow}" stop-opacity="0"/>
    </radialGradient>`;
  }
  inner += `</defs><rect width="1280" height="720" fill="url(#g)"/>`;
  if (sun) inner += `<rect width="1280" height="720" fill="url(#sunGlow)"/><circle cx="${sun.x}" cy="${sun.y}" r="${sun.r}" fill="${sun.disc}"/>`;
  save(name, inner, 1280, 720);
}

// Rays of light across the screen, from the sun's side. Drawn over the buildings, behind the street.
function sunbeams(name, color, beams) {
  const paths = beams.map(([top, width, slant, opacity]) => `<path d="M${top} -20 L${top + width} -20 L${top + width - slant} 760 L${top - slant - width * 4} 760 Z" fill="url(#beam)" opacity="${opacity}"/>`).join('');
  save(name, `<defs><linearGradient id="beam" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="0.7" stop-color="${color}" stop-opacity="0.15"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>${paths}`, 1280, 720);
}

// A haze over the bottom of a far layer, so distance looks pale.
const haze = (color, height = 220) => `<defs><linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity="0.8"/>
  </linearGradient></defs><rect y="${STREET_TOP - height}" width="${TILE}" height="${height}" fill="url(#haze)"/>`;

// A hill covered in fields: strips of crops in different colours, divided by hedgerows with trees.
function fieldHill(id, base, waves, colors, hedge, rand, furrows = false) {
  const outline = hills(base, waves, '#000');
  const d = outline.match(/d="([^"]+)"/)[1];
  let fields = '';
  let x = 0;
  for (const w of widths(rand, 110, 230)) {
    const color = colors[Math.floor(rand() * colors.length)];
    const lean = (rand() - 0.5) * 60;
    fields += `<path d="M${x} ${STREET_TOP} L${x + lean} ${base - 80} L${x + w + lean} ${base - 80} L${x + w} ${STREET_TOP} Z" fill="${color}"/>`;
    if (furrows && rand() < 0.4) {
      for (let f = 8; f < w; f += 12) fields += `<path d="M${x + f} ${STREET_TOP} L${x + f + lean} ${base - 80}" stroke="#000" stroke-opacity="0.08" stroke-width="3"/>`;
    }
    fields += `<path d="M${x} ${STREET_TOP} L${x + lean} ${base - 80}" stroke="${hedge}" stroke-width="5"/>`;
    for (let t = 0; t < 3; t++) {
      const k = 0.25 + rand() * 0.6;
      fields += `<circle cx="${x + lean * (1 - k)}" cy="${STREET_TOP - (STREET_TOP - base + 80) * (1 - k)}" r="${6 + rand() * 5}" fill="${hedge}"/>`;
    }
    x += w;
  }
  return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>
    <path d="${d}" fill="${colors[0]}"/><g clip-path="url(#${id})">${fields}</g>
    <path d="${d.replace(/ L2048 520 Z$/, '').replace(/^M0 520 L0 [\d.]+/, (m) => m.replace('M0 520 L0', 'M0'))}" fill="none" stroke="${hedge}" stroke-width="6" stroke-opacity="0.8"/>`;
}

// An English oak: a broad, lumpy crown on a short trunk.
function oak(x, rand, base = STREET_TOP + 8, size = 1) {
  const h = (70 + rand() * 30) * size;
  const top = base - h;
  const dark = '#2F7D3E';
  const mid = '#3E9A4A';
  const light = '#6CC062';
  let crown = '';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    crown += `<circle cx="${x + Math.cos(a) * 52 * size}" cy="${top - 50 * size + Math.sin(a) * 34 * size}" r="${(34 + rand() * 10) * size}" fill="${dark}"/>`;
  }
  crown += `<circle cx="${x}" cy="${top - 62 * size}" r="${54 * size}" fill="${mid}"/><circle cx="${x - 30 * size}" cy="${top - 44 * size}" r="${36 * size}" fill="${mid}"/>
    <circle cx="${x + 34 * size}" cy="${top - 52 * size}" r="${34 * size}" fill="${mid}"/>
    <circle cx="${x - 20 * size}" cy="${top - 92 * size}" r="${18 * size}" fill="${light}"/><circle cx="${x + 22 * size}" cy="${top - 80 * size}" r="${13 * size}" fill="${light}"/>`;
  return `<path d="M${x - 14 * size} ${base} L${x - 8 * size} ${top} L${x + 8 * size} ${top} L${x + 14 * size} ${base} Z" fill="#7A5232"/>
    <path d="M${x} ${top + 10} L${x - 30 * size} ${top - 30 * size} M${x} ${top + 4} L${x + 28 * size} ${top - 26 * size}" stroke="#7A5232" stroke-width="${8 * size}" stroke-linecap="round"/>${crown}`;
}

// A dry-stone wall along the bottom of the layer, with upright coping stones on top.
function dryStoneWall(x0, x1, rand, base = STREET_TOP + 14, height = 40) {
  let s = `<rect x="${x0}" y="${base - height}" width="${x1 - x0}" height="${height}" fill="#8C8270"/>`;
  for (let row = 0; row < 3; row++) {
    for (let x = x0 - (row % 2) * 14; x < x1; x += 24 + rand() * 14) {
      const w = 22 + rand() * 12;
      s += `<rect x="${x}" y="${base - height + 6 + row * 11}" width="${Math.min(w, x1 - x)}" height="10" rx="4" fill="${['#C9BC9F', '#B8AB8E', '#D6CAAE'][Math.floor(rand() * 3)]}"/>`;
    }
  }
  for (let x = x0; x < x1 - 6; x += 9) s += `<rect x="${x}" y="${base - height - 8}" width="7" height="12" rx="2" fill="${rand() < 0.5 ? '#B8AB8E' : '#A79A7E'}"/>`;
  return s;
}

// ----- Village: an English village -----

// A thatched cottage: whitewash or honey-coloured stone, a thick straw roof with a window peeping
// out of it, small-paned windows, a stable door under a little hood, and roses climbing the wall.
function cottage(rand, x, w) {
  const WALLS = [['#FBF6EA', '#E8DEC8', null], ['#F6E7C8', '#E2CDA3', null], ['#D9B77A', '#C49E5E', 'cotswold']];
  const [wall, shade, pattern] = WALLS[Math.floor(rand() * WALLS.length)];
  const h = 150 + Math.floor(rand() * 2) * 20;
  const top = STREET_TOP - h;
  const ridge = top - 112;
  const fill = pattern ? 'url(#cotswold)' : wall;
  const doorColour = ['#6B8F71', '#3E6E8E', '#7A1E2C', '#2F5D3A'][Math.floor(rand() * 4)];
  let s = `<rect x="${x + 10}" y="${top}" width="${w - 20}" height="${h}" fill="${fill}"/>
    <rect x="${x + w - 26}" y="${top}" width="16" height="${h}" fill="${shade}" opacity="0.8"/>`;
  // The chimney, at one end of the ridge.
  const cx = rand() < 0.5 ? x + 30 : x + w - 64;
  s += `<rect x="${cx}" y="${ridge - 30}" width="34" height="90" fill="#B4513A"/><rect x="${cx - 3}" y="${ridge - 36}" width="40" height="8" fill="#9A4130"/>
    <rect x="${cx + 6}" y="${ridge - 50}" width="9" height="16" fill="#C8693F"/><rect x="${cx + 20}" y="${ridge - 48}" width="9" height="14" fill="#C8693F"/>`;
  // The thatch: thick and rounded, with a scalloped edge, straw lines, and a patterned ridge.
  s += `<path d="M${x - 16} ${top + 18} C${x - 16} ${top - 30} ${x + w * 0.2} ${ridge} ${x + w / 2} ${ridge} C${x + w * 0.8} ${ridge} ${x + w + 16} ${top - 30} ${x + w + 16} ${top + 18} Z" fill="#D8B160"/>
    <path d="M${x + w / 2} ${ridge} C${x + w * 0.8} ${ridge} ${x + w + 16} ${top - 30} ${x + w + 16} ${top + 18} L${x + w * 0.72} ${top + 18} C${x + w * 0.74} ${top - 30} ${x + w * 0.62} ${ridge + 20} ${x + w / 2} ${ridge} Z" fill="#C49A48"/>`;
  for (let i = 0; i < w + 32; i += 9) {
    const sx = x - 16 + i;
    s += `<path d="M${sx} ${top + 14} q${(sx - (x + w / 2)) * 0.05} -24 ${(sx - (x + w / 2)) * 0.12} -44" stroke="#B88E3E" stroke-width="2" fill="none" opacity="0.7"/>`;
  }
  for (let i = 0; i < (w + 32) / 22; i++) s += `<path d="M${x - 16 + i * 22} ${top + 16} a11 8 0 0 0 22 0" fill="#B88E3E"/>`;
  s += `<path d="M${x + w * 0.22} ${ridge + 22} Q${x + w / 2} ${ridge - 8} ${x + w * 0.78} ${ridge + 22}" stroke="#A97E33" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  for (let i = 0; i < 8; i++) {
    const zx = x + w * 0.26 + (i * w * 0.48) / 8;
    s += `<path d="M${zx} ${ridge + 18} l${w * 0.03} 10 l${w * 0.03} -10" stroke="#8E6A2A" stroke-width="2.5" fill="none"/>`;
  }
  // A window peeping out of the thatch, under an eyebrow of straw.
  const ex = x + w / 2 - 20;
  s += `<path d="M${ex - 18} ${top + 2} Q${ex + 20} ${top - 70} ${ex + 58} ${top + 2} Z" fill="#D8B160"/>
    <rect x="${ex}" y="${top - 30}" width="40" height="30" fill="#FFFFFF"/><rect x="${ex + 4}" y="${top - 26}" width="32" height="24" fill="#5FA8D3"/>
    <path d="M${ex + 20} ${top - 26} v24 M${ex + 4} ${top - 14} h32" stroke="#FFFFFF" stroke-width="2.5"/>
    <path d="M${ex - 18} ${top + 2} Q${ex + 20} ${top - 70} ${ex + 58} ${top + 2}" stroke="#B88E3E" stroke-width="6" fill="none"/>`;
  // Little windows of square panes, with flower boxes.
  const doorX = x + w / 2 - 24;
  for (const wx of [x + 26, x + w - 92]) {
    if (Math.abs(wx - doorX) < 70) continue;
    const wy = STREET_TOP - 104;
    s += `<rect x="${wx - 4}" y="${wy - 4}" width="66" height="58" rx="3" fill="#FFFFFF"/>
      <rect x="${wx}" y="${wy}" width="58" height="50" fill="#5FA8D3"/>
      <path d="M${wx} ${wy + 34} L${wx + 40} ${wy} L${wx + 52} ${wy} L${wx} ${wy + 46} Z" fill="#9DD0EE" opacity="0.7"/>
      <path d="M${wx + 19} ${wy} v50 M${wx + 39} ${wy} v50 M${wx} ${wy + 17} h58 M${wx} ${wy + 34} h58" stroke="#FFFFFF" stroke-width="2.5"/>
      <rect x="${wx - 6}" y="${wy + 50}" width="70" height="12" rx="3" fill="#7A5232"/>
      <circle cx="${wx + 6}" cy="${wy + 48}" r="7" fill="#E8456E"/><circle cx="${wx + 22}" cy="${wy + 46}" r="7" fill="#FFFFFF"/>
      <circle cx="${wx + 38}" cy="${wy + 48}" r="7" fill="#B79CEB"/><circle cx="${wx + 54}" cy="${wy + 46}" r="7" fill="#FFD568"/>`;
  }
  // The stable door under a little tiled hood, with roses climbing up beside it.
  s += `<rect x="${doorX}" y="${STREET_TOP - 92}" width="48" height="92" fill="${doorColour}"/>
    <rect x="${doorX}" y="${STREET_TOP - 48}" width="48" height="4" fill="#000000" opacity="0.2"/>
    <rect x="${doorX + 6}" y="${STREET_TOP - 84}" width="36" height="28" rx="2" fill="#000000" opacity="0.12"/>
    <circle cx="${doorX + 40}" cy="${STREET_TOP - 40}" r="3.5" fill="#F2C230"/>
    <path d="M${doorX - 14} ${STREET_TOP - 92} L${doorX + 24} ${STREET_TOP - 118} L${doorX + 62} ${STREET_TOP - 92} Z" fill="#9A4130"/>
    <rect x="${doorX - 14}" y="${STREET_TOP - 94}" width="76" height="5" fill="#7A3326"/>`;
  for (let r = 0; r < 9; r++) {
    const rx = doorX - 12 + (r % 2) * 8;
    const ry = STREET_TOP - 10 - r * 12;
    s += `<circle cx="${rx}" cy="${ry}" r="9" fill="#3E9A4A"/>`;
    if (r % 2 === 0) s += `<circle cx="${rx + 3}" cy="${ry - 3}" r="4.5" fill="#E8456E"/>`;
  }
  return s;
}

// A village church in the distance: a square tower with a pointed spire.
function church(x, base, fill) {
  return `<rect x="${x}" y="${base - 120}" width="150" height="120" fill="${fill}"/>
    <path d="M${x - 6} ${base - 118} L${x + 75} ${base - 170} L${x + 156} ${base - 118} Z" fill="${fill}"/>
    <rect x="${x + 150}" y="${base - 190}" width="56" height="190" fill="${fill}"/>
    <path d="M${x + 146} ${base - 190} L${x + 178} ${base - 300} L${x + 210} ${base - 190} Z" fill="${fill}"/>
    <path d="M${x + 168} ${base - 170} v-14 a10 10 0 0 1 20 0 v14 Z" fill="#FFFFFF" opacity="0.35"/>`;
}

function villageArt() {
  sky('park-sky', [[0, '#3C9CE0'], [0.6, '#8FCDEE'], [1, '#E6F5E8']], { x: 1080, y: 96, r: 40, glow: '#FFF4C8', disc: '#FFFBE6' });
  sunbeams('park-sunbeams', '#FFF6D0', [[740, 140, 520, 0.5], [920, 100, 520, 0.38], [1060, 160, 520, 0.46], [1200, 90, 520, 0.32]]);
  const rand = rng(77);
  let far = fieldHill('vfar', 330, [[2, 36, 0], [5, 14, 1]], ['#BFE3A8', '#D3E8A6', '#B2DB9C', '#E1E6AE'], '#86BE79', rand);
  far += church(1180, 420, '#9CC496');
  far += fieldHill('vmid', 400, [[3, 26, 2], [7, 9, 0.4]], ['#93D07F', '#A9D98B', '#C6DF88', '#86C873'], '#4E9A4F', rand);
  far += haze('#EAF6EA', 200);
  save('park-far', far, TILE, STREET_TOP);

  let near = `<defs><pattern id="cotswold" width="36" height="14" patternUnits="userSpaceOnUse">
      <rect width="36" height="14" fill="#D9B77A"/><rect x="1" y="1" width="20" height="5.5" rx="2" fill="#E3C48A"/><rect x="23" y="1" width="12" height="5.5" rx="2" fill="#CFAB6C"/>
      <rect x="1" y="8" width="11" height="5" rx="2" fill="#CFAB6C"/><rect x="14" y="8" width="21" height="5" rx="2" fill="#E3C48A"/></pattern></defs>`;
  near += hills(470, [[4, 16, 1.2]], '#5BB862');
  let x = 0;
  widths(rand, 280, 360).forEach((w, i) => {
    if (i % 3 === 2) near += oak(x + w / 2, rand);
    else near += cottage(rand, x + 18, w - 36);
    x += w;
  });
  for (let tx = 120; tx < TILE - 120; tx += 520) near += oak(tx, rand, STREET_TOP + 8, 0.8);
  // Along the front: dry-stone walls, with a five-bar gate now and then, and hedges between.
  for (let wx = 0; wx < TILE; wx += 512) {
    near += dryStoneWall(wx, wx + 300, rand);
    near += `<g transform="translate(${wx + 300} 0)">
      <rect x="4" y="${STREET_TOP - 46}" width="8" height="60" fill="#7A5232"/><rect x="92" y="${STREET_TOP - 46}" width="8" height="60" fill="#7A5232"/>
      ${[0, 1, 2, 3, 4].map((b) => `<rect x="12" y="${STREET_TOP - 40 + b * 10}" width="80" height="5" fill="#B88A58"/>`).join('')}
      <path d="M14 ${STREET_TOP + 8} L90 ${STREET_TOP - 40}" stroke="#B88A58" stroke-width="5"/></g>`;
    for (let hx = wx + 404; hx < wx + 512; hx += 34) near += `<circle cx="${hx}" cy="${STREET_TOP - 6}" r="24" fill="#2F8A3F"/><circle cx="${hx - 6}" cy="${STREET_TOP - 16}" r="10" fill="#4FAE55"/>`;
  }
  save('park-near', near, TILE, STREET_TOP + 20);

  // A grass verge full of flowers, then a cobbled lane.
  const r2 = rng(5);
  let ground = `<rect y="${STREET_TOP}" width="${TILE}" height="86" fill="#5FBF5B"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="6" fill="#2F8A3F" opacity="0.45"/>
    <rect y="${STREET_TOP + 6}" width="${TILE}" height="6" fill="#86D97A"/>`;
  for (let gx = 8; gx < TILE - 8; gx += 14 + r2() * 20) {
    const gy = STREET_TOP + 20 + r2() * 60;
    ground += `<path d="M${gx} ${gy} l-4 -10 M${gx} ${gy} l0 -13 M${gx} ${gy} l4 -10" stroke="${r2() < 0.5 ? '#3F9E45' : '#7ACB6A'}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  ground += flowers(r2, STREET_TOP + 20, 56, ['#FFFFFF', '#F58FAB', '#FFD568', '#B79CEB']);
  ground += `<rect y="${STREET_TOP + 80}" width="${TILE}" height="10" fill="#8C8270"/>`;
  for (let kx = 0; kx < TILE; kx += 32) ground += `<rect x="${kx + 1}" y="${STREET_TOP + 78}" width="30" height="12" rx="4" fill="${r2() < 0.5 ? '#C9BC9F' : '#B8AB8E'}"/>`;
  ground += `<rect y="${STREET_TOP + 90}" width="${TILE}" height="${HEIGHT - STREET_TOP - 90}" fill="#6E6A78"/>
    <rect y="${STREET_TOP + 90}" width="${TILE}" height="10" fill="#4E4A58" opacity="0.7"/>`;
  for (let row = 0; row < 4; row++) {
    const y = STREET_TOP + 98 + row * 26;
    for (let cx = (row % 2) * -24; cx < TILE; cx += 48) {
      const tint = ['#A9A6B4', '#B6B3C0', '#9E9BAA', '#B1AEBB'][Math.floor(r2() * 4)];
      ground += `<rect x="${cx + 2}" y="${y}" width="44" height="22" rx="9" fill="${tint}"/>
        <rect x="${cx + 6}" y="${y + 2}" width="30" height="5" rx="2.5" fill="#FFFFFF" opacity="0.28"/>
        <rect x="${cx + 4}" y="${y + 17}" width="40" height="4" rx="2" fill="#000000" opacity="0.14"/>`;
      if (r2() < 0.05) ground += `<path d="M${cx} ${y + 22} l-3 -8 M${cx} ${y + 22} l2 -9" stroke="#5FAE55" stroke-width="2.5" stroke-linecap="round"/>`;
    }
  }
  save('park-street', `<g transform="translate(0 -${STREET_TOP})">${ground}</g>`, TILE, HEIGHT - STREET_TOP);
}

// ----- Farm: the English countryside -----

function barn(x) {
  let planks = '';
  for (let px = x + 14; px < x + 250; px += 18) planks += `<rect x="${px}" y="${STREET_TOP - 206}" width="2.5" height="206" fill="#A9301F" opacity="0.6"/>`;
  let shingles = '';
  for (let row = 0; row < 5; row++) {
    const y = STREET_TOP - 296 + row * 19;
    shingles += `<path d="M${x - 10 + (5 - row) * 10} ${y + 16} H${x + 290 - (5 - row) * 10}" stroke="#463029" stroke-width="3"/>`;
  }
  return `<rect x="${x}" y="${STREET_TOP - 210}" width="280" height="210" fill="#D8402F"/>${planks}
    <rect x="${x + 250}" y="${STREET_TOP - 210}" width="30" height="210" fill="#AE2F22"/>
    <rect x="${x}" y="${STREET_TOP - 210}" width="280" height="10" fill="#000000" opacity="0.15"/>
    <path d="M${x - 16} ${STREET_TOP - 206} L${x + 50} ${STREET_TOP - 300} H${x + 230} L${x + 296} ${STREET_TOP - 206} Z" fill="#5B4037"/>${shingles}
    <path d="M${x - 16} ${STREET_TOP - 206} L${x + 50} ${STREET_TOP - 300} H${x + 230} L${x + 296} ${STREET_TOP - 206}" stroke="#F4EAD2" stroke-width="5" fill="none"/>
    <rect x="${x + 96}" y="${STREET_TOP - 122}" width="88" height="122" fill="#FFF3D6"/>
    <path d="M${x + 96} ${STREET_TOP - 122} L${x + 184} ${STREET_TOP} M${x + 184} ${STREET_TOP - 122} L${x + 96} ${STREET_TOP}" stroke="#D8402F" stroke-width="10"/>
    <rect x="${x + 92}" y="${STREET_TOP - 126}" width="96" height="6" fill="#F4EAD2"/>
    <circle cx="${x + 140}" cy="${STREET_TOP - 178}" r="26" fill="#FFF3D6"/><circle cx="${x + 140}" cy="${STREET_TOP - 178}" r="18" fill="#6E4A2A"/>
    <path d="M${x + 124} ${STREET_TOP - 188} a18 18 0 0 1 14 -8" stroke="#F4EAD2" stroke-width="3" fill="none"/>`;
}

function silo(x) {
  return `<rect x="${x}" y="${STREET_TOP - 270}" width="96" height="270" fill="#C7CFDF"/>
    <rect x="${x + 12}" y="${STREET_TOP - 270}" width="10" height="270" fill="#E3E8F1"/>
    <rect x="${x + 68}" y="${STREET_TOP - 270}" width="28" height="270" fill="#A5AFC4"/>
    <path d="M${x} ${STREET_TOP - 270} A48 44 0 0 1 ${x + 96} ${STREET_TOP - 270} Z" fill="#E2483D"/>
    <path d="M${x + 14} ${STREET_TOP - 290} a40 36 0 0 1 26 -18" stroke="#F07A70" stroke-width="5" fill="none"/>
    <path d="M${x} ${STREET_TOP - 200} H${x + 96} M${x} ${STREET_TOP - 130} H${x + 96} M${x} ${STREET_TOP - 60} H${x + 96}" stroke="#8E96A3" stroke-width="4"/>`;
}

function windmill(x) {
  let blades = '';
  for (const angle of [15, 105, 195, 285]) {
    blades += `<g transform="rotate(${angle})"><rect x="-11" y="-102" width="22" height="94" rx="3" fill="#FFF8E7"/>
      <path d="M-11 -86 H11 M-11 -66 H11 M-11 -46 H11 M-11 -26 H11" stroke="#D9C9A8" stroke-width="2"/></g>`;
  }
  return `<path d="M${x - 44} ${STREET_TOP} L${x - 26} ${STREET_TOP - 210} H${x + 26} L${x + 44} ${STREET_TOP} Z" fill="#E9D2A6"/>
    <path d="M${x + 10} ${STREET_TOP} L${x + 8} ${STREET_TOP - 210} H${x + 26} L${x + 44} ${STREET_TOP} Z" fill="#CFB585"/>
    <rect x="${x - 10}" y="${STREET_TOP - 60}" width="22" height="60" rx="3" fill="#8E5A30"/>
    <rect x="${x - 8}" y="${STREET_TOP - 150}" width="16" height="22" rx="2" fill="#5FA8D3"/>
    <path d="M${x - 34} ${STREET_TOP - 208} L${x} ${STREET_TOP - 252} L${x + 34} ${STREET_TOP - 208} Z" fill="#8E5A30"/>
    <g transform="translate(${x} ${STREET_TOP - 214})">${blades}<circle r="11" fill="#6F4522"/></g>`;
}

function hayStack(x, base = STREET_TOP + 6) {
  return `<path d="M${x - 50} ${base} C${x - 50} ${base - 70} ${x + 50} ${base - 70} ${x + 50} ${base} Z" fill="#F2C440"/>
    <path d="M${x - 40} ${base - 30} C${x - 30} ${base - 52} ${x - 10} ${base - 56} ${x} ${base - 56}" stroke="#FFE38A" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M${x - 26} ${base - 6} C${x - 22} ${base - 34} ${x - 10} ${base - 44} ${x - 2} ${base - 50} M${x + 18} ${base - 6} C${x + 18} ${base - 26} ${x + 22} ${base - 34} ${x + 28} ${base - 40}" stroke="#CC9620" stroke-width="5" fill="none" stroke-linecap="round"/>`;
}

// A round bale of hay, with its spiral showing.
function roundBale(x, base = STREET_TOP + 4) {
  return `<rect x="${x - 34}" y="${base - 58}" width="68" height="58" rx="10" fill="#E8B93C"/>
    <ellipse cx="${x + 34}" cy="${base - 29}" rx="14" ry="29" fill="#F2C95A"/>
    <path d="M${x + 34} ${base - 29} m-4 0 a4 6 0 1 1 8 0 a8 12 0 1 1 -16 0 a12 18 0 1 1 24 0" stroke="#C4921E" stroke-width="2.5" fill="none"/>
    <path d="M${x - 30} ${base - 40} H${x + 24} M${x - 30} ${base - 20} H${x + 24}" stroke="#C4921E" stroke-width="2" opacity="0.6"/>`;
}

// A woolly sheep, as seen grazing on the hill.
function sheep(x, y, flip = 1) {
  return `<g transform="translate(${x} ${y}) scale(${flip} 1)">
    <rect x="-14" y="2" width="5" height="16" rx="2" fill="#2B2D3A"/><rect x="8" y="2" width="5" height="16" rx="2" fill="#2B2D3A"/>
    <circle cx="-12" cy="-4" r="11" fill="#F7F5EE"/><circle cx="0" cy="-8" r="13" fill="#FFFFFF"/><circle cx="12" cy="-4" r="11" fill="#F7F5EE"/><circle cx="0" cy="2" r="11" fill="#F0EDE4"/>
    <ellipse cx="24" cy="-8" rx="8" ry="10" fill="#2B2D3A"/><circle cx="27" cy="-10" r="1.8" fill="#FFFFFF"/></g>`;
}

function farmArt() {
  sky('farm-sky', [[0, '#3E9EDF'], [0.6, '#A9D7EE'], [1, '#FFF1C8']], { x: 1060, y: 110, r: 44, glow: '#FFE9A8', disc: '#FFF8DC' });
  sunbeams('farm-sunbeams', '#FFE9A8', [[700, 150, 560, 0.5], [880, 110, 560, 0.42], [1040, 170, 560, 0.5], [1190, 100, 560, 0.36]]);
  const rand = rng(303);
  let far = fieldHill('ffar', 360, [[2, 34, 1], [5, 12, 0.3]], ['#D9D98A', '#E6C95E', '#B9D57E', '#C7A266'], '#8DB062', rand, true);
  far += fieldHill('fmid', 425, [[3, 24, 0.2], [7, 8, 2]], ['#F0C94F', '#E5B843', '#A6CF6A', '#C99A5A'], '#6E9E45', rand, true);
  for (const [sx, sy, f] of [[300, 452, 1], [360, 458, -1], [1150, 448, 1], [1700, 455, -1], [1760, 450, 1]]) far += sheep(sx, sy, f);
  far += haze('#FFF4D6', 200);
  save('farm-far', far, TILE, STREET_TOP);

  let near = hills(474, [[4, 12, 0.8]], '#8CD45B');
  near += barn(90) + silo(400) + windmill(680) + barn(1010) + silo(1320) + windmill(1640);
  for (const hx of [560, 1500]) near += hayStack(hx);
  for (const bx of [850, 910, 1880]) near += roundBale(bx);
  for (const tx of [960, 1460, 1960]) near += oak(tx, rand, STREET_TOP + 8, 0.9);
  // A post-and-rail fence, lit along the top of each rail.
  for (let fx = 0; fx < TILE; fx += 64) {
    near += `<rect x="${fx + 26}" y="${STREET_TOP - 46}" width="12" height="62" rx="3" fill="#A87A48"/><rect x="${fx + 26}" y="${STREET_TOP - 46}" width="4" height="62" fill="#C99A62"/>`;
  }
  near += `<rect y="${STREET_TOP - 32}" width="${TILE}" height="10" fill="#B88A58"/><rect y="${STREET_TOP - 32}" width="${TILE}" height="3" fill="#D8AE7A"/>
    <rect y="${STREET_TOP - 10}" width="${TILE}" height="10" fill="#B88A58"/><rect y="${STREET_TOP - 10}" width="${TILE}" height="3" fill="#D8AE7A"/>`;
  save('farm-near', near, TILE, STREET_TOP + 20);

  // A grass verge with dandelions, then a rutted dirt track with pebbles and puddles.
  const r2 = rng(19);
  let ground = `<rect y="${STREET_TOP}" width="${TILE}" height="86" fill="#7FCF4E"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="6" fill="#4E9C2E" opacity="0.5"/>
    <rect y="${STREET_TOP + 6}" width="${TILE}" height="6" fill="#A9E879"/>`;
  for (let gx = 12; gx < TILE - 12; gx += 18 + r2() * 26) {
    const gy = STREET_TOP + 22 + r2() * 56;
    ground += `<path d="M${gx} ${gy} l-5 -12 M${gx} ${gy} l0 -15 M${gx} ${gy} l5 -12" stroke="${r2() < 0.5 ? '#59A838' : '#94D86A'}" stroke-width="3" stroke-linecap="round"/>`;
    if (r2() < 0.15) ground += `<circle cx="${gx + 8}" cy="${gy - 12}" r="5" fill="#FFD23F"/><circle cx="${gx + 8}" cy="${gy - 12}" r="2" fill="#F2A900"/>`;
  }
  ground += `<defs><linearGradient id="track" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A86A3E"/><stop offset="0.5" stop-color="#BF8150"/><stop offset="1" stop-color="#AE7044"/></linearGradient></defs>
    <rect y="${STREET_TOP + 86}" width="${TILE}" height="${HEIGHT - STREET_TOP - 86}" fill="url(#track)"/>
    <rect y="${STREET_TOP + 86}" width="${TILE}" height="10" fill="#8F5A33"/>
    <path d="M0 ${STREET_TOP + 96} ${Array.from({ length: 65 }, (_, i) => `L${i * 32} ${STREET_TOP + 96 + (i % 2 ? 4 : -2)}`).join(' ')} L${TILE} ${STREET_TOP + 92} V${STREET_TOP + 86} H0 Z" fill="#6FB445"/>`;
  // Two wheel ruts along the track, each with a lit edge.
  for (const ry of [STREET_TOP + 122, STREET_TOP + 170]) {
    ground += `<rect y="${ry}" width="${TILE}" height="9" fill="#93592F"/><rect y="${ry + 9}" width="${TILE}" height="3" fill="#D39A68"/>`;
  }
  for (let i = 0; i < 260; i++) {
    const px = r2() * TILE;
    const py = STREET_TOP + 100 + r2() * (HEIGHT - STREET_TOP - 104);
    const r = 2 + r2() * 4;
    ground += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.7).toFixed(1)}" fill="${r2() < 0.5 ? '#D8A878' : '#8F5A33'}"/>`;
  }
  for (const px of [380, 1240, 1820]) {
    ground += `<ellipse cx="${px}" cy="${STREET_TOP + 150}" rx="58" ry="10" fill="#7F4A28"/><ellipse cx="${px}" cy="${STREET_TOP + 149}" rx="52" ry="7" fill="#9FC8E6"/>
      <ellipse cx="${px - 16}" cy="${STREET_TOP + 147}" rx="18" ry="2.5" fill="#FFFFFF" opacity="0.7"/>`;
  }
  save('farm-street', `<g transform="translate(0 -${STREET_TOP})">${ground}</g>`, TILE, HEIGHT - STREET_TOP);
}

// ----- Sunset: the English town again, at dusk, on the way to the last park -----

function sunsetArt() {
  // The sun is low, near the rooftops, and the sky runs from violet to gold.
  sky('vet-sky', [[0, '#3B2A78'], [0.4, '#A5448E'], [0.72, '#F2765F'], [1, '#FFC163']], { x: 1040, y: 420, r: 70, glow: '#FFD27A', disc: '#FFE7A8', spread: 0.7 });
  sunbeams('vet-sunbeams', '#FFB070', [[900, 120, 260, 0.45], [1040, 90, 300, 0.4], [1160, 140, 240, 0.42], [1250, 80, 300, 0.3]]);
  const clouds = rng(11);
  let cloudArt = '';
  for (let i = 0; i < 8; i++) {
    const x = 120 + i * 230 + clouds() * 60;
    const y = 90 + clouds() * 150;
    const s = 0.7 + clouds() * 0.8;
    const puff = (dy) => `<circle cx="0" cy="${20 + dy}" r="34"/><circle cx="44" cy="${dy}" r="46"/><circle cx="96" cy="${16 + dy}" r="38"/><circle cx="138" cy="${28 + dy}" r="26"/>
      <rect x="-34" y="${24 + dy}" width="198" height="30" rx="15"/>`;
    // Lit gold from the low sun underneath, pink on top.
    cloudArt += `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.88"><g fill="#FFC88A">${puff(7)}</g><g fill="#F7A5B4">${puff(0)}</g>
      <ellipse cx="40" cy="-14" rx="26" ry="12" fill="#FBC3CB"/></g>`;
  }
  save('vet-clouds', cloudArt, TILE, 320);
  save('vet-far', `<defs>${DUSK_FILTER}</defs><g filter="url(#dusk)">${farTown()}</g>${haze('#F49A7A', 220)}`, TILE, STREET_TOP);
  save('vet-near', townRow({ dusk: true }), TILE, STREET_TOP + 20);
  save('vet-street', townStreet({ dusk: true }), TILE, HEIGHT - STREET_TOP);
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
  // A leafy branch, lit on top and shaded underneath.
  save('platform-leafy', `
    <rect y="8" width="64" height="16" rx="6" fill="#8E5A30"/>
    <rect y="8" width="64" height="4" rx="2" fill="#B07A48"/>
    <rect y="20" width="64" height="5" rx="2" fill="#6A4020"/>
    <ellipse cx="16" cy="11" rx="20" ry="11" fill="#3CB460"/><ellipse cx="46" cy="10" rx="22" ry="11" fill="#46C46B"/>
    <ellipse cx="12" cy="6" rx="9" ry="4" fill="#7AD98A"/><ellipse cx="44" cy="5" rx="10" ry="4" fill="#86E294"/>
    <ellipse cx="30" cy="19" rx="14" ry="5" fill="#2F8A3F" opacity="0.6"/>
    <rect y="0" width="64" height="6" fill="#2F9E4F"/><rect y="0" width="64" height="2" fill="#6CCB78"/>`, 64, 34);
  // The village green's gates, in honey-coloured stone.
  save('park-gate', parkGate({ sign: 'THE GREEN', pillar: '#D9B77A', pillarShade: '#C49E5E', signColour: '#2F5D3A' }), 360, 340);
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
    <rect y="2" width="64" height="4" rx="2" fill="#FFE38A"/>
    <rect y="22" width="64" height="10" fill="#D6A42A"/>
    <rect y="29" width="64" height="4" fill="#B8861E"/>
    <path d="M10 6 V20 M28 8 V18 M46 6 V20 M58 10 V18" stroke="#C4921E" stroke-width="4" stroke-linecap="round"/>`, 64, 34);
  // The meadow's gates, in weathered stone.
  save('farm-gate', parkGate({ sign: 'MEADOW', pillar: '#B8AB8E', pillarShade: '#9A8E72', signColour: '#6E4A2A' }), 360, 340);
}

// The last park's gates, lit by lamps as the sun goes down.
function vetGate() {
  save('vet-gate', parkGate({ sign: 'PARK', pillar: '#9C5945', pillarShade: '#824837', signColour: '#2B2D3A', dusk: true }), 360, 340);
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
    ${repeat(64, (x, i) => `<circle cx="${x + 32}" cy="${34 + (i % 3) * 3}" r="${26 - (i % 3) * 3}" fill="${i % 2 ? '#2F8A3F' : '#37994A'}"/>`)}
    ${repeat(64, (x, i) => `<circle cx="${x + 24}" cy="${22 + (i % 3) * 3}" r="7" fill="#5FB866"/>${i % 4 === 1 ? `<circle cx="${x + 40}" cy="${26}" r="4" fill="#F58FAB"/>` : ''}`)}`, W, H);
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


// ----- Level objects shared by every world -----
function levelObjectArt() {
  // A tall stack of cardboard boxes: too tall to jump, but a slide smashes straight through.
  const box = (x, y, w, h, tint) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${tint}" stroke="#8E5E2E" stroke-width="2.5"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h * 0.16}" rx="2" fill="#000000" opacity="0.08"/>
    <rect x="${x + w / 2 - 6}" y="${y}" width="12" height="${h}" fill="#E8C890" opacity="0.9"/>
    <rect x="${x + 4}" y="${y + 3}" width="${w - 8}" height="3" rx="1.5" fill="#FFFFFF" opacity="0.35"/>
    <path d="M${x + 10} ${y + h - 14} l10 -8 l10 8" stroke="#8E5E2E" stroke-width="2.5" fill="none" opacity="0.6"/>`;
  save('box-stack', `
    ${box(6, 196, 98, 84, '#D9A066')}${box(14, 118, 84, 80, '#E3B27A')}${box(4, 48, 92, 72, '#D49A5E')}${box(24, 0, 70, 50, '#E8BC86')}
    <path d="M30 150 h20 M40 140 v20" stroke="#C0392B" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`, 110, 280);
  save('box-piece', box(2, 2, 36, 32, '#D9A066'), 40, 36);

  // A paw-print block floating just over the cat's head: bump it from below.
  const block = (face, rim, paw) => `<rect x="2" y="2" width="68" height="68" rx="12" fill="${rim}"/>
    <rect x="6" y="5" width="60" height="58" rx="10" fill="${face}"/>
    <rect x="10" y="8" width="52" height="8" rx="4" fill="#FFFFFF" opacity="0.45"/>
    <g transform="translate(36 39)" fill="${paw}"><ellipse cx="0" cy="6" rx="11" ry="9"/><circle cx="-12" cy="-6" r="4.5"/><circle cx="-4" cy="-12" r="4.5"/><circle cx="4" cy="-12" r="4.5"/><circle cx="12" cy="-6" r="4.5"/></g>
    <circle cx="12" cy="60" r="2.5" fill="${rim}"/><circle cx="60" cy="60" r="2.5" fill="${rim}"/><circle cx="12" cy="12" r="2.5" fill="${rim}"/><circle cx="60" cy="12" r="2.5" fill="${rim}"/>`;
  save('paw-block', block('#FFC531', '#C88A12', '#E8456E'), 72, 72);
  save('paw-block-used', block('#C9A77A', '#8E6E48', '#9E8262'), 72, 72);

  // A ditch across the road. Its top half is the trench seen across the far side of the road, from
  // the kerb to where the cat runs; below that is its side, with water at the bottom.
  save('ditch', `<defs>
      <linearGradient id="mouth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A3E2A"/><stop offset="0.25" stop-color="#2B2019"/><stop offset="1" stop-color="#1E1712"/></linearGradient>
      <linearGradient id="pit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2019"/><stop offset="1" stop-color="#4A3426"/></linearGradient></defs>
    <path d="M14 0 H206 L214 52 H6 Z" fill="url(#mouth)"/>
    <path d="M14 0 H206 L208 10 H12 Z" fill="#7A5434"/>
    <path d="M12 10 L6 52 M208 10 L214 52" stroke="#8E6440" stroke-width="5"/>
    <rect x="0" y="52" width="220" height="88" fill="url(#pit)"/>
    <rect x="0" y="50" width="220" height="6" fill="#8E6440"/>
    <path d="M0 52 h20 l-6 88 h-14 Z" fill="#6E4A2E"/><path d="M220 52 h-20 l6 88 h14 Z" fill="#6E4A2E"/>
    ${[66, 86, 108].map((y) => `<circle cx="9" cy="${y}" r="3" fill="#8E6440"/><circle cx="211" cy="${y + 6}" r="3" fill="#8E6440"/>`).join('')}
    <rect x="12" y="112" width="196" height="28" fill="#4E8DB8"/>
    <rect x="12" y="112" width="196" height="5" fill="#8CC6E6"/>
    <path d="M44 124 h30 M124 128 h40" stroke="#BFE3F5" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    <path d="M22 52 q4 -12 8 -16 M198 52 q-3 -10 -8 -14" stroke="#5FAE55" stroke-width="3" fill="none" stroke-linecap="round"/>`, 220, 140);

  // A garden wall with a cat flap at the bottom. The open one is where the cat comes out.
  const flapWall = (open) => {
    let bricks = '';
    for (let row = 0; row < 7; row++) {
      for (let x = (row % 2) * -20; x < 180; x += 40) bricks += `<rect x="${Math.max(0, x) + 1}" y="${24 + row * 20}" width="${Math.min(38, 180 - Math.max(0, x)) - 2}" height="18" rx="2" fill="${(row + x / 40) % 3 ? '#B4513A' : '#C26442'}"/>`;
    }
    return `<rect x="0" y="22" width="180" height="146" fill="#8E392E"/>${bricks}
      <rect x="-4" y="8" width="188" height="18" rx="4" fill="#EFE7D6"/><rect x="-4" y="8" width="188" height="5" rx="2" fill="#FFFFFF" opacity="0.6"/>
      <rect x="56" y="88" width="68" height="80" rx="6" fill="#4A3426"/>
      <rect x="62" y="94" width="56" height="74" rx="4" fill="${open ? '#2B2019' : '#3E6E8E'}"/>
      ${open ? '<path d="M62 94 h56 l-8 -22 h-40 Z" fill="#3E6E8E"/><path d="M68 80 h44" stroke="#2C506A" stroke-width="3"/>' : '<rect x="66" y="98" width="48" height="66" rx="3" fill="#2C506A" opacity="0.5"/><g transform="translate(90 128)" fill="#FFC531"><ellipse cx="0" cy="5" rx="9" ry="7"/><circle cx="-10" cy="-5" r="3.5"/><circle cx="-3" cy="-10" r="3.5"/><circle cx="3" cy="-10" r="3.5"/><circle cx="10" cy="-5" r="3.5"/></g>'}
      <rect x="66" y="40" width="48" height="26" rx="4" fill="#22A67E" stroke="#FFFFFF" stroke-width="3"/>
      <path d="M78 53 h20 m-7 -7 l7 7 l-7 7" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  save('cat-flap', flapWall(false), 180, 168);
  save('cat-flap-open', flapWall(true), 180, 168);

  // What the crow drops: an acorn, with its cap.
  save('acorn', `
    <ellipse cx="16" cy="22" rx="11" ry="12" fill="#B8742F"/><ellipse cx="13" cy="20" rx="4" ry="6" fill="#E0A05A" opacity="0.8"/>
    <path d="M3 14 Q16 2 29 14 Q16 18 3 14 Z" fill="#6E4A2A"/><path d="M8 11 h16 M10 8 h12" stroke="#8E6440" stroke-width="2"/>
    <rect x="15" y="0" width="3" height="6" rx="1.5" fill="#5A3A1E"/>`, 32, 36);

  // The catnip power-up: a green box with a leaf on it.
  save('catnip-box', `
    <rect x="2" y="2" width="68" height="68" rx="14" fill="#2F8A3F"/>
    <rect x="6" y="5" width="60" height="58" rx="11" fill="#57CF62"/>
    <rect x="10" y="8" width="52" height="8" rx="4" fill="#FFFFFF" opacity="0.45"/>
    <path d="M36 54 C14 46 14 22 36 14 C58 22 58 46 36 54 Z" fill="#2F8A3F"/>
    <path d="M36 54 V18 M36 40 l-10 -8 M36 32 l10 -8 M36 46 l9 -6" stroke="#B6F5A8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="56" cy="16" r="4" fill="#FFF3A6"/><circle cx="16" cy="56" r="3" fill="#FFF3A6"/>`, 72, 72);
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
    <rect y="0" width="64" height="3" fill="#8D97BD"/>
    <rect y="30" width="64" height="4" fill="#2C3657"/>
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
    <rect y="0" width="64" height="3" fill="#B26A54"/>
    <rect y="30" width="64" height="4" fill="#3E1C14"/>
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
levelObjectArt();
console.log('World art drawn in public/assets/worlds');
