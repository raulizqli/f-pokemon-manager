import type { PokemonDetail, PokemonListResponse } from '@pokedex/shared';
import { PokeApiClient } from '../../lib/pokeApiClient.js';

export class PokemonService {
  constructor(private readonly pokeApi: PokeApiClient) {}

  list(limit: number, offset: number, search?: string): Promise<PokemonListResponse> {
    return this.pokeApi.listPokemon(limit, offset, search);
  }

  getByIdOrName(idOrName: string): Promise<PokemonDetail> {
    return this.pokeApi.getPokemon(idOrName);
  }
}
