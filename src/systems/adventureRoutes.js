// Where the battle cat can get to in an adventure level, worked out from its map, so a level can be
// hard but never impossible: tests check that the portal, and every coin, crystal and pickup, can be
// reached from the start. Plain code, no Phaser.
//
// The map is a grid of 64px cells, and the cat is drawn standing in a cell with his feet on its floor.
// He's about 1.4 cells tall, so he needs the cell above him clear too. From where he stands he can:
//   walk to the next cell along, or off an edge and fall to whatever's below;
//   jump, with a double jump, to anywhere within JUMP_REACH (a safe share of what he can really do,
//   from the physics in config/gameConfig.js), if no ground is in the way;
//   climb any ladder he's at, up to the island at its top or down to its foot;
//   ride a moving log: anywhere along its path counts as somewhere to stand, as he can wait for it;
//   the same for a water wheel's seats, all the way round (systems/adventure/wheels.js);
//   stand on crumbling leaves, which hold him long enough to jump on, or fall through them once
//   they crumble; cracked floor the same, but it breaks for good;
//   drop down through an island or a bridge he stands on (Down, as entities/Cat.js lets him);
//   walk a drawbridge, once it's down (systems/adventure/drawbridges.js);
//   bounce off a mushroom (data/adventure/traps.js), much higher than a jump (see mushroomReach);
//   swim (systems/adventure/pools.js): falling into a pool he lands in its water; in it he moves to
//   any water cell next to him, climbs out onto a bank beside him, or, at its surface, leaps out
//   (SWIM_REACH, less than a jump). A lever raises the water a stage: what he reaches at one stage
//   counts its levers, and the water rises that many stages, until nothing new opens up.
// Enemies and gunners don't block him: he can always knock them out or get past them.
import { MOVEMENT } from '../config/gameConfig.js';
import { TRAPS } from '../data/adventure/traps.js';
import { ONE_WAY, TILE, moverCells, readAdventureMap } from './adventureMap.js';
import { guardianSolid } from './adventure/trapLogic.js';
import { wheelCells } from './adventure/wheels.js';
import { drawbridgeCells } from './adventure/drawbridges.js';
import { poolAt, poolSurface } from './adventure/pools.js';
import { SWIM_REACH } from '../data/adventure/swim.js';

// How many cells across he can jump, with a double jump, for each number of cells up (or down, as
// negative). He really reaches about 6 up and 8 across at full speed; these leave a margin, so a
// player who isn't perfect still makes it.
export const JUMP_UP = 5;
export const JUMP_REACH = { 5: 2, 4: 3, 3: 4, 2: 5, 1: 5, 0: 6, '-1': 7, '-2': 7, '-3': 7 };
const reachAcross = (up) => JUMP_REACH[up] ?? (up < 0 ? 8 : 0);

// What the camera shows of the way ahead, in cells, when he stands at an edge and it peeks over (see
// LOOK in scenes/AdventureScene.js): this far ahead, this far below him, and this far above.
export const VIEW = { ahead: 11, below: 9, up: 4 };

// How far a bounce off a mushroom takes him: { up, across } in cells, from the mushroom's cell.
// Worked out from its cap's height, its bounce and his second jump, then cut to SAFE_SHARE, as the
// jump limits are,
// so a player who isn't perfect still makes it. Across, he drifts a few cells as he rises.
const SAFE_SHARE = 0.8;
export const MUSHROOM_ACROSS = 3;
export function mushroomReach(world) {
  const mushroom = TRAPS[world]?.mushroom;
  if (!mushroom) return null;
  const { GRAVITY, AIR_JUMP_VELOCITY } = MOVEMENT;
  const px = mushroom.height * mushroom.capTop + (mushroom.bounce ** 2 + AIR_JUMP_VELOCITY ** 2) / (2 * GRAVITY);
  return { up: Math.floor((px * SAFE_SHARE) / TILE), across: MUSHROOM_ACROSS };
}

const SOLID_OBJECTS = new Set(['box', 'stone', 'bonus']);
const PICKUPS = new Set(['coin', 'gem', 'heart', 'rage', 'weapon', 'ammo-standard', 'ammo-explosive', 'ammo-laser', 'ammo-freeze', 'ammo-fire', 'key', 'chest', 'silver-key', 'silver-chest', 'checkpoint']);

// closed: cell rectangles ({ cols, rows }) to treat as solid, to check one path of a level on its own.
// bridgesUp: the drawbridges not lowered yet, to check their switches can be reached without them.
// stage: the water stage to check at (its pools' surfaces); left out, it's worked out from the levers
// he reaches, stage by stage. The result's `stage` is the one it ended at.
export function adventureRoutes(level, options = {}) {
  if (options.stage !== undefined || !level.levers?.length) return routesAt(level, options, options.stage ?? 0);
  let stage = 0;
  for (;;) {
    const result = routesAt(level, options, stage);
    const pulled = level.levers.filter((lever) => result.nearReached(lever.col, lever.row, 1)).length;
    if (pulled <= stage) return result;
    stage = pulled;
  }
}

function routesAt(level, { closed = [], bridgesUp = false }, stage) {
  const { rows, cols, tiles, ladders, objects } = readAdventureMap(level.map);
  const key = (c, r) => `${c},${r}`;
  const blocks = new Set(objects.filter((o) => SOLID_OBJECTS.has(o.type)).map((o) => key(o.col, o.row)));
  // A stone guardian's body is solid too (data/adventure/traps.js).
  for (const trap of (level.traps ?? []).filter((t) => t.kind === 'guardian' && TRAPS[level.world]?.guardian)) {
    const { left, right, top, bottom } = guardianSolid(trap, TRAPS[level.world].guardian);
    for (let c = Math.floor(left / TILE); c <= Math.floor((right - 1) / TILE); c++) {
      for (let r = Math.floor(top / TILE); r <= Math.floor((bottom - 1) / TILE); r++) blocks.add(key(c, r));
    }
  }
  const spikes = new Set(objects.filter((o) => o.type === 'spike').map((o) => key(o.col, o.row)));
  const isClosed = (c, r) => closed.some(({ cols: [c0, c1], rows: [r0, r1] }) => c >= c0 && c <= c1 && r >= r0 && r <= r1);
  const ladderCells = new Set(ladders.filter((l) => !isClosed(l.col, l.row)).map((l) => key(l.col, l.row)));
  const inside = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows;
  const isGround = (c, r) => inside(c, r) && level.map[r][c] === '#';
  // What he can't pass through: the ground and blocks. Islands and bridges he jumps up through.
  const solid = (c, r) => isGround(c, r) || blocks.has(key(c, r)) || isClosed(c, r);
  const logs = new Set([
    ...(level.movers ?? []).flatMap((mover) => [...moverCells(mover)]),
    ...(level.wheels ?? []).flatMap((wheel) => [...wheelCells(wheel)]),
  ]);
  const leaves = new Set(objects.filter((o) => o.type === 'leaves' || o.type === 'cracked').map((o) => key(o.col, o.row)));
  // Drawbridges, once down, are bridges.
  // A bridge with no switch is always down.
  for (const bridge of (level.drawbridges ?? []).filter((b) => !bridgesUp || !b.switch)) for (const { col, row } of drawbridgeCells(bridge)) logs.add(key(col, row));
  const mushrooms = new Set((level.traps ?? []).filter((t) => t.kind === 'mushroom').map((t) => key(t.col, t.row)));
  const bounce = mushroomReach(level.world);
  const floor = (c, r) => inside(c, r) && (tiles[r][c] >= 0 || blocks.has(key(c, r)) || logs.has(key(c, r)) || leaves.has(key(c, r)));
  const standable = (c, r) => inside(c, r) && r > 0 && !solid(c, r) && !solid(c, r - 1) && !spikes.has(key(c, r)) && floor(c, r + 1);
  // Water he swims in, at this stage: a pool's cell that isn't solid.
  const pools = level.pools ?? [];
  // He's taller than a cell (about 1.4), so in the water, as on land, he needs the cell above clear.
  const swimmable = (c, r) => inside(c, r) && !solid(c, r) && !solid(c, r - 1) && poolAt(pools, c, r, stage) !== null;
  const atSurface = (c, r) => swimmable(c, r) && r === poolSurface(poolAt(pools, c, r, stage), stage);

  // Where he lands, falling from this cell: the first cell down with a floor, or null if he falls out.
  const landing = (c, r) => {
    for (let y = r; y < rows; y++) {
      if (solid(c, y) || spikes.has(key(c, y))) return null;
      if (standable(c, y) || swimmable(c, y)) return key(c, y);
    }
    return null;
  };
  // Whether a jump's straight line between two places runs into ground, checked at his middle.
  const clearLine = (c1, r1, c2, r2) => {
    const steps = Math.max(Math.abs(c2 - c1), Math.abs(r2 - r1)) * 2;
    for (let i = 1; i < steps; i++) {
      const c = Math.round(c1 + ((c2 - c1) * i) / steps);
      const r = Math.round(r1 + ((r2 - r1) * i) / steps);
      if (solid(c, r) || solid(c, r - 1)) return false;
    }
    return true;
  };

  const start = objects.find((o) => o.type === 'start');
  const startCell = landing(start.col, start.row) ?? key(start.col, start.row);
  const reached = new Set([startCell]);
  const queue = [startCell];
  const visit = (k) => {
    if (k && !reached.has(k)) { reached.add(k); queue.push(k); }
  };
  while (queue.length) {
    const [c, r] = queue.shift().split(',').map(Number);
    const onLadder = ladderCells.has(key(c, r)) || ladderCells.has(key(c, r + 1));
    // In the water: to any water cell next to him, out onto a bank beside him, and from the
    // surface a leap out.
    if (swimmable(c, r)) {
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (swimmable(c + dc, r + dr) || standable(c + dc, r + dr)) visit(key(c + dc, r + dr));
      }
      if (atSurface(c, r)) {
        for (let up = 0; up <= SWIM_REACH.up; up++) {
          for (let dc = -SWIM_REACH.across; dc <= SWIM_REACH.across; dc++) {
            const c2 = c + dc, r2 = r - up;
            if (standable(c2, r2) && !swimmable(c2, r2) && clearLine(c, r - 1, c2, r2 - 1)) visit(key(c2, r2));
          }
        }
      }
    }
    if (standable(c, r)) {
      for (const dc of [-1, 1]) {
        if (standable(c + dc, r)) visit(key(c + dc, r));
        else if (!solid(c + dc, r) && !solid(c + dc, r - 1)) visit(landing(c + dc, r));
      }
      // Crumbling leaves or cracked floor under him give way, and he falls through; Down drops him
      // through an island or a bridge (one-way tiles), to whatever's under it.
      if (leaves.has(key(c, r + 1)) || (inside(c, r + 1) && ONE_WAY.has(tiles[r + 1][c]) && !blocks.has(key(c, r + 1)))) visit(landing(c, r + 1));
      // Underwater he swims, not jumps: a floor in a pool gives no jump.
      if (!swimmable(c, r)) {
        for (let up = JUMP_UP; up >= -12; up--) {
          const across = reachAcross(up);
          for (let dc = -across; dc <= across; dc++) {
            const c2 = c + dc, r2 = r - up;
            if ((dc || up) && standable(c2, r2) && !solid(c, r - 2) && clearLine(c, r - 1, c2, r2 - 1)) visit(key(c2, r2));
          }
        }
      }
      // On a mushroom, he's thrown up high, and can land anywhere within its reach.
      if (bounce && mushrooms.has(key(c, r))) {
        for (let up = 1; up <= bounce.up; up++) {
          for (let dc = -bounce.across; dc <= bounce.across; dc++) {
            const c2 = c + dc, r2 = r - up;
            if (standable(c2, r2) && clearLine(c, r - 1, c2, r2 - 1)) visit(key(c2, r2));
          }
        }
      }
    }
    // Ladders: up and down the column, stepping off onto the island at the top or the floor below.
    if (onLadder) {
      for (const dr of [-1, 1]) {
        const r2 = r + dr;
        if (ladderCells.has(key(c, r2)) || ladderCells.has(key(c, r2 + 1))) visit(key(c, r2));
      }
      if (standable(c, r)) visit(key(c, r));
    }
    if (ladderCells.has(key(c, r))) visit(landing(c, r - 1));
  }

  // A pickup counts as reached if it's within a jump of somewhere he can stand, with no ground in
  // the way: he jumps through it. `up` limits how far above his feet it can be.
  const nearReached = (col, row, up = JUMP_UP + 1) => {
    if (swimmable(col, row) && reached.has(key(col, row))) return true; // underwater: he swims to it
    for (const cell of reached) {
      const [c, r] = cell.split(',').map(Number);
      const above = r - row; // how far above his feet it is
      if (above < -1 || above > up || !standable(c, r)) continue;
      if (Math.abs(col - c) <= reachAcross(Math.max(0, above - 1)) && clearLine(c, r - 1, col, row)) return true;
    }
    return false;
  };
  const portal = objects.find((o) => o.type === 'portal');
  const unreachable = objects.filter((o) => PICKUPS.has(o.type) && !nearReached(o.col, o.row))
    .concat(objects.filter((o) => o.type === 'bonus' && !nearReached(o.col, o.row + 1, 3)));
  // Blind edges: the edge of somewhere he can stand where, looking the way he'd step off, there's
  // nowhere to land that the camera shows (see VIEW). A level shouldn't have any: a jump down
  // should never be a leap of faith.
  const blindEdges = [];
  // Only the edges of ground, islands and leaves count: he gets onto a block's top on purpose, and
  // jumps off a moving log on purpose, onto where it's taking him.
  for (const cell of reached) {
    const [c, r] = cell.split(',').map(Number);
    if (!standable(c, r) || blocks.has(key(c, r + 1)) || logs.has(key(c, r + 1))) continue;
    for (const dir of [-1, 1]) {
      const next = c + dir;
      if (next < 0 || next >= cols || standable(next, r) || solid(next, r) || solid(next, r - 1)) continue;
      let seen = false;
      for (let across = 1; across <= VIEW.ahead && !seen; across++) {
        for (let down = -VIEW.up; down <= VIEW.below && !seen; down++) {
          const target = key(c + dir * across, r + down);
          if (target !== cell && reached.has(target) && (standable(c + dir * across, r + down) || swimmable(c + dir * across, r + down))) seen = true;
        }
      }
      if (!seen) blindEdges.push({ col: c, row: r, dir });
    }
  }
  return { reached, portal: portal ? nearReached(portal.col, portal.row, 1) : false, unreachable, blindEdges, stage, nearReached };
}
