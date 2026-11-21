// A level's pools: water with a floor, that the cat swims in (data/adventure/swim.js), unlike the
// bottomless gaps' water that costs a heart (systems/adventure/water.js). Plain code, no Phaser, so
// the scene, the route checker and the tests share it.
//
// A level lists them as pools: [{ cols: [from, to], bottom, surface, stages }]:
//   cols: the columns the water fills; bottom: its lowest row (the floor is under it);
//   surface: the row its surface is at, at first (the water fills that row and down);
//   stages: the rows its surface rises to, one a stage (a lever opening a dam gate: levers), in order.
// A level's levers: [{ col, row }]: each pulled raises the water a stage (the dam's gates).

// The row a pool's surface is at, at water stage `stage` (0: as it starts).
export function poolSurface(pool, stage = 0) {
  if (!stage || !pool.stages?.length) return pool.surface;
  return pool.stages[Math.min(stage, pool.stages.length) - 1];
}

// The pool a point (in cells, fractions allowed) is in, at `stage`, or null: inside its columns, at
// or under its surface's row, down to its bottom.
export function poolAt(pools, col, row, stage = 0) {
  return pools.find((pool) => col >= pool.cols[0] && col < pool.cols[1] + 1 && row >= poolSurface(pool, stage) && row < pool.bottom + 1) ?? null;
}

// Whether the cat, his middle at y (px) and the pool's surface at surfaceY (px), is swimming: his
// middle far enough under it. submerge: px (SWIM.submerge).
export const swimsAt = (y, surfaceY, submerge) => y > surfaceY + submerge;

// What a jump press does in the water: a stroke up, or, near the surface, a leap out onto the bank.
// top: his body's top (px); surfaceY: the pool's surface (px).
export function strokeSpeed(top, surfaceY, swim) {
  return top < surfaceY + swim.surfaceBand ? swim.outJump : swim.stroke;
}

// His speed in the water: across, a share of his top running speed; down, no faster than maxSink;
// up, no faster than maxRise.
export function swimVelocity(vx, vy, topSpeed, swim) {
  const across = topSpeed * swim.speedShare;
  return { vx: Math.max(-across, Math.min(across, vx)), vy: Math.max(-swim.maxRise, Math.min(swim.maxSink, vy)) };
}

// What's wrong with a level's pools and levers, as messages.
export function poolProblems(level) {
  const errors = [];
  const rows = level.map.length, cols = level.map[0].length;
  for (const [i, pool] of (level.pools ?? []).entries()) {
    const name = `pool ${i + 1}`;
    const [c0, c1] = pool.cols ?? [];
    if (!(c0 <= c1) || c0 < 0 || c1 >= cols) errors.push(`${name}'s columns must run from one to one at or after it, inside the map`);
    if (!(pool.surface <= pool.bottom) || pool.bottom >= rows) errors.push(`${name}'s surface must be at or above its bottom, inside the map`);
    const surfaces = [pool.surface, ...(pool.stages ?? [])];
    if (surfaces.some((row, k) => k > 0 && !(row < surfaces[k - 1]))) errors.push(`${name}'s stages must each be higher (a smaller row) than the one before`);
  }
  for (const [i, lever] of (level.levers ?? []).entries()) {
    if (level.map[lever.row]?.[lever.col] !== '.') errors.push(`lever ${i + 1} must be in an empty cell`);
  }
  return errors;
}

// How a pool's water is drawn at a surface row, column by column: where the cell at the surface is
// open, the water's surface (its wavy top, its crest) is there; where ground covers it (a cave or a
// tunnel the water runs on into), the water starts under that ground, with no surface. solid(c, r):
// whether a cell is ground. Returns runs of columns with the same top: [{ from, to, top, open }]
// (top: the row the water starts at), leaving out columns that are ground all the way down.
export function poolSegments(pool, surfaceRow, solid) {
  const runs = [];
  for (let c = pool.cols[0]; c <= pool.cols[1]; c++) {
    let top = surfaceRow;
    while (top <= pool.bottom && solid(c, top)) top++;
    if (top > pool.bottom) continue;
    const open = top === surfaceRow;
    const last = runs.at(-1);
    if (last && last.to === c - 1 && last.top === top) last.to = c;
    else runs.push({ from: c, to: c, top, open });
  }
  return runs;
}
