// Draws a bright English high street as seamless parallax layers, plus obstacle sprites.
// Run: npm run assets
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OVERHEAD_DROP, farTown, parkGate, townRow, townStreet } from './english-town.mjs';

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

  // A low scaffold board: its bottom edge sits 97px above the road, so the cat slides under. The board
  // and its arrows hang OVERHEAD_DROP lower than they were first drawn, for the smaller cat.
  let stripes = '';
  for (let x = -50; x < 170; x += 44) {
    stripes += `<path d="M${x} 162 L${x + 56} 48 L${x + 78} 48 L${x + 22} 162 Z" fill="#23264A"/>`;
  }
  save('scaffold', `
    <defs><clipPath id="board"><rect x="6" y="48" width="158" height="114" rx="8"/></clipPath></defs>
    <rect x="14" y="10" width="14" height="280" rx="4" fill="#59648F"/>
    <rect x="142" y="10" width="14" height="280" rx="4" fill="#59648F"/>
    <g transform="translate(0 ${OVERHEAD_DROP})">
    <rect x="6" y="48" width="158" height="114" rx="8" fill="#FFC531"/>
    <g clip-path="url(#board)">${stripes}</g>
    <rect x="6" y="48" width="158" height="114" rx="8" fill="none" stroke="#23264A" stroke-width="6"/>
    <path d="M68 176 L85 196 L102 176 M68 198 L85 218 L102 198" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 176 L85 196 L102 176 M68 198 L85 218 L102 198" fill="none" stroke="#E8456E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`, 170, 290);

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

  // A shop banner between two poles, with the same low edge as the scaffold.
  let bunting = '';
  for (let x = 16; x < 150; x += 28) {
    bunting += `<path d="M${x} 112 L${x + 28} 112 L${x + 14} 162 Z" fill="${(x - 16) / 28 % 2 ? '#FFC531' : '#2F9EDF'}"/>`;
  }
  save('banner', `
    <rect x="10" y="10" width="12" height="280" rx="4" fill="#59648F"/>
    <rect x="148" y="10" width="12" height="280" rx="4" fill="#59648F"/>
    <g transform="translate(0 ${OVERHEAD_DROP})">
    <rect x="14" y="44" width="142" height="70" rx="5" fill="#E8456E"/>
    <rect x="14" y="44" width="142" height="12" fill="#C72F58"/>
    ${bunting}
    <g transform="translate(85 84)" fill="#FFFFFF">
      <ellipse cx="0" cy="7" rx="13" ry="10"/>
      <circle cx="-13" cy="-6" r="5"/><circle cx="-5" cy="-13" r="5"/>
      <circle cx="5" cy="-13" r="5"/><circle cx="13" cy="-6" r="5"/>
    </g>
    <path d="M68 180 L85 200 L102 180 M68 202 L85 222 L102 202" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 180 L85 200 L102 180 M68 202 L85 222 L102 202" fill="none" stroke="#E8456E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`, 170, 290);

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
    <g transform="translate(0 ${OVERHEAD_DROP})">
    <path d="M16 56 Q85 104 154 56" fill="none" stroke="#FFFFFF" stroke-width="5"/>
    ${clothes}
    <path d="M68 172 L85 192 L102 172 M68 194 L85 214 L102 194" fill="none" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 172 L85 192 L102 172 M68 194 L85 214 L102 194" fill="none" stroke="#E8456E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`, 170, 290);

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

  // The escape point: the gates of a city park, open, with the park beyond.
  save('gate', parkGate({ sign: 'PARK', pillar: '#B4513A', pillarShade: '#9A4130' }), 360, 340);
}

sky();
clouds();
save('far', farTown(), TILE, STREET_TOP);
save('near', townRow(), TILE, STREET_TOP + 20);
save('street', townStreet(), TILE, HEIGHT - STREET_TOP);
obstacles();
console.log('City art drawn in public/assets/city');
