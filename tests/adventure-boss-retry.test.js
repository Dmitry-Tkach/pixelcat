import { describe, expect, it } from 'vitest';
import { atBoss, cellKey, fromCheckpoint, restore, snapshot } from '../src/systems/adventure/bossRetry.js';

// A stand-in level scene: just the parts bossRetry reads and changes.
function level({ done = [], lit = [] } = {}) {
  const thing = (cell, extra = {}) => ({
    cell, active: true, visible: true, ...extra,
    disableBody(off, hide) { this.active = !off; this.visible = !hide; },
    destroy() { this.active = false; this.destroyed = true; },
  });
  const enemies = [thing('19,33'), thing('139,25')];
  const scene = {
    level: { test: false },
    coins: 0, gems: 0, hasKey: false, hasSilverKey: false, chestsOpened: 0, knockedOut: 0,
    done: new Set(done), lit: new Set(lit),
    respawnAt: { x: 32, y: 2176 },
    pickups: [thing('10,31', { kind: 'coin' }), thing('172,12', { kind: 'gem' }), thing('8,33', { kind: 'weapon' })],
    chests: [thing('120,30')],
    enemies: { getChildren: () => enemies.filter((e) => !e.destroyed) },
    lanterns: [thing('67,33'), thing('189,33')],
    gates: { raised: [], raise(lantern) { this.raised.push(lantern.cell); } },
    moves: { armed: false, rounds: { standard: 0, explosive: 0 }, ammo: 'standard' },
    cat: { character: 'pawsCat', x: 0, y: 0, changeCharacter(c) { this.character = c; }, setPosition(x, y) { this.x = x; this.y = y; } },
    cameras: { main: { centerOn(x, y) { this.at = { x, y }; } } },
    bossFights: [],
  };
  return scene;
}

describe('trying again at the boss', () => {
  it('names each thing by the cell it was built in', () => {
    expect(cellKey({ col: 189, row: 33 })).toBe('189,33');
  });

  it('starts at the checkpoint before him, with all he had done, and his minigun loaded', () => {
    // The try he lost: coins, a crystal, the minigun, a chest, an enemy knocked out, two checkpoints.
    const lost = level({ done: ['10,31', '172,12', '8,33', '120,30', '19,33'], lit: ['67,33', '189,33'] });
    Object.assign(lost, { coins: 37, gems: 1, hasKey: true, chestsOpened: 1, knockedOut: 1, respawnAt: { x: 12128, y: 2176 } });
    Object.assign(lost.moves, { armed: true, rounds: { standard: 23, explosive: 8 }, ammo: 'explosive' });
    const state = snapshot(lost);

    // The level, built fresh.
    const again = level();
    const opened = [];
    restore(again, state, { armed: 'pawsCatArmed', openChest: (chest) => opened.push(chest.cell) });

    expect(again.pickups.filter((p) => p.active).map((p) => p.cell)).toEqual([]); // all three taken
    expect(again.chests[0].opened).toBe(true);
    expect(opened).toEqual(['120,30']);
    expect(again.enemies.getChildren().map((e) => e.cell)).toEqual(['139,25']); // the knocked-out one gone
    expect(again.lanterns.every((l) => l.lit)).toBe(true);
    expect(again.gates.raised).toEqual(['67,33', '189,33']);
    expect([again.coins, again.gems, again.hasKey, again.chestsOpened, again.knockedOut]).toEqual([37, 1, true, 1, 1]);
    expect(again.cat.character).toBe('pawsCatArmed');
    expect(again.moves.rounds).toEqual({ standard: 23, explosive: 8 });
    expect(again.moves.ammo).toBe('explosive');
    expect(again.respawnAt).toEqual({ x: 12128, y: 2176 });
    expect(again.cat.x).toBe(12128); // at the checkpoint, not the level's start
    // And a second loss carries it all on again.
    expect(snapshot(again).done.sort()).toEqual(state.done.sort());
  });

  it('is offered only while a level boss is fighting and not beaten, not in a test arena', () => {
    const scene = level();
    expect(atBoss(scene)).toBe(false);
    scene.bossFights = [{ started: true, beaten: false }];
    expect(atBoss(scene)).toBe(true);
    scene.bossFights = [{ started: true, beaten: true }];
    expect(atBoss(scene)).toBe(false);
    scene.bossFights = [{ started: true, beaten: false }];
    scene.level.test = true;
    expect(atBoss(scene)).toBe(false);
  });

  it('is offered in any level once he has lit a checkpoint, or at a boss; never in a test arena', () => {
    const scene = level();
    scene.lit = new Set();
    scene.bossFights = [];
    expect(fromCheckpoint(scene)).toBe(false); // no checkpoint yet: from the start
    scene.lit.add('98,23');
    expect(fromCheckpoint(scene)).toBe(true);
    scene.lit = new Set();
    scene.bossFights = [{ started: true, beaten: false }];
    expect(fromCheckpoint(scene)).toBe(true);
    scene.lit.add('98,23');
    scene.level.test = true;
    expect(fromCheckpoint(scene)).toBe(false);
  });
});
