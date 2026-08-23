import type { PokemonDetail, PokemonListResponse, PokemonSummary } from '@pokedex/shared';
import { ServiceUnavailableError } from './errors.js';
import { TtlCache } from './cache.js';

interface PokeApiListResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{ name: string; url: string }>;
}

interface PokeApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: { front_default: string | null };
    };
  };
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
}

export class PokeApiClient {
  private listCache: TtlCache<PokeApiListResult>;
  private detailCache: TtlCache<PokeApiPokemon>;

  constructor(
    private readonly baseUrl: string,
    ttlMs: number,
  ) {
    this.listCache = new TtlCache(ttlMs);
    this.detailCache = new TtlCache(ttlMs);
  }

  async listPokemon(limit: number, offset: number, search?: string): Promise<PokemonListResponse> {
    if (search) {
      return this.searchPokemon(search, limit, offset);
    }

    const cacheKey = `list:${limit}:${offset}`;
    const cached = this.listCache.get(cacheKey);
    const list = cached ?? await this.fetchList(limit, offset);
    if (!cached) this.listCache.set(cacheKey, list);

    const summaries = await Promise.all(
      list.results.map(async (item) => this.toSummary(item.name)),
    );

    return {
      count: list.count,
      nextOffset: list.next ? offset + limit : null,
      previousOffset: list.previous ? Math.max(0, offset - limit) : null,
      results: summaries,
    };
  }

  async getPokemon(idOrName: string | number): Promise<PokemonDetail> {
    const key = String(idOrName).toLowerCase();
    const cached = this.detailCache.get(key);
    const pokemon = cached ?? await this.fetchPokemon(key);
    if (!cached) this.detailCache.set(key, pokemon);
    return this.toDetail(pokemon);
  }

  private async searchPokemon(search: string, limit: number, offset: number): Promise<PokemonListResponse> {
    const allNames = await this.getAllNames();
    const normalized = search.toLowerCase();
    const filtered = allNames.filter((name) => name.includes(normalized));
    const page = filtered.slice(offset, offset + limit);

    const summaries = await Promise.all(page.map((name) => this.toSummary(name)));

    return {
      count: filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
      previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
      results: summaries,
    };
  }

  private allNamesCache: string[] | null = null;

  private async getAllNames(): Promise<string[]> {
    if (this.allNamesCache) return this.allNamesCache;

    const names: string[] = [];
    let offset = 0;
    const limit = 200;

    while (true) {
      const list = await this.fetchList(limit, offset);
      names.push(...list.results.map((r) => r.name));
      if (!list.next) break;
      offset += limit;
    }

    this.allNamesCache = names;
    return names;
  }

  private async fetchList(limit: number, offset: number): Promise<PokeApiListResult> {
    const url = `${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`;
    const response = await this.fetchJson<PokeApiListResult>(url);
    return response;
  }

  private async fetchPokemon(idOrName: string): Promise<PokeApiPokemon> {
    const url = `${this.baseUrl}/pokemon/${idOrName}`;
    return this.fetchJson<PokeApiPokemon>(url);
  }

  private async toSummary(name: string): Promise<PokemonSummary> {
    const pokemon = await this.fetchPokemon(name);
    return {
      id: pokemon.id,
      name: pokemon.name,
      spriteUrl: this.getSprite(pokemon),
      types: pokemon.types.map((t) => t.type.name),
    };
  }

  private toDetail(pokemon: PokeApiPokemon): PokemonDetail {
    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      spriteUrl: this.getSprite(pokemon),
      spriteShinyUrl: pokemon.sprites.front_default,
      types: pokemon.types.map((t) => t.type.name),
      abilities: pokemon.abilities.map((a) => a.ability.name),
      stats: pokemon.stats.map((s) => ({
        name: s.stat.name,
        baseStat: s.base_stat,
      })),
    };
  }

  private getSprite(pokemon: PokeApiPokemon): string | null {
    return (
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.front_default
    );
  }

  private async fetchJson<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new ServiceUnavailableError(`PokéAPI request failed: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) throw error;
      throw new ServiceUnavailableError('Unable to reach PokéAPI');
    }
  }
}
