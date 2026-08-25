import type {
  CreateTradeInput,
  PublicCollectionEntry,
  Trade,
  TrainerSummary,
} from '@pokedex/shared';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../lib/errors.js';
import { UserRepository } from '../auth/userRepository.js';
import { CollectionRepository } from '../collection/collectionRepository.js';
import { TradeRepository, type TradeRecord } from './tradeRepository.js';

function toTradeDto(trade: TradeRecord): Trade {
  return {
    id: trade.id,
    status: trade.status as Trade['status'],
    initiator: { id: trade.initiator.id, displayName: trade.initiator.displayName },
    recipient: { id: trade.recipient.id, displayName: trade.recipient.displayName },
    offered: {
      entryId: trade.offeredEntryId,
      pokemonId: trade.offeredPokemonId,
      pokemonName: trade.offeredPokemonName,
      spriteUrl: trade.offeredSpriteUrl,
      nickname: trade.offeredNickname,
      isShiny: trade.offeredIsShiny,
    },
    requested: {
      entryId: trade.requestedEntryId,
      pokemonId: trade.requestedPokemonId,
      pokemonName: trade.requestedPokemonName,
      spriteUrl: trade.requestedSpriteUrl,
      nickname: trade.requestedNickname,
      isShiny: trade.requestedIsShiny,
    },
    createdAt: trade.createdAt.toISOString(),
    updatedAt: trade.updatedAt.toISOString(),
  };
}

function toPublicEntry(entry: {
  id: string;
  pokemonId: number;
  pokemonName: string;
  spriteUrl: string | null;
  nickname: string | null;
  status: string;
  isShiny: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PublicCollectionEntry {
  return {
    id: entry.id,
    pokemonId: entry.pokemonId,
    pokemonName: entry.pokemonName,
    spriteUrl: entry.spriteUrl,
    nickname: entry.nickname,
    status: entry.status as PublicCollectionEntry['status'],
    isShiny: entry.isShiny,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export class TradeService {
  constructor(
    private readonly trades: TradeRepository,
    private readonly users: UserRepository,
    private readonly collection: CollectionRepository,
  ) {}

  async listTrainers(userId: string, search?: string): Promise<TrainerSummary[]> {
    const rows = await this.users.searchExcluding(userId, search);
    return rows.map((row) => ({
      id: row.id,
      displayName: row.displayName,
      collectionCount: row._count.collection,
    }));
  }

  async listTrainerCollection(userId: string): Promise<PublicCollectionEntry[]> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError('Trainer not found');
    const entries = await this.collection.findByUserId(userId);
    return entries.map(toPublicEntry);
  }

  async list(userId: string): Promise<Trade[]> {
    const trades = await this.trades.findForUser(userId);
    return trades.map(toTradeDto);
  }

  async create(userId: string, input: CreateTradeInput): Promise<Trade> {
    if (input.recipientId === userId) {
      throw new BadRequestError('You cannot trade with yourself');
    }
    if (input.offeredEntryId === input.requestedEntryId) {
      throw new BadRequestError('Offered and requested Pokémon must be different');
    }

    const recipient = await this.users.findById(input.recipientId);
    if (!recipient) throw new NotFoundError('Trainer not found');

    const offered = await this.collection.findById(input.offeredEntryId);
    const requested = await this.collection.findById(input.requestedEntryId);
    if (!offered || !requested) throw new NotFoundError('Collection entry not found');
    if (offered.userId !== userId) {
      throw new ForbiddenError('You can only offer Pokémon from your collection');
    }
    if (requested.userId !== input.recipientId) {
      throw new BadRequestError('Requested Pokémon does not belong to that trainer');
    }
    if (offered.status === 'wishlist' || requested.status === 'wishlist') {
      throw new BadRequestError('Wishlist Pokémon cannot be traded');
    }

    if (offered.pokemonId === requested.pokemonId && offered.isShiny === requested.isShiny) {
      throw new ConflictError('Cannot trade the same species in the same shiny form');
    }

    const initiatorWouldGain = await this.collection.findByUserPokemonAndShiny(
      userId,
      requested.pokemonId,
      requested.isShiny,
    );
    if (initiatorWouldGain) {
      throw new ConflictError('You already have that Pokémon in that form');
    }
    const recipientWouldGain = await this.collection.findByUserPokemonAndShiny(
      input.recipientId,
      offered.pokemonId,
      offered.isShiny,
    );
    if (recipientWouldGain) {
      throw new ConflictError('That trainer already has your offered Pokémon in that form');
    }

    const offeredPending = await this.trades.findPendingByEntryId(offered.id);
    const requestedPending = await this.trades.findPendingByEntryId(requested.id);
    if (offeredPending || requestedPending) {
      throw new ConflictError('One of these Pokémon is already in a pending trade');
    }

    const trade = await this.trades.create({
      initiatorId: userId,
      recipientId: input.recipientId,
      offeredEntryId: offered.id,
      requestedEntryId: requested.id,
      offeredPokemonId: offered.pokemonId,
      offeredPokemonName: offered.pokemonName,
      offeredSpriteUrl: offered.spriteUrl,
      offeredNickname: offered.nickname,
      offeredIsShiny: offered.isShiny,
      requestedPokemonId: requested.pokemonId,
      requestedPokemonName: requested.pokemonName,
      requestedSpriteUrl: requested.spriteUrl,
      requestedNickname: requested.nickname,
      requestedIsShiny: requested.isShiny,
    });

    return toTradeDto(trade);
  }

  async accept(userId: string, tradeId: string): Promise<Trade> {
    const trade = await this.requireTrade(tradeId);
    if (trade.recipientId !== userId) {
      throw new ForbiddenError('Only the recipient can accept this trade');
    }
    this.requirePending(trade);

    if (!trade.offeredEntryId || !trade.requestedEntryId) {
      throw new ConflictError('One of the Pokémon is no longer available');
    }

    const offered = await this.collection.findById(trade.offeredEntryId);
    const requested = await this.collection.findById(trade.requestedEntryId);
    if (!offered || !requested) {
      throw new ConflictError('One of the Pokémon is no longer available');
    }
    if (offered.userId !== trade.initiatorId || requested.userId !== trade.recipientId) {
      throw new ConflictError('Ownership changed; this trade can no longer be completed');
    }

    const initiatorHasRequested = await this.collection.findByUserPokemonAndShiny(
      trade.initiatorId,
      requested.pokemonId,
      requested.isShiny,
    );
    if (initiatorHasRequested) {
      throw new ConflictError('The initiator already has that Pokémon in that form');
    }
    const recipientHasOffered = await this.collection.findByUserPokemonAndShiny(
      trade.recipientId,
      offered.pokemonId,
      offered.isShiny,
    );
    if (recipientHasOffered) {
      throw new ConflictError('You already have the offered Pokémon in that form');
    }

    const updated = await this.trades.acceptSwap({
      tradeId: trade.id,
      offeredEntryId: offered.id,
      requestedEntryId: requested.id,
      initiatorId: trade.initiatorId,
      recipientId: trade.recipientId,
    });
    return toTradeDto(updated);
  }

  async reject(userId: string, tradeId: string): Promise<Trade> {
    const trade = await this.requireTrade(tradeId);
    if (trade.recipientId !== userId) {
      throw new ForbiddenError('Only the recipient can reject this trade');
    }
    this.requirePending(trade);
    return toTradeDto(await this.trades.updateStatus(trade.id, 'rejected'));
  }

  async cancel(userId: string, tradeId: string): Promise<Trade> {
    const trade = await this.requireTrade(tradeId);
    if (trade.initiatorId !== userId) {
      throw new ForbiddenError('Only the initiator can cancel this trade');
    }
    this.requirePending(trade);
    return toTradeDto(await this.trades.updateStatus(trade.id, 'cancelled'));
  }

  private async requireTrade(tradeId: string): Promise<TradeRecord> {
    const trade = await this.trades.findById(tradeId);
    if (!trade) throw new NotFoundError('Trade not found');
    return trade;
  }

  private requirePending(trade: TradeRecord): void {
    if (trade.status !== 'pending') {
      throw new ConflictError('This trade is no longer pending');
    }
  }
}
