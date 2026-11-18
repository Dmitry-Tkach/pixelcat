// Draws the Rootbreaker in his arena, his fists and their chains in the poses of his moves, as one
// picture, to review him without a browser. It places them with the game's own code (chainHold,
// chainBow and chainLinks in data/adventure/rootbreaker.js), from the pieces in public/assets.
// Run: node tools/adventure-rootbreaker-preview.mjs out.png
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOTBREAKER, chainBow, chainHold, chainLinks, fistAngle, fistBox, rbPath, turnBetween } from '../src/data/adventure/rootbreaker.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] ?? 'rootbreaker-preview.png';
const ARENA = { w: 1280, above: 760, below: 60 }; // level 3's arena: 20 tiles, him in the middle
const CAT = { w: 70, h: 90 }; // the cat's box, for size
const PAD = 700; // room round each panel, so pieces never fall off the canvas

const file = (name) => join(ROOT, 'public', rbPath(name));
const sizeOf = async (name) => sharp(file(name)).metadata().then((m) => ({ w: m.width, h: m.height }));
const sizes = { fist: await sizeOf('rb-rock-1') };

// One picture, scaled and turned about its joint, placed so that joint is at (x, y).
async function placed(name, scale, origin, x, y, rotation) {
  const { w, h } = await sizeOf(name);
  const sw = Math.max(1, Math.round(w * scale)), sh = Math.max(1, Math.round(h * scale));
  const scaled = await sharp(file(name)).resize(sw, sh).toBuffer();
  const deg = (rotation * 180) / Math.PI;
  const turned = await sharp(scaled).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer({ resolveWithObject: true });
  const px = origin.x * sw - sw / 2, py = origin.y * sh - sh / 2;
  const c = Math.cos(rotation), s = Math.sin(rotation);
  const left = x - (turned.info.width / 2 + px * c - py * s), top = y - (turned.info.height / 2 + px * s + py * c);
  return { input: turned.data, left: Math.round(left + PAD), top: Math.round(top + PAD) };
}

// The body, face and core, as the game places them; and where each shoulder's ring is.
async function bodyParts(x, floor) {
  const r = ROOTBREAKER, k = r.scale.body;
  const body = await sizeOf('rb-body');
  const w = body.w * k, h = body.h * k, left = x - w / 2, top = floor - h;
  const on = (at) => ({ x: left + at.x * w, y: top + at.y * h });
  const parts = [
    await placed('rb-body', k, { x: 0.5, y: 1 }, x, floor, 0),
    await placed('rb-face-calm', k, { x: 0.5, y: 0.5 }, on(r.faceAt).x, on(r.faceAt).y, 0),
    await placed('rb-core-closed', k, { x: 0.5, y: 0.5 }, on(r.coreAt).x, on(r.coreAt).y, 0),
  ];
  return { parts, mounts: r.shoulders.map(on) };
}

// One arm's pictures: its chain behind his body, its fist in front.
async function armParts(mount, side, goal, tilt, dir, look = '') {
  const angle = fistAngle(tilt, dir);
  const hold = chainHold(goal, mount, sizes.fist);
  const links = chainLinks(mount, hold, chainBow(mount, hold, side));
  const turn = turnBetween(fistAngle(0, side), angle) * ROOTBREAKER.arm.spin;
  const glowing = look === '';
  const k = ROOTBREAKER.arm.scale;
  const glow = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + PAD * 2}" height="${H + PAD * 2}">
    ${glowing ? `<circle cx="${goal.x + PAD}" cy="${goal.y + PAD}" r="95" fill="#7dff6a" opacity="0.4"/>` : ''}
    <polyline points="${[mount, ...links, hold].map((p) => `${(p.x + PAD).toFixed(1)},${(p.y + PAD).toFixed(1)}`).join(' ')}" fill="none" stroke="#7dff6a" stroke-width="10" stroke-opacity="0.35" stroke-linejoin="round"/>
  </svg>`;
  return {
    angle,
    back: [
      { input: Buffer.from(glow), left: 0, top: 0 },
      ...await Promise.all(links.map((l) => placed('rb-link', l.size, { x: 0.5, y: 0.5 }, l.x, l.y, l.rotation))),
    ],
    parts: [await placed(look === '-cracked' ? 'rb-fist-cracked' : 'rb-rock-1', k, { x: 0.5, y: 0.5 }, goal.x, goal.y, turn)],
    goal,
  };
}

// The poses: each arm's goal (its fist's middle), tilt and the way it points, as his moves set them.
const r = ROOTBREAKER;
const across = (sizes.fist.h * r.arm.scale * r.arm.box) / 2;
const POSES = [
  { title: 'Resting', arms: (x, f) => [-1, 1].map((side) => ({ goal: { x: x + side * r.fistRest.out, y: f - r.fistRest.up }, tilt: r.fistRest.tilt, dir: side })) },
  { title: 'Smash: raised over the cat (right)', cat: 380, arms: (x, f, cat) => [rest(x, f, -1), { goal: { x: cat, y: f - r.smash.high }, tilt: r.smash.raiseTilt, dir: 1 }] },
  { title: 'Smash: stuck on the floor, glowing (phase 2)', cat: 520, arms: (x, f) => [rest(x, f, -1), { goal: { x: x + 420, y: f - across }, tilt: 0, dir: 1, look: '' }] },
  { title: 'Rockfall: fists clash over his head', arms: (x, f) => [-1, 1].map((side) => ({ goal: { x: x + side * 150, y: f - 373 + 20 }, tilt: 0, dir: -side, look: '-dim' })) },
  { title: 'Smash, as near his body as it lands (cracked)', cat: -150, arms: (x, f) => [{ goal: { x: x - r.reachZone.inner, y: f - across }, tilt: 0, dir: -1, look: '-cracked' }, rest(x, f, 1)] },
  { title: 'Sweep: cocked at the wall, glowing', cat: 300, arms: (x, f) => [rest(x, f, -1), { goal: { x: x + 640 - r.reachZone.edge, y: f - r.sweep.cockUp }, tilt: r.sweep.cockTilt, dir: 1 }] },
  { title: 'Sweep: swung in low, as far as it goes', cat: 200, arms: (x, f) => [rest(x, f, -1), { goal: { x: x + r.reachZone.inner, y: f - r.sweep.height }, tilt: 0, dir: 1 }] },
];
function rest(x, f, side) {
  return { goal: { x: x + side * r.fistRest.out, y: f - r.fistRest.up }, tilt: r.fistRest.tilt, dir: side, look: '-dim' };
}

const W = ARENA.w, H = ARENA.above + ARENA.below;
const panels = [];
for (const pose of POSES) {
  const x = W / 2, floor = ARENA.above;
  const { parts, mounts } = await bodyParts(x, floor);
  const arms = [];
  for (const [i, arm] of pose.arms(x, floor, x + (pose.cat ?? 0)).entries()) arms.push(await armParts(mounts[i], i ? 1 : -1, arm.goal, arm.tilt, arm.dir, arm.look ?? '-dim'));
  // The floor, the arena's walls, the cat's box, and each fist's hit box.
  const boxes = arms.map(({ goal }) => fistBox(goal, sizes.fist));
  const catX = x + (pose.cat ?? -300);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + PAD * 2}" height="${H + PAD * 2}">
    <rect x="${PAD}" y="${PAD}" width="${W}" height="${H}" fill="#5f8f7a"/>
    <rect x="${PAD}" y="${PAD + floor}" width="${W}" height="${ARENA.below}" fill="#4a3a28"/>
    <rect x="${PAD + catX - CAT.w / 2}" y="${PAD + floor - CAT.h}" width="${CAT.w}" height="${CAT.h}" fill="#e8743b" opacity="0.85"/>
    <text x="${PAD + 16}" y="${PAD + 40}" font-family="Helvetica" font-size="32" fill="#fff">${pose.title}</text>
  </svg>`;
  const over = `<svg xmlns="http://www.w3.org/2000/svg" width="${W + PAD * 2}" height="${H + PAD * 2}">
    ${boxes.map((b) => `<rect x="${PAD + b.left}" y="${PAD + b.top}" width="${b.right - b.left}" height="${b.bottom - b.top}" fill="none" stroke="#ff3b3b" stroke-width="3" stroke-dasharray="10 6"/>`).join('')}
  </svg>`;
  const big = await sharp({ create: { width: W + PAD * 2, height: H + PAD * 2, channels: 4, background: '#00000000' } })
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }, ...arms.flatMap((a) => a.back), ...parts, ...arms.flatMap((a) => a.parts), { input: Buffer.from(over), left: 0, top: 0 }])
    .png().toBuffer();
  panels.push(await sharp(big).extract({ left: PAD, top: PAD, width: W, height: H }).resize(Math.round(W / 2)).toBuffer());
}
const pw = Math.round(W / 2), ph = Math.round((H * pw) / W);
await sharp({ create: { width: pw * 2 + 30, height: Math.ceil(panels.length / 2) * (ph + 10) + 10, channels: 4, background: '#222' } })
  .composite(panels.map((input, i) => ({ input, left: 10 + (i % 2) * (pw + 10), top: 10 + Math.floor(i / 2) * (ph + 10) })))
  .png().toFile(OUT);
console.log(`Rootbreaker preview: ${OUT}`);
