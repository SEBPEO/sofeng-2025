import { Injectable, ExecutionContext } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from '../../users/users.service';

// ============================================================================
// TEMPORARY DEV MODE: Auth validation bypassed
// TODO: RESTORE AUTH VALIDATION - Remove dev mode and restore proper JWT validation
// ============================================================================
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private moduleRef: ModuleRef) {
    super();
  }

  private async getUsersService(): Promise<UsersService | null> {
    try {
      return this.moduleRef.get(UsersService, { strict: false });
    } catch {
      return null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ============================================================================
    // DEV MODE: Always allow requests and inject dev user, bypassing JWT validation
    // TODO: RESTORE - Remove this and use super.canActivate(context) for proper validation
    // ============================================================================
    const request = context.switchToHttp().getRequest();
    const devEmail = 'kemplent@gmail.com';

    // Try to get UsersService lazily
    const usersService = await this.getUsersService();

    if (!usersService) {
      // If service is not available, use mock user
      request.user = {
        userId: 'dev-user-id',
        sub: 'dev-user-id',
        email: devEmail,
        name: devEmail,
        picture: undefined,
      };
      return true; // Always allow in dev mode
    }

    try {
      const devUser = await usersService.findByEmail(devEmail);

      if (devUser) {
        request.user = {
          userId: devUser.user_id,
          sub: devUser.user_id,
          email: devUser.email,
          name: `${devUser.first_name || ''} ${devUser.last_name || ''}`.trim() || devUser.email,
          picture: undefined,
        };
      } else {
        // If user doesn't exist, use mock user
        request.user = {
          userId: 'dev-user-id',
          sub: 'dev-user-id',
          email: devEmail,
          name: devEmail,
          picture: undefined,
        };
      }
      return true; // Always allow in dev mode
    } catch (error) {
      // If lookup fails, use mock user
      console.warn('[DEV MODE] Failed to lookup kemplent@gmail.com user, using mock:', error);
      request.user = {
        userId: 'dev-user-id',
        sub: 'dev-user-id',
        email: devEmail,
        name: devEmail,
        picture: undefined,
      };
      return true; // Always allow in dev mode
    }

    // ============================================================================
    // ORIGINAL CODE (to restore):
    // return super.canActivate(context) as Promise<boolean>;
    // ============================================================================
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // ============================================================================
    // DEV MODE: Override handleRequest to always succeed even if JWT validation fails
    // TODO: RESTORE - Remove this override to restore proper error handling
    // ============================================================================
    if (user) {
      return user; // If user was set by canActivate, return it
    }
    // If JWT validation failed but we're in dev mode, canActivate already set the user
    const request = context.switchToHttp().getRequest();
    return request.user || super.handleRequest(err, user, info, context);
  }
}
