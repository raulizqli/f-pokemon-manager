import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, ServiceUnavailableError } from './errors.js';
import { PokeApiClient } from './pokeApiClient.js';

describe('PokeApiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps upstream 404 to NotFoundError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    );

    const client = new PokeApiClient('https://pokeapi.co/api/v2', 60_000);
    await expect(client.getPokemon('missingno')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('maps network failures to ServiceUnavailableError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const client = new PokeApiClient('https://pokeapi.co/api/v2', 60_000);
    await expect(client.getPokemon(1)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
