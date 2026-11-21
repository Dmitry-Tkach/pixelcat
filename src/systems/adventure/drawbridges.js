// Drawbridges: a bridge that isn't there until the cat opens it with its switch, a stone with a gem
// that he shoots or touches. Then its planks drop into place one by one, and it stays down. Plain
// code, no Phaser, so tests can check levels (systems/adventure/AdventureDrawbridges.js draws it).
//
// A level lists them as drawbridges: [{ switch: { col, row }, from, to, row }]: the switch stands
// in its cell, and the bridge runs from column `from` to `to` along `row`, as a thin bridge (map
// letter -) would. Both must be in empty cells of the map. One with no switch is down from the
// start (a rope bridge that's simply there, with its own planks).
//   falls: its planks give way under the cat a moment after he lands on each (the high way's rope
//     bridge: keep running), and come back a little later (DRAWBRIDGE.fall);
//   holdMs: once its switch is set off, it stays down only this long, shakes a warning, then rises
//     and its switch resets (the gate's: shoot, then run).

// plankMs: the time between one plank dropping in and the next. dropPx: how far above its place a
// plank starts as it drops in. dropMs: how long one plank takes to drop. hit: how far (px) round the
// switch's middle a round or the cat sets it off.
export const DRAWBRIDGE = { plankMs: 90, dropPx: 120, dropMs: 260, hit: 34, depth: 2.5, switchDepth: 3 };
// A falling plank: it shakes for afterMs once the cat stands on it (shakePx each way), then drops
// dropPx out of sight over dropMs, and comes back backMs after it fell.
export const PLANK_FALL = { afterMs: 450, shakePx: 2, dropPx: 260, dropMs: 420, backMs: 2600 };
// A timed bridge: it shakes for the last warnMs before it rises; rising takes riseMs a plank.
export const BRIDGE_HOLD = { warnMs: 1500, shakePx: 2, riseMs: 220 };

// Every cell a drawbridge covers, once it's down.
export const drawbridgeCells = ({ from, to, row }) => Array.from({ length: to - from + 1 }, (_, i) => ({ col: from + i, row }));

// Whether a point (px) is on a drawbridge's switch: { col, row } is its cell, and it stands in the
// middle of it.
export function hitsSwitch({ col, row }, x, y, tile) {
  const mx = col * tile + tile / 2, my = row * tile + tile / 2;
  return Math.abs(x - mx) <= DRAWBRIDGE.hit && Math.abs(y - my) <= DRAWBRIDGE.hit;
}

// What's wrong with a level's drawbridges, as messages.
export function drawbridgeProblems(level) {
  const errors = [];
  const { map } = level;
  const empty = (c, r) => r >= 0 && r < map.length && c >= 0 && c < map[0].length && map[r][c] === '.';
  for (const [i, bridge] of (level.drawbridges ?? []).entries()) {
    const name = `drawbridge ${i + 1}`;
    if (bridge.switch && !empty(bridge.switch.col, bridge.switch.row)) errors.push(`${name}'s switch must be in an empty cell`);
    if (bridge.holdMs !== undefined && !(bridge.holdMs > BRIDGE_HOLD.warnMs)) errors.push(`${name}'s holdMs must be longer than its warning (${BRIDGE_HOLD.warnMs} ms)`);
    if (bridge.holdMs !== undefined && !bridge.switch) errors.push(`${name} has a holdMs but no switch to set it off again`);
    if (!(bridge.from <= bridge.to)) errors.push(`${name} must run from a column to one at or after it`);
    else if (drawbridgeCells(bridge).some(({ col, row }) => !empty(col, row))) errors.push(`${name} must be in empty cells`);
  }
  return errors;
}
