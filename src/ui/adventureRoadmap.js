import { ADVENTURE_ROADMAP, ADVENTURE_WORLDS, ROADMAP_ART, ROADMAP_LOOK, ROADMAP_PIECES } from '../data/adventure/roadmap.js';
import { roadmapLayout } from '../systems/adventure/roadmapLayout.js';
import './adventure-roadmap.css';

// The adventure's road map (Level Select), from the owner's design: the worlds' islands stacked from
// the bottom, the first, to the top, the last, climbed like a ladder, the golden road snaking up
// through their levels (systems/adventure/roadmapLayout.js places everything). It scrolls up and
// down, and opens on the level the player is up to, with the cat standing on it like a game piece.
// Each level is a button from the owner's art: its number when open, a tick when finished, a padlock
// when locked. It's plain HTML; nothing moves but the glow round the current level.

const CRYSTALS = 3; // a level's crystals, shown under it once it's been played
const art = (name) => `${ROADMAP_ART}/${name}.webp`;

// levels: one for each stop of ADVENTURE_ROADMAP, in order: { locked, current, played, stars,
// title, onPick }. crystals: { found, total }. onBack: back to the home screen. overlay: for
// buttons that click like the rest of the menus. Returns the element, and scrollToCurrent(), to
// call once it's on screen.
export function adventureRoadmap({ levels, crystals, onBack, overlay }) {
  const layout = roadmapLayout(ROADMAP_LOOK, ROADMAP_PIECES, ADVENTURE_WORLDS.length);
  const { w, h } = layout;
  const at = (box) => ({ left: pct(box.x, w), top: pct(box.y, h), width: pct(box.w, w) });

  const root = document.createElement('div');
  root.className = 'roadmap';
  const scroller = document.createElement('div');
  scroller.className = 'roadmap-scroll';
  const map = document.createElement('div');
  map.className = 'roadmap-map';
  map.style.aspectRatio = `${w} / ${h}`;

  // Clouds drifting by, at the back.
  for (const { x, y, w: cw, cloud } of ROADMAP_LOOK.clouds) {
    const [pw, ph] = ROADMAP_PIECES.clouds[cloud - 1];
    map.append(piece(`cloud-${cloud}`, 'roadmap-cloud', at({ x: x * w - cw / 2, y: y * h - (cw * ph) / pw / 2, w: cw })));
  }
  // The islands, the top one first, so each lower one is in front of the one above it.
  for (let i = layout.worlds.length - 1; i >= 0; i--) map.append(piece(`island-${i + 1}`, 'roadmap-island', at(layout.worlds[i].island)));

  // The golden road: a soft glow, a dark edge and the gold, in the map's own units.
  const road = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  road.setAttribute('class', 'roadmap-road');
  road.setAttribute('viewBox', `0 0 ${w} ${h}`);
  road.setAttribute('preserveAspectRatio', 'none');
  road.setAttribute('aria-hidden', 'true');
  road.innerHTML = ['glow', 'edge', 'gold'].map((part) => `<path class="roadmap-road-${part}" d="${layout.route}"/>`).join('');
  map.append(road);

  // Each world's title plate and number badge.
  layout.worlds.forEach(({ title, badge }, i) => {
    map.append(piece(`title-${i + 1}`, 'roadmap-plate', at(title), ADVENTURE_WORLDS[i]));
    map.append(piece(`badge-${i + 1}`, 'roadmap-plate', at(badge)));
  });

  // The levels.
  let current = null;
  const points = layout.worlds.flatMap((world) => world.levels);
  levels.forEach((level, i) => {
    const stop = ADVENTURE_ROADMAP[i];
    const number = (i % 3) + 1;
    const world = ADVENTURE_WORLDS.indexOf(stop.world) + 1;
    const { x, y } = points[i];
    const look = level.locked ? 'locked' : level.played && !level.current ? 'done' : String(number);
    const button = overlay.button('', () => level.onPick());
    button.className = `roadmap-level${level.current ? ' current' : ''}`;
    button.disabled = level.locked;
    Object.assign(button.style, at({ x: x - layout.button.w / 2, y: y - layout.button.h / 2, w: layout.button.w }));
    const state = level.locked ? 'locked' : level.played ? `${level.stars} of ${CRYSTALS} crystals` : 'not played yet';
    button.setAttribute('aria-label', `World ${world}, ${stop.world}, level ${number}: ${level.title}, ${state}`);
    button.append(piece(`level-${look}`, 'roadmap-level-picture'));
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

  // The cat, standing on the level the player is up to.
  if (current) {
    const [cw, ch] = ROADMAP_PIECES.cat;
    const height = ROADMAP_LOOK.cat;
    const width = (height * cw) / ch;
    const feet = current.y - layout.button.h * 0.42;
    map.append(piece('cat', 'roadmap-cat', at({ x: current.x - width / 2, y: feet - height, w: width })));
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
    const share = current ? current.y / h : 1;
    scroller.scrollTop = share * map.offsetHeight - scroller.clientHeight / 2;
  };
  return { element: root, scrollToCurrent };
}

// Every picture the road map shows, to fetch early, so it opens whole.
export function adventureRoadmapPictures() {
  const worlds = ADVENTURE_WORLDS.map((_, i) => i + 1);
  return [
    ...worlds.flatMap((n) => [`island-${n}`, `title-${n}`, `badge-${n}`]),
    'level-1', 'level-2', 'level-3', 'level-done', 'level-locked', 'cat', 'cloud-1', 'cloud-2',
  ].map(art);
}

function pct(part, whole) {
  return `${(part / whole) * 100}%`;
}

function piece(name, className, style = {}, alt = '') {
  const img = document.createElement('img');
  img.src = art(name);
  img.alt = alt;
  img.className = className;
  img.draggable = false;
  Object.assign(img.style, style);
  return img;
}
