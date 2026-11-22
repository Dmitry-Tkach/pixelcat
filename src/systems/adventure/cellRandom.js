// A number from 0 to 1 for a cell, the same each time (a small integer hash): decoration and the
// rock kit use it to place things "at random" but the same way every time. Its own module, needing
// nothing, so the level checks can use it too.
export function cellRandom(col, row, salt = 0) {
  let h = (col * 374761393 + row * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
