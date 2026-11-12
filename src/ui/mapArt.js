// The level map's picture: a meadow seen from above, with a winding dirt path from the cat's home to a
// trophy, past a round button for every level, and each world's own ground and scenery around it. It's
// one SVG, drawn once when the map opens: nothing in it moves, so it costs nothing while it's shown.
// Plain code with no page or Phaser, so tools can render it to check how it looks.
// JourneyMap.js puts the real buttons and the cat on top of it, at the same places.

export const MAP_SIZE = { w: 1000, h: 520 };
const PATH = { edge: 86, top: 70, dash: 7, dashGap: '16 18' };
const STOP = { r: 40, rim: 9, ring: 54 };
const CLEAR_OF_PATH = 62; // scenery keeps this far from the middle of the path
const INK = '#2a1d14';

// Each world's ground and the things that grow or stand on it.
export const MAP_WORLDS = {
  City: { ground: '#9fb7a2', edge: '#7f9a86', props: ['building', 'building', 'tree', 'bush', 'building', 'rock'] },
  Village: { ground: '#86cf5c', edge: '#64ad42', props: ['tree', 'tree', 'house', 'bush', 'fence', 'rock', 'stump'] },
  Farm: { ground: '#b5d35a', edge: '#93b23e', props: ['field', 'hay', 'barn', 'tree', 'fence', 'hay'] },
  Sunset: { ground: '#d9b45f', edge: '#b88f43', props: ['tree', 'vet', 'bush', 'rock', 'tree', 'stump'] },
};

// Where each stop sits, in map units: left to right, zigzagging down and up as it climbs.
const ZIGZAG = { low: 350, climb: 110, swing: 62 };
export function stopPositions(count) {
  const left = 90, right = MAP_SIZE.w - 90;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    return { x: left + t * (right - left), y: ZIGZAG.low - t * ZIGZAG.climb + (i % 2 ? -ZIGZAG.swing : ZIGZAG.swing) * 0.9 };
  });
}

// The path: from home, through every stop, to the trophy.
export function pathPoints(positions) {
  const first = positions[0], last = positions[positions.length - 1];
  return [{ x: 20, y: first.y + 70 }, ...positions, { x: MAP_SIZE.w - 20, y: last.y - 80 }];
}

// The same scenery every time: a small seeded random.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function distanceToPath(x, y, points) {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)));
  }
  return best;
}

// ----- Scenery, drawn from above in chunky shapes with dark outlines -----

const shadow = (x, y, rx, ry = rx * 0.45) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.18"/>`;
const outlined = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;

const PROPS = {
  tree: (x, y, s) => `${shadow(x + 6 * s, y + 30 * s, 34 * s)}
    <rect x="${x - 6 * s}" y="${y}" width="${12 * s}" height="${30 * s}" rx="${4 * s}" fill="#7a4a26" ${outlined}/>
    <circle cx="${x - 16 * s}" cy="${y - 8 * s}" r="${22 * s}" fill="#2f9e3c" ${outlined}/>
    <circle cx="${x + 16 * s}" cy="${y - 6 * s}" r="${22 * s}" fill="#2f9e3c" ${outlined}/>
    <circle cx="${x}" cy="${y - 24 * s}" r="${26 * s}" fill="#3cb94a" ${outlined}/>
    <circle cx="${x - 8 * s}" cy="${y - 32 * s}" r="${8 * s}" fill="#6fdc6a"/>`,
  bush: (x, y, s) => `${shadow(x, y + 12 * s, 30 * s)}
    <circle cx="${x - 14 * s}" cy="${y}" r="${14 * s}" fill="#3aa84a" ${outlined}/>
    <circle cx="${x + 14 * s}" cy="${y}" r="${14 * s}" fill="#3aa84a" ${outlined}/>
    <circle cx="${x}" cy="${y - 8 * s}" r="${16 * s}" fill="#47c257" ${outlined}/>`,
  rock: (x, y, s) => `${shadow(x, y + 10 * s, 24 * s)}
    <path d="M${x - 22 * s} ${y + 8 * s} Q${x - 24 * s} ${y - 14 * s} ${x - 4 * s} ${y - 16 * s} Q${x + 22 * s} ${y - 18 * s} ${x + 22 * s} ${y + 6 * s} Z" fill="#a7aeb8" ${outlined}/>
    <path d="M${x - 10 * s} ${y - 9 * s} Q${x} ${y - 13 * s} ${x + 8 * s} ${y - 10 * s}" stroke="#e2e6ec" stroke-width="${4 * s}" fill="none" stroke-linecap="round"/>`,
  stump: (x, y, s) => `${shadow(x, y + 10 * s, 22 * s)}
    <ellipse cx="${x}" cy="${y}" rx="${18 * s}" ry="${12 * s}" fill="#b5713b" ${outlined}/>
    <ellipse cx="${x}" cy="${y}" rx="${10 * s}" ry="${6 * s}" fill="none" stroke="#7a4a26" stroke-width="2"/>`,
  fence: (x, y, s) => `<g>
    <rect x="${x - 40 * s}" y="${y - 4 * s}" width="${80 * s}" height="${8 * s}" rx="3" fill="#c98a4b" ${outlined}/>
    ${[-36, -12, 12, 36].map((dx) => `<rect x="${x + (dx - 4) * s}" y="${y - 12 * s}" width="${8 * s}" height="${22 * s}" rx="2" fill="#a86b35" ${outlined}/>`).join('')}</g>`,
  house: (x, y, s) => `${shadow(x + 8 * s, y + 26 * s, 46 * s)}
    <rect x="${x - 38 * s}" y="${y - 10 * s}" width="${76 * s}" height="${36 * s}" rx="4" fill="#f2c36b" ${outlined}/>
    <path d="M${x - 46 * s} ${y - 6 * s} L${x} ${y - 46 * s} L${x + 46 * s} ${y - 6 * s} Z" fill="#e2533f" ${outlined}/>
    <rect x="${x - 8 * s}" y="${y + 6 * s}" width="${16 * s}" height="${20 * s}" rx="3" fill="#7a4a26"/>`,
  barn: (x, y, s) => `${shadow(x + 10 * s, y + 30 * s, 56 * s)}
    <rect x="${x - 46 * s}" y="${y - 14 * s}" width="${92 * s}" height="${44 * s}" rx="4" fill="#d8443a" ${outlined}/>
    <path d="M${x - 54 * s} ${y - 10 * s} L${x} ${y - 52 * s} L${x + 54 * s} ${y - 10 * s} Z" fill="#9a2f2a" ${outlined}/>
    <path d="M${x - 14 * s} ${y + 30 * s} V${y} H${x + 14 * s} V${y + 30 * s} M${x - 14 * s} ${y} L${x + 14 * s} ${y + 30 * s} M${x + 14 * s} ${y} L${x - 14 * s} ${y + 30 * s}" stroke="#fff" stroke-width="3" fill="none"/>`,
  hay: (x, y, s) => `${shadow(x + 4 * s, y + 18 * s, 30 * s)}
    <rect x="${x - 26 * s}" y="${y - 16 * s}" width="${52 * s}" height="${32 * s}" rx="${6 * s}" fill="#f0c94c" ${outlined}/>
    <path d="M${x - 26 * s} ${y - 4 * s} H${x + 26 * s} M${x - 26 * s} ${y + 6 * s} H${x + 26 * s}" stroke="#b8902c" stroke-width="3"/>
    <path d="M${x - 10 * s} ${y - 16 * s} V${y + 16 * s} M${x + 10 * s} ${y - 16 * s} V${y + 16 * s}" stroke="#c9602f" stroke-width="3"/>`,
  field: (x, y, s) => `<g opacity="0.9">
    ${[0, 1, 2, 3].map((i) => `<rect x="${x - 50 * s}" y="${y - 30 * s + i * 16 * s}" width="${100 * s}" height="${10 * s}" rx="5" fill="${i % 2 ? '#8fb33b' : '#7aa22e'}"/>`).join('')}</g>`,
  building: (x, y, s) => `${shadow(x + 10 * s, y + 34 * s, 48 * s)}
    <rect x="${x - 40 * s}" y="${y - 36 * s}" width="${80 * s}" height="${70 * s}" rx="5" fill="#c8d2e0" ${outlined}/>
    <rect x="${x - 30 * s}" y="${y - 26 * s}" width="${60 * s}" height="${50 * s}" rx="3" fill="#a9b6c9"/>
    <rect x="${x - 16 * s}" y="${y - 16 * s}" width="${14 * s}" height="${10 * s}" rx="2" fill="#7d8aa0"/>
    <rect x="${x + 6 * s}" y="${y + 2 * s}" width="${14 * s}" height="${10 * s}" rx="2" fill="#7d8aa0"/>`,
  darkTree: (x, y, s) => `${shadow(x + 6 * s, y + 32 * s, 38 * s)}
    <rect x="${x - 7 * s}" y="${y}" width="${14 * s}" height="${32 * s}" rx="${4 * s}" fill="#5c3a1e" ${outlined}/>
    <circle cx="${x - 18 * s}" cy="${y - 6 * s}" r="${24 * s}" fill="#1f7a32" ${outlined}/>
    <circle cx="${x + 18 * s}" cy="${y - 4 * s}" r="${24 * s}" fill="#1f7a32" ${outlined}/>
    <circle cx="${x}" cy="${y - 26 * s}" r="${28 * s}" fill="#27913d" ${outlined}/>
    <circle cx="${x - 9 * s}" cy="${y - 34 * s}" r="${8 * s}" fill="#4fc35a"/>`,
  mushroom: (x, y, s) => `${shadow(x, y + 14 * s, 22 * s)}
    <rect x="${x - 6 * s}" y="${y - 4 * s}" width="${12 * s}" height="${18 * s}" rx="${4 * s}" fill="#f4ead2" ${outlined}/>
    <path d="M${x - 22 * s} ${y - 2 * s} Q${x} ${y - 34 * s} ${x + 22 * s} ${y - 2 * s} Z" fill="#e2483d" ${outlined}/>
    <circle cx="${x - 8 * s}" cy="${y - 12 * s}" r="${4 * s}" fill="#fff"/><circle cx="${x + 7 * s}" cy="${y - 16 * s}" r="${3 * s}" fill="#fff"/>`,
  crystal: (x, y, s) => `${shadow(x, y + 14 * s, 28 * s)}
    <path d="M${x - 20 * s} ${y + 10 * s} L${x - 14 * s} ${y - 18 * s} L${x - 6 * s} ${y + 10 * s} Z" fill="#9b6bff" ${outlined}/>
    <path d="M${x - 8 * s} ${y + 12 * s} L${x} ${y - 34 * s} L${x + 9 * s} ${y + 12 * s} Z" fill="#c59bff" ${outlined}/>
    <path d="M${x + 6 * s} ${y + 10 * s} L${x + 15 * s} ${y - 14 * s} L${x + 22 * s} ${y + 10 * s} Z" fill="#6fd6ff" ${outlined}/>
    <path d="M${x - 2 * s} ${y - 20 * s} L${x} ${y - 30 * s}" stroke="#fff" stroke-width="${3 * s}" stroke-linecap="round"/>`,
  bone: (x, y, s) => `${shadow(x, y + 8 * s, 26 * s, 6 * s)}
    <g transform="rotate(-18 ${x} ${y})">
    <rect x="${x - 20 * s}" y="${y - 4 * s}" width="${40 * s}" height="${8 * s}" rx="${4 * s}" fill="#f4ead2" ${outlined}/>
    ${[-1, 1].map((k) => `<circle cx="${x + k * 21 * s}" cy="${y - 5 * s}" r="${6 * s}" fill="#f4ead2" ${outlined}/><circle cx="${x + k * 21 * s}" cy="${y + 5 * s}" r="${6 * s}" fill="#f4ead2" ${outlined}/>`).join('')}</g>`,
  ruin: (x, y, s) => `${shadow(x + 6 * s, y + 24 * s, 30 * s)}
    <rect x="${x - 14 * s}" y="${y - 30 * s}" width="${28 * s}" height="${54 * s}" rx="3" fill="#cfc2a4" ${outlined}/>
    <path d="M${x - 14 * s} ${y - 30 * s} L${x - 4 * s} ${y - 40 * s} L${x + 4 * s} ${y - 32 * s} L${x + 14 * s} ${y - 38 * s} V${y - 30 * s} Z" fill="#cfc2a4" ${outlined}/>
    <path d="M${x - 5 * s} ${y - 22 * s} V${y + 18 * s} M${x + 5 * s} ${y - 22 * s} V${y + 18 * s}" stroke="#a8997a" stroke-width="3"/>`,
  tower: (x, y, s) => `${shadow(x + 8 * s, y + 30 * s, 38 * s)}
    <rect x="${x - 26 * s}" y="${y - 20 * s}" width="${52 * s}" height="${48 * s}" rx="4" fill="#aab0bd" ${outlined}/>
    ${[-20, -6, 8].map((dx) => `<rect x="${x + dx * s}" y="${y - 30 * s}" width="${12 * s}" height="${12 * s}" fill="#aab0bd" ${outlined}/>`).join('')}
    <path d="M${x - 8 * s} ${y + 28 * s} V${y + 10 * s} A${8 * s} ${8 * s} 0 0 1 ${x + 8 * s} ${y + 10 * s} V${y + 28 * s} Z" fill="#5d4532"/>`,
  banner: (x, y, s) => `<rect x="${x - 2 * s}" y="${y - 40 * s}" width="${4 * s}" height="${52 * s}" fill="#7a4a26"/>
    <path d="M${x + 2 * s} ${y - 38 * s} H${x + 30 * s} L${x + 22 * s} ${y - 28 * s} L${x + 30 * s} ${y - 18 * s} H${x + 2 * s} Z" fill="#3d6bd8" ${outlined}/>`,
  vet: (x, y, s) => `${shadow(x + 8 * s, y + 30 * s, 50 * s)}
    <rect x="${x - 42 * s}" y="${y - 22 * s}" width="${84 * s}" height="${50 * s}" rx="5" fill="#f4f1ea" ${outlined}/>
    <rect x="${x - 6 * s}" y="${y - 14 * s}" width="${12 * s}" height="${32 * s}" fill="#e2533f"/>
    <rect x="${x - 16 * s}" y="${y - 4 * s}" width="${32 * s}" height="${12 * s}" fill="#e2533f"/>`,
};

// A wooden sign with a world's name.
const sign = (x, y, text, half = Math.max(58, text.length * 5.6 + 16)) => `<g>
  <rect x="${x - 3}" y="${y}" width="6" height="26" fill="#7a4a26"/>
  <rect x="${x - half}" y="${y - 22}" width="${half * 2}" height="30" rx="7" fill="#d3954f" ${outlined}/>
  <text x="${x}" y="${y}" text-anchor="middle" font-family="Fredoka, Arial, sans-serif" font-weight="700" font-size="18" fill="#fff" stroke="${INK}" stroke-width="4" paint-order="stroke">${text}</text></g>`;

const STAR = 'M0 -11 L3.2 -3.6 L11 -3.4 L4.9 1.6 L7 9.3 L0 4.9 L-7 9.3 L-4.9 1.6 L-11 -3.4 L-3.2 -3.6 Z';

// A level's button: a round orange top on a wooden rim, its number, and its stars below; grey with
// a padlock while it's locked; a golden ring round the one the player is up to.
function stopArt({ x, y }, stop) {
  const { r, rim, ring } = STOP;
  const top = stop.locked ? '#9aa3b5' : '#ffa53a';
  const light = stop.locked ? '#b9c0cd' : '#ffc46a';
  const side = stop.locked ? '#5d6577' : '#a0522d';
  const parts = [shadow(x + 4, y + rim + 12, r + 6, 16)];
  if (stop.current) parts.push(`<circle cx="${x}" cy="${y}" r="${ring}" fill="#ffd23f" opacity="0.5"/><circle cx="${x}" cy="${y}" r="${ring}" fill="none" stroke="#fff3b0" stroke-width="4"/>`);
  parts.push(
    `<circle cx="${x}" cy="${y + rim}" r="${r}" fill="${side}" ${outlined}/>`,
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${top}" ${outlined}/>`,
    `<circle cx="${x}" cy="${y - 4}" r="${r - 9}" fill="${light}"/>`,
  );
  if (stop.locked) {
    parts.push(`<g transform="translate(${x} ${y})">
      <path d="M-11 -4 V-12 A11 11 0 0 1 11 -12 V-4" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
      <path d="M-11 -4 V-12 A11 11 0 0 1 11 -12 V-4" fill="none" stroke="#e6e9ef" stroke-width="5" stroke-linecap="round"/>
      <rect x="-17" y="-6" width="34" height="26" rx="6" fill="#f2c24b" ${outlined}/>
      <circle cx="0" cy="5" r="4" fill="${INK}"/></g>`);
  } else {
    parts.push(`<text x="${x}" y="${y + 14}" text-anchor="middle" font-family="Fredoka, Arial, sans-serif" font-weight="700" font-size="40" fill="#fff" stroke="${INK}" stroke-width="7" paint-order="stroke">${stop.number}</text>`);
    const stars = [-1, 0, 1].map((k, i) => {
      const filled = i < (stop.stars ?? 0);
      return `<path d="${STAR}" transform="translate(${x + k * 27} ${y + r + rim + 16 + (k === 0 ? 6 : 0)}) scale(1.25)" fill="${filled ? '#ffd23f' : '#3b2a1a'}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
    });
    parts.push(...stars);
  }
  return `<g>${parts.join('')}</g>`;
}

const home = (x, y) => PROPS.house(x, y, 0.8);
// A swirling portal, where the adventure's road starts, and a castle, where it ends.
const portal = (x, y) => `${shadow(x, y + 30, 40)}
  <ellipse cx="${x}" cy="${y}" rx="34" ry="40" fill="#5b3fa8" ${outlined}/>
  <ellipse cx="${x}" cy="${y}" rx="24" ry="30" fill="#7fd0ff"/>
  <ellipse cx="${x}" cy="${y}" rx="13" ry="17" fill="#ffffff" opacity="0.9"/>`;
const castle = (x, y) => `${shadow(x, y + 42, 60)}
  ${PROPS.tower(x - 34, y + 4, 0.8)}${PROPS.tower(x + 34, y + 4, 0.8)}
  <rect x="${x - 24}" y="${y - 30}" width="48" height="66" rx="4" fill="#bcc2ce" ${outlined}/>
  <path d="M${x - 30} ${y - 28} L${x} ${y - 64} L${x + 30} ${y - 28} Z" fill="#d8443a" ${outlined}/>
  <path d="M${x - 10} ${y + 36} V${y + 10} A10 10 0 0 1 ${x + 10} ${y + 10} V${y + 36} Z" fill="#5d4532"/>`;
const ENDS = { house: home, portal, trophy: (x, y) => trophy(x, y), castle, none: () => '' };
const SIGN_ROOM = 92; // scenery stays below the world signs
const BLEND = 70; // how wide the ground fades from one world to the next
const trophy = (x, y) => `${shadow(x, y + 40, 36)}
  <path d="M${x - 30} ${y - 40} C${x - 52} ${y - 40} ${x - 50} ${y - 6} ${x - 22} ${y - 8}" fill="none" stroke="${INK}" stroke-width="11"/>
  <path d="M${x - 30} ${y - 40} C${x - 52} ${y - 40} ${x - 50} ${y - 6} ${x - 22} ${y - 8}" fill="none" stroke="#f5a623" stroke-width="6"/>
  <path d="M${x + 30} ${y - 40} C${x + 52} ${y - 40} ${x + 50} ${y - 6} ${x + 22} ${y - 8}" fill="none" stroke="${INK}" stroke-width="11"/>
  <path d="M${x + 30} ${y - 40} C${x + 52} ${y - 40} ${x + 50} ${y - 6} ${x + 22} ${y - 8}" fill="none" stroke="#f5a623" stroke-width="6"/>
  <path d="M${x - 32} ${y - 48} H${x + 32} C${x + 32} ${y - 6} ${x + 14} ${y + 4} ${x} ${y + 6} C${x - 14} ${y + 4} ${x - 32} ${y - 6} ${x - 32} ${y - 48} Z" fill="#ffb92e" ${outlined}/>
  <rect x="${x - 7}" y="${y + 4}" width="14" height="18" fill="#e0901c" ${outlined}/>
  <rect x="${x - 22}" y="${y + 20}" width="44" height="16" rx="4" fill="#a0522d" ${outlined}/>
  <path d="M${x - 18} ${y - 40} C${x - 18} ${y - 20} ${x - 10} ${y - 10} ${x - 4} ${y - 8}" stroke="#ffe08a" stroke-width="5" fill="none" stroke-linecap="round"/>`;

// The whole picture, as an SVG string. `stops`: { number, world, locked, current, stars }, in order.
// `look`: { worlds, start, end }: each world's ground and scenery (MAP_WORLDS by default), and what
// stands at each end of the path ('house' and 'trophy' by default; also 'portal' and 'castle', or
// 'none', for a path that runs on off the edge).
export function mapArt(stops, { worlds = MAP_WORLDS, start = 'house', end = 'trophy' } = {}) {
  const worldLook = (world) => worlds[world] ?? Object.values(worlds)[0];
  const positions = stopPositions(stops.length);
  const points = pathPoints(positions);
  const random = seeded(7);
  const parts = [];

  // Each world's ground: from halfway to its first stop to halfway past its last.
  const regions = [];
  stops.forEach((stop, i) => {
    if (i > 0 && stops[i - 1].world === stop.world) return;
    const last = stops.findLastIndex((other) => other.world === stop.world);
    const left = i === 0 ? 0 : (positions[i - 1].x + positions[i].x) / 2;
    const right = last === stops.length - 1 ? MAP_SIZE.w : (positions[last].x + positions[last + 1].x) / 2;
    regions.push({ world: stop.world, left, right });
  });
  const defs = [];
  const groundOf = (world) => worldLook(world).ground;
  for (const { world, left, right } of regions) {
    parts.push(`<rect x="${left}" y="0" width="${right - left + 1}" height="${MAP_SIZE.h}" fill="${groundOf(world)}"/>`);
  }
  // Where each world meets the next, its ground fades into the next one's.
  regions.forEach(({ world, right }, i) => {
    const ground = groundOf(world);
    const next = regions[i + 1];
    if (next) {
      const to = worldLook(next.world).ground;
      defs.push(`<linearGradient id="blend${i}"><stop offset="0" stop-color="${ground}"/><stop offset="1" stop-color="${to}"/></linearGradient>`);
      parts.push(`<rect x="${right - BLEND}" y="0" width="${BLEND * 2}" height="${MAP_SIZE.h}" fill="url(#blend${i})"/>`);
    }
  });
  for (const { world, left, right } of regions) {
    const { edge } = worldLook(world);
    // Darker patches of grass, for texture.
    for (let k = 0; k < 5; k++) {
      const x = left + random() * (right - left), y = random() * MAP_SIZE.h;
      parts.push(`<ellipse cx="${x}" cy="${y}" rx="${50 + random() * 60}" ry="${24 + random() * 30}" fill="${edge}" opacity="0.45"/>`);
    }
  }

  // The path: a dark edge, the dirt, and a dashed line down the middle.
  const d = `M${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}`;
  parts.push(
    `<path d="${d}" fill="none" stroke="#7a6142" stroke-width="${PATH.edge}" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<path d="${d}" fill="none" stroke="#d9c08a" stroke-width="${PATH.top}" stroke-linejoin="round" stroke-linecap="round"/>`,
    `<path d="${d}" fill="none" stroke="#5a4630" stroke-width="${PATH.dash}" stroke-dasharray="${PATH.dashGap}" stroke-linecap="round"/>`,
  );

  // Scenery, scattered over each world, clear of the path, its stops and each other. Drawn top to
  // bottom, so nearer things overlap further ones.
  const placed = [];
  const homeAt = { x: 62, y: positions[0].y - 105 };
  for (const { world, left, right } of regions) {
    const kinds = worldLook(world).props;
    let tries = 0;
    for (let n = 0; n < kinds.length * 2 && tries < 400; tries++) {
      const x = left + 30 + random() * (right - left - 60), y = SIGN_ROOM + random() * (MAP_SIZE.h - SIGN_ROOM - 40);
      if (Math.hypot(x - homeAt.x, y - homeAt.y) < 95) continue; // the cat's home
      if (positions.some((p) => Math.hypot(x - p.x, y - p.y - 30) < 100)) continue; // a stop and its stars
      if (distanceToPath(x, y, points) < CLEAR_OF_PATH + 30) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < 80)) continue;
      placed.push({ x, y, kind: kinds[n % kinds.length], s: 0.8 + random() * 0.35 });
      n += 1;
    }
  }
  placed.sort((a, b) => a.y - b.y).forEach(({ x, y, kind, s }) => parts.push(PROPS[kind](x, y, s)));

  for (const { world, left, right } of regions) parts.push(sign((left + right) / 2, 36, world));
  const last = points[points.length - 1];
  const endLift = end === 'castle' ? 22 : 0; // the castle is tall: a little above the last stop, below the sign
  parts.push(ENDS[start](homeAt.x, homeAt.y), ENDS[end](last.x - 40 + endLift, last.y + 10 - endLift));
  stops.forEach((stop, i) => parts.push(stopArt(positions[i], stop)));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_SIZE.w} ${MAP_SIZE.h}"><defs>${defs.join('')}</defs>${parts.join('\n')}</svg>`;
}
