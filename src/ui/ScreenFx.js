// Moments drawn in HTML over the game: a circle wipe between screens, a title card as a level
// begins, and a banner for getting away. They're only for looks, and never hold up the game.
const WIPE_MS = 300;
const TITLE_MS = 2100;
const BANNER_MS = 1800;

export class ScreenFx {
  // `instant` skips the wipe's animation, for the fast in-game tests.
  constructor({ instant = false } = {}) {
    this.instant = instant;
    this.wipe = document.createElement('div');
    this.wipe.className = 'wipe';
    this.title = document.createElement('div');
    this.title.className = 'title-card';
    this.title.innerHTML = '<small></small><strong></strong>';
    this.banner = document.createElement('div');
    this.banner.className = 'escape-banner';
    document.body.append(this.title, this.banner, this.wipe);
    this.covered = false;
  }

  // Closes a circle over the screen, then runs `then`. The next screen opens it with reveal().
  cover(then) {
    if (this.instant) {
      then();
      return;
    }
    this.covered = true;
    this.wipe.className = 'wipe closing';
    setTimeout(then, WIPE_MS);
  }

  reveal() {
    if (!this.covered) return;
    this.covered = false;
    this.wipe.className = 'wipe opening';
  }

  // "Level 1", then the level's own name, on a banner in its world's colour.
  showTitle({ number, title, world }) {
    const card = this.title;
    card.querySelector('small').textContent = number;
    card.querySelector('strong').textContent = title;
    card.dataset.world = world ?? '';
    restartAnimation(card, 'title-card showing');
    clearTimeout(this.titleTimer);
    this.titleTimer = setTimeout(() => { card.className = 'title-card'; }, TITLE_MS);
  }

  showBanner(text) {
    this.banner.textContent = text;
    restartAnimation(this.banner, 'escape-banner showing');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { this.banner.className = 'escape-banner'; }, BANNER_MS);
  }
}

// Setting the same class again doesn't replay a CSS animation, so it's cleared and reflowed first.
function restartAnimation(element, className) {
  element.className = '';
  void element.offsetWidth;
  element.className = className;
}
