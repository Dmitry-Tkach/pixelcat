import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { GATES } from '../src/data/adventure/gates.js';
import { ADVENTURE_ART, adventureArtWorld, ADVENTURE_LEVELS, adventurePath } from '../src/data/adventure/index.js';
import { BOSS_ARENAS } from '../src/data/adventure/bossArenas.js';
import { portalPosts } from '../src/systems/adventure/gatePlacement.js';
import { TILE, readAdventureMap } from '../src/systems/adventureMap.js';

const pictures = ({ start, checkpoint, portal }) => [start.ring, start.swirl, checkpoint.pole, checkpoint.down, checkpoint.up, portal.arch, portal.swirl, portal.post];

// A small map: ground (#) along the bottom row, with the portal on it.
const map = (rows) => readAdventureMap(rows);

describe('the gates', () => {
  it('use only pictures in their world\'s art, and those are prepared', () => {
    for (const [world, gates] of Object.entries(GATES)) {
      for (const picture of pictures(gates)) {
        // A world's own picture, or the one it borrows from the base world.
        const owner = adventureArtWorld(world, picture);
        expect(ADVENTURE_ART[owner], picture).toContain(picture);
        expect(existsSync(`public/${adventurePath(owner, picture)}`), picture).toBe(true);
      }
    }
  });

  it('are there for every world with a level or a boss arena', () => {
    for (const level of [...ADVENTURE_LEVELS, ...Object.values(BOSS_ARENAS)]) expect(GATES[level.world], level.id).toBeDefined();
  });

  it('keep the places inside their pictures within them', () => {
    for (const { start, checkpoint, portal } of Object.values(GATES)) {
      for (const hole of [start.hole, portal.hole]) {
        expect(hole.x - hole.size / 2).toBeGreaterThanOrEqual(0);
        expect(hole.x + hole.size / 2).toBeLessThanOrEqual(1);
      }
      expect(checkpoint.flag.upY).toBeLessThan(checkpoint.flag.downY);
    }
  });
});

describe('the portal\'s flame posts', () => {
  const rules = GATES.wood.portal;
  const portalIn = (layout) => layout.objects.find((o) => o.type === 'portal');

  it('stand on both sides on wide ground', () => {
    const layout = map(['..........', '....E.....', '##########']);
    const middle = 4 * TILE + TILE / 2;
    expect(portalPosts(layout, portalIn(layout), rules)).toEqual([middle - rules.postGap, middle + rules.postGap]);
  });

  it('are left out together if one side has no ground, or a block in the way', () => {
    const edge = map(['..........', '....E.....', '#####.....']);
    expect(portalPosts(edge, portalIn(edge), rules)).toEqual([]);
    // A block on the square where the right post would stand.
    const blockCol = Math.floor((4 * TILE + TILE / 2 + rules.postGap) / TILE);
    const row = [...'....E.....'];
    row[blockCol] = 'X';
    const block = map(['..........', row.join(''), '##########']);
    expect(portalPosts(block, portalIn(block), rules)).toEqual([]);
  });

  it('flank the portal in every level', () => {
    for (const level of ADVENTURE_LEVELS) {
      const layout = readAdventureMap(level.map);
      expect(portalPosts(layout, portalIn(layout), GATES[level.world].portal), level.id).toHaveLength(2);
    }
  });
});
