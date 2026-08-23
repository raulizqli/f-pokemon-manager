import { z } from 'zod';

export const collectionStatusSchema = z.enum(['caught', 'wishlist', 'favorite']);

export const createCollectionEntrySchema = z.object({
  pokemonId: z.number().int().positive(),
  nickname: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  status: collectionStatusSchema.default('caught'),
});

export const updateCollectionEntrySchema = z.object({
  nickname: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  status: collectionStatusSchema.optional(),
});

export const collectionEntrySchema = z.object({
  id: z.string(),
  pokemonId: z.number(),
  pokemonName: z.string(),
  spriteUrl: z.string().nullable(),
  nickname: z.string().nullable(),
  notes: z.string().nullable(),
  status: collectionStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const collectionStatsSchema = z.object({
  total: z.number(),
  byStatus: z.record(z.number()),
});

export type CollectionStatus = z.infer<typeof collectionStatusSchema>;
export type CreateCollectionEntryInput = z.infer<typeof createCollectionEntrySchema>;
export type UpdateCollectionEntryInput = z.infer<typeof updateCollectionEntrySchema>;
export type CollectionEntry = z.infer<typeof collectionEntrySchema>;
export type CollectionStats = z.infer<typeof collectionStatsSchema>;
