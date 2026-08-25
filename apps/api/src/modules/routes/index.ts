import { Router, type NextFunction, type Response } from 'express';
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

type AuthHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;

function wrap(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<void> | void,
): AuthHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post('/register', wrap((req, res) => controller.register(req, res)));
  router.post('/login', wrap((req, res) => controller.login(req, res)));
  router.post('/refresh', wrap((req, res) => controller.refresh(req, res)));
  router.post('/logout', wrap((req, res) => controller.logout(req, res)));
  router.get('/me', requireAuth, wrap((req, res) => controller.me(req, res)));

  return router;
}

export function createPokemonRouter(controller: PokemonController): Router {
  const router = Router();

  router.get('/', wrap((req, res) => controller.list(req, res)));
  router.get('/:idOrName/evolutions', wrap((req, res) => controller.evolutions(req, res)));
  router.get('/:idOrName', wrap((req, res) => controller.detail(req, res)));

  return router;
}

export function createCollectionRouter(controller: CollectionController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/stats', wrap((req, res) => controller.stats(req, res)));
  router.get('/', wrap((req, res) => controller.list(req, res)));
  router.post('/', wrap((req, res) => controller.create(req, res)));
  router.post('/:id/evolve', wrap((req, res) => controller.evolve(req, res)));
  router.patch('/:id', wrap((req, res) => controller.update(req, res)));
  router.delete('/:id', wrap((req, res) => controller.remove(req, res)));

  return router;
}

export function createAiRouter(controller: AiController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/status', wrap((req, res) => {
    controller.status(req, res);
  }));
  router.post('/insights', wrap((req, res) => controller.insights(req, res)));

  return router;
}

export function createUsersRouter(controller: UsersController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/', wrap((req, res) => controller.list(req, res)));
  router.get('/:id/collection', wrap((req, res) => controller.collection(req, res)));

  return router;
}

export function createTradeRouter(controller: TradeController): Router {
  const router = Router();

  router.use(requireAuth);
  router.get('/', wrap((req, res) => controller.list(req, res)));
  router.post('/', wrap((req, res) => controller.create(req, res)));
  router.post('/:id/accept', wrap((req, res) => controller.accept(req, res)));
  router.post('/:id/reject', wrap((req, res) => controller.reject(req, res)));
  router.post('/:id/cancel', wrap((req, res) => controller.cancel(req, res)));

  return router;
}
