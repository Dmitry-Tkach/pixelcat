# Working on Cat Escape: a guide for agents

Read this whole file before you start. It's everything you need to work on this project alongside
the main agent (Claude Code) without getting in each other's way.

## The people and the roles

- **The owner** is the creative director: they decide what the game is, how it looks and what's fun.
  They draw new character art themselves with ChatGPT's image engine. English isn't their first
  language: write to them in short, plain sentences, no jargon, and explain what you did and why.
- **Claude Code** is the creative assistant and the main engineer.
- **You** are a second engineer, given one clear task at a time. Build what the task asks.
  - **Ideas:** if you have a creative idea (a level layout, a mechanic, a look), propose it with a
    reason and let the owner decide. Don't make creative decisions on your own.
  - **Questions:** ask in plain text, as a short numbered list. The owner doesn't like pop-up
    question dialogs.

## The game

Two separate games, chosen on the first page (a full-window choice of two cards). Each game has a
page of its own, which loads only that game:

1. **The runner, "Bath Day Escape":** the home cat runs from the family (the girl, the boy,
   grandma) through four worlds (City, Village, Farm, Sunset), with bosses (Crown Cat, Bomber Rat,
   Ginger Gunner). Scene: `src/scenes/GameScene.js`. Levels: `src/data/levels/`.
2. **The adventure, "The Battle Cat":** a multi-direction platformer. The grey battle cat climbs,
   fights and explores fantasy worlds, eight of them (see below).
   - **Scenes:** `AdventureBootScene` (loading), `AdventureMenuScene` (its menus) and
     `AdventureScene` (a level), in `src/scenes/`. Levels: `src/data/adventure/`.
   - **Built so far:** two levels, `wood-1` "Into the Roots" and `wood-2` "The Canopy", and the
     troll's fight in a test arena (`docs/adventure-boss-troll.md`).
   - **Planned:** 8 worlds of 3 levels, 24 in all, the third of each a boss level, on the road map in
     `src/data/adventure/roadmap.js`: Wood, Autumn Forest, Graveyard, Crystal Caves, Ancient, Sky
     Ruins, Execution Grounds, Medieval. Their tile packs are in `images/assets/worlds/`.
   - **The road map** (Level Select) shows one world to a page, with arrows between them.

They keep separate progress and share nothing but the home screen and the menus' look.

## The tools and commands

- Phaser 3.90 (Arcade physics), Vite, plain JavaScript modules. Images are prepared with sharp.
- `npm run dev`: the game in the browser. It's three pages, each loading only its own game:
  - `/`: the first page, the choice of the two games (plain HTML, no Phaser);
  - `/runner.html`: the runner (`src/pages/runner.js`);
  - `/adventure.html`: the adventure (`src/pages/adventure.js`). In development, add `?adventure` to
    go straight to its first level, or `?boss=troll1` for the troll's test arena.
  - Add `?unlockAll` to either game's page to open every level.
  - The start-up both games share is `src/startGame.js`.
- `npm test`: the unit tests (vitest). They must pass before every commit.
- `npx vite build`: checks the game builds.
- `npm run assets`: prepares every image in `public/assets` from `images/`.
  - **Run the whole thing, never a single step:** the last step adds every outline, and running an
    earlier step alone leaves the sprites without them.
  - **For long runs,** use `caffeinate -i npm run assets`.
- `npm run test:play`: plays through the game in headless Chrome. **Ask the owner first**, as for
  any browser run (see the rules).
- `node tools/adventure-preview.mjs out.png 0 --routes`: draws adventure level 0 as a picture, with
  dots everywhere the cat can stand and red rings round anything out of reach. Use it to review a
  level without a browser.

## Rules that always apply

1. **Don't run a browser without asking.** That covers Chrome, Puppeteer, the play tests and any
   real-time tests. The owner's Mac is slow (a 2015 MacBook Pro) and they check speed themselves.
   Check your work with the unit tests, the build, the level preview, and pictures rendered with
   sharp.
2. **One task, one branch.** Make a new branch for your task from the branch the owner names
   (today, `cat-v2-sheet`, where all current work is). Don't work on `main`, and never on a branch
   the other agent is using.
3. **Don't push, merge into `main`, or open pull requests unless the owner asks.** The GitHub
   repo is public.
4. **Never overwrite or delete the owner's source art** in `images/`. Tools read it and write
   their output elsewhere.
5. **Keep downloaded asset packs out of git.** `images/assets/` (Craftpix and other free packs)
   stays untracked. Only the prepared images in `public/assets` are committed, plus the cut frames
   in `images/sprites/<character>/`.
6. **Don't touch files the other agent is changing at the same time.** The owner will say which
   ones. If you must change a shared file (often `AdventureScene.js`, `GameScene.js`, `ui.css`),
   say so first.
7. **Report honestly.**
   - Say what you checked and how, and what you didn't, such as "not seen in the browser".
   - If a test fails, say so and show it.
   - Never say something works if you haven't checked it.

## How the code is written

- **Comments in plain English:** they explain what something is for and why, in short sentences,
  the way the existing files do. Match that style.
- **Settings at the top:** numbers worth tuning go in a named constant near the top of the file,
  with a comment, never buried in the logic.
- **Content is data:**
  - Levels, enemies, gunners, ammo and the bolt are described in `src/data/...`, and the code reads
    them. Adding content should mostly mean adding data.
  - Logic that doesn't need Phaser (map reading, routes, progress) lives in plain modules, so
    vitest can test it.
- **Tests:** add a test for new logic, and for every new level (see below).
- **Commits:**
  - The message is a short summary line, then a few lines on what changed and why, in plain
    English.
  - Stage files by name. Never `git add -A`, which would sweep in the untracked packs.

## The adventure, in detail

- **Where its code is:** adventure files have "adventure" in their name or folder. The runner's
  files (`GameScene.js`, `BootScene.js`, `data/characters.js`) only call into them:
  - `ui/adventureMenus.js`: its home screen, road map, and opening a level;
  - `scenes/adventureLoading.js`: loading its art and making its animations;
  - `data/adventure/heroes.js`: the battle cats' frames and hitboxes;
  - `data/adventure/roadmap.js`: its levels in order, and the road map's colours.
- **Still shared with the runner:** the cat's body and running (`entities/Cat.js`), the controls,
  `config/gameConfig.js`, the effects, the menu look and the first screen. They stay as they are.
- **Everything new goes in adventure files.** We work only on the adventure now; the runner is
  frozen. New code, data and tests go in files named for the adventure (`Adventure...js`,
  `adventure...js`, `adventure-....test.js`) or in its folders (`data/adventure/`), never into the
  runner's files. The bosses' code, for example, goes in a `systems/adventure/bosses/` folder.
  When something new must hook into a shared file, keep that hook to a line or two.

- **Levels** are written with the map builder (`src/data/adventure/mapBuilder.js`) in named
  sections, instead of rows of letters. See `wood.js`.
  - **The tile grid:** 64px tiles. Islands are one-way: you jump up through them and land on top.
  - **The map's letters** are listed in `src/systems/adventureMap.js` (OBJECTS, ENEMY_LETTERS,
    GUNNER_LETTERS, SCENERY).
- **The checks:** every level must pass `checkAdventureLevel` and the route checker,
  `src/systems/adventureRoutes.js`. Tests fail if:
  - the portal, or any coin, crystal or pickup, can't be reached;
  - any edge is a **blind drop**: nothing to land on within what the camera shows.

  Design to these. The checker's jump limits are a little under the real physics, on purpose.
- **The hero:**
  - **Bare paws to start:** he starts as `battleCatPaws`, and the minigun pickup (`w`) swaps him to
    `battleCat`.
  - **The same frame layout:** both are 236x171 frames with the same hitboxes, so the swap is
    seamless. See `src/data/characters.js`.
  - **Size:** he's shown at 0.8 of his drawn size (`ADVENTURE_HERO` in
    `src/data/adventure/index.js`).
- **His moves** are in `src/systems/AdventureMoves.js`:
  - X shoots (hold for a burst) while he has rounds. Ammo is limited, in three kinds
    (`data/adventure/ammo.js`), and Q swaps between them.
  - Shift dashes.
  - C fires the magic bolt, after 3 knockouts (`data/adventure/beams.js`).
  - The rage mushroom (`m`).
- **Enemies:**
  - **The walkers:** zombies from the gangsta-cats pack (`data/adventure/enemies.js`,
    `entities/AdventureEnemy.js`). They patrol, chase the cat and swipe.
  - **The gunners:** cats with guns that stand and fire at where the cat is
    (`data/adventure/gunners.js`, `entities/AdventureGunner.js`).
  - **One group:** both are in one physics group in the scene.
- **The camera** (`LOOK` in `AdventureScene.js`): it looks below and ahead of the cat, and peeks
  over an edge when he stands at one.
- **Progress:** the adventure's progress is its own `Progress` (key `cat-escape-adventure`). A
  level's stars are the crystals found in it, up to 3.
- **The adventure's screens:** the road map (`ui/mapArt.js` with `ADVENTURE_MAP_WORLDS`), and the
  adventure home screen, "Adventure Paws" (`ui/adventureHome.js`, its data in
  `data/adventure/home.js`, its art cut by `tools/adventure-paws-home-art.mjs`).

## Art

- **The owner's art:**
  - **What they send:** new character sheets made in ChatGPT, saved in `images/sprites/...` or
    `images/assets/...`.
  - **The cutting tools:** `tools/cut-sheet.mjs` and `tools/cut-battle-cat.mjs`. They handle labels,
    a painted checkerboard instead of transparency (`clearPaintedBackground`), ladders and blocks
    drawn into frames, and matching sizes.
  - **Before using a cut:** show the owner a contact sheet or GIFs.
- **Pack art:** prepared by `tools/adventure-art.mjs`: tiles, pickups, enemy and gunner atlases, and
  effects.
- **Scenery, icons and effects drawn in code** (SVG through sharp) are welcome: the road maps, the
  minigun box, the bolt and the home picture are all drawn that way.

## Traps we've already fallen into

- **Plain groups don't collide.** In Phaser 3.90, a plain `this.add.group()` never collides. Use
  `this.physics.add.group()`.
- **Group-against-list callbacks swap order.** A collider between a group and a plain array of
  sprites calls back with (array sprite, group member), the reverse of the other colliders. Pick
  the bullet with `group.contains(a) ? a : b`. Getting this wrong froze the game.
- **No world gravity.** The world has none; the cat brings his own. Anything that should fall
  needs gravity given to it, as the enemy group does.
- **Fall-through.** Fast fallers sank through tiles until `TILE_BIAS` was raised to 40 and fall
  speed was capped.
- **Rows can't stand on row 0.** The route checker never stands the cat on the map's top row: he
  needs headroom.
- **sharp resizes before compositing.** In one sharp chain, `resize()` runs before `composite()`.
  To scale a composed picture, composite to a buffer first, then resize.
- **sharp needs whole pixels and a canvas-sized piece.** Its composite offsets must be whole
  numbers, and every piece must fit inside the canvas: clip it first.
- **Empty rows under pack images.** Some pack images have empty rows under the drawing, which
  floats them above the ground. The art tool trims those for things that stand.

## When you finish

Tell the owner, in a few plain sentences:
- what you built, and where to see it;
- what you checked (tests, build, preview pictures) and what you didn't (the browser);
- your branch and commit;
- anything they should decide or try.
