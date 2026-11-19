import { SINGLE_JUMP_HEIGHT } from '../../config/gameConfig.js';
import { HERO_JUMP } from '../../data/adventure/heroJump.js';
import { TILE } from '../adventureMap.js';
import { TRAPS, TRAP_KINDS } from '../../data/adventure/traps.js';

// The moving traps' plain logic (data/adventure/traps.js): how the mace swings, the crusher's
// cycle, when the cat lands on a mushroom, what's hit, and whether a level's traps are placed
// sensibly. No Phaser, so tests can check it; systems/adventure/AdventureTraps.js draws them.

const STANDS = new Set(['idol', 'mushroom']);
// The cat's height as shown (px): standing, and sliding (data/adventure/heroes.js: his run and slide
// hitboxes, 113 and 73 px tall, shown at 0.8).
export const STAND_HEIGHT = 90;
export const SLIDE_HEIGHT = 58;
// How much room a waiting crusher must leave above the ground it slams onto: a single jump lifts his
// feet the adventure cat's jump height (the main game's, times HERO_JUMP.height), his head
// STAND_HEIGHT above them. Lower, a plain jump under it would bump
// it, and be under it if it fell.
const CRUSHER_MARGIN = 20;
export const CRUSHER_CLEARANCE = Math.ceil(SINGLE_JUMP_HEIGHT * HERO_JUMP.height + STAND_HEIGHT + CRUSHER_MARGIN);
// Where the lowest point of a mace's spikes must swing, above the ground under it (px): high enough
// for a slide to pass under, low enough to hit him standing, so it's dodged by sliding or timing.
export const MACE_SWING_LOW = { min: SLIDE_HEIGHT + 12, max: STAND_HEIGHT - 6 };

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

// How the cat meets a crusher, from their bodies ({ left, top, right, bottom }): 'top' if he's on or
// above it (he can stand on it), 'beneath' if he's under it, 'side' otherwise. CONTACT_SLACK px of
// overlap still counts as on top or beneath.
const CONTACT_SLACK = 16;
export function crusherContact(cat, block) {
  if (cat.bottom <= block.top + CONTACT_SLACK) return 'top';
  if (cat.top >= block.bottom - CONTACT_SLACK) return 'beneath';
  return 'side';
}

// Does a crusher in this phase crush the cat beneath it? Only while it falls, or the moment it lands:
// waiting or lifting, it's just stone to bump his head on.
const LANDED_HURTS_MS = 150;
export function crusherCrushes(cat, block, { phase, ms }) {
  if (phase !== 'fall' && !(phase === 'down' && ms < LANDED_HURTS_MS)) return false;
  const across = cat.right > block.left && cat.left < block.right;
  return across && crusherContact(cat, block) !== 'top' && cat.top < block.bottom && cat.bottom > block.bottom - CONTACT_SLACK;
}

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

// The stone guardian's swing (radians, outward from hanging straight down) at a moment: resting
// low, rising outward (eased), holding, then striking back down (speeding up), over periodMs.
const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2;
export function guardianSwing(ms, { periodMs, swingDeg, swing }) {
  const most = (swingDeg * Math.PI) / 180;
  let t = (((ms % periodMs) + periodMs) % periodMs) / periodMs;
  if (t < swing.rest) return 0;
  t -= swing.rest;
  if (t < swing.rise) return most * ease(t / swing.rise);
  t -= swing.rise;
  if (t < swing.hold) return most;
  t -= swing.hold;
  return most * (1 - (t / swing.strike) ** 2);
}

// Which part of its swing an arm is in at a moment: 'rest', 'rise', 'hold' or 'strike'.
export function guardianPhase(ms, { periodMs, swing }) {
  let t = (((ms % periodMs) + periodMs) % periodMs) / periodMs;
  for (const phase of ['rest', 'rise', 'hold', 'strike']) {
    if (t < swing[phase]) return phase;
    t -= swing[phase];
  }
  return 'strike';
}

// Where the guardian and his arms are, from his trap ({ col, row, chain }): his middle x and feet y,
// his body's top left, and each arm: its socket (where it turns), restTurn (the turn that hangs its
// chain straight down), reach (from the socket to the ball's middle), and outward (+1 for the left
// arm, whose swing goes left, -1 for the right).
export function guardianGeometry(trap, r) {
  const x = trap.col * TILE, feet = (trap.row + 1) * TILE + r.sink;
  const left = x - r.bodySize.w / 2, top = feet - r.bodySize.h;
  const chain = trap.chain ?? r.chain;
  const arms = r.sockets.map((socket, i) => {
    const { shoulder, chainEnd } = r.armJoints[i];
    const vx = (chainEnd.x - shoulder.x) * r.armSize.w, vy = (chainEnd.y - shoulder.y) * r.armSize.h;
    return {
      socket: { x: left + socket.x * r.bodySize.w, y: top + socket.y * r.bodySize.h },
      restTurn: Math.atan2(vx, vy), armLength: Math.hypot(vx, vy),
      reach: Math.hypot(vx, vy) + chain + r.ballMiddle * r.ballHeight,
      outward: i === 0 ? 1 : -1,
    };
  });
  return { x, feet, left, top, chain, arms };
}

// Whether the guardian's mouth fire is 'idle', 'warn' (glowing) or 'pour' at a moment on his arms'
// clock (data/adventure/traps.js, guardian.fire).
export function guardianFirePhase(ms, { everyMs, startMs, warnMs, pourMs, firstAfterMs }) {
  if (ms < firstAfterMs) return 'idle';
  const t = ms % everyMs;
  if (t >= startMs && t < startMs + pourMs) return 'pour';
  if (t >= startMs - warnMs && t < startMs) return 'warn';
  return 'idle';
}

// Where his fire pours, in px ({ left, right, top, bottom }): from his mouth straight down to the path.
export function guardianFireColumn(trap, r, pathY) {
  const { x, left, top } = guardianGeometry(trap, r);
  const { mouth, width } = r.fire;
  const mouthX = left + mouth.x * r.bodySize.w;
  return { left: mouthX - width / 2, right: mouthX + width / 2, top: top + mouth.y * r.bodySize.h, bottom: pathY, x };
}

// The guardian's solid stone, in px ({ left, right, top, bottom }): he blocks the cat, and fills his
// platform, so there's no standing beside him or getting over him.
export function guardianSolid(trap, r) {
  const { x, feet, top } = guardianGeometry(trap, r);
  const half = (r.bodySize.w * r.solid.width) / 2;
  return { left: x - half, right: x + half, top: top + r.bodySize.h * r.solid.top, bottom: feet };
}

// The middle of an arm's ball, swung `swing` radians outward.
export const guardianBall = (arm, swing) => swingPoint(arm.socket, arm.reach, arm.outward * swing);

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
      // The ball, hanging straight down, must clear the ground under the hook, and its spikes swing
      // low enough to hit him standing but high enough for a slide.
      const hook = maceHook(trap, r);
      const hookCol = Math.floor(hook.x / TILE);
      const chain = trap.chain ?? r.chain;
      const lowest = hook.y + chain + r.ballHeight;
      const floor = floorRow(tiles, hookCol, Math.floor(hook.y / TILE) + 1); // the first ground under the hook
      if (hookCol < 0 || hookCol >= cols) errors.push(`${name}'s chain hangs off the map`);
      else if (floor !== null && lowest > floor * TILE) errors.push(`${name} in column ${col} hangs into the ground`);
      else if (floor !== null) {
        const spikes = floor * TILE - (hook.y + chain + r.ballMiddle * r.ballHeight + r.hitShare * r.ballHeight);
        if (spikes < MACE_SWING_LOW.min) errors.push(`${name} in column ${col} swings too low to slide under (${Math.round(spikes)} px up)`);
        if (spikes > MACE_SWING_LOW.max) errors.push(`${name} in column ${col} swings over a standing cat (${Math.round(spikes)} px up)`);
      }
    }
    if (kind === 'guardian') {
      // He stands on stone blocks (or ground), in open air, and each ball, hanging at rest, swings
      // low enough to hit him standing on the path below but high enough for a slide.
      const r = rules.guardian;
      const half = r.platformCells / 2;
      for (let c = col - half; c < col + half; c++) {
        if (!['X', '#'].includes(map[row + 1]?.[c])) errors.push(`${name} in column ${col}: his platform needs stone (X) or ground at column ${c}, row ${row + 1}`);
        if ((tiles[row]?.[c] ?? -1) >= 0) errors.push(`${name} in column ${col} stands inside the ground at column ${c}`);
      }
      for (const arm of guardianGeometry(trap, r).arms) {
        const ball = guardianBall(arm, 0);
        // The ground under the ball: the first below his shoulder (the ball may hang below it).
        const floor = floorRow(tiles, Math.floor(ball.x / TILE), Math.floor(arm.socket.y / TILE) + 1);
        if (floor === null) continue;
        const spikes = floor * TILE - (ball.y + r.hitShare * r.ballHeight);
        if (spikes < MACE_SWING_LOW.min) errors.push(`${name} in column ${col}: a ball hangs too low to slide under (${Math.round(spikes)} px up)`);
        if (spikes > MACE_SWING_LOW.max) errors.push(`${name} in column ${col}: a ball hangs over a standing cat (${Math.round(spikes)} px up)`);
      }
    }
    if (kind === 'crusher') {
      const floor = floorRow(tiles, col, row);
      if (floor === null) errors.push(`${name} in column ${col} has no ground below to slam onto`);
      else if (floor * TILE - (row * TILE + rules.crusher.height) < CRUSHER_CLEARANCE) {
        errors.push(`${name} in column ${col} waits too low: a jump under it would touch it (it needs ${CRUSHER_CLEARANCE} px of room)`);
      }
    }
  }
  return errors;
}
