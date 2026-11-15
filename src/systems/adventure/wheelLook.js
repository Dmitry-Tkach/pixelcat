import { TILE } from '../adventureMap.js';

// How a water wheel looks (systems/adventure/wheels.js), drawn in code for now: a wooden rim with
// paddles, spokes out to each seat, and a stone hub with a green glow, in a container that turns
// round the hub. The owner is drawing the real wheel; this stands in until it's ready.
const LOOK = {
  depth: 1.7, // behind the ground (2) and the seats, in front of the backdrop
  rim: { colour: 0x6b4423, edge: 0x3f2712, width: 14 },
  spoke: { colour: 0x8a5a2b, edge: 0x3f2712, width: 12 },
  paddles: { every: 2, length: 34, width: 16, colour: 0x7a4e26 }, // paddles: this many between spokes
  hub: { radius: 34, colour: 0x8b8f86, edge: 0x4e524a, glow: 0x7dff6a, glowRadius: 14 },
};

export function drawWheel(scene, wheel) {
  const { radius, seats } = wheel;
  const r = radius * TILE;
  const g = scene.add.graphics();
  const spokeAngles = Array.from({ length: seats }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / seats);
  // Spokes, an edge under each so it reads as wood.
  for (const angle of spokeAngles) {
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    g.lineStyle(LOOK.spoke.width + 4, LOOK.spoke.edge).lineBetween(0, 0, x, y);
    g.lineStyle(LOOK.spoke.width, LOOK.spoke.colour).lineBetween(0, 0, x, y);
  }
  // Paddles sticking out of the rim, between the spokes.
  const count = seats * (LOOK.paddles.every + 1);
  for (let i = 0; i < count; i++) {
    if (i % (LOOK.paddles.every + 1) === 0) continue;
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    const from = r - LOOK.rim.width / 2, to = r + LOOK.paddles.length;
    g.lineStyle(LOOK.paddles.width, LOOK.paddles.colour)
      .lineBetween(Math.cos(angle) * from, Math.sin(angle) * from, Math.cos(angle) * to, Math.sin(angle) * to);
  }
  g.lineStyle(LOOK.rim.width + 4, LOOK.rim.edge).strokeCircle(0, 0, r);
  g.lineStyle(LOOK.rim.width, LOOK.rim.colour).strokeCircle(0, 0, r);
  g.fillStyle(LOOK.hub.edge).fillCircle(0, 0, LOOK.hub.radius + 4);
  g.fillStyle(LOOK.hub.colour).fillCircle(0, 0, LOOK.hub.radius);
  g.fillStyle(LOOK.hub.glow, 0.9).fillCircle(0, 0, LOOK.hub.glowRadius);
  const { x, y } = { x: wheel.col * TILE + TILE / 2, y: wheel.row * TILE };
  return scene.add.container(x, y, [g]).setDepth(LOOK.depth);
}
