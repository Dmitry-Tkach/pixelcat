// The English town shared by the City (by day) and the Sunset world (at dusk): terraced houses,
// shops, a pub, street furniture, the far skyline and the pavement.
// `townRow`, `farTown` and `townStreet` return SVG markup for a layer; tools draw and save it.

export const TILE = 2048;
export const HEIGHT = 720;
export const STREET_TOP = 520; // where the buildings meet the pavement

// Small seeded generator, so the street looks the same on every run.
export function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Splits TILE into widths that sum to it exactly, so the layer repeats without a seam.
export function widths(rand, min, max) {
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

// At dusk, lit windows and lamps are collected here and drawn over the darkened street, so they
// glow. By day this stays off, and nothing changes.
const DUSK = { on: false, rand: null, lights: [] };
const LIT = { glass: '#FFD27A', shop: '#F2BE6A', shine: '#FFF0C2', bars: '#D9C6DE', dark: '#3B3566' };
// Evening light: everything darker, redder and bluer, with the warm light only where lamps shine.
export const DUSK_FILTER = `<filter id="dusk" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="
  0.62 0.12 0.10 0 0.03
  0.10 0.42 0.12 0 0.01
  0.14 0.16 0.62 0 0.06
  0 0 0 1 0"/></filter>`;

// A window's glass, lit warmly at dusk. Most windows are lit, and shops always are (chance 1).
// It's drawn over the darkened street, then the window's bars are drawn over it again.
// `bars` are the window's glazing bars, as [x, y, w, h] rectangles, redrawn over the light.
function litPane(x, y, w, h, chance = 0.6, bars = [], glass = LIT.glass) {
  if (!DUSK.on || DUSK.rand() > chance) return '';
  DUSK.lights.push(`<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="6" fill="${glass}" opacity="0.18"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${glass}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h * 0.35}" fill="${LIT.shine}" opacity="0.45"/>
    ${bars.map(([bx, by, bw, bh]) => `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${LIT.bars}"/>`).join('')}`);
  return '';
}

// A soft pool of lamplight, at dusk only.
function glow(x, y, r) {
  if (!DUSK.on) return '';
  DUSK.lights.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#FFD27A" opacity="0.16"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#FFE7A8" opacity="0.35"/>
    <path d="M${x - 16} ${y + 18} L${x + 16} ${y + 18} L${x + 12} ${y - 18} L${x - 12} ${y - 18} Z" fill="#FFF3C4"/>`);
  return '';
}

// The town in the distance: terraced roofs with chimney pots, church spires, a dome and a clock
// tower, all pale with distance, with a haze rising from the street.
export function farTown() {
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
  return inner;
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
    <rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${DUSK.on ? LIT.dark : '#5FA8D3'}"/>
    <path d="M${wx} ${wy + wh * 0.62} L${wx + ww * 0.7} ${wy} L${wx + ww} ${wy} L${wx} ${wy + wh * 0.92} Z" fill="#9DD0EE" opacity="0.8"/>
    ${litPane(wx, wy, ww, wh, 0.6, [[wx, wy + half - 2.5, ww, 5], [wx + ww / 2 - 1.5, wy, 3, wh], [wx, wy + half / 2 - 1, ww, 2], [wx, wy + half + half / 2 - 1, ww, 2]])}
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
    ${litPane(winX, fasciaY + 44, winW, STREET_TOP - fasciaY - 62, 1, [[winX + winW / 3, fasciaY + 44, 3, STREET_TOP - fasciaY - 62], [winX + (winW * 2) / 3, fasciaY + 44, 3, STREET_TOP - fasciaY - 62]], LIT.shop)}${litPane(doorX + 7, fasciaY + 52, 36, 50, 1, [], LIT.shop)}
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
    ${litPane(cx - w / 2 + 4, top + 8, w - 8, h - 20, 0.8, [[cx - w / 2 + 2, top + h * 0.42, w - 4, 4], [cx - 1.5, top + 8, 3, h - 20], [cx - w / 2 + side, top + 8, 3, h - 20], [cx + w / 2 - side, top + 8, 3, h - 20]])}
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
    <circle cx="${x}" cy="${base - 254}" r="4" fill="#23262F"/>${glow(x, base - 214, 70)}`;
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

// The street's row of buildings and everything along its pavement. `dusk` darkens it to evening,
// with lit windows and lamps.
export function townRow({ dusk = false } = {}) {
  DUSK.on = dusk;
  DUSK.rand = rng(4242);
  DUSK.lights = [];
  const rand = rng(1234);
  let x = 0;
  let inner = '';
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
  const lights = DUSK.lights.join('');
  DUSK.on = false;
  return `<defs>${brickPatterns()}${DUSK_FILTER}</defs>${dusk ? `<g filter="url(#dusk)">${inner}</g>${lights}` : inner}`;
}

// Warm buff York stone paving, so a grey cat never stands on its own colour, then a granite kerb and
// a dark road with double yellow lines along its edge.
export function townStreet({ dusk = false } = {}) {
  const rand = rng(99);
  const SLAB = 64;
  const ROWS = [STREET_TOP + 8, STREET_TOP + 39];
  let inner = `<defs><linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#363A47"/><stop offset="0.45" stop-color="#424757"/><stop offset="1" stop-color="#383C49"/>
    </linearGradient></defs>
    <rect y="${STREET_TOP}" width="${TILE}" height="70" fill="#E2CFA8"/>
    <rect y="${STREET_TOP}" width="${TILE}" height="8" fill="#C4AE84"/>`;
  ROWS.forEach((rowY, row) => {
    const offset = row ? SLAB / 2 : 0;
    for (let x = -offset; x < TILE; x += SLAB) {
      const tint = rand() < 0.3 ? '#DCC69C' : rand() < 0.5 ? '#E9D8B6' : '#E4D1AC';
      inner += `<rect x="${x + 1.5}" y="${rowY + 1}" width="${SLAB - 3}" height="29" rx="2" fill="${tint}"/>
        <rect x="${x + 1.5}" y="${rowY + 1}" width="${SLAB - 3}" height="2.5" rx="1" fill="#F4E8CF"/>
        <rect x="${x + 1.5}" y="${rowY + 27}" width="${SLAB - 3}" height="3" rx="1" fill="#C4AE84"/>`;
      if (rand() < 0.08) inner += `<path d="M${x + 14 + rand() * 30} ${rowY + 8} l8 6 l-3 5 l8 6" stroke="#B49C70" stroke-width="2" fill="none" stroke-linecap="round"/>`;
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
  const layer = `<g transform="translate(0 -${STREET_TOP})">${inner}</g>`;
  return dusk ? `<defs>${DUSK_FILTER}</defs><g filter="url(#dusk)">${layer}</g>` : layer;
}


// The escape point: a park's entrance, with its gates open and the park beyond. Every world has one,
// in its own stone and with its own sign. 360 by 340, with the way through in the middle.
export function parkGate({ sign, pillar = '#C9BC9F', pillarShade = '#A99C80', signColour = '#1F4D3A', dusk = false }) {
  const pillarAt = (x) => `<rect x="${x}" y="70" width="64" height="270" fill="${pillar}"/>
    <rect x="${x + 44}" y="70" width="20" height="270" fill="${pillarShade}"/>
    ${[110, 160, 210, 260, 310].map((y) => `<rect x="${x}" y="${y}" width="64" height="4" fill="${pillarShade}" opacity="0.7"/>`).join('')}
    <rect x="${x - 8}" y="56" width="80" height="18" rx="3" fill="${pillarShade}"/>
    <rect x="${x - 8}" y="56" width="80" height="5" rx="2" fill="#FFFFFF" opacity="0.45"/>
    <circle cx="${x + 32}" cy="40" r="17" fill="${pillar}"/><circle cx="${x + 26}" cy="35" r="6" fill="#FFFFFF" opacity="0.4"/>`;
  // One gate leaf, swung open toward the viewer: bars with spear tips, and a curl at the top.
  const leaf = (x, flip) => {
    let bars = '';
    for (let i = 0; i < 6; i++) {
      const bx = x + (flip ? -i * 9 : i * 9);
      bars += `<rect x="${bx}" y="120" width="4" height="214" fill="#23262F"/><path d="M${bx - 3} 121 L${bx + 2} 110 L${bx + 7} 121 Z" fill="#23262F"/>`;
    }
    const left = flip ? x - 50 : x;
    return `${bars}<rect x="${left}" y="150" width="54" height="5" fill="#23262F"/><rect x="${left}" y="300" width="54" height="5" fill="#23262F"/>
      <path d="M${left + 8} 150 q19 -26 38 0" stroke="#23262F" stroke-width="4" fill="none"/>`;
  };
  const sky = dusk ? '#F2A67A' : '#BFE7F7';
  const lawn = dusk ? '#4E8F55' : '#7BE39A';
  const glow = dusk ? '<circle cx="180" cy="200" r="70" fill="#FFD27A" opacity="0.25"/>' : '';
  return `
    <rect x="64" y="96" width="232" height="244" fill="${sky}"/>${glow}
    <path d="M64 250 Q180 220 296 250 V340 H64 Z" fill="${lawn}"/>
    <path d="M160 340 Q172 280 180 246 Q188 280 200 340 Z" fill="#E9D7B0"/>
    <rect x="216" y="170" width="10" height="70" fill="#7A5232"/>
    <circle cx="221" cy="160" r="34" fill="#3E9A4A"/><circle cx="208" cy="168" r="22" fill="#57CF62"/><circle cx="236" cy="150" r="14" fill="#7AD98A"/>
    <circle cx="110" cy="232" r="12" fill="#57CF62"/><circle cx="98" cy="238" r="9" fill="#3E9A4A"/>
    <circle cx="104" cy="226" r="3" fill="#F58FAB"/><circle cx="116" cy="236" r="3" fill="#FFD568"/>
    ${leaf(70, false)}${leaf(290, true)}
    ${pillarAt(0)}${pillarAt(296)}
    <path d="M40 104 Q180 22 320 104" stroke="#23262F" stroke-width="8" fill="none"/>
    <path d="M58 104 Q180 40 302 104" stroke="#23262F" stroke-width="3" fill="none"/>
    <rect x="110" y="48" width="140" height="40" rx="8" fill="${signColour}" stroke="#E7C66B" stroke-width="3"/>
    <text x="180" y="76" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${sign.length > 5 ? 18 : 24}" fill="#F2D48A" text-anchor="middle" letter-spacing="2">${sign}</text>
    ${dusk ? '<circle cx="32" cy="22" r="12" fill="#FFE7A8"/><circle cx="328" cy="22" r="12" fill="#FFE7A8"/><circle cx="32" cy="22" r="26" fill="#FFD27A" opacity="0.3"/><circle cx="328" cy="22" r="26" fill="#FFD27A" opacity="0.3"/>' : ''}`;
}
