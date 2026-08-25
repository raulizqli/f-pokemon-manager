import type {
  CollectionEntry,
  CollectionStats,
  CreateCollectionEntryInput,
  EvolveCollectionEntryInput,
  UpdateCollectionEntryInput,
} from '@pokedex/shared';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js';
import { PokeApiClient } from '../../lib/pokeApiClient.js';
import { TradeRepository } from '../trade/tradeRepository.js';
import { CollectionRepository } from './collectionRepository.js';

export const SHINY_CATCH_RATE = 0.3;

function toDto(entry: {
  id: string;
  pokemonId: number;
  pokemonName: string;
  spriteUrl: string | null;
  nickname: string | null;
  notes: string | null;
  status: string;
  isShiny: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CollectionEntry {
  return {
    id: entry.id,
    pokemonId: entry.pokemonId,
    pokemonName: entry.pokemonName,
    spriteUrl: entry.spriteUrl,
    nickname: entry.nickname,
    notes: entry.notes,
    status: entry.status as CollectionEntry['status'],
    isShiny: entry.isShiny,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export class CollectionService {
  constructor(
    private readonly repository: CollectionRepository,
    private readonly pokeApi: PokeApiClient,
    private readonly trades: TradeRepository,
  ) {}

  async list(userId: string, status?: string): Promise<CollectionEntry[]> {
    const entries = await this.repository.findByUserId(userId, status);
    return entries.map(toDto);
  }

  async create(userId: string, input: CreateCollectionEntryInput): Promise<CollectionEntry> {
    const isShiny = Math.random() < SHINY_CATCH_RATE;
    const existing = await this.repository.findByUserPokemonAndShiny(
      userId,
      input.pokemonId,
      isShiny,
    );
    if (existing) {
      throw new ConflictError(
        isShiny
          ? 'You already have a shiny of this Pokémon'
          : 'You already have this Pokémon (non-shiny)',
      );
    }

    const pokemon = await this.pokeApi.getPokemon(input.pokemonId);
    const spriteUrl = isShiny
      ? (pokemon.spriteShinyUrl ?? pokemon.spriteUrl)
      : pokemon.spriteUrl;

    const entry = await this.repository.create({
      userId,
      pokemonId: pokemon.id,
      pokemonName: pokemon.name,
      spriteUrl,
      nickname: input.nickname,
      notes: input.notes,
      status: input.status,
      isShiny,
    });

    return toDto(entry);
  }

  async update(userId: string, id: string, input: UpdateCollectionEntryInput): Promise<CollectionEntry> {
    const entry = await this.requireOwned(userId, id);
    const updated = await this.repository.update(entry.id, input);
    return toDto(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entry = await this.requireOwned(userId, id);
    await this.assertNotInPendingTrade(entry.id);
    await this.repository.delete(entry.id);
  }

  async evolve(
    userId: string,
    id: string,
    input: EvolveCollectionEntryInput,
  ): Promise<CollectionEntry> {
    const entry = await this.requireOwned(userId, id);
    await this.assertNotInPendingTrade(entry.id);

    const targets = await this.pokeApi.getNextEvolutions(entry.pokemonId);
    if (targets.length === 0) {
      throw new BadRequestError('This Pokémon cannot evolve');
    }

    let target = targets[0];
    if (targets.length > 1) {
      if (!input.targetPokemonId) {
        throw new BadRequestError('Choose an evolution');
      }
      const match = targets.find((item) => item.id === input.targetPokemonId);
      if (!match) {
        throw new BadRequestError('Invalid evolution target');
      }
      target = match;
    } else if (input.targetPokemonId && input.targetPokemonId !== target.id) {
      throw new BadRequestError('Invalid evolution target');
    }

    const already = await this.repository.findByUserPokemonAndShiny(
      userId,
      target.id,
      entry.isShiny,
    );
    if (already) {
      throw new ConflictError('You already have this evolved form');
    }

    const pokemon = await this.pokeApi.getPokemon(target.id);
    const spriteUrl = entry.isShiny
      ? (pokemon.spriteShinyUrl ?? pokemon.spriteUrl)
      : pokemon.spriteUrl;

    const updated = await this.repository.updatePokemon(entry.id, {
      pokemonId: pokemon.id,
      pokemonName: pokemon.name,
      spriteUrl,
    });
    return toDto(updated);
  }

  getStats(userId: string): Promise<CollectionStats> {
    return this.repository.getStats(userId);
  }

  private async requireOwned(userId: string, id: string) {
    const entry = await this.repository.findById(id);
    if (!entry) throw new NotFoundError('Collection entry not found');
    if (entry.userId !== userId) throw new UnauthorizedError('Not allowed to update this entry');
    return entry;
  }

  private async assertNotInPendingTrade(entryId: string): Promise<void> {
    const pending = await this.trades.findPendingByEntryId(entryId);
    if (pending) {
      throw new ConflictError('This Pokémon is in a pending trade');
    }
  }
}
