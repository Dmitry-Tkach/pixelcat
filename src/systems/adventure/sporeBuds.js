// Spore buds, the jungle path's star in level 3 (Heart of the Tree): a bounce mushroom that waits
// closed, a green bud. Green means shoot it, as with a wheel's hub and an arrow stone: a round into
// it opens it into a bounce mushroom for openMs, then it shudders (warnMs) and closes again. A
// level marks a mushroom as a bud with { bud: true } (mapBuilder's trap).
// Until the owner draws it, the closed bud is drawn in code.

export const SPORE_BUD = {
  openMs: 3200, // how long it stays open
  warnMs: 700, // the end of its open time, when it shudders: about to close
  pulseMs: 900, // closed, it glows gently, this often
  shudderPx: 3,
  body: { w: 64, h: 72 }, // closed, what a round hits (px), standing on its cell's floor
  look: { w: 64, h: 80, stem: 0x4f8a2e, bud: 0x6fcf3a, tip: 0xc8ff6a, edge: 0x2c5a18, glow: 0xb8ff8a },
};

// Its state after `ms` more: open time left, and whether it's closing soon or has just closed.
export function budAfter(openLeft, ms, { warnMs } = SPORE_BUD) {
  const left = Math.max(0, openLeft - ms);
  return { left, open: left > 0, warning: left > 0 && left <= warnMs, closed: openLeft > 0 && left === 0 };
}

// The closed bud's picture, drawn once.
export function budTexture(scene) {
  const key = 'adventure-spore-bud';
  if (scene.textures.exists(key)) return key;
  const { w, h, stem, bud, tip, edge } = SPORE_BUD.look;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(stem).fillRect(w / 2 - 5, h * 0.55, 10, h * 0.45);
  g.fillStyle(stem).fillEllipse(w / 2 - 14, h * 0.8, 22, 10).fillEllipse(w / 2 + 14, h * 0.78, 22, 10); // leaves
  g.fillStyle(edge).fillEllipse(w / 2, h * 0.38, 44, 58);
  g.fillStyle(bud).fillEllipse(w / 2, h * 0.38, 38, 52);
  g.fillStyle(tip).fillEllipse(w / 2, h * 0.16, 14, 16);
  g.lineStyle(2, edge).lineBetween(w / 2, h * 0.14, w / 2, h * 0.6).lineBetween(w / 2 - 10, h * 0.2, w / 2 - 12, h * 0.56).lineBetween(w / 2 + 10, h * 0.2, w / 2 + 12, h * 0.56);
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}
