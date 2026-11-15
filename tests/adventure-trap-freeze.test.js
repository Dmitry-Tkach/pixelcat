import { SPORE_BUD, budAfter } from '../src/systems/adventure/sporeBuds.js';
import { describe, expect, it } from 'vitest';
import { TRAP_FREEZE, canFreezeTrap, frostAfterHit, frozenBallBlock, iceAfter } from '../src/data/adventure/freeze.js';
import { TRAP_KINDS } from '../src/data/adventure/traps.js';

describe('freezing small traps', () => {
  it('freezes the maces, crushers and dart idols, not the guardian or the mushroom', () => {
    expect(canFreezeTrap('mace')).toBe(true);
    expect(canFreezeTrap('crusher')).toBe(true);
    expect(canFreezeTrap('idol')).toBe(true);
    expect(canFreezeTrap('guardian')).toBe(false);
    expect(canFreezeTrap('mushroom')).toBe(false);
    for (const kind of TRAP_FREEZE.kinds) expect(TRAP_KINDS).toContain(kind);
  });

  it("puts a block of ice round a mace's ball, centred on it", () => {
    const block = frozenBallBlock({ x: 500, y: 300 }, 84);
    expect((block.left + block.right) / 2).toBe(500);
    expect((block.top + block.bottom) / 2).toBe(300);
    expect(block.right - block.left).toBeCloseTo(84 * TRAP_FREEZE.ballShare * 2);
  });

  it('thaws after its time, cracking first', () => {
    const { ms, crackMs } = TRAP_FREEZE;
    expect(iceAfter(ms, ms - crackMs - 1, TRAP_FREEZE).cracking).toBe(false);
    expect(iceAfter(ms, ms - crackMs + 1, TRAP_FREEZE).cracking).toBe(true);
    expect(iceAfter(ms, ms, TRAP_FREEZE).thawed).toBe(true);
  });
});

describe('frosting a trap', () => {
  it('takes several freeze rounds to freeze it', () => {
    let frost = 0;
    for (let i = 1; i < TRAP_FREEZE.shots; i++) {
      const hit = frostAfterHit(frost);
      expect(hit.freezes).toBe(false);
      frost = hit.frost;
    }
    expect(frostAfterHit(frost)).toEqual({ frost: 0, freezes: true });
    expect(TRAP_FREEZE.shots).toBeGreaterThan(1);
  });
});


describe('spore buds', () => {
  it('stay open a while, shudder near the end, then close', () => {
    expect(budAfter(SPORE_BUD.openMs, 100)).toMatchObject({ open: true, warning: false, closed: false });
    expect(budAfter(SPORE_BUD.warnMs, 100)).toMatchObject({ open: true, warning: true });
    expect(budAfter(50, 100)).toMatchObject({ left: 0, open: false, closed: true });
    expect(budAfter(0, 100)).toMatchObject({ open: false, closed: false });
  });
});
