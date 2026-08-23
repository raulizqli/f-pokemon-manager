import type { NextFunction, Request, Response } from 'express';
import type { AuthService } from '../modules/auth/authService.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function createAuthMiddleware(authService: AuthService) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      next();
      return;
    }

    try {
      const token = header.slice(7);
      const payload = authService.verifyAccessToken(token);
      req.userId = payload.sub;
    } catch {
      // Invalid token on optional routes — leave userId unset
    }

    next();
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}
