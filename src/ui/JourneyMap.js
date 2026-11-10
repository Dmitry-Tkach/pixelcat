import { CHARACTERS } from '../data/characters.js';
import { MAP_SIZE, mapArt, stopPositions } from './mapArt.js';

const WALK_MS = 650; // how long the cat takes to walk to the stop the player picks
const FACE_PX = 40; // the cat's face, and the bosses', on the map
const BOSS_FACE_PX = 30;

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

// The level menu: a meadow seen from above, with a winding path from the cat's home past a round
// button for every level to a trophy (the picture is mapArt.js). `stops` are the levels, in order:
// { number, title, world, locked, current, stars, mouse, boss, onPick }, where `boss` is a character
// id. The picture's buttons are drawn; real, see-through buttons sit on them, for clicks, keys and
// screen readers. `instant` skips the cat's walk, for the fast in-game tests.
export function journeyMap({ stops, instant = false }) {
  const map = document.createElement('div');
  map.className = 'map';
  const art = document.createElement('div');
  art.className = 'map-art';
  art.innerHTML = mapArt(stops);
  map.append(art);
  const at = stopPositions(stops.length).map(({ x, y }) => ({ x: (x / MAP_SIZE.w) * 100, y: (y / MAP_SIZE.h) * 100 }));

  // The cat waits on the level the player is up to.
  const startAt = Math.max(0, stops.findIndex((stop) => stop.current));
  const cat = face('cat', FACE_PX, 'map-cat');
  const placeCat = (i) => {
    cat.style.left = `${at[i].x}%`;
    cat.style.top = `${at[i].y}%`;
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
    button.style.left = `${at[i].x}%`;
    button.style.top = `${at[i].y}%`;
    const stars = stop.locked ? 'locked' : `${stop.stars ?? 0} of 3 stars`;
    button.setAttribute('aria-label', `${stop.number}. ${stop.title}, ${stars}${stop.mouse ? ', toy mouse found' : ''}`);
    // Its name, on a tag shown when it's pointed at or chosen with the keys.
    const label = document.createElement('strong');
    label.className = 'map-stop-name';
    label.textContent = stop.title;
    button.append(label);
    if (stop.mouse) {
      const mouse = document.createElement('span');
      mouse.className = 'map-mouse';
      mouse.textContent = '🐭';
      button.append(mouse);
    }
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
