import { HOME_ART } from '../data/adventure/home.js';
import { ADVENTURE_ROADMAP, ADVENTURE_WORLDS, ROADMAP_MAP } from '../data/adventure/roadmap.js';
import './adventure-roadmap.css';

// The adventure's road map (Level Select): the owner's vertical map, climbed like a ladder, the
// first world at the bottom and the last at the top (ROADMAP_MAP in data/adventure/roadmap.js). It
// scrolls up and down, and opens on the level the player is up to, with a gold paw bobbing over it.
// Each level is a live hexagon button over the painted one: open, current, finished (with its
// crystals) or locked. The picture is plain HTML; nothing moves but the paw.

const PAW = `${HOME_ART}/icon-paw.webp`;
const CRYSTALS = 3; // a level's crystals, shown under it once it's been played
const percent = (part, whole) => `${(part / whole) * 100}%`;

// A hexagon, pointy at the top like the painted ones: its outline, and a lighter inside.
const HEX = '25,2 47,14.5 47,39.5 25,52 3,39.5 3,14.5';
const HEX_IN = '25,7.5 42.5,17.5 42.5,36.5 25,46.5 7.5,36.5 7.5,17.5';
const PADLOCK = '<g fill="#5d6470" stroke="#2c3038" stroke-width="1.5"><path d="M19 25 v-4 a6 6 0 0 1 12 0 v4" fill="none" stroke-width="3"/><rect x="16" y="24.5" width="18" height="14" rx="3"/></g>';

// levels: one for each stop of ADVENTURE_ROADMAP, in order: { locked, current, played, stars,
// title, onPick }. crystals: { found, total }. onBack: back to the home screen. overlay: for
// buttons that click like the rest of the menus. Returns the element, and scrollToCurrent(), to
// call once it's on screen.
export function adventureRoadmap({ levels, crystals, onBack, overlay }) {
  const { w, h, hex, nodes, file, backdrop } = ROADMAP_MAP;
  const root = document.createElement('div');
  root.className = 'roadmap';
  root.style.setProperty('--backdrop', `url(${backdrop})`);
  root.innerHTML = `<svg class="roadmap-defs" aria-hidden="true"><defs>
    <linearGradient id="roadmap-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#f2a414"/></linearGradient>
    <linearGradient id="roadmap-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3c8d0"/><stop offset="1" stop-color="#868d98"/></linearGradient>
  </defs></svg>`;

  const scroller = document.createElement('div');
  scroller.className = 'roadmap-scroll';
  const map = document.createElement('div');
  map.className = 'roadmap-map';
  map.style.aspectRatio = `${w} / ${h}`;
  const picture = document.createElement('img');
  picture.className = 'roadmap-picture';
  picture.src = file;
  picture.alt = '';
  picture.width = w;
  picture.height = h;
  picture.draggable = false;
  map.append(picture);

  let current = null;
  levels.forEach((level, i) => {
    const stop = ADVENTURE_ROADMAP[i];
    const [x, y] = nodes[i];
    const world = ADVENTURE_WORLDS.indexOf(stop.world) + 1;
    const number = (i % 3) + 1;
    const button = overlay.button('', () => level.onPick());
    button.className = `roadmap-level${level.locked ? ' locked' : ''}${level.current ? ' current' : ''}${level.played ? ' played' : ''}`;
    button.disabled = level.locked;
    Object.assign(button.style, { left: percent(x, w), top: percent(y, h), width: percent(hex, w) });
    const state = level.locked ? 'locked' : level.played ? `${level.stars} of ${CRYSTALS} crystals` : 'not played yet';
    button.setAttribute('aria-label', `World ${world}, ${stop.world}, level ${number}: ${level.title}, ${state}`);
    button.innerHTML = `<svg viewBox="0 0 50 54" aria-hidden="true">
      <polygon points="${HEX}" fill="${level.locked ? 'url(#roadmap-stone)' : 'url(#roadmap-gold)'}" stroke="#4a2410" stroke-width="3.5" stroke-linejoin="round"/>
      <polygon points="${HEX_IN}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" stroke-linejoin="round"/>
      ${level.locked ? PADLOCK : `<text x="25" y="35" text-anchor="middle">${number}</text>`}
    </svg>`;
    if (level.played) {
      const gems = document.createElement('span');
      gems.className = 'roadmap-crystals';
      gems.innerHTML = Array.from({ length: CRYSTALS }, (_, c) => `<i class="${c < level.stars ? 'earned' : ''}"></i>`).join('');
      button.append(gems);
    }
    const name = document.createElement('strong');
    name.className = 'roadmap-name';
    name.textContent = level.title;
    button.append(name);
    map.append(button);
    if (level.current) current = { x, y };
  });

  // The paw over the level the player is up to.
  if (current) {
    const paw = document.createElement('img');
    paw.className = 'roadmap-paw';
    paw.src = PAW;
    paw.alt = '';
    Object.assign(paw.style, { left: percent(current.x, w), top: percent(current.y - hex * 0.95, h), width: percent(hex * 0.8, w) });
    map.append(paw);
  }
  scroller.append(map);

  // The top bar: back, the title, and the crystals found.
  const bar = document.createElement('div');
  bar.className = 'roadmap-bar';
  const back = overlay.button('Back', onBack);
  back.className = 'paws-plank roadmap-back';
  const title = document.createElement('h2');
  title.className = 'roadmap-title';
  title.textContent = 'Level Select';
  const count = document.createElement('span');
  count.className = 'roadmap-count';
  count.innerHTML = `<i></i>${crystals.found} / ${crystals.total}`;
  count.setAttribute('aria-label', `${crystals.found} of ${crystals.total} crystals found`);
  bar.append(back, title, count);

  root.append(scroller, bar);

  // Centres the level the player is up to, or shows the bottom, where the road starts.
  const scrollToCurrent = () => {
    const at = current ? current.y / h : 1;
    scroller.scrollTop = at * map.offsetHeight - scroller.clientHeight / 2;
  };
  return { element: root, scrollToCurrent };
}

export function adventureRoadmapPictures() {
  return [ROADMAP_MAP.file, ROADMAP_MAP.backdrop];
}
