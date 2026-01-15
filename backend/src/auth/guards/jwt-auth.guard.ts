import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const result = super.canActivate(context);

    if (result instanceof Observable) {
      return result.pipe(
        catchError(() => {
          throw new UnauthorizedException('Invalid or missing token');
        }),
      );
    }

    if (result instanceof Promise) {
      return result.catch(() => {
        throw new UnauthorizedException('Invalid or missing token');
      });
    }

    return result;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
