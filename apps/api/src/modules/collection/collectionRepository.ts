import type { CollectionEntry } from '@prisma/client';
import { prisma } from '../../config/database.js';

export interface CreateCollectionData {
  userId: string;
  pokemonId: number;
  pokemonName: string;
  spriteUrl: string | null;
  nickname?: string;
  notes?: string;
  status: string;
  isShiny: boolean;
}

export interface UpdateCollectionData {
  nickname?: string | null;
  notes?: string | null;
  status?: string;
}

export interface EvolveCollectionData {
  pokemonId: number;
  pokemonName: string;
  spriteUrl: string | null;
}

export class CollectionRepository {
  findByUserId(userId: string, status?: string): Promise<CollectionEntry[]> {
    return prisma.collectionEntry.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<CollectionEntry | null> {
    return prisma.collectionEntry.findUnique({ where: { id } });
  }

  findByUserPokemonAndShiny(
    userId: string,
    pokemonId: number,
    isShiny: boolean,
  ): Promise<CollectionEntry | null> {
    return prisma.collectionEntry.findUnique({
      where: { userId_pokemonId_isShiny: { userId, pokemonId, isShiny } },
    });
  }

  create(data: CreateCollectionData): Promise<CollectionEntry> {
    return prisma.collectionEntry.create({ data });
  }

  update(id: string, data: UpdateCollectionData): Promise<CollectionEntry> {
    return prisma.collectionEntry.update({ where: { id }, data });
  }

  updatePokemon(id: string, data: EvolveCollectionData): Promise<CollectionEntry> {
    return prisma.collectionEntry.update({ where: { id }, data });
  }

  delete(id: string): Promise<CollectionEntry> {
    return prisma.collectionEntry.delete({ where: { id } });
  }

  async getStats(
    userId: string,
  ): Promise<{ total: number; byStatus: Record<string, number>; shinyCount: number }> {
    const entries = await prisma.collectionEntry.findMany({
      where: { userId },
      select: { status: true, isShiny: true },
    });

    const byStatus: Record<string, number> = {};
    let shinyCount = 0;
    for (const entry of entries) {
      byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
      if (entry.isShiny) shinyCount += 1;
    }

    return { total: entries.length, byStatus, shinyCount };
  }
}
