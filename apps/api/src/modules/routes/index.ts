import { Router } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import type {
  AuthController,
  PokemonController,
  CollectionController,
  AiController,
  UsersController,
  TradeController,
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
  router.get('/:idOrName/evolutions', (req, res, next) => {
    controller.evolutions(req as AuthenticatedRequest, res).catch(next);
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
  router.post('/:id/evolve', (req, res, next) => {
    controller.evolve(req as AuthenticatedRequest, res).catch(next);
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
  router.get('/status', (req, res) => {
    controller.status(req as AuthenticatedRequest, res);
  });
  router.post('/insights', (req, res, next) => {
    controller.insights(req as AuthenticatedRequest, res).catch(next);
  });

  return router;
}

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/', (req, res, next) => {
    controller.list(req as AuthenticatedRequest, res).catch(next);
  });
  router.get('/:id/collection', (req, res, next) => {
    controller.collection(req as AuthenticatedRequest, res).catch(next);
  });

  return router;
}

export function createTradeRouter(controller: TradeController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/', (req, res, next) => {
    controller.list(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/', (req, res, next) => {
    controller.create(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/:id/accept', (req, res, next) => {
    controller.accept(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/:id/reject', (req, res, next) => {
    controller.reject(req as AuthenticatedRequest, res).catch(next);
  });
  router.post('/:id/cancel', (req, res, next) => {
    controller.cancel(req as AuthenticatedRequest, res).catch(next);
  });

  return router;
}
