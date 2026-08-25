import type { AiInsightsResponse, AiProvider, AiWarning } from '@pokedex/shared';
import type { Env } from '../../config/env.js';
import { QuotaExceededError, ServiceUnavailableError } from '../../lib/errors.js';
import type { CollectionRepository } from '../collection/collectionRepository.js';
import { PokeApiClient } from '../../lib/pokeApiClient.js';

type InsightsPayload = {
  insights: string | null;
  recommendations: string[];
};

type ProviderErrorBody = {
  error?: { message?: string; code?: string; status?: string; type?: string };
};

function parseInsightsPayload(content: string): InsightsPayload {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(trimmed) as { insights?: string; recommendations?: string[] };
  return {
    insights: parsed.insights ?? null,
    recommendations: parsed.recommendations ?? [],
  };
}

function isQuotaFailure(status: number, body: ProviderErrorBody): boolean {
  const code = String(body.error?.code ?? body.error?.status ?? body.error?.type ?? '');
  const message = String(body.error?.message ?? '').toLowerCase();
  return (
    code === 'insufficient_quota' ||
    code === 'RESOURCE_EXHAUSTED' ||
    message.includes('insufficient_quota') ||
    message.includes('exceeded your current quota') ||
    message.includes('quota exceeded') ||
    (status === 429 && message.includes('quota'))
  );
}

async function readProviderError(response: Response, providerLabel: string): Promise<never> {
  let body: ProviderErrorBody = {};
  try {
    body = (await response.json()) as ProviderErrorBody;
  } catch {
    // Keep the status code when the body is not JSON.
  }

  if (isQuotaFailure(response.status, body)) {
    throw new QuotaExceededError(
      `${providerLabel} quota exceeded. Check your plan and billing details.`,
    );
  }

  const detail = body.error?.message ?? body.error?.code ?? `HTTP ${response.status}`;
  throw new ServiceUnavailableError(`${providerLabel} unavailable: ${detail}`);
}

export class AiService {
  constructor(
    private readonly env: Env,
    private readonly collectionRepo: CollectionRepository,
    private readonly pokeApi: PokeApiClient,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.env.OPENAI_API_KEY || this.env.GEMINI_API_KEY);
  }

  async getInsights(userId: string): Promise<AiInsightsResponse> {
    if (!this.isEnabled()) {
      return { enabled: false, insights: null, recommendations: [], provider: null, model: null };
    }

    const entries = await this.collectionRepo.findByUserId(userId);
    const stats = await this.collectionRepo.getStats(userId);

    if (entries.length === 0) {
      return {
        enabled: true,
        insights: 'Your collection is empty. Start by exploring Pokémon and adding your favorites!',
        recommendations: ['Pikachu', 'Charizard', 'Bulbasaur', 'Eevee'],
        provider: null,
        model: null,
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

    const warnings: AiWarning[] = [];
    let openaiError: unknown;

    if (this.env.OPENAI_API_KEY) {
      try {
        return await this.completeWithProvider('openai', this.env.OPENAI_MODEL, () =>
          this.completeWithOpenAi(prompt),
        );
      } catch (error) {
        openaiError = error;
        console.warn(
          '[ai] OpenAI insights failed, trying Gemini fallback',
          error instanceof Error ? error.message : error,
        );
        if (error instanceof QuotaExceededError) {
          warnings.push({ code: 'QUOTA_EXCEEDED', provider: 'openai' });
        }
        if (!this.env.GEMINI_API_KEY) {
          throw error instanceof QuotaExceededError || error instanceof ServiceUnavailableError
            ? error
            : new ServiceUnavailableError('Failed to generate AI insights');
        }
      }
    }

    if (this.env.GEMINI_API_KEY) {
      try {
        return await this.completeWithProvider(
          'gemini',
          this.env.GEMINI_MODEL,
          () => this.completeWithGemini(prompt),
          warnings,
        );
      } catch (error) {
        console.warn('[ai] Gemini insights failed', error instanceof Error ? error.message : error);
        if (openaiError instanceof QuotaExceededError) throw openaiError;
        if (error instanceof QuotaExceededError || error instanceof ServiceUnavailableError) throw error;
      }
    }

    throw new ServiceUnavailableError('Failed to generate AI insights');
  }

  private async completeWithProvider(
    provider: AiProvider,
    model: string,
    complete: () => Promise<InsightsPayload>,
    warnings: AiWarning[] = [],
  ): Promise<AiInsightsResponse> {
    const payload = await complete();
    return {
      enabled: true,
      provider,
      model,
      ...payload,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  private async completeWithOpenAi(prompt: string): Promise<InsightsPayload> {
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
      await readProviderError(response, 'OpenAI');
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new ServiceUnavailableError('Empty AI response');
    }

    return parseInsightsPayload(content);
  }

  private async completeWithGemini(prompt: string): Promise<InsightsPayload> {
    const model = encodeURIComponent(this.env.GEMINI_MODEL);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 300,
            responseSchema: {
              type: 'OBJECT',
              properties: {
                insights: { type: 'STRING' },
                recommendations: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['insights', 'recommendations'],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      await readProviderError(response, 'Gemini');
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
    if (!content) {
      throw new ServiceUnavailableError('Empty AI response');
    }

    return parseInsightsPayload(content);
  }
}
