// Copies the sprites the game uses into public/assets, with web-friendly names and sizes.
// Run: npm run assets
import sharp from 'sharp';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'images', 'sprites');
const DEST = join(ROOT, 'public', 'assets', 'sprites');

const SETS = [
  { dir: 'cat', out: 'cat', scale: 0.5, anims: { Run: 8, Jump: 8, Fall: 8, Slide: 10, Hurt: 10, Dead: 10, Idle: 10 } },
  { dir: 'owner-action-girl', out: 'owner', scale: 1, anims: { Run: 6, Jump: 3, Idle: 4, Lunge: 1, Hurt: 1, Down: 1, Hug: 12 } },
  { dir: 'boy-frames', out: 'boy', scale: 1, anims: { Run: 6, Jump: 3, Idle: 4, Lunge: 1, Hurt: 1, Down: 1, Hug: 4 } },
  { dir: 'grandma-frames', out: 'grandma', scale: 1, anims: { Run: 6, Lunge: 4, Hug: 6 } },
  { dir: 'bos-cat', out: 'crown-cat', scale: 1, anims: { Idle: 4, Run: 8, Crouch: 4, Leap: 5, Land: 4, ClawReady: 4, Claw: 7, Hit: 9, Dizzy: 5 } },
  // Cut from his sprite sheet by tools/cut-orange-cat.mjs. His art is small, so it's enlarged here.
  { dir: 'orange-cat', out: 'orange-cat', scale: 1.35, anims: { Idle: 4, Run: 6, Shoot: 7, Spray: 4, Hit: 3, Rage: 4, Defeated: 6, Jump: 4, Slide: 4, Dash: 3, Charge: 4, Beam: 1 } },
  // Cut from his second sprite sheet by tools/cut-boss-rat.mjs. It's drawn smaller than his first,
  // so it's enlarged more, to keep him the same size in the game.
  { dir: 'bomber-rat', out: 'bomber-rat', scale: 1.5, anims: { Idle: 8, Run: 9, Jump: 8, Throw: 7, Bomb: 1, Blast: 1, Lunge: 6, Power: 8, Won: 5, Defeated: 9 } },
];

// Sets whose source files use their own naming. `every` keeps one frame in N, to save memory.
const SEQUENCES = [
  { dir: 'dog-run', prefix: 'rr_', out: 'dog', anim: 'run', count: 21, every: 2, scale: 0.6 },
  { dir: 'dog-jump', prefix: 'l_', out: 'dog', anim: 'leap', count: 18, every: 2, scale: 0.6 },
  { dir: 'bird', files: ['Frame-1', 'frame-2', 'frame-3', 'frame-4'], out: 'bird', anim: 'fly', scale: 0.16 },
];

rmSync(DEST, { recursive: true, force: true });
for (const set of SETS) {
  const outDir = join(DEST, set.out);
  mkdirSync(outDir, { recursive: true });
  for (const [anim, count] of Object.entries(set.anims)) {
    for (let i = 1; i <= count; i++) {
      const img = sharp(join(SRC, set.dir, `${anim} (${i}).png`));
      const { width } = await img.metadata();
      await img
        .resize({ width: Math.round(width * set.scale) })
        .png({ compressionLevel: 9 })
        .toFile(join(outDir, `${anim.toLowerCase()}-${i}.png`));
    }
  }
}
for (const seq of SEQUENCES) {
  const outDir = join(DEST, seq.out);
  mkdirSync(outDir, { recursive: true });
  const names = seq.files ?? Array.from(
    { length: Math.ceil(seq.count / seq.every) },
    (_, i) => `${seq.prefix}${String(i * seq.every).padStart(3, '0')}`,
  );
  let frame = 1;
  for (const name of names) {
    const img = sharp(join(SRC, seq.dir, `${name}.png`));
    const { width } = await img.metadata();
    await img
      .resize({ width: Math.round(width * seq.scale) })
      .png({ compressionLevel: 9 })
      .toFile(join(outDir, `${seq.anim}-${frame}.png`));
    frame += 1;
  }
  console.log(`${seq.out}/${seq.anim}: ${frame - 1} frames`);
}
// The pigeon flock: three birds per frame, staggered so they don't flap in step.
const FLOCK = { out: 'flock', anim: 'fly', frames: 4, width: 330, height: 116, positions: [[0, 18, 0], [108, 0, 1], [216, 16, 2]] };
mkdirSync(join(DEST, FLOCK.out), { recursive: true });
for (let frame = 1; frame <= FLOCK.frames; frame++) {
  const composite = FLOCK.positions.map(([left, top, shift]) => ({
    input: join(DEST, 'bird', `fly-${((frame - 1 + shift) % FLOCK.frames) + 1}.png`),
    left,
    top,
  }));
  await sharp({ create: { width: FLOCK.width, height: FLOCK.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composite)
    .png({ compressionLevel: 9 })
    .toFile(join(DEST, FLOCK.out, `${FLOCK.anim}-${frame}.png`));
}

// Pictures for the HTML menus, copied as they are.
const UI_DEST = join(ROOT, 'public', 'assets', 'ui');
mkdirSync(UI_DEST, { recursive: true });
copyFileSync(join(SRC, 'cat-eating', 'cat-eating-2.gif'), join(UI_DEST, 'escape-success.gif'));
copyFileSync(join(SRC, 'gif', 'cat-refusing-bath.gif'), join(UI_DEST, 'bath-refused.gif'));

console.log('Sprites prepared in public/assets/sprites');
