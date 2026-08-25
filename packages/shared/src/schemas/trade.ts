import { z } from 'zod';
import { collectionStatusSchema } from './collection.js';

export const tradeStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'cancelled']);

export const trainerSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  collectionCount: z.number(),
});

export const trainerListQuerySchema = z.object({
  search: z.string().trim().max(50).optional(),
});

export const publicCollectionEntrySchema = z.object({
  id: z.string(),
  pokemonId: z.number(),
  pokemonName: z.string(),
  spriteUrl: z.string().nullable(),
  nickname: z.string().nullable(),
  status: collectionStatusSchema,
  isShiny: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const tradePokemonSnapshotSchema = z.object({
  entryId: z.string().nullable(),
  pokemonId: z.number(),
  pokemonName: z.string(),
  spriteUrl: z.string().nullable(),
  nickname: z.string().nullable(),
  isShiny: z.boolean(),
});

export const createTradeSchema = z.object({
  recipientId: z.string().min(1),
  offeredEntryId: z.string().min(1),
  requestedEntryId: z.string().min(1),
});

export const tradePartySchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

export const tradeSchema = z.object({
  id: z.string(),
  status: tradeStatusSchema,
  initiator: tradePartySchema,
  recipient: tradePartySchema,
  offered: tradePokemonSnapshotSchema,
  requested: tradePokemonSnapshotSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TradeStatus = z.infer<typeof tradeStatusSchema>;
export type TrainerSummary = z.infer<typeof trainerSummarySchema>;
export type TrainerListQuery = z.infer<typeof trainerListQuerySchema>;
export type PublicCollectionEntry = z.infer<typeof publicCollectionEntrySchema>;
export type TradePokemonSnapshot = z.infer<typeof tradePokemonSnapshotSchema>;
export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type Trade = z.infer<typeof tradeSchema>;
