// Mill Falls' own art (level 2), cut from the owner's three sheets by tools/adventure-mill-art.mjs:
//   images/levels/forest/water-mill.png (prompts/forest-level/11-water-wheel.md): the wheel, a seat, the stand;
//   images/levels/forest/waterfalls.png (12-waterfalls.md): a waterfall's top, middle, splash and veil;
//   images/levels/forest/mill-falls-props.png (13-mill-falls-props.md): a leaf clump, a rope plank,
//   a cave mouth, a lantern and stakes.
// The sizes here are what the tool cuts them to, so the game shows them at their own size.

// The sheets' pieces, in the rows the tool finds them in (top to bottom, each left to right).
export const MILL_SHEETS = {
  'water-mill': [['mill-seat'], ['mill-wheel'], ['mill-stand']],
  waterfalls: [['fall-top'], ['fall-middle', 'fall-veil'], ['fall-splash']],
  'mill-falls-props': [['mill-leaves', 'mill-rope'], ['mill-cave', 'mill-lantern', 'mill-stakes']],
};

// The wheel, cut so its rim, where the seats sit, is RIM_RADIUS px from its middle: a wheel of
// radius 4 cells (systems/adventure/wheels.js) at its own size; a smaller one is shown scaled down.
// The tool measures where the rim is in the picture and prints it (rimShare: the rim's radius over
// half the picture's width).
export const MILL_WHEEL = { rimRadius: 256, rimShare: 0.754 };

// A seat, cut as wide as a 3-cell seat. top: px from the picture's top to where he stands (the top
// of its planks, under the moss tufts), measured by the tool.
export const MILL_SEAT = { width: 192, top: 4 };

// The stand holding the wheel's axle from behind: cut this tall, then shown stretched to reach from
// the hub down to the ground or the water. axle: where the axle sits on it (fractions of its
// picture). Across, it's never wider than maxSpread of its own width for a wheel of radius 4, and
// narrower for a smaller wheel, so a tall stand doesn't splay out.
export const MILL_STAND = { height: 480, axle: { x: 0.5, y: 0.144 }, maxSpread: 0.9 };

// How the stand is scaled under a wheel of `radius` cells, its axle `drop` px above the floor.
export function standScale(radius, drop) {
  const y = Math.max(0.4, drop / ((1 - MILL_STAND.axle.y) * MILL_STAND.height));
  return { x: Math.min(y, MILL_STAND.maxSpread) * (radius / 4), y };
}

// A waterfall: the middle repeats down as far as it falls, and flows (speed, px a second). The top
// and the splash are cut to match its width. waterShare: the share of the top picture's width
// that's water, so the top's water lines up with the middle.
export const WATERFALL = { width: 150, speed: 260, waterShare: 0.62, splashShare: 1.5, depth: 1.6, alpha: 0.95 };

// The props, cut to these widths (px).
export const MILL_PROPS = { 'mill-leaves': 420, 'mill-rope': 64, 'mill-cave': 300, 'mill-lantern': 34, 'mill-stakes': 200 };

export const MILL_ART = [
  'mill-wheel', 'mill-seat', 'mill-stand', 'fall-top', 'fall-middle', 'fall-veil', 'fall-splash',
  'mill-leaves', 'mill-rope', 'mill-cave', 'mill-lantern', 'mill-stakes',
];
