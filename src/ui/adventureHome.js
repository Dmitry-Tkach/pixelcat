import { ADVENTURE_NAME, HOME_ART, HOME_BUTTONS, HOME_CHARACTERS, HOME_SCENE } from '../data/adventure/home.js';
import './adventure-home.css';

// The adventure's home screen, "Adventure Paws", in layers (see data/adventure/home.js): the
// landscape at the back, its characters standing on it, then the logo and the wooden buttons. It's
// plain HTML in the menu overlay. The landscape is fitted by CSS alone (adventure-home.css), so a
// window of any shape shows every character whole, and nothing runs while it's on screen.

const percent = (part, whole) => `${(part / whole) * 100}%`;
const picture = (name) => `${HOME_ART}/${name}.webp`;

// The screen, as an element for the overlay's content. overlay: the menu overlay, whose buttons
// play the click and wake the sound. on: what each button does, by its action in HOME_BUTTONS.
export function adventureHome({ overlay, on }) {
  const { w, h, keep, sky } = HOME_SCENE;
  const root = document.createElement('div');
  root.className = 'paws-home';
  root.style.setProperty('--sky', sky);
  root.style.setProperty('--scene-w', w);
  root.style.setProperty('--scene-h', h);
  root.style.setProperty('--keep-w', keep.right - keep.left);

  // The landscape and its characters, all placed in the landscape's own pixels.
  const stage = document.createElement('div');
  stage.className = 'paws-stage';
  stage.append(image(picture('landscape'), 'paws-landscape'));
  for (const { name, x, y, w: cw, h: ch, shadow, glow } of HOME_CHARACTERS) {
    if (shadow) {
      const under = document.createElement('div');
      under.className = 'paws-shadow';
      Object.assign(under.style, { left: percent(x + cw / 2, w), top: percent(y + ch, h), width: percent(cw * 0.72, w) });
      stage.append(under);
    }
    const figure = image(picture(name), `paws-character${glow ? ' paws-glow' : ''}`);
    Object.assign(figure.style, { left: percent(x, w), top: percent(y, h), width: percent(cw, w) });
    stage.append(figure);
  }

  // The logo and the menu.
  const menu = document.createElement('div');
  menu.className = 'paws-menu';
  menu.append(image(picture('logo'), 'paws-logo', ADVENTURE_NAME));
  const buttons = document.createElement('nav');
  buttons.className = 'paws-buttons';
  HOME_BUTTONS.forEach(({ name, action, label, big }, i) => {
    const button = overlay.button('', () => on[action]());
    button.className = `paws-button${big ? ' paws-big' : ''}`;
    button.setAttribute('aria-label', label);
    button.style.setProperty('--i', i);
    button.append(image(picture(`button-${name}`), '', ''));
    buttons.append(button);
  });
  menu.append(buttons);
  root.append(stage, menu);
  return root;
}

// Every picture the screen shows, to fetch early, so it appears whole when it opens.
export function adventureHomePictures() {
  return ['landscape', 'logo', ...HOME_CHARACTERS.map((c) => c.name), ...HOME_BUTTONS.map((b) => `button-${b.name}`)].map(picture);
}

function image(src, className, alt = '') {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.draggable = false;
  if (className) img.className = className;
  return img;
}
