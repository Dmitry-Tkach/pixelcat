import { describe, expect, it } from 'vitest';
import { BOSSES, bossLayout } from '../src/data/adventure/bosses.js';
import { BOSS_ARENAS } from '../src/data/adventure/bossArenas.js';
import { BOSS_FIGHTS } from '../src/data/adventure/bossFights.js';
import { adventureRoutes } from '../src/systems/adventureRoutes.js';
import { TILE, checkAdventureLevel, readAdventureMap } from '../src/systems/adventureMap.js';
import { phaseAttacks } from '../src/systems/adventure/bosses/bossBrain.js';

const arenas = Object.entries(BOSS_ARENAS);

describe('adventure boss arenas', () => {
  it.each(arenas)('%s has no mistakes, and no portal: beating him ends it', (_kind, level) => {
    expect(checkAdventureLevel(level)).toEqual([]);
  });

  it.each(arenas)('%s has every pickup in reach, and no blind drops', (_kind, level) => {
    const { unreachable, blindEdges } = adventureRoutes(level);
    expect(unreachable.map((o) => `${o.type} at column ${o.col}, row ${o.row}`)).toEqual([]);
    expect(blindEdges).toEqual([]);
  });

  it.each(arenas)('%s is for a boss with a fight and art, standing inside its walls', (kind, level) => {
    const { boss } = level;
    expect(boss.kind).toBe(kind);
    expect(BOSS_FIGHTS[kind]).toBeDefined();
    expect(BOSSES[kind]).toBeDefined();
    expect(boss.col).toBeGreaterThan(boss.arena.left);
    expect(boss.col).toBeLessThan(boss.arena.right);
    // The walls stand all the way up, so nothing leaves the arena.
    const { tiles } = readAdventureMap(level.map);
    for (let row = 1; row < tiles.length; row++) {
      expect(tiles[row][boss.arena.left - 1], `left wall, row ${row}`).toBeGreaterThanOrEqual(0);
      expect(tiles[row][boss.arena.right + 1], `right wall, row ${row}`).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(arenas)('%s is no more than about two screens wide, so he is never far away', (_kind, level) => {
    const { arena } = level.boss;
    expect((arena.right - arena.left + 1) * TILE).toBeLessThanOrEqual(2 * 1280);
  });

  it('the troll is a test level, kept out of the road map and progress', () => {
    expect(BOSS_ARENAS.troll1.test).toBe(true);
  });
});

describe('the troll\'s club', () => {
  it('reaches about as far as his brain\'s "close", and lands inside his frame', () => {
    const { club, frameW, feetX } = bossLayout('troll1');
    expect(club.to).toBeGreaterThan(BOSS_FIGHTS.troll1.nearRange);
    expect(feetX + club.to).toBeLessThanOrEqual(frameW);
    expect(club.from).toBeLessThan(club.to);
  });

  it('every attack, in every part, has the code to show it', async () => {
    const { BOSS_ATTACKS } = await import('../src/entities/adventureBossAttacks/index.js');
    for (const phase of BOSS_FIGHTS.troll1.phases) {
      for (const { attack } of phaseAttacks(BOSS_FIGHTS.troll1, phase)) {
        expect(BOSS_ATTACKS[attack], attack).toBeDefined();
        expect(BOSS_ATTACKS[attack].windup, attack).toBeTypeOf('function');
        expect(BOSS_ATTACKS[attack].attack, attack).toBeTypeOf('function');
        expect(BOSS_ATTACKS[attack].recover, attack).toBeTypeOf('function');
        // An attack his body ends (active: null) needs the code that ends it.
        if (BOSS_FIGHTS.troll1.attacks[attack].active === null) expect(BOSS_ATTACKS[attack].update, attack).toBeTypeOf('function');
      }
    }
  });
});
