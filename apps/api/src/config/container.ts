import type { Env } from './env.js';
import { PokeApiClient } from '../lib/pokeApiClient.js';
import { AuthService } from '../modules/auth/authService.js';
import { RefreshTokenRepository } from '../modules/auth/refreshTokenRepository.js';
import { UserRepository } from '../modules/auth/userRepository.js';
import { CollectionRepository } from '../modules/collection/collectionRepository.js';
import { CollectionService } from '../modules/collection/collectionService.js';
import { PokemonService } from '../modules/pokemon/pokemonService.js';
import { AiService } from '../modules/ai/aiService.js';
import {
  AuthController,
  PokemonController,
  CollectionController,
  AiController,
} from '../modules/routes/controllers.js';

export function createContainer(env: Env) {
  const userRepository = new UserRepository();
  const refreshTokenRepository = new RefreshTokenRepository();
  const collectionRepository = new CollectionRepository();
  const pokeApiClient = new PokeApiClient(env.POKEAPI_BASE_URL, env.POKEAPI_CACHE_TTL_MS);

  const authService = new AuthService(userRepository, refreshTokenRepository, env);
  const pokemonService = new PokemonService(pokeApiClient);
  const collectionService = new CollectionService(collectionRepository, pokeApiClient);
  const aiService = new AiService(env, collectionRepository, pokeApiClient);

  return {
    authService,
    controllers: {
      auth: new AuthController(authService),
      pokemon: new PokemonController(pokemonService),
      collection: new CollectionController(collectionService),
      ai: new AiController(aiService),
    },
  };
}

export type Container = ReturnType<typeof createContainer>;
