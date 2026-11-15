import { ADVENTURE_LEVELS } from '../../data/adventure/index.js';

// While developing, a link can start a level at a named place, to try one part of it without playing
// up to it: /adventure.html?at=guardian. A level names its places in its `places`
// ({ name: { col, row } }, the cell he stands in). Only in development: the built game ignores it.

// The place the link asks for, as { levelIndex, cell }, or null.
export function devPlace(search = typeof location === 'undefined' ? '' : location.search) {
  if (!import.meta.env?.DEV) return null;
  const name = new URLSearchParams(search).get('at');
  if (!name) return null;
  const levelIndex = ADVENTURE_LEVELS.findIndex((level) => level.places?.[name]);
  return levelIndex < 0 ? null : { levelIndex, cell: ADVENTURE_LEVELS[levelIndex].places[name] };
}
