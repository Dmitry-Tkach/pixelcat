// Where everything on the road map goes, in the map's own units (data/adventure/roadmap.js). Plain
// code with no page, so vitest can test it. The first world is at the bottom and the road climbs:
// each island sits a row above the one before, taking turns left and right of the middle, its title
// plate and world badge just above it, its three level buttons along its front. On the first island
// the road runs left to right, on the next right to left, and so on, like a ladder's zigzag, so it
// always climbs from an island's last level to the next island's first on the same side.

// look: ROADMAP_LOOK; pieces: ROADMAP_PIECES; worlds: how many.
export function roadmapLayout(look, pieces, worlds) {
  const w = look.width;
  const h = look.bottom + worlds * look.row + look.top;
  const placed = [];
  for (let i = 0; i < worlds; i++) {
    const [iw, ih] = pieces.islands[i];
    const islandW = look.island;
    const islandH = (islandW * ih) / iw;
    const cx = w / 2 + (i % 2 === 0 ? -look.swing : look.swing);
    // Its feet a row higher for each world, from the bottom margin up.
    const bottom = h - look.bottom - i * look.row;
    const island = { x: cx - islandW / 2, y: bottom - islandH, w: islandW, h: islandH };
    const [tw, th] = pieces.titles[i];
    const titleH = th * (look.button / pieces.level[0]);
    const titleW = (tw * titleH) / th;
    const title = { x: cx - titleW / 2, y: island.y - look.title - titleH / 2, w: titleW, h: titleH };
    const badgeW = look.button * 0.9;
    const badgeH = (badgeW * pieces.badge[1]) / pieces.badge[0];
    const badge = { x: title.x - badgeW * 0.6, y: title.y + titleH / 2 - badgeH / 2, w: badgeW, h: badgeH };
    const along = i % 2 === 0 ? look.levels.x : [...look.levels.x].reverse();
    const levels = along.map((share) => ({ x: island.x + share * islandW, y: island.y + look.levels.y * islandH }));
    placed.push({ island, title, badge, levels });
  }
  const buttonH = (look.button * pieces.level[1]) / pieces.level[0];
  return { w, h, button: { w: look.button, h: buttonH }, worlds: placed, route: roadPath(placed, w / 2) };
}

// The road, as an SVG path through every level in order: straight along an island, and a curve
// up its side to the next, bowing outwards, away from the map's `middle`.
export function roadPath(worlds, middle) {
  const points = worlds.flatMap((world) => world.levels);
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (i % 3 !== 0) {
      d += ` L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    } else {
      // Up to the next island, bowing out past the side it climbs.
      const out = a.x > middle ? 1 : -1;
      const bow = 70 * out;
      d += ` C${(a.x + bow).toFixed(1)} ${(a.y - 30).toFixed(1)} ${(b.x + bow).toFixed(1)} ${(b.y + 30).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
  }
  return d;
}
