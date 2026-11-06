# Cat Escape

A 2D browser chase game built with Phaser 3 and plain JavaScript. You run the cat to the escape gate before its family catches it. Clean running builds speed, and that's the only way to outrun them.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the game locally |
| `npm test` | Runs the rule and level checks, in seconds |
| `npm run test:play` | Plays the real game fast-forwarded: every obstacle, combo and level, at several frame rates |
| `npm run test:play -- bird` | The same, for scenarios whose name contains "bird" |
| `npm run test:balance` | Simulated players at three skill levels attempt every level, to compare difficulty |
| `npm run test:realtime` | Real-time checks of drawing, touch and audio, for before a release on an idle computer |
| `npm run build` | Builds the static site into `dist/` |
| `npm run assets` | Rebuilds `public/assets` from `images/` and regenerates the city art |

## Controls

- **Keyboard:** Left and Right or A and D to run, Space, Up or W to jump, Down or S to slide, E for the Super Paw, Esc or P to pause, M to switch to the always-running mode
- **Touch:** tap to jump, swipe down to slide. There's no way to run by touch yet, so the game can't currently be played on a phone (mobile development is paused)
- Tap again in the air for a double jump
- Pressing slide in the air is a dive: the cat drops quickly, then slides on landing
- Landing on top of an obstacle is safe, and landing on a bin bounces the cat high. Hitting an obstacle's side still slows the cat
- Avoiding 3 obstacles or lunges in a row earns a short sprint
- Floating ledges can be jumped up through and landed on. Press Down on one to drop through
- Fish treats earn up to 3 stars per level
- Checkpoints let you continue from partway through a level after being caught
- The chaser keeps a constant speed, and lunges more often the closer they get: jump as they dash. A miss costs them distance, and a grab costs the cat a lot
- A chaser left out of sight takes a shortcut back, with a warning. Treats count double until they land
- A cat high on a ledge can't be caught from the road, but one that stops up there gets climbed after
- Walls stop the cat dead and lose all its speed. A wall too tall to jump needs a lift, or a bounce and a double jump
- A Super Paw box floats high up. Collect it, then press E to knock the chaser off screen for a while. The next chaser in the level's list then runs in

## Project layout

```
src/
  config/    global tuning: screen size, jump and slide physics
  data/      content: levels, obstacles, characters, themes
  systems/   game rules with no Phaser dependency: distance, speed, states, level checks
  entities/  things in the world: cat, owner, obstacles, background
  input/     touch and keyboard, turned into jump, slide and pause
  audio/     synthesized sound effects and music playback
  ui/        in-game HUD (Phaser) and menu screens (HTML and CSS)
  scenes/    loading, and the scene that connects everything for one level
  testing/   development-only driver for the fast in-game tests
tools/       scripts that prepare sprites and draw the city art
tests/       unit tests, fast in-game tests (play/) and real-time checks (realtime/)
```

## Checking any level

Progress is saved in the browser, and levels unlock in order. While developing, open the game with `?unlockAll` on the address to open every level.

## Screen shape

The game fills the browser window at any shape, and adjusts when the window is resized. The distance visible ahead of the cat is the same on every screen: wider windows see more behind the cat, and taller ones see more sky.

## Adding content

**A level:** add a plan to `src/data/levels/index.js`, built from the sections in `src/data/levels/sections.js`. Section timings are in seconds, so they scale to each level's speed. Then run `npm test` and `npm run test:play`.  They check that the spacing is fair, that the owner can be outrun, and that the level can be completed. New levels and obstacles are tested automatically, from their data.

**An obstacle:** add its drawing to `tools/street-art.mjs`, its image to `IMAGE_ASSETS` in `src/data/themes.js`, and its type to `src/data/obstacles.js`. Then place it in a level.

**A lunge:** add `attacks: [{ at, warningSeconds }]` to a level. `npm test` checks that it lands clear of obstacles.

**A power-up box:** add `pickups: [{ type, at }]` to a level, using a type from `src/data/pickups.js`.

**A chaser:** cut their frames, add them to `tools/prepare-assets.mjs` and `src/data/characters.js` with the roles `idle`, `run`, `hop`, `catch`, `stumble` and `lose`, then add a personality to `src/data/chasers.js` and list them in a level's `chasers`. Without a drawing for a pose, reuse a run frame and lean it with `poseAngles`, as grandma does.

**A combo:** add `combo: true` to the second obstacle of a pair in a level. This allows tighter spacing, so check that it feels fair.

**A moving obstacle:** the kinds are listed in `src/data/obstacles.js`. To add a charger, add its frames to `tools/prepare-assets.mjs` and `src/data/characters.js`, then add a type with a `motion` block to `src/data/obstacles.js`. In a level, `at` is where it meets the cat at full speed, so moving and static obstacles are spaced the same way. `npm test` checks that the obstacle starts off-screen and leaves time to jump over it. Copy the `dog` type for a ground charger, or `leapingDog` for one that sails overhead.

**A world:** draw its layers, obstacles and gate in `tools/world-art.mjs`, add its art to `IMAGE_ASSETS` and a theme to `src/data/themes.js`, and add its obstacle versions at the end of `src/data/obstacles.js`. The theme's `swap` turns the shared sections into that world's obstacles, then set `theme` on a level.

**A sound effect:** add its layers to `src/data/sounds.js`, then call `audio.playSfx('name')`.

**A music track:** add its notation to `src/data/music.js`, then set `music: { track, bpm }` on a level. Parts with `bus: 'danger'` fade in only while the owner is close.

Game code only refers to roles such as `run`, `catch` and `lose`, so replacing a chaser's art doesn't need code changes.

## Before a public release

The owner frames in `images/sprites/owner-action-girl` come from a watermarked stock preview. Replace them with licensed art first, and confirm the license of the cat sprites. Check the terms for the Bevouliin dog sprites in `images/sprites/dog-run` and `dog-jump`, and for the bird sprites in `images/sprites/bird`, too. Don't ship anything from `images/colors example` or `images/sprites/girl`.
