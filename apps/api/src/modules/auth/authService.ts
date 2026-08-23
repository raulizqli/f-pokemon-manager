import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { AuthTokens, LoginInput, RegisterInput, UserProfile } from '@pokedex/shared';
import type { Env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import { RefreshTokenRepository } from './refreshTokenRepository.js';
import { UserRepository } from './userRepository.js';

interface TokenPayload {
  sub: string;
  email: string;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly env: Env,
  ) {}

  async register(input: RegisterInput): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(input.email.toLowerCase());
    if (existing) {
      throw new ConflictError('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.users.create({
      email: input.email.toLowerCase(),
      passwordHash,
      displayName: input.displayName,
    });

    return this.issueTokens(user.id, user.email, user.displayName, user.createdAt);
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.users.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return this.issueTokens(user.id, user.email, user.displayName, user.createdAt);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    await this.refreshTokens.deleteByHash(tokenHash);
    return this.issueTokens(user.id, user.email, user.displayName, user.createdAt);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    try {
      await this.refreshTokens.deleteByHash(tokenHash);
    } catch {
      // Token may already be invalid; logout is idempotent
    }
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.env.JWT_ACCESS_SECRET) as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid access token');
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    displayName: string,
    createdAt: Date,
  ): Promise<AuthTokens> {
    const payload: TokenPayload = { sub: userId, email };
    const accessToken = jwt.sign(payload, this.env.JWT_ACCESS_SECRET, {
      expiresIn: this.env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.getRefreshExpiry();

    await this.refreshTokens.create({ tokenHash, userId, expiresAt });

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email,
        displayName,
        createdAt: createdAt.toISOString(),
      },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getRefreshExpiry(): Date {
    const match = this.env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)d$/);
    const days = match ? Number.parseInt(match[1], 10) : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }
}
