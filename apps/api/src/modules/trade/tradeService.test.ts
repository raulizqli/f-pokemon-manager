import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictError, ForbiddenError } from '../../lib/errors.js';
import type { CollectionRepository } from '../collection/collectionRepository.js';
import type { UserRepository } from '../auth/userRepository.js';
import { TradeService } from './tradeService.js';
import type { TradeRepository, TradeRecord } from './tradeRepository.js';

function entry(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: 'offered-1',
    userId: 'initiator',
    pokemonId: 1,
    pokemonName: 'bulbasaur',
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

function tradeRecord(overrides: Partial<TradeRecord> = {}): TradeRecord {
  const now = new Date();
  return {
    id: 'trade-1',
    initiatorId: 'initiator',
    recipientId: 'recipient',
    offeredEntryId: 'offered-1',
    requestedEntryId: 'requested-1',
    offeredPokemonId: 1,
    offeredPokemonName: 'bulbasaur',
    offeredSpriteUrl: null,
    offeredNickname: null,
    offeredIsShiny: false,
    requestedPokemonId: 4,
    requestedPokemonName: 'charmander',
    requestedSpriteUrl: null,
    requestedNickname: null,
    requestedIsShiny: false,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    initiator: { id: 'initiator', displayName: 'Ash' },
    recipient: { id: 'recipient', displayName: 'Misty' },
    ...overrides,
  } as TradeRecord;
}

describe('TradeService domain rules', () => {
  const trades = {
    create: vi.fn(),
    findById: vi.fn(),
    findForUser: vi.fn(),
    findPendingByEntryId: vi.fn(),
    updateStatus: vi.fn(),
    acceptSwap: vi.fn(),
  };

  const users = {
    findById: vi.fn(),
    searchExcluding: vi.fn(),
  };

  const collection = {
    findById: vi.fn(),
    findByUserPokemonAndShiny: vi.fn(),
    findByUserId: vi.fn(),
  };

  let service: TradeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TradeService(
      trades as unknown as TradeRepository,
      users as unknown as UserRepository,
      collection as unknown as CollectionRepository,
    );
  });

  it('forbids accept by non-recipient', async () => {
    trades.findById.mockResolvedValue(tradeRecord());
    await expect(service.accept('initiator', 'trade-1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(trades.acceptSwap).not.toHaveBeenCalled();
  });

  it('accepts via repository swap for recipient', async () => {
    const accepted = tradeRecord({ status: 'accepted' });
    trades.findById.mockResolvedValue(tradeRecord());
    trades.acceptSwap.mockResolvedValue(accepted);

    const result = await service.accept('recipient', 'trade-1');
    expect(result.status).toBe('accepted');
    expect(trades.acceptSwap).toHaveBeenCalledWith('trade-1');
  });

  it('rejects propose when offered entry already pending', async () => {
    users.findById.mockResolvedValue({ id: 'recipient', displayName: 'Misty' });
    collection.findById
      .mockResolvedValueOnce(entry({ id: 'offered-1', userId: 'initiator', pokemonId: 1 }))
      .mockResolvedValueOnce(
        entry({ id: 'requested-1', userId: 'recipient', pokemonId: 4, pokemonName: 'charmander' }),
      );
    collection.findByUserPokemonAndShiny.mockResolvedValue(null);
    trades.create.mockRejectedValue(
      new ConflictError('One of these Pokémon is already in a pending trade'),
    );

    await expect(
      service.create('initiator', {
        recipientId: 'recipient',
        offeredEntryId: 'offered-1',
        requestedEntryId: 'requested-1',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
