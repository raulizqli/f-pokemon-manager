import { z } from 'zod';

export const pokemonListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().optional(),
});

export const pokemonSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  spriteUrl: z.string().nullable(),
  types: z.array(z.string()),
});

export const pokemonListResponseSchema = z.object({
  count: z.number(),
  nextOffset: z.number().nullable(),
  previousOffset: z.number().nullable(),
  results: z.array(pokemonSummarySchema),
});

export const pokemonStatSchema = z.object({
  name: z.string(),
  baseStat: z.number(),
});

export const pokemonDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  height: z.number(),
  weight: z.number(),
  spriteUrl: z.string().nullable(),
  spriteShinyUrl: z.string().nullable(),
  types: z.array(z.string()),
  abilities: z.array(z.string()),
  stats: z.array(pokemonStatSchema),
});

export type PokemonListQuery = z.infer<typeof pokemonListQuerySchema>;
export type PokemonSummary = z.infer<typeof pokemonSummarySchema>;
export type PokemonListResponse = z.infer<typeof pokemonListResponseSchema>;
export type PokemonDetail = z.infer<typeof pokemonDetailSchema>;
