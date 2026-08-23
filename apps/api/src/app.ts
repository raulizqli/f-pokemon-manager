import cors from 'cors';
import express from 'express';
import type { Env } from './config/env.js';
import { createContainer } from './config/container.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { errorHandler, requestLogger } from './middleware/errorHandler.js';
import {
  createAiRouter,
  createAuthRouter,
  createCollectionRouter,
  createPokemonRouter,
} from './modules/routes/index.js';

export function createApp(env: Env) {
  const app = express();
  const container = createContainer(env);

  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);
  app.use(createAuthMiddleware(container.authService));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'pokedex-api' });
  });

  app.use('/api/auth', createAuthRouter(container.controllers.auth));
  app.use('/api/pokemon', createPokemonRouter(container.controllers.pokemon));
  app.use('/api/collection', createCollectionRouter(container.controllers.collection));
  app.use('/api/ai', createAiRouter(container.controllers.ai));

  app.use(errorHandler);

  return app;
}
