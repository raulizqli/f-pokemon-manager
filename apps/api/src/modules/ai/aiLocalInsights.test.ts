import { describe, it, expect } from 'vitest';
import { buildLocalInsights, LOCAL_INSIGHTS_MODEL } from './aiLocalInsights.js';

describe('buildLocalInsights', () => {
  it('suggests types missing from the collection', () => {
    const result = buildLocalInsights({
      total: 5,
      byStatus: { caught: 4, wishlist: 1 },
      topTypes: ['grass'],
      sampleNames: ['bulbasaur', 'oddish'],
    });

    expect(result.insights).toContain('5 Pokémon');
    expect(result.insights).toContain('grass');
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations).not.toContain('Bulbasaur');
  });

  it('falls back to default recommendations when many types are covered', () => {
    const result = buildLocalInsights({
      total: 20,
      byStatus: { caught: 20 },
      topTypes: Object.keys({
        normal: 1,
        fire: 1,
        water: 1,
        grass: 1,
        electric: 1,
        psychic: 1,
        fighting: 1,
        poison: 1,
        ground: 1,
        flying: 1,
        bug: 1,
        rock: 1,
        ghost: 1,
        dragon: 1,
        dark: 1,
        steel: 1,
        fairy: 1,
        ice: 1,
      }),
      sampleNames: ['pikachu'],
    });

    expect(result.recommendations).toEqual(['Pikachu', 'Eevee', 'Squirtle']);
  });

  it('exports a stable model id for API responses', () => {
    expect(LOCAL_INSIGHTS_MODEL).toBe('local-heuristic');
  });
});
