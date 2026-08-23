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

  deleteExpired() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
