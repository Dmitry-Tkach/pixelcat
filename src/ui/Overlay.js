// The menu layer: plain HTML and CSS drawn above the game canvas.
// Each screen is one call to show(), so adding a screen needs no new markup.
export class Overlay {
  constructor(root = document.getElementById('overlay')) {
    this.root = root;
    this.title = root.querySelector('[data-title]');
    this.image = root.querySelector('[data-image]');
    this.message = root.querySelector('[data-message]');
    this.actions = root.querySelector('[data-actions]');
    this.tiles = root.querySelector('[data-tiles]');
    this.onAction = () => {}; // runs on every button press, before the button's own action
  }

  button(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      this.onAction();
      onClick();
    });
    return button;
  }

  // Clearing the source as well as hiding it stops an animation from playing unseen.
  setImage(image) {
    this.image.hidden = !image;
    this.image.alt = image?.alt ?? '';
    if (image) this.image.src = image.src;
    else this.image.removeAttribute('src');
  }

  // `image` is an optional picture: { src, alt }.
  // `tiles` is an optional grid: { label, detail, world, locked, current, onClick }.
  show({ title, message = '', image, actions, tiles = [] }) {
    this.title.textContent = title;
    this.message.textContent = message;
    this.setImage(image);
    this.root.querySelector('.panel').classList.toggle('wide', tiles.length > 0);
    this.tiles.replaceChildren(
      ...tiles.map(({ label, detail, world, locked, current, onClick }) => {
        const tile = this.button('', onClick);
        tile.classList.add('tile');
        tile.dataset.world = world ?? '';
        tile.disabled = Boolean(locked);
        if (current) tile.classList.add('current');
        const name = document.createElement('strong');
        name.textContent = label;
        const small = document.createElement('small');
        small.textContent = detail;
        tile.append(name, small);
        return tile;
      }),
    );
    this.actions.replaceChildren(
      ...actions.map(({ label, primary, onClick }) => {
        const button = this.button(label, onClick);
        if (primary) button.classList.add('primary');
        return button;
      }),
    );
    this.root.hidden = false;
    this.actions.querySelector('.primary')?.focus();
  }

  hide() {
    this.root.hidden = true;
    this.setImage(null);
    this.actions.replaceChildren();
    this.tiles.replaceChildren();
  }
}
