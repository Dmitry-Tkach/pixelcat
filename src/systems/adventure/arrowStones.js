// Arrow stones, the cave path's star in level 3 (Heart of the Tree): a moving stone platform, ridden
// like a moving log, with a green arrow on its face showing which way it's going next. Green means
// shoot it, as with a water wheel's hub: a round into a stone (or just above it, where a cat on a
// ledge level with it shoots) turns it back the other way; three freeze rounds stop it for a while.
// A level marks a moving log as one with { arrow: true } (mapBuilder's mover).
// Until the owner draws them, the stone and its arrow are drawn in code.
import { TILE } from '../adventureMap.js';

export const ARROW_STONE = {
  reach: 56, // px above the stone's top that a round still hits it (his gun is ~21-34 px above his feet)
  reverseCooldownMs: 900, // after it turns back, how long before another round can turn it again
  slab: { top: 10, height: 44, colour: 0x8d8f86, light: 0xb4b6aa, dark: 0x55574f, moss: 0x7fb24a, radius: 10 },
  mark: { w: 46, h: 30, colour: 0x7dff6a, edge: 0x1f5a1a, glow: 0xb8ffb0 },
  flashMs: 180, // the arrow flashes white as it turns
};

// The way an arrow points, in radians (0 right, a quarter turn down), for a stone heading from
// `from` to `to` (each { x, y }).
export function arrowAngle(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Whether a round at (x, y) hits a stone whose body is `rect` ({ left, right, top, bottom }).
export function hitsStone(rect, x, y, { reach } = ARROW_STONE) {
  return x >= rect.left && x <= rect.right && y >= rect.top - reach && y <= rect.bottom;
}

// The stone's picture for a stone `width` cells wide, and the arrow's, drawn once each.
export function stoneTextures(scene, width) {
  const { slab, mark } = ARROW_STONE;
  const key = `adventure-arrow-stone-${width}`;
  if (!scene.textures.exists(key)) {
    const w = width * TILE;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(slab.dark).fillRoundedRect(0, slab.top, w, slab.height, slab.radius);
    g.fillStyle(slab.colour).fillRoundedRect(2, slab.top, w - 4, slab.height - 5, slab.radius);
    g.fillStyle(slab.light).fillRoundedRect(6, slab.top + 3, w - 12, 8, 4);
    g.fillStyle(slab.dark, 0.5);
    for (let x = TILE; x < w; x += TILE) g.fillRect(x - 1, slab.top + 6, 2, slab.height - 12); // its blocks' joins
    g.fillStyle(slab.moss).fillRoundedRect(4, slab.top - 3, w - 8, 6, 3);
    g.generateTexture(key, w, TILE);
    g.destroy();
  }
  const markKey = 'adventure-arrow-mark';
  if (!scene.textures.exists(markKey)) {
    const g = scene.make.graphics({ add: false });
    const arrow = (dx, dy, colour) => {
      g.fillStyle(colour);
      g.fillRect(2 + dx, mark.h / 2 - 5 + dy, mark.w * 0.55, 10);
      g.fillTriangle(mark.w * 0.5 + dx, 2 + dy, mark.w - 2 + dx, mark.h / 2 + dy, mark.w * 0.5 + dx, mark.h - 2 + dy);
    };
    arrow(0, 0, mark.edge);
    g.fillStyle(mark.colour);
    g.fillRect(4, mark.h / 2 - 3, mark.w * 0.5, 6);
    g.fillTriangle(mark.w * 0.52, 5, mark.w - 5, mark.h / 2, mark.w * 0.52, mark.h - 5);
    g.generateTexture(markKey, mark.w, mark.h);
    g.destroy();
  }
  return { stone: key, mark: markKey };
}
