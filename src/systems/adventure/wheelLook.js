import { TILE } from '../adventureMap.js';
import { MILL_STAND, MILL_WHEEL, standScale } from '../../data/adventure/millArt.js';
import { floorRow } from './trapLogic.js';

// How a water wheel looks (systems/adventure/wheels.js): the owner's wheel picture turning round its
// hub, in front of its wooden stand, which reaches down to the ground or the river
// (data/adventure/millArt.js, cut by tools/adventure-mill-art.mjs). Until those pictures are there,
// a stand-in drawn in code: a wooden rim with paddles, spokes, and a stone hub with a green glow.
// drawWheel returns what turns (the scene turns it as the wheel turns).
const DEPTH = { stand: 1.65, wheel: 1.7 }; // behind the ground (2) and the seats, in front of the waterfalls
const STAND_IN = {
  rim: { colour: 0x6b4423, edge: 0x3f2712, width: 14 },
  spoke: { colour: 0x8a5a2b, edge: 0x3f2712, width: 12 },
  paddles: { every: 2, length: 34, width: 16, colour: 0x7a4e26 }, // paddles: this many between spokes
  hub: { radius: 34, colour: 0x8b8f86, edge: 0x4e524a, glow: 0x7dff6a, glowRadius: 14 },
};

// level: for where the stand reaches down to (the ground under the hub, or the river's surface).
export function drawWheel(scene, wheel, art, level) {
  const x = wheel.col * TILE + TILE / 2, y = wheel.row * TILE;
  if (!scene.textures.exists(art('mill-wheel'))) return drawStandIn(scene, wheel, x, y);
  const tiles = scene.layout?.tiles ?? [];
  const ground = floorRow(tiles, wheel.col, wheel.row + 1);
  const water = level?.water?.row;
  const floorY = (Math.min(ground ?? Infinity, water ?? Infinity, tiles.length) + 0.5) * TILE;
  const scale = standScale(wheel.radius, floorY - y);
  scene.add.image(x, y, art('mill-stand')).setOrigin(MILL_STAND.axle.x, MILL_STAND.axle.y)
    .setScale(scale.x, scale.y).setDepth(DEPTH.stand);
  return scene.add.image(x, y, art('mill-wheel')).setScale((wheel.radius * TILE) / MILL_WHEEL.rimRadius).setDepth(DEPTH.wheel);
}

function drawStandIn(scene, wheel, x, y) {
  const { radius, seats } = wheel;
  const r = radius * TILE;
  const L = STAND_IN;
  const g = scene.add.graphics();
  const spokeAngles = Array.from({ length: seats }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / seats);
  // Spokes, an edge under each so it reads as wood.
  for (const angle of spokeAngles) {
    const sx = Math.cos(angle) * r, sy = Math.sin(angle) * r;
    g.lineStyle(L.spoke.width + 4, L.spoke.edge).lineBetween(0, 0, sx, sy);
    g.lineStyle(L.spoke.width, L.spoke.colour).lineBetween(0, 0, sx, sy);
  }
  // Paddles sticking out of the rim, between the spokes.
  const count = seats * (L.paddles.every + 1);
  for (let i = 0; i < count; i++) {
    if (i % (L.paddles.every + 1) === 0) continue;
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    const from = r - L.rim.width / 2, to = r + L.paddles.length;
    g.lineStyle(L.paddles.width, L.paddles.colour)
      .lineBetween(Math.cos(angle) * from, Math.sin(angle) * from, Math.cos(angle) * to, Math.sin(angle) * to);
  }
  g.lineStyle(L.rim.width + 4, L.rim.edge).strokeCircle(0, 0, r);
  g.lineStyle(L.rim.width, L.rim.colour).strokeCircle(0, 0, r);
  g.fillStyle(L.hub.edge).fillCircle(0, 0, L.hub.radius + 4);
  g.fillStyle(L.hub.colour).fillCircle(0, 0, L.hub.radius);
  g.fillStyle(L.hub.glow, 0.9).fillCircle(0, 0, L.hub.glowRadius);
  return scene.add.container(x, y, [g]).setDepth(DEPTH.wheel);
}
