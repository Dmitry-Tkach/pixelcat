// Which character the player runs as. While developing, ?cat=battle tries the grey battle cat, a
// possible new look for the cat, on any level.
const params = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
export const PLAYER = import.meta.env?.DEV && params?.get('cat') === 'battle' ? 'battleCat' : 'cat';
