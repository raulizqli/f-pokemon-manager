import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Env } from '../../config/env.js';
import type { CollectionRepository } from '../collection/collectionRepository.js';
import type { PokeApiClient } from '../../lib/pokeApiClient.js';
import { QuotaExceededError, ServiceUnavailableError } from '../../lib/errors.js';
import { AiService } from './aiService.js';

const baseEnv: Env = {
  NODE_ENV: 'test',
  PORT: 4000,
  DATABASE_URL: 'postgresql://pokedex:pokedex@localhost:5432/pokedex',
  JWT_ACCESS_SECRET: 'test-access-secret-min-16',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'http://localhost:5177',
  POKEAPI_BASE_URL: 'https://pokeapi.co/api/v2',
  POKEAPI_CACHE_TTL_MS: 600_000,
  OPENAI_MODEL: 'gpt-4o-mini',
  GEMINI_MODEL: 'gemini-flash-latest',
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function createService(env: Partial<Env> = {}) {
  const collectionRepo = {
    findByUserId: vi.fn().mockResolvedValue([{ pokemonId: 1, pokemonName: 'bulbasaur' }]),
    getStats: vi.fn().mockResolvedValue({
      total: 1,
      byStatus: { caught: 1 },
      shinyCount: 0,
    }),
  } as unknown as CollectionRepository;

  const pokeApi = {
    getPokemon: vi.fn().mockResolvedValue({ types: ['grass'] }),
  } as unknown as PokeApiClient;

  return new AiService({ ...baseEnv, ...env }, collectionRepo, pokeApi);
}

describe('AiService Gemini → OpenAI fallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses Gemini first when both keys are set', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"insights":"Try a Fire type.","recommendations":["Charmander","Vulpix","Growlithe"]}',
                },
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createService({
      OPENAI_API_KEY: 'openai-key',
      GEMINI_API_KEY: 'gemini-key',
    }).getInsights('user-1');

    expect(result.enabled).toBe(true);
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-flash-latest');
    expect(result.insights).toBe('Try a Fire type.');
    expect(String(fetchMock.mock.calls[0][0])).toContain('generativelanguage.googleapis.com');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('switches to OpenAI when all Gemini models fail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { message: 'RESOURCE_EXHAUSTED', status: 'RESOURCE_EXHAUSTED' } },
          false,
          429,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: { message: 'high demand' } }, false, 503),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          choices: [
            {
              message: {
                content: '{"insights":"Nice start.","recommendations":["Pikachu","Eevee","Squirtle"]}',
              },
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createService({
      OPENAI_API_KEY: 'openai-key',
      GEMINI_API_KEY: 'gemini-key',
      GEMINI_MODEL: 'gemini-flash-latest',
    }).getInsights('user-1');

    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.insights).toBe('Nice start.');
    expect(result.warnings).toEqual([{ code: 'QUOTA_EXCEEDED', provider: 'gemini' }]);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('api.openai.com');
  });

  it('tries the next Gemini model when the preferred one fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'boom' } }, false, 500))
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Here you go:\n{"insights":"Add Water types.","recommendations":["Squirtle","Totodile","Mudkip"]}',
                  },
                ],
              },
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createService({
      GEMINI_API_KEY: 'gemini-key',
      GEMINI_MODEL: 'broken-model',
    }).getInsights('user-1');

    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-flash-latest');
    expect(result.insights).toBe('Add Water types.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not call OpenAI when Gemini succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"insights":"Nice start.","recommendations":["Pikachu","Eevee","Squirtle"]}',
                },
              ],
            },
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createService({
      OPENAI_API_KEY: 'openai-key',
      GEMINI_API_KEY: 'gemini-key',
    }).getInsights('user-1');

    expect(result.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('generativelanguage.googleapis.com');
  });

  it('throws quota when Gemini is over quota and OpenAI is not configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: { message: 'RESOURCE_EXHAUSTED', status: 'RESOURCE_EXHAUSTED' } },
          false,
          429,
        ),
      ),
    );

    await expect(
      createService({ GEMINI_API_KEY: 'gemini-key' }).getInsights('user-1'),
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it('throws when Gemini fails and OpenAI is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 500)));

    await expect(
      createService({ GEMINI_API_KEY: 'gemini-key' }).getInsights('user-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
