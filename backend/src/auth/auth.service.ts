import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private auditService: AuditService,
  ) {}

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

    // Log successful login
    try {
      await this.auditService.logAuth(user.id, 'LOGIN', 'unknown', 'unknown');
    } catch (error) {
      // Don't fail login if audit logging fails
      console.error('Failed to log auth event:', error);
    }

    return { token, user, profileCompleted };
  }
}
