// "Try again" after losing all his hearts, once he's lit a checkpoint (any level, as today's
// platformers do; at first only at a level's boss): the level starts over at the last checkpoint he
// lit, with full hearts, and without losing what he's done ("From the start" is still offered). The
// scene restarts fresh, so what he'd done is written down as he loses (snapshot) and put back as it
// starts (restore): his coins and crystals, his keys and opened chests, the enemies he knocked out,
// the checkpoints he lit, and his minigun with its rounds.
//
// The scene marks each thing the level builds with its cell (cellKey), and keeps the cells of what
// he's taken, opened and knocked out in `scene.done`, and of the checkpoints he's lit in `scene.lit`.

// A thing's name in the level: the cell it was built in.
export const cellKey = ({ col, row }) => `${col},${row}`;

// What he's done this try, to carry into the next. `scene` gives the counters, the moves and the sets.
export function snapshot(scene) {
  return {
    at: { ...scene.respawnAt },
    coins: scene.coins,
    gems: scene.gems,
    hasKey: scene.hasKey,
    hasSilverKey: scene.hasSilverKey,
    chestsOpened: scene.chestsOpened,
    knockedOut: scene.knockedOut,
    done: [...scene.done],
    lit: [...scene.lit],
    armed: scene.moves.armed,
    rounds: { ...scene.moves.rounds },
    ammo: scene.moves.ammo,
  };
}

// The level, fresh, as he left it: everything he took gone, his chests open, his knocked-out
// enemies gone, his checkpoints lit, his counters and his minigun back, and him at the checkpoint.
// `armed`: the character he becomes with the minigun; `openChest(chest)` shows a chest open.
export function restore(scene, state, { armed, openChest }) {
  const done = new Set(state.done);
  // Taken: switched off and hidden, as taking it does (the scene's overlap still holds the list).
  for (const item of scene.pickups) {
    if (done.has(item.cell)) item.disableBody(true, true);
  }
  for (const chest of scene.chests) {
    if (!done.has(chest.cell)) continue;
    chest.opened = true;
    openChest(chest);
  }
  for (const enemy of scene.enemies.getChildren().slice()) {
    if (done.has(enemy.cell)) enemy.destroy();
  }
  const lit = new Set(state.lit);
  for (const lantern of scene.lanterns) {
    if (!lit.has(lantern.cell)) continue;
    lantern.lit = true;
    scene.gates.raise(lantern);
  }
  scene.done = done;
  scene.lit = lit;
  Object.assign(scene, {
    coins: state.coins, gems: state.gems, hasKey: state.hasKey, hasSilverKey: state.hasSilverKey,
    chestsOpened: state.chestsOpened, knockedOut: state.knockedOut,
  });
  if (state.armed) {
    scene.cat.changeCharacter(armed);
    Object.assign(scene.moves.rounds, state.rounds);
    scene.moves.ammo = state.ammo;
  }
  scene.respawnAt = { ...state.at };
  scene.cat.setPosition(state.at.x, state.at.y - 80);
  scene.cameras.main.centerOn(scene.cat.x, scene.cat.y);
}

// Whether losing now should offer a try from the checkpoint: a boss of the level's is fighting and
// not beaten (not in a boss's own test arena, which is short).
export const atBoss = (scene) => !scene.level.test && scene.bossFights.some((fight) => fight.started && !fight.beaten);

// Whether losing now offers a try from the last checkpoint: he's lit one (the owner found the
// checkpoints did nothing once his hearts ran out), or he's at a boss. Not in a test arena.
export const fromCheckpoint = (scene) => !scene.level.test && (scene.lit.size > 0 || atBoss(scene));
