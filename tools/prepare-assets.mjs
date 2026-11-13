// Copies the sprites the game uses into public/assets, with web-friendly names and sizes.
// Run: npm run assets
import sharp from 'sharp';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAWS_FRAME } from '../src/data/adventure/heroes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'images', 'sprites');
const DEST = join(ROOT, 'public', 'assets', 'sprites');

const SETS = [
  { dir: 'cat', out: 'cat', scale: 0.5, anims: { Run: 8, Jump: 8, Fall: 8, Slide: 10, Hurt: 10, Dead: 10, Idle: 10 } },
  { dir: 'owner-action-girl', out: 'owner', scale: 1, anims: { Run: 6, Jump: 3, Idle: 4, Lunge: 1, Hurt: 1, Down: 1, Hug: 12 } },
  { dir: 'boy-frames', out: 'boy', scale: 1, anims: { Run: 6, Jump: 3, Idle: 4, Lunge: 1, Hurt: 1, Down: 1, Hug: 4 } },
  { dir: 'grandma-frames', out: 'grandma', scale: 1, anims: { Run: 6, Lunge: 4, Hug: 6 } },
  { dir: 'bos-cat', out: 'crown-cat', scale: 1, anims: { Idle: 4, Run: 8, Crouch: 4, Leap: 5, Land: 4, ClawReady: 4, Claw: 7, Hit: 9, Dizzy: 5 } },
  // Cut from his sprite sheet by tools/cut-orange-cat.mjs, and kept at the size it's drawn.
  { dir: 'orange-cat', out: 'orange-cat', scale: 1, anims: { Idle: 4, Run: 6, Shoot: 7, Spray: 4, Hit: 3, Rage: 4, Defeated: 6, Jump: 4, Slide: 4, Dash: 3, Charge: 4, Beam: 1 } },
  // Cut from his second sprite sheet by tools/cut-boss-rat.mjs, and kept at the size it's drawn.
  { dir: 'bomber-rat', out: 'bomber-rat', scale: 1, anims: { Idle: 8, Run: 9, Jump: 8, Throw: 7, Bomb: 1, Blast: 1, Lunge: 6, Power: 8, Won: 5, Defeated: 9 } },
  // The test character for new levels and worlds, tried with ?cat=battle. Cut by tools/cut-battle-cat.mjs,
  // and kept at the size it's drawn, which is the game cat's size.
  { dir: 'battle-cat', out: 'battle-cat', scale: 1, anims: { Idle: 8, Run: 8, Shoot: 8, Hit: 3, Rage: 4, Defeated: 5, Jump: 4, Slide: 4, Dash: 4, Climb: 6, ClimbUp: 4, ClimbDown: 6, Hang: 1, Special: 4, SpecialEnd: 3 } },
  // The same cat with bare paws, as he starts each adventure level. Cut by tools/cut-battle-cat.mjs.
  { dir: 'battle-cat-paws', out: 'battle-cat-paws', scale: 1, anims: { Idle: 4, Run: 8, Jump: 4, Slide: 4, Hit: 3, Rage: 4, Defeated: 3, Dash: 4, Climb: 6, ClimbUp: 4, ClimbDown: 6, Hang: 1, Special: 3, SpecialEnd: 3 } },
  // The new Adventure Paws cat, from the owner's ChatGPT strips, cut by tools/cut-paws-cat.mjs to his
  // taller frame (PAWS_FRAME). As each new strip is cut, its move goes on this line and comes off
  // the stand-ins' line below.
  { dir: 'paws-cat/frames', out: 'paws-cat', scale: 1, anims: { Idle: 6, Run: 8, Jump: 4, Slide: 4, Swipe: 4, Dash: 4, Hit: 3, Defeated: 5, Rage: 4, Special: 4, SpecialEnd: 3, Victory: 6, Climb: 6, ClimbUp: 4 } },
  // His swipe with the minigun, for when it's out of rounds: the bare-pawed one, until it's drawn.
  // With the minigun: his swipe and pull-up are the bare-pawed ones, until they're drawn with it.
  { dir: 'paws-cat/frames', out: 'paws-cat-armed', scale: 1, anims: { Swipe: 4, ClimbUp: 4 } },
  // His own standing, running, shooting and climbing (the minigun on his back) with the minigun.
  { dir: 'paws-cat/frames-minigun', out: 'paws-cat-armed', scale: 1, anims: { Idle: 6, Run: 8, Shoot: 6, RunShoot: 8, Climb: 6 } },
  // His other moves for now: the battle cat's, bare-pawed and with the minigun, padded on top (`pad`)
  // into his taller frame.
  { dir: 'battle-cat-paws', out: 'paws-cat', scale: 1, pad: PAWS_FRAME.pad, anims: { ClimbDown: 6, Hang: 1 } },
  { dir: 'battle-cat', out: 'paws-cat-armed', scale: 1, pad: PAWS_FRAME.pad, anims: { Hit: 3, Rage: 4, Defeated: 5, Jump: 4, Slide: 4, Dash: 4, ClimbDown: 6, Hang: 1, Special: 4, SpecialEnd: 3 } },
];

// Sets whose source files use their own naming. `every` keeps one frame in N, to save memory.
const SEQUENCES = [
  { dir: 'dog-run', prefix: 'rr_', out: 'dog', anim: 'run', count: 21, every: 2, scale: 0.6 },
  { dir: 'dog-jump', prefix: 'l_', out: 'dog', anim: 'leap', count: 18, every: 2, scale: 0.6 },
  { dir: 'bird', files: ['Frame-1', 'frame-2', 'frame-3', 'frame-4'], out: 'bird', anim: 'fly', scale: 0.16 },
];

rmSync(DEST, { recursive: true, force: true });
// Several sets can fill one folder (the new cat's own moves and his stand-ins).
for (const set of SETS) {
  const outDir = join(DEST, set.out);
  mkdirSync(outDir, { recursive: true });
  for (const [anim, count] of Object.entries(set.anims)) {
    for (let i = 1; i <= count; i++) {
      const img = sharp(join(SRC, set.dir, `${anim} (${i}).png`));
      const { width } = await img.metadata();
      await img
        .resize({ width: Math.round(width * set.scale) })
        .extend({ top: set.pad ?? 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
// The home screen's two games, each with a moving picture that plays when it's pointed at, and its
// first frame, still, the rest of the time. Animated WebP is a fraction of the GIF's size.
for (const [gif, name] of [['cat_and_owner_chill', 'home-runner'], ['caharacters-party', 'home-adventure']]) {
  const file = join(SRC, 'gif', `${gif}.gif`);
  await sharp(file, { animated: true }).webp({ quality: 78, effort: 6 }).toFile(join(UI_DEST, `${name}.webp`));
  await sharp(file, { page: 0 }).webp({ quality: 82 }).toFile(join(UI_DEST, `${name}-still.webp`));
}

console.log('Sprites prepared in public/assets/sprites');
