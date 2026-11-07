// Draws a bright English high street as seamless parallax layers, plus obstacle sprites.
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
  // System fonts, for the lettering on shop signs.
  writeFileSync(join(OUT, `${name}.png`), new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Georgia' } }).render().asPng());
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

// A soft English morning: a paler sky than a summer's day, with the sun's glow in one corner.
function sky() {
  const inner = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4FA3DE"/><stop offset="0.55" stop-color="#93CBEE"/><stop offset="1" stop-color="#E3F1FA"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.86" cy="0.12" r="0.5">
      <stop offset="0" stop-color="#FFF7D6" stop-opacity="0.9"/><stop offset="0.12" stop-color="#FFF2B8" stop-opacity="0.6"/>
      <stop offset="0.45" stop-color="#FFE9A8" stop-opacity="0.15"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="1280" height="720" fill="url(#g)"/><rect width="1280" height="720" fill="url(#sun)"/>
    <circle cx="1100" cy="86" r="40" fill="#FFFBE6"/>`;
  save('sky', inner, 1280, 720);
}

function clouds() {
  const rand = rng(7);
  let inner = '';
  for (let i = 0; i < 9; i++) {
    // Kept clear of the image's edges, so no cloud is cut off where the layer repeats.
    const x = 110 + i * 205 + rand() * 50;
    const y = 80 + rand() * 160;
    const s = 0.7 + rand() * 0.9;
    // A pale blue-grey underside under the white, so each cloud looks round.
    const puff = (dy) => `<circle cx="0" cy="${20 + dy}" r="34"/><circle cx="44" cy="${dy}" r="46"/><circle cx="96" cy="${16 + dy}" r="38"/><circle cx="138" cy="${28 + dy}" r="26"/>
      <rect x="-34" y="${24 + dy}" width="198" height="30" rx="15"/>`;
    inner += `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.95">
      <g fill="#C9D9E6">${puff(7)}</g><g fill="#FFFFFF">${puff(0)}</g>
      <ellipse cx="40" cy="-14" rx="26" ry="12" fill="#FFFFFF"/></g>`;
  }
  save('clouds', inner, TILE, 320);
}

// The town in the distance: terraced roofs with chimney pots, church spires, a dome and a clock
// tower, all pale with distance, with a haze rising from the street.
function farCity() {
  const rand = rng(21);
  const pale = ['#A9CBE2', '#B8D5E8'];
  let inner = `<defs><linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#E3F1FA" stop-opacity="0"/><stop offset="1" stop-color="#EDF6FC" stop-opacity="0.85"/>
    </linearGradient></defs>`;
  let x = 0;
  widths(rand, 110, 220).forEach((w, i) => {
    const fill = pale[i % 2];
    const kind = rand();
    const top = STREET_TOP - (190 + rand() * 120);
    if (kind < 0.12) {
      // A church: a square tower with a tall spire.
      const tw = 46;
      const tx = x + w / 2 - tw / 2;
      const towerTop = STREET_TOP - 300;
      inner += `<rect x="${x}" y="${top + 40}" width="${w}" height="${STREET_TOP - top - 40}" fill="${fill}"/>
        <rect x="${tx}" y="${towerTop}" width="${tw}" height="${STREET_TOP - towerTop}" fill="${fill}"/>
        <path d="M${tx - 4} ${towerTop} L${tx + tw / 2} ${towerTop - 130} L${tx + tw + 4} ${towerTop} Z" fill="${fill}"/>`;
    } else if (kind < 0.2) {
      // A great dome on a drum, with a lantern on top.
      const cx = x + w / 2;
      inner += `<rect x="${x}" y="${top + 30}" width="${w}" height="${STREET_TOP - top - 30}" fill="${fill}"/>
        <rect x="${cx - 52}" y="${top - 30}" width="104" height="60" fill="${fill}"/>
        <path d="M${cx - 60} ${top - 28} A60 64 0 0 1 ${cx + 60} ${top - 28} Z" fill="${fill}"/>
        <rect x="${cx - 9}" y="${top - 116}" width="18" height="30" fill="${fill}"/>
        <path d="M${cx - 10} ${top - 116} L${cx} ${top - 140} L${cx + 10} ${top - 116} Z" fill="${fill}"/>`;
    } else if (kind < 0.27) {
      // A clock tower.
      const tw = 54;
      const tx = x + w / 2 - tw / 2;
      const towerTop = STREET_TOP - 340;
      inner += `<rect x="${x}" y="${top + 50}" width="${w}" height="${STREET_TOP - top - 50}" fill="${fill}"/>
        <rect x="${tx}" y="${towerTop}" width="${tw}" height="${STREET_TOP - towerTop}" fill="${fill}"/>
        <rect x="${tx - 6}" y="${towerTop - 14}" width="${tw + 12}" height="18" fill="${fill}"/>
        <path d="M${tx - 4} ${towerTop - 14} L${tx + tw / 2} ${towerTop - 96} L${tx + tw + 4} ${towerTop - 14} Z" fill="${fill}"/>
        <circle cx="${tx + tw / 2}" cy="${towerTop + 34}" r="17" fill="#DCEBF5"/>
        <path d="M${tx + tw / 2} ${towerTop + 34} v-11 M${tx + tw / 2} ${towerTop + 34} h8" stroke="${fill}" stroke-width="3"/>`;
    } else {
      // Terraced houses: a pitched roof and chimney stacks with pots.
      inner += `<rect x="${x}" y="${top}" width="${w}" height="${STREET_TOP - top}" fill="${fill}"/>
        <path d="M${x} ${top} L${x + 14} ${top - 24} L${x + w - 14} ${top - 24} L${x + w} ${top} Z" fill="${fill}"/>`;
      for (let c = x + 22; c < x + w - 30; c += 70 + rand() * 30) {
        inner += `<rect x="${c}" y="${top - 52}" width="24" height="30" fill="${fill}"/>
          <rect x="${c + 3}" y="${top - 62}" width="6" height="11" fill="${fill}"/><rect x="${c + 15}" y="${top - 60}" width="6" height="9" fill="${fill}"/>`;
      }
      for (let wy = top + 24; wy < STREET_TOP - 34; wy += 44) {
        for (let wx = x + 18; wx < x + w - 26; wx += 36) {
          inner += `<rect x="${wx}" y="${wy}" width="14" height="24" rx="1" fill="#DCEBF5"/>`;
        }
      }
    }
    x += w;
  });
  inner += `<rect y="${STREET_TOP - 260}" width="${TILE}" height="260" fill="url(#haze)"/>`;
  save('far', inner, TILE, STREET_TOP);
}

// Brick in reds and yellow stock, and the painted stucco of pastel terraces.
const BRICKS = [['#B4513A', '#9A4130'], ['#C26442', '#A54F33'], ['#A9473A', '#8E392E'], ['#CF9457', '#B37A43'], ['#9C5945', '#824837']];
const STUCCO = [['#F4E8D2', '#DCCDB2'], ['#F3CFC8', '#DDB2AA'], ['#C3DDEA', '#A6C4D3'], ['#D2EAD8', '#B3D3BB'], ['#F7E2A8', '#E0C886']];
const SHOP_PAINT = ['#1F4D3A', '#1E3A5F', '#7A1E2C', '#2B2D3A', '#2F6A73', '#5B3A6E'];
const SHOP_NAMES = ['BAKERY', 'TEA ROOM', 'BOOKS', 'FLORIST', 'CHEMIST', 'BUTCHER', 'NEWSAGENT', 'FISH & CHIPS', 'POST OFFICE', 'SWEETS', 'HARDWARE', 'ANTIQUES'];
const DOORS = ['#C8202F', '#1E3A5F', '#1F6B45', '#F2C230', '#2B2D3A', '#7FB8D8'];
const STONE = '#EFE7D6';

function brickPatterns() {
  return BRICKS.map(([brick, mortarShade], i) => `
    <pattern id="brick${i}" width="40" height="16" patternUnits="userSpaceOnUse">
      <rect width="40" height="16" fill="${brick}"/>
      <rect y="7" width="40" height="1.5" fill="#E9D9C9" opacity="0.55"/><rect y="15" width="40" height="1.5" fill="#E9D9C9" opacity="0.55"/>
      <rect x="10" width="1.5" height="7" fill="#E9D9C9" opacity="0.55"/><rect x="30" y="8" width="1.5" height="7" fill="#E9D9C9" opacity="0.55"/>
      <rect x="22" y="1" width="7" height="5" fill="${mortarShade}" opacity="0.35"/><rect x="3" y="9" width="6" height="5" fill="#FFFFFF" opacity="0.08"/>
    </pattern>`).join('');
}

// A white sash window: two panes, one above the other, under a stone lintel.
function sashWindow(wx, wy, ww = 46, wh = 70) {
  const half = wh / 2;
  return `<rect x="${wx - 6}" y="${wy - 10}" width="${ww + 12}" height="8" fill="${STONE}"/>
    <rect x="${wx - 4}" y="${wy - 4}" width="${ww + 8}" height="${wh + 8}" rx="2" fill="#FFFFFF"/>
    <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="#5FA8D3"/>
    <path d="M${wx} ${wy + wh * 0.62} L${wx + ww * 0.7} ${wy} L${wx + ww} ${wy} L${wx} ${wy + wh * 0.92} Z" fill="#9DD0EE" opacity="0.8"/>
    <rect x="${wx}" y="${wy + half - 2.5}" width="${ww}" height="5" fill="#FFFFFF"/>
    <rect x="${wx + ww / 2 - 1.5}" y="${wy}" width="3" height="${wh}" fill="#FFFFFF"/>
    <rect x="${wx}" y="${wy + half / 2 - 1}" width="${ww}" height="2" fill="#FFFFFF"/>
    <rect x="${wx}" y="${wy + half + half / 2 - 1}" width="${ww}" height="2" fill="#FFFFFF"/>
    <rect x="${wx - 8}" y="${wy + wh + 4}" width="${ww + 16}" height="7" rx="2" fill="${STONE}"/>
    <rect x="${wx - 8}" y="${wy + wh + 10}" width="${ww + 16}" height="3" fill="#000000" opacity="0.12"/>`;
}

// A front door painted a bright colour, with a fanlight over it and steps up to it.
function frontDoor(dx, colour) {
  const top = STREET_TOP - 104;
  return `<rect x="${dx - 12}" y="${top - 34}" width="72" height="${104 + 34}" fill="#FFFFFF"/>
    <rect x="${dx - 16}" y="${top - 40}" width="80" height="9" fill="${STONE}"/>
    <path d="M${dx} ${top} A24 24 0 0 1 ${dx + 48} ${top} Z" fill="#9DD0EE"/>
    <path d="M${dx + 24} ${top} L${dx + 8} ${top - 14} M${dx + 24} ${top} V${top - 24} M${dx + 24} ${top} L${dx + 40} ${top - 14}" stroke="#FFFFFF" stroke-width="2.5"/>
    <rect x="${dx}" y="${top}" width="48" height="92" fill="${colour}"/>
    <rect x="${dx + 6}" y="${top + 8}" width="15" height="30" rx="2" fill="#000000" opacity="0.14"/>
    <rect x="${dx + 27}" y="${top + 8}" width="15" height="30" rx="2" fill="#000000" opacity="0.14"/>
    <rect x="${dx + 6}" y="${top + 46}" width="15" height="38" rx="2" fill="#000000" opacity="0.14"/>
    <rect x="${dx + 27}" y="${top + 46}" width="15" height="38" rx="2" fill="#000000" opacity="0.14"/>
    <circle cx="${dx + 40}" cy="${top + 48}" r="3.5" fill="#F2C230"/>
    <rect x="${dx + 17}" y="${top + 40}" width="14" height="4" rx="1" fill="#F2C230"/>
    <rect x="${dx - 8}" y="${STREET_TOP - 12}" width="64" height="6" fill="#D9D6CF"/>
    <rect x="${dx - 14}" y="${STREET_TOP - 6}" width="76" height="6" fill="#C9C6BE"/>`;
}

// Black railings in front of a house.
function railings(x0, x1) {
  let s = `<rect x="${x0}" y="${STREET_TOP - 48}" width="${x1 - x0}" height="4" fill="#23262F"/>
    <rect x="${x0}" y="${STREET_TOP - 14}" width="${x1 - x0}" height="4" fill="#23262F"/>`;
  for (let x = x0 + 4; x < x1; x += 11) {
    s += `<rect x="${x}" y="${STREET_TOP - 56}" width="3" height="56" fill="#23262F"/><path d="M${x - 2} ${STREET_TOP - 55} L${x + 1.5} ${STREET_TOP - 63} L${x + 5} ${STREET_TOP - 55} Z" fill="#23262F"/>`;
  }
  return s;
}

// A shop on the ground floor: a painted front with its name in gold, a big window and a door.
function shopFront(rand, x, w) {
  const paint = SHOP_PAINT[Math.floor(rand() * SHOP_PAINT.length)];
  const name = SHOP_NAMES[Math.floor(rand() * SHOP_NAMES.length)];
  const fasciaY = STREET_TOP - 150;
  const fontSize = Math.min(22, Math.floor((w - 40) / (name.length * 0.72)));
  let s = `<rect x="${x + 4}" y="${fasciaY - 6}" width="${w - 8}" height="${STREET_TOP - fasciaY + 6}" fill="${paint}"/>
    <rect x="${x}" y="${fasciaY - 10}" width="${w}" height="8" fill="${STONE}"/>
    <rect x="${x + 14}" y="${fasciaY}" width="${w - 28}" height="34" rx="3" fill="${paint}" stroke="#E7C66B" stroke-width="2.5"/>
    <text x="${x + w / 2}" y="${fasciaY + 24}" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${fontSize}" fill="#F2D48A" text-anchor="middle" letter-spacing="1.5">${name.replace('&', '&amp;')}</text>`;
  const doorX = x + w - 70;
  const winX = x + 16;
  const winW = doorX - winX - 12;
  s += `<rect x="${winX}" y="${fasciaY + 44}" width="${winW}" height="${STREET_TOP - fasciaY - 62}" fill="#8CC6E6"/>
    <path d="M${winX} ${STREET_TOP - 30} L${winX + 40} ${fasciaY + 44} L${winX + 70} ${fasciaY + 44} L${winX + 30} ${STREET_TOP - 30} Z" fill="#C9E7F7" opacity="0.8"/>
    <rect x="${winX + winW / 3}" y="${fasciaY + 44}" width="3" height="${STREET_TOP - fasciaY - 62}" fill="${paint}"/>
    <rect x="${winX + (winW * 2) / 3}" y="${fasciaY + 44}" width="3" height="${STREET_TOP - fasciaY - 62}" fill="${paint}"/>
    <rect x="${winX - 4}" y="${STREET_TOP - 20}" width="${winW + 8}" height="20" fill="${paint}"/>
    <rect x="${winX - 4}" y="${STREET_TOP - 20}" width="${winW + 8}" height="3" fill="#FFFFFF" opacity="0.25"/>
    <rect x="${doorX}" y="${fasciaY + 44}" width="50" height="${STREET_TOP - fasciaY - 44}" fill="${paint}"/>
    <rect x="${doorX + 7}" y="${fasciaY + 52}" width="36" height="50" fill="#8CC6E6"/>
    <circle cx="${doorX + 40}" cy="${STREET_TOP - 46}" r="3.5" fill="#F2C230"/>`;
  // A striped awning over some, and a hanging sign on a bracket over others.
  if (rand() < 0.45) {
    const awningY = fasciaY + 36;
    const stripe = ['#C8202F', '#1F6B45', '#1E3A5F', '#E0A22B'][Math.floor(rand() * 4)];
    for (let i = 0; i * 22 < w - 28; i++) {
      const sx = x + 14 + i * 22;
      const sw = Math.min(22, w - 28 - i * 22);
      s += `<path d="M${sx} ${awningY} h${sw} v24 a${sw / 2} 7 0 0 1 ${-sw} 0 Z" fill="${i % 2 ? '#FFFFFF' : stripe}"/>`;
    }
    s += `<rect x="${x + 14}" y="${awningY + 30}" width="${w - 28}" height="10" fill="#000000" opacity="0.12"/>`;
  } else if (rand() < 0.6) {
    const bx = x + 18;
    s += `<path d="M${bx} ${fasciaY - 60} h46 M${bx + 6} ${fasciaY - 60} q14 12 34 0" stroke="#23262F" stroke-width="4" fill="none"/>
      <rect x="${bx + 14}" y="${fasciaY - 58}" width="2" height="8" fill="#23262F"/><rect x="${bx + 40}" y="${fasciaY - 58}" width="2" height="8" fill="#23262F"/>
      <rect x="${bx + 8}" y="${fasciaY - 50}" width="40" height="34" rx="4" fill="${paint}" stroke="#E7C66B" stroke-width="2.5"/>
      <circle cx="${bx + 28}" cy="${fasciaY - 33}" r="8" fill="#F2D48A"/>`;
  }
  return s;
}

// A bay window bulging out from the front: a wide middle window and two narrower angled sides,
// under a little slate roof.
function bayWindow(cx, bottom, w = 120, h = 92) {
  const side = w * 0.2;
  const top = bottom - h;
  return `<path d="M${cx - w / 2 - 8} ${top} L${cx - w / 2 + 6} ${top - 18} L${cx + w / 2 - 6} ${top - 18} L${cx + w / 2 + 8} ${top} Z" fill="#5C6475"/>
    <rect x="${cx - w / 2 - 6}" y="${top - 3}" width="${w + 12}" height="6" fill="${STONE}"/>
    <rect x="${cx - w / 2}" y="${top + 3}" width="${w}" height="${h - 3}" fill="#FFFFFF"/>
    <rect x="${cx - w / 2 + 4}" y="${top + 8}" width="${side - 6}" height="${h - 20}" fill="#4A8FB8"/>
    <rect x="${cx + w / 2 - side + 2}" y="${top + 8}" width="${side - 6}" height="${h - 20}" fill="#4A8FB8"/>
    <rect x="${cx - w / 2 + side + 2}" y="${top + 8}" width="${w - side * 2 - 4}" height="${h - 20}" fill="#5FA8D3"/>
    <path d="M${cx - w / 2 + side + 2} ${top + h - 34} L${cx + 6} ${top + 8} L${cx + 24} ${top + 8} L${cx - w / 2 + side + 2} ${top + h - 12} Z" fill="#9DD0EE" opacity="0.8"/>
    <rect x="${cx - w / 2 + 2}" y="${top + h * 0.42}" width="${w - 4}" height="4" fill="#FFFFFF"/>
    <rect x="${cx - 1.5}" y="${top + 8}" width="3" height="${h - 20}" fill="#FFFFFF"/>
    <rect x="${cx - w / 2 - 4}" y="${bottom - 12}" width="${w + 8}" height="12" fill="${STONE}"/>
    <rect x="${cx - w / 2 - 4}" y="${bottom - 3}" width="${w + 8}" height="3" fill="#000000" opacity="0.15"/>`;
}

// Stone blocks up a brick building's corners, alternating long and short.
function quoins(x, top, w, h) {
  let s = '';
  for (let y = top + 6, i = 0; y < STREET_TOP - 24; y += 22, i++) {
    const long = i % 2 === 0;
    s += `<rect x="${x}" y="${y}" width="${long ? 22 : 14}" height="18" fill="${STONE}"/>
      <rect x="${x + w - 12 - (long ? 22 : 14)}" y="${y}" width="${long ? 22 : 14}" height="18" fill="${STONE}"/>`;
  }
  return s;
}

// A Tudor pub: white render crossed with black timbers, an upper floor that overhangs the street,
// diamond-paned windows, hanging baskets and a painted sign.
const PUB_NAMES = ['THE CAT & FIDDLE', 'THE OLD BELL', 'THE KINGS HEAD', 'THE WHITE HART', 'THE ROSE & CROWN'];
function tudorPub(rand, x, w) {
  const top = STREET_TOP - 330;
  const jetty = STREET_TOP - 150; // where the upper floor overhangs the ground floor
  const name = PUB_NAMES[Math.floor(rand() * PUB_NAMES.length)];
  const paint = ['#1F4D3A', '#7A1E2C', '#2B2D3A'][Math.floor(rand() * 3)];
  const beam = '#2A1E19';
  let s = `<path d="M${x - 6} ${top + 70} L${x + w / 2} ${top - 40} L${x + w + 6} ${top + 70} Z" fill="#5C6475"/>
    <path d="M${x - 6} ${top + 70} L${x + w / 2} ${top - 40} L${x + w + 6} ${top + 70}" stroke="${beam}" stroke-width="7" fill="none"/>
    <rect x="${x - 6}" y="${top + 66}" width="${w + 12}" height="${jetty - top - 66}" fill="#F6F0E2"/>`;
  // The timber frame: posts, rails and braces.
  for (let px = x - 6; px <= x + w + 6; px += (w + 12) / 5) s += `<rect x="${px - 4}" y="${top + 66}" width="8" height="${jetty - top - 66}" fill="${beam}"/>`;
  s += `<rect x="${x - 6}" y="${top + 66}" width="${w + 12}" height="8" fill="${beam}"/>
    <rect x="${x - 6}" y="${top + 150}" width="${w + 12}" height="8" fill="${beam}"/>
    <rect x="${x - 10}" y="${jetty - 10}" width="${w + 20}" height="12" fill="${beam}"/>`;
  const bay = (w + 12) / 5;
  for (let i = 0; i < 5; i++) {
    const bx = x - 6 + i * bay;
    if (i % 2 === 0) s += `<path d="M${bx + 4} ${top + 150} L${bx + bay - 4} ${top + 74} M${bx + 4} ${jetty - 10} L${bx + bay - 4} ${top + 158}" stroke="${beam}" stroke-width="7"/>`;
    else {
      // Leaded windows, made of little diamonds.
      for (const wy of [top + 88, top + 172]) {
        s += `<rect x="${bx + 8}" y="${wy}" width="${bay - 16}" height="48" fill="#5FA8D3"/>
          <path d="M${bx + 8} ${wy} l${bay - 16} 48 M${bx + 8} ${wy + 24} l${(bay - 16) / 2} 24 M${bx + 8 + (bay - 16) / 2} ${wy} l${(bay - 16) / 2} 24
            M${bx + bay - 8} ${wy} l${-(bay - 16)} 48 M${bx + bay - 8} ${wy + 24} l${-(bay - 16) / 2} 24 M${bx + bay - 8 - (bay - 16) / 2} ${wy} l${-(bay - 16) / 2} 24"
            stroke="#2A1E19" stroke-width="1.5" opacity="0.7"/>
          <rect x="${bx + 6}" y="${wy - 3}" width="${bay - 12}" height="4" fill="${beam}"/><rect x="${bx + 6}" y="${wy + 48}" width="${bay - 12}" height="4" fill="${beam}"/>`;
      }
    }
  }
  // The pub's front, set back under the overhang.
  const fontSize = Math.min(19, Math.floor((w - 30) / (name.length * 0.68)));
  s += `<rect x="${x + 4}" y="${jetty + 2}" width="${w - 8}" height="${STREET_TOP - jetty - 2}" fill="${paint}"/>
    <rect x="${x + 12}" y="${jetty + 8}" width="${w - 24}" height="30" rx="3" fill="${paint}" stroke="#E7C66B" stroke-width="2.5"/>
    <text x="${x + w / 2}" y="${jetty + 29}" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${fontSize}" fill="#F2D48A" text-anchor="middle" letter-spacing="1">${name.replace('&', '&amp;')}</text>
    <rect x="${x + 18}" y="${jetty + 48}" width="${w - 110}" height="${STREET_TOP - jetty - 70}" fill="#E6B45E" opacity="0.9"/>
    <path d="M${x + 18} ${jetty + 48 + (STREET_TOP - jetty - 70) / 2} h${w - 110} M${x + 18 + (w - 110) / 2} ${jetty + 48} v${STREET_TOP - jetty - 70}" stroke="${paint}" stroke-width="4"/>
    <rect x="${x + w - 78}" y="${jetty + 48}" width="48" height="${STREET_TOP - jetty - 48}" fill="#3F2A1C"/>
    <circle cx="${x + w - 38}" cy="${STREET_TOP - 46}" r="3.5" fill="#F2C230"/>`;
  // Hanging baskets of flowers, and the pub sign on its bracket.
  for (const hx of [x + 26, x + w - 26]) {
    s += `<path d="M${hx} ${jetty} v14" stroke="#23262F" stroke-width="2"/>
      <path d="M${hx - 16} ${jetty + 14} a16 12 0 0 0 32 0 Z" fill="#3F2A1C"/>
      <circle cx="${hx - 10}" cy="${jetty + 12}" r="7" fill="#E8456E"/><circle cx="${hx + 2}" cy="${jetty + 9}" r="7" fill="#F2C230"/>
      <circle cx="${hx + 11}" cy="${jetty + 13}" r="6" fill="#B79CEB"/><circle cx="${hx - 2}" cy="${jetty + 20}" r="6" fill="#57CF62"/>`;
  }
  return s;
}

// A Victorian house with a steep gable to the street, carved trim, a round window up in the gable,
// and a bay window by the front door.
function gabledHouse(rand, x, w) {
  const [wall, shade] = BRICKS[Math.floor(rand() * BRICKS.length)];
  const fill = `url(#brick${BRICKS.findIndex(([b]) => b === wall)})`;
  const eaves = STREET_TOP - 260;
  const peak = eaves - Math.min(150, w * 0.55);
  let s = `<rect x="${x}" y="${eaves}" width="${w}" height="${STREET_TOP - eaves}" fill="${fill}"/>
    <path d="M${x} ${eaves} L${x + w / 2} ${peak} L${x + w} ${eaves} Z" fill="${fill}"/>
    <rect x="${x + w - 12}" y="${eaves}" width="12" height="${STREET_TOP - eaves}" fill="${shade}" opacity="0.8"/>
    <path d="M${x - 14} ${eaves + 8} L${x + w / 2} ${peak - 10} L${x + w + 14} ${eaves + 8}" stroke="#5C6475" stroke-width="14" fill="none" stroke-linejoin="round"/>
    <path d="M${x - 8} ${eaves + 14} L${x + w / 2} ${peak + 2} L${x + w + 8} ${eaves + 14}" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-dasharray="8 6"/>
    <rect x="${x + w / 2 - 3}" y="${peak - 30}" width="6" height="22" fill="#FFFFFF"/>
    <circle cx="${x + w / 2}" cy="${eaves - (eaves - peak) * 0.4}" r="17" fill="#FFFFFF"/><circle cx="${x + w / 2}" cy="${eaves - (eaves - peak) * 0.4}" r="12" fill="#5FA8D3"/>
    <path d="M${x + w / 2 - 12} ${eaves - (eaves - peak) * 0.4} h24 M${x + w / 2} ${eaves - (eaves - peak) * 0.4 - 12} v24" stroke="#FFFFFF" stroke-width="2.5"/>
    <rect x="${x}" y="${eaves + 120}" width="${w - 12}" height="8" fill="${STONE}"/>`;
  // Upstairs: a pair of sash windows with keystones.
  const cols = w > 260 ? 3 : 2;
  const gap = (w - 12 - cols * 46) / (cols + 1);
  for (let c = 0; c < cols; c++) {
    const wx = x + gap + c * (46 + gap);
    s += sashWindow(wx, eaves + 30) + `<path d="M${wx + 17} ${eaves + 18} h12 l-2 10 h-8 Z" fill="${STONE}"/>`;
  }
  // Downstairs: a bay window and the front door, with railings.
  const doorX = x + w - 96;
  s += bayWindow(x + (doorX - x) / 2 + 2, STREET_TOP - 6, Math.min(140, doorX - x - 26)) + frontDoor(doorX, DOORS[Math.floor(rand() * DOORS.length)]);
  s += `<rect x="${x}" y="${STREET_TOP - 8}" width="${w}" height="8" fill="#000000" opacity="0.12"/>`;
  return s;
}

// One terraced house: brick or painted, with sash windows, a chimney stack, and a shop or a front door.
function building(rand, x, w) {
  const stucco = rand() < 0.35;
  const [wall, shade] = stucco ? STUCCO[Math.floor(rand() * STUCCO.length)] : BRICKS[Math.floor(rand() * BRICKS.length)];
  const fill = stucco ? wall : `url(#brick${BRICKS.findIndex(([b]) => b === wall)})`;
  const floors = 2 + Math.floor(rand() * 2);
  const h = 160 + floors * 92;
  const top = STREET_TOP - h;
  let s = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${fill}"/>
    <rect x="${x + w - 12}" y="${top}" width="12" height="${h}" fill="${shade}" opacity="0.8"/>`;
  // The roof: a parapet with a stone coping, slate behind it, and a chimney stack with pots.
  s += `<path d="M${x + 6} ${top - 2} L${x + 30} ${top - 34} L${x + w - 30} ${top - 34} L${x + w - 6} ${top - 2} Z" fill="#5C6475"/>
    <path d="M${x + 30} ${top - 34} L${x + w - 30} ${top - 34}" stroke="#7D8698" stroke-width="3"/>
    <rect x="${x - 4}" y="${top - 8}" width="${w + 8}" height="12" fill="${stucco ? '#FFFFFF' : STONE}"/>
    <rect x="${x - 4}" y="${top - 8}" width="${w + 8}" height="3" fill="#FFFFFF" opacity="0.6"/>`;
  const stackX = x + 18 + rand() * (w - 90);
  const pots = 2 + Math.floor(rand() * 3);
  s += `<rect x="${stackX}" y="${top - 72}" width="${16 + pots * 12}" height="42" fill="${stucco ? '#B4513A' : shade}"/>
    <rect x="${stackX - 3}" y="${top - 76}" width="${22 + pots * 12}" height="7" fill="${STONE}"/>`;
  for (let p = 0; p < pots; p++) {
    s += `<rect x="${stackX + 6 + p * 12}" y="${top - 92}" width="8" height="17" fill="#C8693F"/><rect x="${stackX + 5 + p * 12}" y="${top - 94}" width="10" height="4" fill="#A9532F"/>`;
  }
  // Georgian touches: stone up the corners of brick, and a stone band between floors.
  if (!stucco) s += quoins(x, top, w, h);
  for (let f = 1; f < floors; f++) s += `<rect x="${x}" y="${top + 18 + f * 92}" width="${w - 12}" height="6" fill="${stucco ? '#FFFFFF' : STONE}" opacity="0.9"/>`;
  // Sash windows on the floors above the street, each with a keystone over it.
  const cols = Math.max(2, Math.floor((w - 30) / 78));
  const gap = (w - 12 - cols * 46) / (cols + 1);
  for (let f = 0; f < floors; f++) {
    const wy = top + 30 + f * 92;
    for (let c = 0; c < cols; c++) {
      const wx = x + gap + c * (46 + gap);
      s += sashWindow(wx, wy) + `<path d="M${wx + 17} ${wy - 13} h12 l-2 10 h-8 Z" fill="${STONE}"/>`;
      if (rand() < 0.2) {
        s += `<rect x="${wx - 4}" y="${wy + 58}" width="54" height="12" rx="2" fill="#3F2A1C"/>`;
        for (let k = 0; k < 4; k++) s += `<circle cx="${wx + 4 + k * 13}" cy="${wy + 56}" r="6" fill="${['#E8456E', '#FFFFFF', '#F2C230', '#B79CEB'][k]}"/>`;
      }
    }
  }
  // The ground floor: a shop, or a house's front door. A stucco house has grooved render on its
  // ground floor, and a bay window or railings by its door.
  if (rand() < 0.6) {
    s += shopFront(rand, x, w - 12);
  } else {
    const doorX = x + w - 96;
    if (stucco) {
      for (let gy = STREET_TOP - 150; gy < STREET_TOP - 10; gy += 18) s += `<rect x="${x}" y="${gy}" width="${w - 12}" height="2" fill="${shade}"/>`;
    }
    s += rand() < 0.5
      ? bayWindow(x + (doorX - x) / 2 + 2, STREET_TOP - 6, Math.min(140, doorX - x - 26))
      : sashWindow(x + 30, STREET_TOP - 118, 56, 76) + railings(x + 8, doorX - 20);
    s += frontDoor(doorX, DOORS[Math.floor(rand() * DOORS.length)]);
  }
  s += `<rect x="${x}" y="${STREET_TOP - 8}" width="${w}" height="8" fill="#000000" opacity="0.12"/>`;
  return s;
}

// A plane tree, as on many English streets, with a dappled crown.
function tree(x, rand) {
  const h = 120 + rand() * 40;
  const base = STREET_TOP + 8;
  const greens = ['#3E9E4F', '#2F8341', '#67C06A'];
  const cy = base - h - 40;
  return `<path d="M${x - 8} ${base} L${x - 5} ${base - h} L${x + 5} ${base - h} L${x + 8} ${base} Z" fill="#B9A58A"/>
    <path d="M${x - 4} ${base - 30} q5 -10 2 -24 M${x + 3} ${base - 70} q4 -6 0 -18" stroke="#8E7A60" stroke-width="3" fill="none"/>
    <path d="M${x} ${base - h + 6} L${x - 30} ${cy + 20} M${x} ${base - h + 10} L${x + 28} ${cy + 16}" stroke="#9E8B70" stroke-width="7" stroke-linecap="round"/>
    <circle cx="${x - 36}" cy="${cy + 6}" r="40" fill="${greens[1]}"/><circle cx="${x + 34}" cy="${cy + 2}" r="42" fill="${greens[1]}"/>
    <circle cx="${x}" cy="${cy - 22}" r="50" fill="${greens[0]}"/><circle cx="${x - 28}" cy="${cy - 4}" r="34" fill="${greens[0]}"/>
    <circle cx="${x + 26}" cy="${cy - 10}" r="36" fill="${greens[0]}"/>
    <circle cx="${x - 18}" cy="${cy - 42}" r="16" fill="${greens[2]}"/><circle cx="${x + 20}" cy="${cy - 30}" r="11" fill="${greens[2]}"/>`;
}

// A black Victorian lamp post with a lantern.
function lamp(x) {
  const base = STREET_TOP + 8;
  return `<rect x="${x - 4}" y="${base - 196}" width="8" height="196" fill="#23262F"/>
    <path d="M${x - 13} ${base} L${x - 9} ${base - 30} L${x + 9} ${base - 30} L${x + 13} ${base} Z" fill="#23262F"/>
    <rect x="${x - 7}" y="${base - 100}" width="14" height="8" rx="3" fill="#2F333E"/>
    <path d="M${x - 16} ${base - 196} L${x + 16} ${base - 196} L${x + 12} ${base - 232} L${x - 12} ${base - 232} Z" fill="#FFE9A3"/>
    <path d="M${x} ${base - 196} V${base - 232} M${x - 14} ${base - 214} H${x + 14}" stroke="#23262F" stroke-width="2.5"/>
    <path d="M${x - 20} ${base - 230} L${x} ${base - 250} L${x + 20} ${base - 230} Z" fill="#23262F"/>
    <rect x="${x - 18}" y="${base - 198}" width="36" height="5" rx="2" fill="#23262F"/>
    <circle cx="${x}" cy="${base - 254}" r="4" fill="#23262F"/>`;
}

// A red telephone box with its little windows.
function phoneBox(x) {
  const base = STREET_TOP + 8;
  let s = `<rect x="${x - 26}" y="${base - 170}" width="52" height="170" rx="4" fill="#C8202F"/>
    <path d="M${x - 30} ${base - 170} A30 14 0 0 1 ${x + 30} ${base - 170} Z" fill="#C8202F"/>
    <rect x="${x - 30}" y="${base - 172}" width="60" height="6" fill="#A91A27"/>
    <rect x="${x - 20}" y="${base - 160}" width="40" height="12" rx="2" fill="#F5F2E6"/>
    <rect x="${x - 26}" y="${base - 6}" width="52" height="6" fill="#A91A27"/>`;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 3; c++) s += `<rect x="${x - 18 + c * 13}" y="${base - 140 + r * 18}" width="10" height="14" fill="#BFE0F0"/>`;
  }
  return s;
}

// A round red post box.
function postBox(x) {
  const base = STREET_TOP + 8;
  return `<rect x="${x - 17}" y="${base - 86}" width="34" height="80" fill="#C8202F"/>
    <rect x="${x + 6}" y="${base - 86}" width="11" height="80" fill="#A91A27"/>
    <path d="M${x - 19} ${base - 86} A19 12 0 0 1 ${x + 19} ${base - 86} Z" fill="#D9303F"/>
    <rect x="${x - 21}" y="${base - 90}" width="42" height="6" rx="2" fill="#A91A27"/>
    <rect x="${x - 10}" y="${base - 70}" width="20" height="4" rx="1" fill="#23262F"/>
    <rect x="${x - 19}" y="${base - 8}" width="38" height="8" fill="#23262F"/>`;
}

// Red, white and blue bunting strung along the street.
function bunting(x0, x1, y) {
  const mid = (x0 + x1) / 2;
  let s = `<path d="M${x0} ${y} Q${mid} ${y + 46} ${x1} ${y}" stroke="#F5F2E6" stroke-width="2.5" fill="none"/>`;
  const colours = ['#C8202F', '#FFFFFF', '#1E3A5F'];
  for (let i = 1; i < 14; i++) {
    const t = i / 14;
    const fx = x0 + (x1 - x0) * t;
    const fy = y + 46 * 2 * t * (1 - t) * 1;
    s += `<path d="M${fx - 9} ${fy} L${fx + 9} ${fy} L${fx} ${fy + 20} Z" fill="${colours[i % 3]}"/>`;
  }
  return s;
}

function nearCity() {
  const rand = rng(1234);
  let x = 0;
  let inner = `<defs>${brickPatterns()}</defs>`;
  const fronts = widths(rand, 220, 320);
  // Mostly terraced houses and shops, with now and then a Tudor pub or a gabled Victorian house.
  fronts.forEach((w, i) => {
    const kind = rand();
    if (kind < 0.16 && i > 0) inner += tudorPub(rand, x, w);
    else if (kind < 0.34) inner += gabledHouse(rand, x, w);
    else inner += building(rand, x, w);
    x += w;
  });
  // Bunting between the lamp posts, then the street's trees, lamps, phone boxes and post boxes.
  for (let lx = 320; lx + 680 < TILE + 1; lx += 680) inner += bunting(lx, lx + 680, STREET_TOP - 236);
  for (let tx = 150; tx < TILE - 60; tx += 340) inner += tree(tx, rand);
  for (let lx = 320; lx < TILE - 60; lx += 680) inner += lamp(lx);
  inner += phoneBox(560) + postBox(1260) + phoneBox(1800);
  save('near', inner, TILE, STREET_TOP + 20);
}

// Grey stone pavement, a granite kerb, and a dark road with double yellow lines along its edge.
function street() {
  const rand = rng(99);
  const SLAB = 64;
  const ROWS = [STREET_TOP + 8, STREET_TOP + 39];
  let inner = `<defs><linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#363A47"/><stop offset="0.45" stop-color="#424757"/><stop offset="1" stop-color="#383C49"/>
    </linearGradient></defs>
    <rect y="${STREET_TOP}" width="${TILE}" height="70" fill="#CFCCC5"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="8" fill="#B3AFA7"/>`;
  ROWS.forEach((rowY, row) => {
    const offset = row ? SLAB / 2 : 0;
    for (let x = -offset; x < TILE; x += SLAB) {
      const tint = rand() < 0.3 ? '#C8C4BC' : rand() < 0.5 ? '#D6D3CC' : '#D0CDC6';
      inner += `<rect x="${x + 1.5}" y="${rowY + 1}" width="${SLAB - 3}" height="29" rx="2" fill="${tint}"/>
        <rect x="${x + 1.5}" y="${rowY + 1}" width="${SLAB - 3}" height="2.5" rx="1" fill="#E4E2DD"/>
        <rect x="${x + 1.5}" y="${rowY + 27}" width="${SLAB - 3}" height="3" rx="1" fill="#B3AFA7"/>`;
      if (rand() < 0.08) inner += `<path d="M${x + 14 + rand() * 30} ${rowY + 8} l8 6 l-3 5 l8 6" stroke="#A9A59D" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      if (rand() < 0.04) inner += `<ellipse cx="${x + 32}" cy="${rowY + 16}" rx="12" ry="4" fill="#9FC3D6" opacity="0.55"/>`;
    }
  });
  for (let x = 90; x < TILE; x += 320 + Math.floor(rand() * 220)) {
    const y = ROWS[1];
    inner += `<path d="M${x} ${y + 2} q-3 -10 -8 -14 M${x} ${y + 2} q1 -12 4 -16 M${x} ${y + 2} q5 -8 10 -10" stroke="#5AAE5E" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  // The granite kerb, then the road and the shadow the kerb throws on it.
  inner += `<rect y="${STREET_TOP + 70}" width="${TILE}" height="23" fill="#B9BCC4"/>
    <rect y="${STREET_TOP + 70}" width="${TILE}" height="6" fill="#E1E3E8"/>
    <rect y="${STREET_TOP + 84}" width="${TILE}" height="9" fill="#9498A3"/>`;
  for (let x = 0; x < TILE; x += 96) inner += `<rect x="${x}" y="${STREET_TOP + 70}" width="2" height="23" fill="#8E929C"/>`;
  inner += `<rect y="${STREET_TOP + 93}" width="${TILE}" height="${HEIGHT - STREET_TOP - 93}" fill="url(#road)"/>
    <rect y="${STREET_TOP + 93}" width="${TILE}" height="12" fill="#23262F" opacity="0.6"/>
    <rect y="${STREET_TOP + 107}" width="${TILE}" height="4" fill="#F2C230"/>
    <rect y="${STREET_TOP + 115}" width="${TILE}" height="4" fill="#F2C230"/>`;
  for (let i = 0; i < 900; i++) {
    const gx = rand() * TILE;
    const gy = STREET_TOP + 122 + rand() * (HEIGHT - STREET_TOP - 126);
    inner += `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${(2 + rand() * 3).toFixed(1)}" height="2" rx="1" fill="${rand() < 0.5 ? '#525868' : '#2C2F3A'}" opacity="0.7"/>`;
  }
  // The white dashed line down the middle of the road.
  for (let x = 40; x < TILE; x += 256) {
    inner += `<rect x="${x}" y="684" width="136" height="12" rx="3" fill="#1C1E26" opacity="0.5"/>
      <rect x="${x}" y="682" width="136" height="12" rx="3" fill="#F3F3F0"/>
      <rect x="${x + 30 + rand() * 60}" y="686" width="${10 + rand() * 18}" height="6" rx="3" fill="#C9CACF"/>`;
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

  // A round red pillar box, in the same space the other worlds' hydrant-sized obstacles use.
  save('hydrant', `
    <rect x="12" y="90" width="46" height="10" rx="3" fill="#23262F"/>
    <rect x="15" y="24" width="40" height="68" fill="#C8202F"/>
    <rect x="42" y="24" width="13" height="68" fill="#A91A27"/>
    <rect x="15" y="24" width="5" height="68" fill="#E04855" opacity="0.7"/>
    <path d="M12 26 C12 4 58 4 58 26 Z" fill="#D9303F"/>
    <path d="M18 14 C24 8 34 6 40 7" stroke="#F07A84" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="9" y="22" width="52" height="7" rx="3" fill="#A91A27"/>
    <rect x="23" y="38" width="24" height="5" rx="1.5" fill="#23262F"/>
    <rect x="25" y="52" width="20" height="14" rx="2" fill="#F5F2E6"/>
    <rect x="28" y="56" width="14" height="2" fill="#A91A27"/><rect x="28" y="60" width="10" height="2" fill="#A91A27"/>`, 70, 100);

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
  const car = (body, shade, extra = '') => `
    <rect x="6" y="88" width="24" height="52" rx="8" fill="#23264A"/><rect x="120" y="88" width="24" height="52" rx="8" fill="#23264A"/>
    <path d="M30 62 L42 22 C44 14 50 10 58 10 H92 C100 10 106 14 108 22 L120 62 Z" fill="${shade}"/>
    <path d="M40 60 L50 26 C51 22 54 20 58 20 H92 C96 20 99 22 100 26 L110 60 Z" fill="#BFE7F7"/>
    <rect x="8" y="58" width="134" height="62" rx="16" fill="${body}"/>
    <rect x="8" y="100" width="134" height="20" rx="8" fill="${shade}"/>
    <circle cx="32" cy="82" r="13" fill="#FFF3C4"/><circle cx="118" cy="82" r="13" fill="#FFF3C4"/>
    <rect x="52" y="74" width="46" height="18" rx="4" fill="#23264A" opacity="0.75"/>
    <rect x="56" y="104" width="38" height="11" rx="2" fill="#FFF2B0"/>
    <rect x="58" y="106" width="34" height="2" fill="#23262F" opacity="0.4"/>${extra}`;
  // A red car, a racing green one, and a black cab with its yellow TAXI light.
  save('car-1', car('#D33A35', '#A8291F'), 150, 140);
  save('car-2', car('#1F6B45', '#154E32'), 150, 140);
  save('car-3', car('#23262F', '#14161C', `
    <rect x="57" y="0" width="36" height="13" rx="4" fill="#F2C230"/>
    <text x="75" y="10.5" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="9" fill="#23262F" text-anchor="middle">TAXI</text>
    <path d="M40 60 L50 26 C51 22 54 20 58 20 H92 C96 20 99 22 100 26 L110 60 Z" fill="none" stroke="#3E4352" stroke-width="3"/>`), 150, 140);
  const zebra = Array.from({ length: 6 }, (_, i) => {
    const y = 6 + i * 21;
    const inset = 44 - i * 8;
    return `<rect x="${inset}" y="${y}" width="${340 - inset * 2}" height="12" rx="2" fill="#FFFFFF" opacity="0.9"/>`;
  }).join('');
  save('zebra-crossing', zebra, 340, 130);
  // Red, amber and green, on a black pole with a black and white band.
  const trafficLight = (redOn) => `
    <rect x="35" y="110" width="10" height="150" fill="#23262F"/>
    <rect x="35" y="214" width="10" height="10" fill="#FFFFFF"/><rect x="35" y="234" width="10" height="10" fill="#FFFFFF"/>
    <rect x="14" y="2" width="52" height="118" rx="8" fill="#23262F"/>
    <rect x="10" y="4" width="8" height="112" rx="3" fill="#2F333E"/><rect x="62" y="4" width="8" height="112" rx="3" fill="#2F333E"/>
    <circle cx="40" cy="25" r="14" fill="${redOn ? '#FF3B30' : '#4E2226'}"/>
    <circle cx="40" cy="61" r="14" fill="#4E3E1C"/>
    <circle cx="40" cy="97" r="14" fill="${redOn ? '#1C3F2C' : '#36E06B'}"/>
    <rect x="22" y="9" width="36" height="5" rx="2" fill="#14161C"/><rect x="22" y="45" width="36" height="5" rx="2" fill="#14161C"/><rect x="22" y="81" width="36" height="5" rx="2" fill="#14161C"/>`;
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
