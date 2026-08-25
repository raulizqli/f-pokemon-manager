import type { PokemonDetail, PokemonListResponse, PokemonSummary } from '@pokedex/shared';
import { NotFoundError, ServiceUnavailableError } from './errors.js';
import { TtlCache } from './cache.js';
import { mapWithConcurrency } from './concurrency.js';

const FETCH_TIMEOUT_MS = 8_000;
const DETAIL_CONCURRENCY = 5;
const NAME_CATALOG_LIMIT = 2_000;
const OFFICIAL_ARTWORK_CDN =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

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
    front_shiny: string | null;
    other?: {
      'official-artwork'?: {
        front_default: string | null;
        front_shiny?: string | null;
      };
    };
  };
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
}

interface PokeApiSpecies {
  name: string;
  evolution_chain: { url: string };
}

interface EvolutionNode {
  species: { name: string; url: string };
  evolves_to: EvolutionNode[];
}

interface PokeApiEvolutionChain {
  chain: EvolutionNode;
}

function findEvolutionNode(node: EvolutionNode, speciesName: string): EvolutionNode | null {
  if (node.species.name === speciesName) return node;
  for (const child of node.evolves_to) {
    const found = findEvolutionNode(child, speciesName);
    if (found) return found;
  }
  return null;
}

function parseIdFromPokemonUrl(url: string): number | null {
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function officialArtworkUrl(id: number): string {
  return `${OFFICIAL_ARTWORK_CDN}/${id}.png`;
}

export class PokeApiClient {
  private listCache: TtlCache<PokeApiListResult>;
  private detailCache: TtlCache<PokeApiPokemon>;
  private speciesCache: TtlCache<PokeApiSpecies>;
  private chainCache: TtlCache<PokeApiEvolutionChain>;
  private allNamesCache: string[] | null = null;

  constructor(
    private readonly baseUrl: string,
    ttlMs: number,
  ) {
    this.listCache = new TtlCache(ttlMs);
    this.detailCache = new TtlCache(ttlMs);
    this.speciesCache = new TtlCache(ttlMs);
    this.chainCache = new TtlCache(ttlMs);
  }

  async listPokemon(limit: number, offset: number, search?: string): Promise<PokemonListResponse> {
    if (search) {
      return this.searchPokemon(search, limit, offset);
    }

    const cacheKey = `list:${limit}:${offset}`;
    const cached = this.listCache.get(cacheKey);
    const list = cached ?? (await this.fetchList(limit, offset));
    if (!cached) this.listCache.set(cacheKey, list);

    const summaries = await mapWithConcurrency(list.results, DETAIL_CONCURRENCY, (item) =>
      this.toSummaryFromListItem(item),
    );

    return {
      count: list.count,
      nextOffset: list.next ? offset + limit : null,
      previousOffset: list.previous ? Math.max(0, offset - limit) : null,
      results: summaries,
    };
  }

  async getPokemon(idOrName: string | number): Promise<PokemonDetail> {
    const pokemon = await this.loadPokemon(String(idOrName));
    return this.toDetail(pokemon);
  }

  async getNextEvolutions(idOrName: string | number): Promise<PokemonSummary[]> {
    const current = await this.getPokemon(idOrName);
    const species = await this.getSpecies(current.name);
    const chain = await this.getEvolutionChain(species.evolution_chain.url);
    const node = findEvolutionNode(chain.chain, current.name);
    if (!node) return [];
    return mapWithConcurrency(node.evolves_to, DETAIL_CONCURRENCY, async (child) => {
      const detail = await this.getPokemon(child.species.name);
      return {
        id: detail.id,
        name: detail.name,
        spriteUrl: detail.spriteUrl,
        types: detail.types,
      };
    });
  }

  private async searchPokemon(search: string, limit: number, offset: number): Promise<PokemonListResponse> {
    const allNames = await this.getAllNames();
    const normalized = search.toLowerCase();
    const filtered = allNames.filter((name) => name.includes(normalized));
    const page = filtered.slice(offset, offset + limit);

    const summaries = await mapWithConcurrency(page, DETAIL_CONCURRENCY, (name) => this.toSummary(name));

    return {
      count: filtered.length,
      nextOffset: offset + limit < filtered.length ? offset + limit : null,
      previousOffset: offset > 0 ? Math.max(0, offset - limit) : null,
      results: summaries,
    };
  }

  private async getAllNames(): Promise<string[]> {
    if (this.allNamesCache) return this.allNamesCache;
    const list = await this.fetchList(NAME_CATALOG_LIMIT, 0);
    this.allNamesCache = list.results.map((r) => r.name);
    return this.allNamesCache;
  }

  private async fetchList(limit: number, offset: number): Promise<PokeApiListResult> {
    const url = `${this.baseUrl}/pokemon?limit=${limit}&offset=${offset}`;
    return this.fetchJson<PokeApiListResult>(url);
  }

  private async fetchPokemon(idOrName: string): Promise<PokeApiPokemon> {
    const url = `${this.baseUrl}/pokemon/${idOrName}`;
    return this.fetchJson<PokeApiPokemon>(url);
  }

  private async getSpecies(name: string): Promise<PokeApiSpecies> {
    const cached = this.speciesCache.get(name);
    if (cached) return cached;
    const species = await this.fetchJson<PokeApiSpecies>(`${this.baseUrl}/pokemon-species/${name}`);
    this.speciesCache.set(name, species);
    return species;
  }

  private async getEvolutionChain(url: string): Promise<PokeApiEvolutionChain> {
    const cached = this.chainCache.get(url);
    if (cached) return cached;
    const chain = await this.fetchJson<PokeApiEvolutionChain>(url);
    this.chainCache.set(url, chain);
    return chain;
  }

  private async loadPokemon(idOrName: string): Promise<PokeApiPokemon> {
    const key = idOrName.toLowerCase();
    const cached = this.detailCache.get(key);
    if (cached) return cached;
    const pokemon = await this.fetchPokemon(key);
    this.cachePokemon(pokemon);
    return pokemon;
  }

  private cachePokemon(pokemon: PokeApiPokemon): void {
    this.detailCache.set(pokemon.name.toLowerCase(), pokemon);
    this.detailCache.set(String(pokemon.id), pokemon);
  }

  private async toSummaryFromListItem(item: { name: string; url: string }): Promise<PokemonSummary> {
    const parsedId = parseIdFromPokemonUrl(item.url);
    const pokemon = await this.loadPokemon(parsedId != null ? String(parsedId) : item.name);
    return {
      id: parsedId ?? pokemon.id,
      name: item.name,
      spriteUrl: officialArtworkUrl(parsedId ?? pokemon.id),
      types: pokemon.types.map((t) => t.type.name),
    };
  }

  private async toSummary(name: string): Promise<PokemonSummary> {
    const pokemon = await this.loadPokemon(name);
    return {
      id: pokemon.id,
      name: pokemon.name,
      spriteUrl: officialArtworkUrl(pokemon.id),
      types: pokemon.types.map((t) => t.type.name),
    };
  }

  private toDetail(pokemon: PokeApiPokemon): PokemonDetail {
    return {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      spriteUrl: this.getSprite(pokemon) ?? officialArtworkUrl(pokemon.id),
      spriteShinyUrl: this.getShinySprite(pokemon),
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

  private getShinySprite(pokemon: PokeApiPokemon): string | null {
    return (
      pokemon.sprites.other?.['official-artwork']?.front_shiny ??
      pokemon.sprites.front_shiny ??
      this.getSprite(pokemon)
    );
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.status === 404) {
        throw new NotFoundError('Pokémon not found');
      }
      if (!response.ok) {
        throw new ServiceUnavailableError(`PokéAPI request failed: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ServiceUnavailableError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableError('PokéAPI request timed out');
      }
      throw new ServiceUnavailableError('Unable to reach PokéAPI');
    } finally {
      clearTimeout(timer);
    }
  }
}
