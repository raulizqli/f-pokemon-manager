import { prisma } from '../../config/database.js';

export class RefreshTokenRepository {
  create(data: { tokenHash: string; userId: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data });
  }

  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  deleteByHash(tokenHash: string) {
    return prisma.refreshToken.delete({ where: { tokenHash } });
  }

  /**
   * Atomically consume an unexpired refresh token and insert its replacement.
   * Returns null if the old token is missing, expired, or already rotated.
   */
  rotate(
    oldTokenHash: string,
    next: { tokenHash: string; expiresAt: Date },
  ): Promise<{ userId: string } | null> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.refreshToken.findUnique({ where: { tokenHash: oldTokenHash } });
      if (!existing || existing.expiresAt < new Date()) {
        return null;
      }

      const deleted = await tx.refreshToken.deleteMany({
        where: { tokenHash: oldTokenHash, expiresAt: { gt: new Date() } },
      });
      if (deleted.count !== 1) {
        return null;
      }

      await tx.refreshToken.create({
        data: {
          tokenHash: next.tokenHash,
          userId: existing.userId,
          expiresAt: next.expiresAt,
        },
      });

      return { userId: existing.userId };
    });
  }

  deleteExpired() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
