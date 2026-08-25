import type { Trade, User } from '@prisma/client';
import { prisma } from '../../config/database.js';

const tradeInclude = {
  initiator: { select: { id: true, displayName: true } },
  recipient: { select: { id: true, displayName: true } },
} as const;

export type TradeRecord = Trade & {
  initiator: Pick<User, 'id' | 'displayName'>;
  recipient: Pick<User, 'id' | 'displayName'>;
};

export interface CreateTradeData {
  initiatorId: string;
  recipientId: string;
  offeredEntryId: string;
  requestedEntryId: string;
  offeredPokemonId: number;
  offeredPokemonName: string;
  offeredSpriteUrl: string | null;
  offeredNickname: string | null;
  offeredIsShiny: boolean;
  requestedPokemonId: number;
  requestedPokemonName: string;
  requestedSpriteUrl: string | null;
  requestedNickname: string | null;
  requestedIsShiny: boolean;
}

export class TradeRepository {
  create(data: CreateTradeData): Promise<TradeRecord> {
    return prisma.trade.create({ data, include: tradeInclude });
  }

  findById(id: string): Promise<TradeRecord | null> {
    return prisma.trade.findUnique({ where: { id }, include: tradeInclude });
  }

  findForUser(userId: string): Promise<TradeRecord[]> {
    return prisma.trade.findMany({
      where: { OR: [{ initiatorId: userId }, { recipientId: userId }] },
      include: tradeInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findPendingByEntryId(entryId: string): Promise<Trade | null> {
    return prisma.trade.findFirst({
      where: {
        status: 'pending',
        OR: [{ offeredEntryId: entryId }, { requestedEntryId: entryId }],
      },
    });
  }

  updateStatus(id: string, status: string): Promise<TradeRecord> {
    return prisma.trade.update({ where: { id }, data: { status }, include: tradeInclude });
  }

  acceptSwap(params: {
    tradeId: string;
    offeredEntryId: string;
    requestedEntryId: string;
    initiatorId: string;
    recipientId: string;
  }): Promise<TradeRecord> {
    const { tradeId, offeredEntryId, requestedEntryId, initiatorId, recipientId } = params;
    return prisma.$transaction(async (tx) => {
      await tx.collectionEntry.update({
        where: { id: offeredEntryId },
        data: { userId: recipientId },
      });
      await tx.collectionEntry.update({
        where: { id: requestedEntryId },
        data: { userId: initiatorId },
      });
      return tx.trade.update({
        where: { id: tradeId },
        data: { status: 'accepted' },
        include: tradeInclude,
      });
    });
  }
}
