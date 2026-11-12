// The game's three pages: the first page, the choice of games (index.html), and each game's own
// page, which loads only that game. Plain code with no Phaser, so the first page stays small.
export const PAGES = { choice: './', runner: 'runner.html', adventure: 'adventure.html' };

// Leaves for another page, after the screen wipe closes, if there's one.
export function goToPage(page, screenFx) {
  const leave = () => { location.href = page; };
  if (screenFx) screenFx.cover(leave);
  else leave();
}
