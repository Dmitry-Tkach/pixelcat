// A dark outline around what the cat plays with, so it stands out in front of the scenery, as in
// classic platformers. It's drawn by the game, so no art needs changing. Browsers drawing without
// WebGL have no effects, and simply go without it.
const OUTLINE = {
  color: 0x1e2a4a,
  strength: 8, // how dark and solid the edge is
  distance: 3, // how far it reaches out from the art, in pixels
  quality: 0.2,
  padding: 6, // room around the art for the outline to show
};

export function outline(object) {
  const fx = object?.preFX;
  if (!fx) return object;
  fx.setPadding(OUTLINE.padding);
  fx.addGlow(OUTLINE.color, OUTLINE.strength, 0, false, OUTLINE.quality, OUTLINE.distance);
  return object;
}
