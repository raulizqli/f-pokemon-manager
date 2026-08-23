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
}

export interface UpdateCollectionData {
  nickname?: string | null;
  notes?: string | null;
  status?: string;
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

  findByUserAndPokemon(userId: string, pokemonId: number): Promise<CollectionEntry | null> {
    return prisma.collectionEntry.findUnique({
      where: { userId_pokemonId: { userId, pokemonId } },
    });
  }

  create(data: CreateCollectionData): Promise<CollectionEntry> {
    return prisma.collectionEntry.create({ data });
  }

  update(id: string, data: UpdateCollectionData): Promise<CollectionEntry> {
    return prisma.collectionEntry.update({ where: { id }, data });
  }

  delete(id: string): Promise<CollectionEntry> {
    return prisma.collectionEntry.delete({ where: { id } });
  }

  async getStats(userId: string): Promise<{ total: number; byStatus: Record<string, number> }> {
    const entries = await prisma.collectionEntry.findMany({
      where: { userId },
      select: { status: true },
    });

    const byStatus: Record<string, number> = {};
    for (const entry of entries) {
      byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    }

    return { total: entries.length, byStatus };
  }
}
