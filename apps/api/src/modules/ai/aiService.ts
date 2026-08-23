import type { AiInsightsResponse } from '@pokedex/shared';
import type { Env } from '../../config/env.js';
import { ServiceUnavailableError } from '../../lib/errors.js';
import type { CollectionRepository } from '../collection/collectionRepository.js';
import { PokeApiClient } from '../../lib/pokeApiClient.js';

export class AiService {
  constructor(
    private readonly env: Env,
    private readonly collectionRepo: CollectionRepository,
    private readonly pokeApi: PokeApiClient,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.env.OPENAI_API_KEY);
  }

  async getInsights(userId: string): Promise<AiInsightsResponse> {
    if (!this.env.OPENAI_API_KEY) {
      return { enabled: false, insights: null, recommendations: [] };
    }

    const entries = await this.collectionRepo.findByUserId(userId);
    const stats = await this.collectionRepo.getStats(userId);

    if (entries.length === 0) {
      return {
        enabled: true,
        insights: 'Your collection is empty. Start by exploring Pokémon and adding your favorites!',
        recommendations: ['Pikachu', 'Charizard', 'Bulbasaur', 'Eevee'],
      };
    }

    const typeCounts: Record<string, number> = {};
    for (const entry of entries.slice(0, 20)) {
      try {
        const detail = await this.pokeApi.getPokemon(entry.pokemonId);
        for (const type of detail.types) {
          typeCounts[type] = (typeCounts[type] ?? 0) + 1;
        }
      } catch {
        // Skip failed lookups
      }
    }

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    const prompt = `You are a Pokémon collection assistant. The user has ${stats.total} Pokémon.
Status breakdown: ${JSON.stringify(stats.byStatus)}.
Top types in collection: ${topTypes.join(', ') || 'unknown'}.
Sample Pokémon: ${entries.slice(0, 8).map((e) => e.pokemonName).join(', ')}.

Provide a brief, friendly analysis (2-3 sentences) and exactly 3 Pokémon name recommendations to diversify their collection. Respond in JSON: {"insights":"...","recommendations":["name1","name2","name3"]}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.env.OPENAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new ServiceUnavailableError('AI service unavailable');
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new ServiceUnavailableError('Empty AI response');
      }

      const parsed = JSON.parse(content) as { insights?: string; recommendations?: string[] };
      return {
        enabled: true,
        insights: parsed.insights ?? null,
        recommendations: parsed.recommendations ?? [],
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableError) throw error;
      throw new ServiceUnavailableError('Failed to generate AI insights');
    }
  }
}
