import { TILE } from '../adventureMap.js';
import { TRAPS, TRAP_KINDS } from '../../data/adventure/traps.js';

// The moving traps' plain logic (data/adventure/traps.js): how the mace swings, the crusher's
// cycle, when the cat lands on a mushroom, what's hit, and whether a level's traps are placed
// sensibly. No Phaser, so tests can check it; systems/adventure/AdventureTraps.js draws them.

const STANDS = new Set(['idol', 'mushroom']);

// The mace's angle (radians) at a moment: a pendulum swinging swingDeg each way. Positive is
// clockwise on screen, so the ball goes left.
export function maceAngle(ms, { periodMs, swingDeg }) {
  return (swingDeg * Math.PI / 180) * Math.sin((2 * Math.PI * ms) / periodMs);
}

// Where the ball's middle is, hanging `reach` px from the hook at `angle`.
export function swingPoint(hook, reach, angle) {
  return { x: hook.x - reach * Math.sin(angle), y: hook.y + reach * Math.cos(angle) };
}

// Does a circle touch a rectangle ({ left, top, right, bottom })?
export function circleHitsRect({ x, y }, r, rect) {
  const nx = Math.max(rect.left, Math.min(x, rect.right));
  const ny = Math.max(rect.top, Math.min(y, rect.bottom));
  return (x - nx) ** 2 + (y - ny) ** 2 <= r * r;
}

export const rectsTouch = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// The crusher's next moment, from { phase, ms, drop, speed }: drop is how far (px) it is below its
// top, out of `fall` px to the ground. Phases: wait (calm, at the top), warn (eyes glowing), fall,
// down (on the ground), rise. Returns the new state, with slam: true the moment it lands.
export function crusherStep(state, ms, rules, fall) {
  const s = { ...state, ms: state.ms + ms, slam: false };
  const next = (phase) => Object.assign(s, { phase, ms: 0 });
  switch (s.phase) {
    case 'wait':
      if (s.ms >= rules.waitMs) next('warn');
      break;
    case 'warn':
      if (s.ms >= rules.warnMs) Object.assign(next('fall'), { speed: 0 });
      break;
    case 'fall':
      s.speed = Math.min(rules.fallSpeed, s.speed + (rules.fallAccel * ms) / 1000);
      s.drop = Math.min(fall, s.drop + (s.speed * ms) / 1000);
      if (s.drop >= fall) Object.assign(next('down'), { slam: true });
      break;
    case 'down':
      if (s.ms >= rules.downMs) next('rise');
      break;
    case 'rise':
      s.drop = Math.max(0, s.drop - (rules.riseSpeed * ms) / 1000);
      if (s.drop <= 0) next('wait');
      break;
    default:
      break;
  }
  return s;
}

export const crusherStart = () => ({ phase: 'wait', ms: 0, drop: 0, speed: 0, slam: false });

// Is the crusher looking angry (eyes glowing)?
export const crusherAngry = (phase) => phase === 'warn' || phase === 'fall' || phase === 'down';

// Has the cat just landed on a mushroom's cap? Falling, his feet crossing the cap's top this step,
// and over the cap.
export function landsOnCap({ prevBottom, bottom, vy, x }, cap) {
  return vy > 0 && prevBottom <= cap.top + 8 && bottom >= cap.top && Math.abs(x - cap.x) <= cap.half;
}

// The first row at or below `row` in a column with a tile in it, or null.
export function floorRow(tiles, col, row) {
  for (let r = row; r < tiles.length; r++) if (tiles[r][col] >= 0) return r;
  return null;
}

// The mace's hook, in the world: under the island above its cell (hanging), or at its gallows'
// ring, the gallows standing on its cell, its beam pointing `facing`.
export function maceHook(trap, rules) {
  const middle = trap.col * TILE + TILE / 2;
  if (trap.hanging) return { x: middle, y: trap.row * TILE - rules.hangingSink };
  const height = rules.gallowsHeight;
  const width = height * rules.gallowsAspect;
  const facing = trap.facing ?? 1;
  return { x: middle + facing * (rules.hook.x - 0.5) * width, y: (trap.row + 1) * TILE - height + rules.hook.y * height };
}

// What's wrong with a level's traps, as messages.
export function trapProblems(level, layout) {
  const errors = [];
  const { map } = level;
  const { tiles, rows, cols } = layout;
  const rules = TRAPS[level.world];
  for (const [i, trap] of (level.traps ?? []).entries()) {
    const { kind, col, row } = trap;
    const name = `trap ${i + 1} (${kind})`;
    if (!TRAP_KINDS.includes(kind)) { errors.push(`${name} isn't a kind of trap`); continue; }
    if (!rules?.[kind]) { errors.push(`${name}: the ${level.world} world has no ${kind}`); continue; }
    if (col < 0 || col >= cols || row < 0 || row >= rows) { errors.push(`${name} is outside the map`); continue; }
    if (map[row][col] !== '.') errors.push(`${name} is on a cell that already has ${map[row][col]}`);
    const below = tiles[row + 1]?.[col] ?? -1;
    if ((STANDS.has(kind) || (kind === 'mace' && !trap.hanging)) && below < 0) errors.push(`${name} in column ${col} isn't standing on anything`);
    if (kind === 'mace') {
      const r = rules.mace;
      if (trap.hanging && (tiles[row - 1]?.[col] ?? -1) < 0) errors.push(`${name} in column ${col} has no island above to hang from`);
      // The ball, hanging straight down, must clear the ground under the hook.
      const hook = maceHook(trap, r);
      const hookCol = Math.floor(hook.x / TILE);
      const lowest = hook.y + (trap.chain ?? r.chain) + r.ballHeight;
      const floor = floorRow(tiles, hookCol, Math.floor(hook.y / TILE) + 1); // the first ground under the hook
      if (hookCol < 0 || hookCol >= cols) errors.push(`${name}'s chain hangs off the map`);
      else if (floor !== null && lowest > floor * TILE) errors.push(`${name} in column ${col} hangs into the ground`);
    }
    if (kind === 'crusher' && floorRow(tiles, col, row) === null) errors.push(`${name} in column ${col} has no ground below to slam onto`);
  }
  return errors;
}
