// Spikes (map letter ^): each world's own pictures, one in each spike's cell (pictures: chosen for
// each cell by its place, so a row isn't copied, and the same each time), standing on its floor.
// Only the part of its cell a picture fills hurts the cat: hit, a box at the cell's foot, w px wide
// (inside the cell, so a picture wider than its cell, overlapping its neighbours into one row,
// never hurts the cell beside it) and h px tall (most of its drawn height: its tips thin out at the
// top). tests/adventure-spikes.test.js checks each box against its world's pictures.
//   wood: the pack's low spikes, 29 px drawn;
//   autumn: the owner's thorn bushes (prompt hidden-dam/10), red-tipped, 96 px wide, about 48 tall.
export const SPIKES = {
  wood: { pictures: ['spike'], hit: { w: 52, h: 20 } },
  autumn: { pictures: ['thorn-1', 'thorn-2', 'thorn-3'], hit: { w: 56, h: 36 } },
};
// Which of a world's pictures each cell gets: cellRandom's seed (systems/adventure/decorPlacement.js).
export const SPIKE_SEED = 31;
export const spikesOf = (world) => SPIKES[world] ?? SPIKES.wood;
// The picture for the spike in a cell. random(col, row): a number in [0, 1) for the cell.
export const spikePicture = (world, col, row, random) => {
  const { pictures } = spikesOf(world);
  return pictures[Math.floor(random(col, row) * pictures.length) % pictures.length];
};
