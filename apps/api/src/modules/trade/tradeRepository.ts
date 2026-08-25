import { Prisma, type Trade, type User } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { isUniqueConstraintError } from '../../lib/prismaErrors.js';

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
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "CollectionEntry"
        WHERE id IN (${Prisma.join([data.offeredEntryId, data.requestedEntryId])})
        FOR UPDATE
      `;

      const pending = await tx.trade.findFirst({
        where: {
          status: 'pending',
          OR: [
            { offeredEntryId: data.offeredEntryId },
            { requestedEntryId: data.offeredEntryId },
            { offeredEntryId: data.requestedEntryId },
            { requestedEntryId: data.requestedEntryId },
          ],
        },
      });
      if (pending) {
        throw new ConflictError('One of these Pokémon is already in a pending trade');
      }

      try {
        return await tx.trade.create({ data, include: tradeInclude });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ConflictError('One of these Pokémon is already in a pending trade');
        }
        throw error;
      }
    });
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

  acceptSwap(tradeId: string): Promise<TradeRecord> {
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{
          id: string;
          status: string;
          initiatorId: string;
          recipientId: string;
          offeredEntryId: string | null;
          requestedEntryId: string | null;
        }>
      >`
        SELECT id, status, "initiatorId", "recipientId", "offeredEntryId", "requestedEntryId"
        FROM "Trade"
        WHERE id = ${tradeId}
        FOR UPDATE
      `;

      const trade = locked[0];
      if (!trade) throw new NotFoundError('Trade not found');
      if (trade.status !== 'pending') {
        throw new ConflictError('This trade is no longer pending');
      }
      if (!trade.offeredEntryId || !trade.requestedEntryId) {
        throw new ConflictError('One of the Pokémon is no longer available');
      }

      await tx.$queryRaw`
        SELECT id FROM "CollectionEntry"
        WHERE id IN (${Prisma.join([trade.offeredEntryId, trade.requestedEntryId])})
        FOR UPDATE
      `;

      const offered = await tx.collectionEntry.findUnique({ where: { id: trade.offeredEntryId } });
      const requested = await tx.collectionEntry.findUnique({
        where: { id: trade.requestedEntryId },
      });
      if (!offered || !requested) {
        throw new ConflictError('One of the Pokémon is no longer available');
      }
      if (offered.userId !== trade.initiatorId || requested.userId !== trade.recipientId) {
        throw new ConflictError('Ownership changed; this trade can no longer be completed');
      }
      if (offered.status === 'wishlist' || requested.status === 'wishlist') {
        throw new ConflictError('Wishlist Pokémon cannot be traded');
      }

      const initiatorHasRequested = await tx.collectionEntry.findUnique({
        where: {
          userId_pokemonId_isShiny: {
            userId: trade.initiatorId,
            pokemonId: requested.pokemonId,
            isShiny: requested.isShiny,
          },
        },
      });
      if (initiatorHasRequested) {
        throw new ConflictError('The initiator already has that Pokémon in that form');
      }

      const recipientHasOffered = await tx.collectionEntry.findUnique({
        where: {
          userId_pokemonId_isShiny: {
            userId: trade.recipientId,
            pokemonId: offered.pokemonId,
            isShiny: offered.isShiny,
          },
        },
      });
      if (recipientHasOffered) {
        throw new ConflictError('You already have the offered Pokémon in that form');
      }

      try {
        const offeredMoved = await tx.collectionEntry.updateMany({
          where: { id: offered.id, userId: trade.initiatorId },
          data: { userId: trade.recipientId, status: 'caught' },
        });
        if (offeredMoved.count !== 1) {
          throw new ConflictError('Ownership changed; this trade can no longer be completed');
        }

        const requestedMoved = await tx.collectionEntry.updateMany({
          where: { id: requested.id, userId: trade.recipientId },
          data: { userId: trade.initiatorId, status: 'caught' },
        });
        if (requestedMoved.count !== 1) {
          throw new ConflictError('Ownership changed; this trade can no longer be completed');
        }

        return await tx.trade.update({
          where: { id: tradeId },
          data: { status: 'accepted' },
          include: tradeInclude,
        });
      } catch (error) {
        if (error instanceof ConflictError) throw error;
        if (isUniqueConstraintError(error)) {
          throw new ConflictError('Trade would create a duplicate Pokémon ownership');
        }
        throw error;
      }
    });
  }
}
