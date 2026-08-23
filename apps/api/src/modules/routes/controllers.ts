import type { Response } from 'express';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  createCollectionEntrySchema,
  updateCollectionEntrySchema,
  pokemonListQuerySchema,
} from '@pokedex/shared';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import type { AuthService } from '../auth/authService.js';
import type { CollectionService } from '../collection/collectionService.js';
import type { PokemonService } from '../pokemon/pokemonService.js';
import type { AiService } from '../ai/aiService.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = registerSchema.parse(req.body);
    const tokens = await this.authService.register(input);
    res.status(201).json(tokens);
  };

  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = loginSchema.parse(req.body);
    const tokens = await this.authService.login(input);
    res.json(tokens);
  };

  refresh = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await this.authService.refresh(refreshToken);
    res.json(tokens);
  };

  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { refreshToken } = refreshSchema.parse(req.body);
    await this.authService.logout(refreshToken);
    res.status(204).send();
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const profile = await this.authService.getProfile(req.userId!);
    res.json(profile);
  };
}

export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query = pokemonListQuerySchema.parse(req.query);
    const result = await this.pokemonService.list(query.limit, query.offset, query.search);
    res.json(result);
  };

  detail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const idOrName = String(req.params.idOrName);
    const result = await this.pokemonService.getByIdOrName(idOrName);
    res.json(result);
  };
}

export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const entries = await this.collectionService.list(req.userId!, status);
    res.json(entries);
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = createCollectionEntrySchema.parse(req.body);
    const entry = await this.collectionService.create(req.userId!, input);
    res.status(201).json(entry);
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = updateCollectionEntrySchema.parse(req.body);
    const entry = await this.collectionService.update(req.userId!, String(req.params.id), input);
    res.json(entry);
  };

  remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await this.collectionService.remove(req.userId!, String(req.params.id));
    res.status(204).send();
  };

  stats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const stats = await this.collectionService.getStats(req.userId!);
    res.json(stats);
  };
}

export class AiController {
  constructor(private readonly aiService: AiService) {}

  insights = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await this.aiService.getInsights(req.userId!);
    res.json(result);
  };

  status = (_req: AuthenticatedRequest, res: Response): void => {
    res.json({ enabled: this.aiService.isEnabled() });
  };
}
