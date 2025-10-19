import { Injectable } from '@nestjs/common';

export type User = {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: 'google';
};

@Injectable()
export class UsersService {
  private users = new Map<string, User>();

  findByEmail(email: string) {
    for (const u of this.users.values()) if (u.email === email) return u;
    return undefined;
  }
  upsertGoogle(profile: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }) {
    const existing = this.findByEmail(profile.email);
    const user: User = existing ?? {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      provider: 'google',
    };
    if (!existing) this.users.set(user.id, user);
    return user;
  }
}
