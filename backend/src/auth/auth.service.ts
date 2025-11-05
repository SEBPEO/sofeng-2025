import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async handleGoogleLogin(googleUser: any) {
    const user = await this.users.upsertGoogle({
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    });

    // Check if profile is completed
    const userWithProfiles = await this.users.findByIdWithProfiles(user.id);
    const profileCompleted = userWithProfiles?.profileCompleted || false;

    const payload = { 
      sub: user.id, 
      email: user.email, 
      name: user.name, 
      picture: user.picture,
      profileCompleted,
    };
    const token = await this.jwt.signAsync(payload);
    return { token, user, profileCompleted };
  }
}
