// Spikes (map letter ^): each world's are its own picture (spike, 64 px wide), and only the part of
// a cell its picture fills hurts the cat: hit, a box at the cell's foot, w px wide (a little under
// the picture's own, so brushing a tip at its very edge doesn't hurt) and h px tall (most of its
// drawn height: its tips thin out at the top). Measured on each world's picture: the Wood world's
// spikes are low, 29 px drawn; the Autumn world's thorn bushes stand 50 px. (tests/adventure-spikes
// checks each covers at least two-thirds of its picture's height.)
export const SPIKE_HIT = {
  wood: { w: 52, h: 20 },
  autumn: { w: 56, h: 40 },
};
export const spikeHit = (world) => SPIKE_HIT[world] ?? SPIKE_HIT.wood;
