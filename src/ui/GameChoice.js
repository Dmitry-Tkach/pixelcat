// The home screen's choice of game: two panels side by side, the runner and the adventure, each with
// its picture behind it, a kicker, a title, what it's about, its keys and its buttons. The picture is
// still until the panel is pointed at, then it plays; on touch screens, with nothing to point, it
// always plays. Clicking anywhere on a panel does its first button's job.
//
// `games`: [{ id, kicker, title, text, keys, still, moving, alt, actions: [{ label, primary, onClick }] }]
export function gameChoice(games) {
  const choice = document.createElement('div');
  choice.className = 'game-choice';
  for (const game of games) {
    const panel = document.createElement('section');
    panel.className = `game-panel game-panel-${game.id}`;
    panel.setAttribute('aria-label', game.title);

    const picture = document.createElement('img');
    picture.className = 'game-panel-picture';
    picture.src = game.still;
    picture.alt = game.alt;
    picture.draggable = false;
    // The moving picture is fetched once, then swapped in and out as the panel is pointed at.
    new Image().src = game.moving;
    const play = () => { picture.src = game.moving; };
    const stop = () => { picture.src = game.still; };
    if (window.matchMedia?.('(hover: hover)').matches) {
      panel.addEventListener('pointerenter', play);
      panel.addEventListener('pointerleave', stop);
      panel.addEventListener('focusin', play);
      panel.addEventListener('focusout', stop);
    } else {
      play();
    }

    const words = document.createElement('div');
    words.className = 'game-panel-words';
    const kicker = document.createElement('span');
    kicker.className = 'game-panel-kicker';
    kicker.textContent = game.kicker;
    const title = document.createElement('h2');
    title.textContent = game.title;
    const text = document.createElement('p');
    text.textContent = game.text;
    const keys = document.createElement('small');
    keys.textContent = game.keys;
    const buttons = document.createElement('div');
    buttons.className = 'game-panel-buttons';
    for (const { label, primary, onClick } of game.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      if (primary) button.classList.add('primary');
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        onClick();
      });
      buttons.append(button);
    }
    words.append(kicker, title, text, keys, buttons);
    panel.append(picture, words);
    panel.addEventListener('click', () => game.actions[0].onClick());
    choice.append(panel);
  }
  return choice;
}
