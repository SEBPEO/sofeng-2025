import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export type User = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: 'google' | string;
};

const prisma = new PrismaClient();

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async findByEmail(email: string) {
    return await prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return await prisma.user.findUnique({ where: { user_id: id } });
  }

  async findDbById(id: string) {
    return await prisma.user.findUnique({ where: { user_id: id } });
  }

  async upsertGoogle(profile: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }) {
    // Split display name into first/last
    const name = profile.name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first_name = parts.shift() ?? profile.email.split('@')[0];
    const last_name = parts.join(' ') || '';

    // Prisma schema requires several required fields (role, gender, first_name, last_name).
    // We'll choose sensible defaults: role='patient' and gender='male' when missing.
    // NOTE: adjust these defaults if your app needs different values or a migration to nullable fields.
    try {
      const dbUser = await prisma.user.upsert({
        where: { email: profile.email },
        update: {
          first_name,
          last_name,
          lastLogin: new Date(),
        },
        create: {
          email: profile.email,
          first_name,
          last_name,
          role: 'patient',
          gender: 'male',
          createdAt: new Date(),
          lastLogin: new Date(),
        },
      });

      return mapDbUser(dbUser);
    } catch (err) {
      this.logger.error('Failed to upsert google user', err as any);
      throw err;
    }
  }
}

function mapDbUser(dbUser: any): User {
  const name = [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ').trim();
  return {
    id: dbUser.user_id,
    email: dbUser.email,
    name: name || undefined,
    picture: undefined,
    provider: 'google',
  };
}
