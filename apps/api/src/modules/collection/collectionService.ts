import type {
  CollectionEntry,
  CollectionStats,
  CreateCollectionEntryInput,
  UpdateCollectionEntryInput,
} from '@pokedex/shared';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../lib/errors.js';
import { PokeApiClient } from '../../lib/pokeApiClient.js';
import { CollectionRepository } from './collectionRepository.js';

function toDto(entry: {
  id: string;
  pokemonId: number;
  pokemonName: string;
  spriteUrl: string | null;
  nickname: string | null;
  notes: string | null;
  status: string;
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
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export class CollectionService {
  constructor(
    private readonly repository: CollectionRepository,
    private readonly pokeApi: PokeApiClient,
  ) {}

  async list(userId: string, status?: string): Promise<CollectionEntry[]> {
    const entries = await this.repository.findByUserId(userId, status);
    return entries.map(toDto);
  }

  async create(userId: string, input: CreateCollectionEntryInput): Promise<CollectionEntry> {
    const existing = await this.repository.findByUserAndPokemon(userId, input.pokemonId);
    if (existing) {
      throw new ConflictError('This Pokémon is already in your collection');
    }

    const pokemon = await this.pokeApi.getPokemon(input.pokemonId);
    const entry = await this.repository.create({
      userId,
      pokemonId: pokemon.id,
      pokemonName: pokemon.name,
      spriteUrl: pokemon.spriteUrl,
      nickname: input.nickname,
      notes: input.notes,
      status: input.status,
    });

    return toDto(entry);
  }

  async update(userId: string, id: string, input: UpdateCollectionEntryInput): Promise<CollectionEntry> {
    const entry = await this.repository.findById(id);
    if (!entry) throw new NotFoundError('Collection entry not found');
    if (entry.userId !== userId) throw new UnauthorizedError('Not allowed to update this entry');

    const updated = await this.repository.update(id, input);
    return toDto(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const entry = await this.repository.findById(id);
    if (!entry) throw new NotFoundError('Collection entry not found');
    if (entry.userId !== userId) throw new UnauthorizedError('Not allowed to delete this entry');
    await this.repository.delete(id);
  }

  getStats(userId: string): Promise<CollectionStats> {
    return this.repository.getStats(userId);
  }
}
