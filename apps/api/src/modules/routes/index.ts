import { Router } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import type {
  AuthController,
  PokemonController,
  CollectionController,
  AiController,
} from './controllers.js';

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/register', (req, res, next) => {
    controller.register(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/login', (req, res, next) => {
    controller.login(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/refresh', (req, res, next) => {
    controller.refresh(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/logout', (req, res, next) => {
    controller.logout(req as AuthenticatedRequest, res).catch(next);
  });
  router.get('/me', requireAuth, (req, res, next) => {
    controller.me(req as AuthenticatedRequest, res).catch(next);
  });

  return router;
}

export function createPokemonRouter(controller: PokemonController): Router {
  const router = Router();

  router.get('/', (req, res, next) => {
    controller.list(req as AuthenticatedRequest, res).catch(next);
  });
  router.get('/:idOrName', (req, res, next) => {
    controller.detail(req as AuthenticatedRequest, res).catch(next);
  });

  return router;
}

export function createCollectionRouter(controller: CollectionController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/stats', (req, res, next) => {
    controller.stats(req as AuthenticatedRequest, res).catch(next);
  });
  router.get('/', (req, res, next) => {
    controller.list(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/', (req, res, next) => {
    controller.create(req as AuthenticatedRequest, res).catch(next);
  });
  router.patch('/:id', (req, res, next) => {
    controller.update(req as AuthenticatedRequest, res).catch(next);
  });
  router.delete('/:id', (req, res, next) => {
    controller.remove(req as AuthenticatedRequest, res).catch(next);
  });

  return router;
}

export function createAiRouter(controller: AiController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/status', (req, res, next) => {
    controller.status(req as AuthenticatedRequest, res);
    next();
  });
  router.post('/insights', (req, res, next) => {
    controller.insights(req as AuthenticatedRequest, res).catch(next);
  });

  return router;
}
