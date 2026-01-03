import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

// ============================================================================
// TEMPORARY DEV MODE: Auth validation bypassed
// TODO: RESTORE AUTH VALIDATION - Remove this dev mode and restore proper JWT validation
// ============================================================================
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    cfg: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get('JWT_SECRET'),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validate(_payload: any) {
    // ============================================================================
    // DEV MODE: Always return user with email "kemplent" regardless of token
    // TODO: RESTORE - Remove this and use the original validation below
    // ============================================================================
    const devEmail = 'kemplent@gmail.com';
    try {
      const devUser = await this.usersService.findByEmail(devEmail);

      if (devUser) {
        return {
          userId: devUser.user_id,
          sub: devUser.user_id,
          email: devUser.email,
          name: `${devUser.first_name || ''} ${devUser.last_name || ''}`.trim() || devUser.email,
          picture: undefined,
        };
      }
    } catch (error) {
      // If database lookup fails, fall back to mock user
      console.warn('[DEV MODE] Failed to lookup kemplent user, using mock:', error);
    }

    // If user doesn't exist or lookup failed, return mock user object
    return {
      userId: 'dev-user-id',
      sub: 'dev-user-id',
      email: devEmail,
      name: devEmail,
      picture: undefined,
    };

    // ============================================================================
    // ORIGINAL CODE (to restore):
    // return { userId: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
    // ============================================================================
  }
}
