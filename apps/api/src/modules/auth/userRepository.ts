import type { User } from '@prisma/client';
import { prisma } from '../../config/database.js';

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  create(data: { email: string; passwordHash: string; displayName: string }): Promise<User> {
    return prisma.user.create({ data });
  }
}
