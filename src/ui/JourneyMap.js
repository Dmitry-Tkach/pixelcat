import { CHARACTERS, idleFrameKey } from '../data/characters.js';

const WALK_MS = 650; // how long the cat takes to walk to the stop the player picks
const FACE_PX = 40; // the cat's face, and the bosses', on the map
const BOSS_FACE_PX = 30;
// Each world's band of the map: its scenery, in front of a sky in its own colours.
const WORLDS = {
  City: { image: 'assets/city/near.png', sky: 'linear-gradient(#4FA3DE, #BFE2F5)' },
  Village: { image: 'assets/worlds/park-near.png', sky: 'linear-gradient(#3C9CE0, #CFEBD8)' },
  Farm: { image: 'assets/worlds/farm-near.png', sky: 'linear-gradient(#3E9EDF, #FFE9B8)' },
  Sunset: { image: 'assets/worlds/vet-near.png', sky: 'linear-gradient(#3B2A78, #F2765F 70%, #FFC163)' },
};

// Where a stop sits on the map, as percentages: along the road, and rising and falling with it.
function stopPosition(index, count) {
  return { x: 9 + (index * 78) / Math.max(1, count - 1), y: 57 + Math.sin(index * 1.25) * 11 };
}

// A round portrait cut from a character's idle frame, as a CSS background.
function faceStyle(character, size) {
  const { face, folder, anims } = CHARACTERS[character];
  const file = `assets/sprites/${folder}/${anims.idle.file}-${anims.idle.frameList?.[0] ?? 1}.png`;
  const scale = size / face.size;
  return { file, scale, x: -face.x * scale, y: -face.y * scale };
}

function face(character, size, className) {
  const el = document.createElement('span');
  el.className = className;
  const { file, scale, x, y } = faceStyle(character, size);
  el.style.backgroundImage = `url(${file})`;
  el.style.backgroundPosition = `${x}px ${y}px`;
  // The frame's own size, scaled, so the face lands in the circle. It's read once the image loads.
  const img = new Image();
  img.onload = () => { el.style.backgroundSize = `${img.width * scale}px ${img.height * scale}px`; };
  img.src = file;
  return el;
}

// The level menu as a road from home, past a park at the end of every level, to the last park. `stops` are the levels, in order:
// { number, title, detail, world, locked, current, boss, onPick }, where `boss` is a character id.
// `instant` skips the cat's walk, for the fast in-game tests.
export function journeyMap({ stops, instant = false }) {
  const map = document.createElement('div');
  map.className = 'map';
  const count = stops.length;
  const positions = stops.map((_, i) => stopPosition(i, count));

  // One band of scenery for each world, between the stops either side of it.
  const edges = positions.map((p, i) => (i === 0 ? 0 : (positions[i - 1].x + p.x) / 2));
  stops.forEach((stop, i) => {
    if (i > 0 && stops[i - 1].world === stop.world) return;
    const last = stops.findLastIndex((other) => other.world === stop.world);
    const band = document.createElement('div');
    band.className = 'map-world';
    const right = last === count - 1 ? 100 : (positions[last].x + positions[last + 1].x) / 2;
    band.style.left = `${edges[i]}%`;
    band.style.width = `${right - edges[i]}%`;
    const { image, sky } = WORLDS[stop.world] ?? WORLDS.City;
    band.style.backgroundImage = `url(${image}), ${sky}`;
    const name = document.createElement('span');
    name.className = 'map-world-name';
    name.textContent = stop.world;
    band.append(name);
    map.append(band);
  });

  // The road, through every stop, from home to the last park.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('map-road');
  const points = [{ x: 0, y: positions[0].y + 6 }, ...positions, { x: 100, y: positions[count - 1].y - 4 }];
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const mid = (a.x + b.x) / 2;
    d += ` C${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}`;
  }
  for (const [className, width] of [['map-road-edge', 9], ['map-road-top', 6], ['map-road-dash', 1]]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', className);
    path.setAttribute('stroke-width', width);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.setAttribute('fill', 'none');
    svg.append(path);
  }
  map.append(svg);

  const home = document.createElement('span');
  home.className = 'map-end map-home';
  home.textContent = '🏠';
  const park = document.createElement('span');
  park.className = 'map-end map-park';
  park.textContent = '🌳';
  map.append(home, park);

  // The cat waits on the level the player is up to.
  const startAt = Math.max(0, stops.findIndex((stop) => stop.current));
  const cat = face('cat', FACE_PX, 'map-cat');
  const placeCat = (i) => {
    cat.style.left = `${positions[i].x}%`;
    cat.style.top = `${positions[i].y}%`;
  };
  placeCat(startAt);

  let walking = false;
  stops.forEach((stop, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile map-stop';
    button.dataset.world = stop.world;
    button.disabled = stop.locked;
    if (stop.current) button.classList.add('current');
    button.style.left = `${positions[i].x}%`;
    button.style.top = `${positions[i].y}%`;
    button.setAttribute('aria-label', `${stop.number}. ${stop.title}${stop.locked ? ', locked' : ''}`);
    const number = document.createElement('span');
    number.className = 'map-stop-number';
    number.textContent = stop.locked ? '🔒' : String(stop.number);
    const label = document.createElement('strong');
    label.textContent = stop.title;
    const detail = document.createElement('small');
    detail.textContent = stop.detail;
    button.append(number, label, detail);
    if (stop.boss) button.append(face(stop.boss, BOSS_FACE_PX, 'map-boss'));
    button.addEventListener('click', () => {
      if (walking) return;
      if (instant || i === startAt) {
        stop.onPick();
        return;
      }
      // The cat walks along to the stop, then the level opens.
      walking = true;
      cat.classList.add('walking');
      placeCat(i);
      setTimeout(() => stop.onPick(), WALK_MS);
    });
    map.append(button);
  });
  map.append(cat);
  return map;
}
