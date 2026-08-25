import type { AiInsightsResponse, AiProvider, AiWarning } from '@pokedex/shared';
import type { Env } from '../../config/env.js';
import { mapWithConcurrency } from '../../lib/concurrency.js';
import { ServiceUnavailableError } from '../../lib/errors.js';
import type { CollectionRepository } from '../collection/collectionRepository.js';
import { PokeApiClient } from '../../lib/pokeApiClient.js';
import { buildLocalInsights, LOCAL_INSIGHTS_MODEL } from './aiLocalInsights.js';

type InsightsPayload = {
  insights: string | null;
  recommendations: string[];
};

type ProviderErrorBody = {
  error?: { message?: string; code?: string; status?: string; type?: string };
};

const GEMINI_FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3-flash-preview'] as const;

function parseInsightsPayload(content: string): InsightsPayload {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: { insights?: string; recommendations?: string[] };
  try {
    parsed = JSON.parse(trimmed) as { insights?: string; recommendations?: string[] };
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new ServiceUnavailableError('Empty AI response');
    parsed = JSON.parse(match[0]) as { insights?: string; recommendations?: string[] };
  }
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
    message.includes('resource exhausted') ||
    (status === 429 && (message.includes('quota') || code === 'RESOURCE_EXHAUSTED'))
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
    throw new ServiceUnavailableError(`${providerLabel} quota exceeded`);
  }

  const detail = body.error?.message ?? body.error?.code ?? `HTTP ${response.status}`;
  throw new ServiceUnavailableError(`${providerLabel} unavailable: ${detail}`);
}

function geminiModelCandidates(preferred?: string): string[] {
  const models = [preferred, ...GEMINI_FALLBACK_MODELS].filter(
    (model): model is string => Boolean(model?.trim()),
  );
  return [...new Set(models)];
}

function providerFromLabel(label: string): AiProvider {
  return label === 'OpenAI' ? 'openai' : 'gemini';
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
    const sample = entries.slice(0, 20);
    const details = await mapWithConcurrency(sample, 5, async (entry) => {
      try {
        return await this.pokeApi.getPokemon(entry.pokemonId);
      } catch {
        return null;
      }
    });
    for (const detail of details) {
      if (!detail) continue;
      for (const type of detail.types) {
        typeCounts[type] = (typeCounts[type] ?? 0) + 1;
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

Provide a brief, friendly analysis (2-3 sentences) and exactly 3 Pokémon name recommendations to diversify their collection. Respond ONLY with valid JSON (no markdown): {"insights":"...","recommendations":["name1","name2","name3"]}`;

    const warnings: AiWarning[] = [];
    let providersAttempted = false;

    if (this.env.GEMINI_API_KEY) {
      providersAttempted = true;
      const models = geminiModelCandidates(this.env.GEMINI_MODEL);
      for (const model of models) {
        try {
          console.info(`[ai] Using Gemini model ${model}`);
          return await this.completeWithProvider(
            'gemini',
            model,
            () => this.completeWithGemini(prompt, model),
            warnings,
          );
        } catch (error) {
          console.warn(
            `[ai] Gemini model ${model} failed`,
            error instanceof Error ? error.message : error,
          );
          this.recordProviderFailure('Gemini', error, warnings);
        }
      }
      if (this.env.OPENAI_API_KEY) {
        console.warn('[ai] Gemini failed — switching to OpenAI fallback');
      }
    }

    if (this.env.OPENAI_API_KEY) {
      providersAttempted = true;
      try {
        return await this.completeWithProvider(
          'openai',
          this.env.OPENAI_MODEL,
          () => this.completeWithOpenAi(prompt),
          warnings,
        );
      } catch (error) {
        console.warn('[ai] OpenAI failed', error instanceof Error ? error.message : error);
        this.recordProviderFailure('OpenAI', error, warnings);
      }
    }

    if (providersAttempted) {
      console.warn('[ai] All providers failed — returning local heuristic insights');
      return this.completeWithLocalFallback({
        stats,
        topTypes,
        sampleNames: entries.map((e) => e.pokemonName),
        warnings,
      });
    }

    throw new ServiceUnavailableError('Failed to generate AI insights');
  }

  private recordProviderFailure(
    providerLabel: string,
    error: unknown,
    warnings: AiWarning[],
  ): void {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('quota exceeded') || message.includes('resource exhausted')) {
      const provider = providerFromLabel(providerLabel);
      if (warnings.some((warning) => warning.provider === provider)) return;
      warnings.push({
        code: 'QUOTA_EXCEEDED',
        provider,
      });
    }
  }

  private completeWithLocalFallback(params: {
    stats: { total: number; byStatus: Record<string, number> };
    topTypes: string[];
    sampleNames: string[];
    warnings: AiWarning[];
  }): AiInsightsResponse {
    const local = buildLocalInsights({
      total: params.stats.total,
      byStatus: params.stats.byStatus,
      topTypes: params.topTypes,
      sampleNames: params.sampleNames,
    });
    return {
      enabled: true,
      provider: null,
      model: LOCAL_INSIGHTS_MODEL,
      insights: local.insights,
      recommendations: local.recommendations,
      ...(params.warnings.length > 0 ? { warnings: params.warnings } : {}),
    };
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

  private async completeWithGemini(prompt: string, modelName: string): Promise<InsightsPayload> {
    const model = encodeURIComponent(modelName);
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
            maxOutputTokens: 512,
          },
        }),
      },
    );

    if (!response.ok) {
      await readProviderError(response, 'Gemini');
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };
    const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    if (!content.trim()) {
      throw new ServiceUnavailableError(
        `Empty AI response (${data.candidates?.[0]?.finishReason ?? 'no content'})`,
      );
    }

    return parseInsightsPayload(content);
  }
}
