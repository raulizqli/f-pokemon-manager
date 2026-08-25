import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestError, ConflictError } from '../../lib/errors.js';
import type { PokeApiClient } from '../../lib/pokeApiClient.js';
import type { TradeRepository } from '../trade/tradeRepository.js';
import { CollectionService } from './collectionService.js';
import type { CollectionRepository } from './collectionRepository.js';

function entry(overrides: Partial<{
  id: string;
  userId: string;
  pokemonId: number;
  pokemonName: string;
  spriteUrl: string | null;
  nickname: string | null;
  notes: string | null;
  status: string;
  isShiny: boolean;
}> = {}) {
  const now = new Date();
  return {
    id: 'entry-1',
    userId: 'user-1',
    pokemonId: 25,
    pokemonName: 'pikachu',
    spriteUrl: null,
    nickname: null,
    notes: null,
    status: 'caught',
    isShiny: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('CollectionService domain rules', () => {
  const repository = {
    findByUserPokemonAndShiny: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    updatePokemon: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByUserId: vi.fn(),
    getStats: vi.fn(),
  };

  const pokeApi = {
    getPokemon: vi.fn(),
    getNextEvolutions: vi.fn(),
  };

  const trades = {
    findPendingByEntryId: vi.fn(),
  };

  let service: CollectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    service = new CollectionService(
      repository as unknown as CollectionRepository,
      pokeApi as unknown as PokeApiClient,
      trades as unknown as TradeRepository,
    );
  });

  it('rejects duplicate non-shiny catch with 409', async () => {
    repository.findByUserPokemonAndShiny.mockResolvedValue(entry());
    await expect(
      service.create('user-1', { pokemonId: 25, status: 'caught' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('maps unique constraint on create to ConflictError', async () => {
    repository.findByUserPokemonAndShiny.mockResolvedValue(null);
    pokeApi.getPokemon.mockResolvedValue({
      id: 25,
      name: 'pikachu',
      spriteUrl: 'x',
      spriteShinyUrl: 'y',
    });
    const { Prisma } = await import('@prisma/client');
    repository.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create('user-1', { pokemonId: 25, status: 'caught' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('requires targetPokemonId when evolution branches', async () => {
    repository.findById.mockResolvedValue(entry({ pokemonId: 133, pokemonName: 'eevee' }));
    trades.findPendingByEntryId.mockResolvedValue(null);
    pokeApi.getNextEvolutions.mockResolvedValue([
      { id: 134, name: 'vaporeon', spriteUrl: null, types: ['water'] },
      { id: 135, name: 'jolteon', spriteUrl: null, types: ['electric'] },
    ]);

    await expect(service.evolve('user-1', 'entry-1', {})).rejects.toBeInstanceOf(BadRequestError);
  });

  it('evolves to chosen branch target', async () => {
    repository.findById.mockResolvedValue(entry({ pokemonId: 133, pokemonName: 'eevee' }));
    trades.findPendingByEntryId.mockResolvedValue(null);
    repository.findByUserPokemonAndShiny.mockResolvedValue(null);
    pokeApi.getNextEvolutions.mockResolvedValue([
      { id: 134, name: 'vaporeon', spriteUrl: null, types: ['water'] },
      { id: 135, name: 'jolteon', spriteUrl: null, types: ['electric'] },
    ]);
    pokeApi.getPokemon.mockResolvedValue({
      id: 135,
      name: 'jolteon',
      spriteUrl: 'j',
      spriteShinyUrl: 'js',
    });
    repository.updatePokemon.mockResolvedValue(
      entry({ pokemonId: 135, pokemonName: 'jolteon', spriteUrl: 'j' }),
    );

    const result = await service.evolve('user-1', 'entry-1', { targetPokemonId: 135 });
    expect(result.pokemonName).toBe('jolteon');
    expect(repository.updatePokemon).toHaveBeenCalledWith('entry-1', {
      pokemonId: 135,
      pokemonName: 'jolteon',
      spriteUrl: 'j',
    });
  });
});
