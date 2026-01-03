import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private cfg: ConfigService,
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    /* redirects to Google */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res) {
    const { token, profileCompleted } = await this.auth.handleGoogleLogin(req.user);
    const frontend = this.cfg.get('FRONTEND_URL');
    return res.redirect(
      `${frontend}/oauth/callback?token=${token}&profileCompleted=${profileCompleted}`,
    );
  }

  // ============================================================================
  // TEMPORARY DEV MODE: Auth validation bypassed
  // TODO: RESTORE AUTH VALIDATION - Ensure @UseGuards(AuthGuard('jwt')) is properly enforced
  // ============================================================================
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req) {
    const id = req.user?.userId || req.user?.sub;

    const dbUser = await this.users.findDbById(id);
    return dbUser ?? req.user;
  }

  // ============================================================================
  // DEV ENDPOINT: Generate token for kemplent user (for development only)
  // TODO: REMOVE THIS ENDPOINT - This is only for dev mode, remove before production
  // ============================================================================
  @Get('dev/login')
  async devLogin() {
    const devEmail = 'kemplent@gmail.com';
    const user = await this.users.findByEmail(devEmail);

    if (!user) {
      return { error: `User with email "${devEmail}" not found. Please create this user first.` };
    }

    const userWithProfiles = await this.users.findByIdWithProfiles(user.user_id);
    const profileCompleted = !!(
      userWithProfiles?.doctor_profile || userWithProfiles?.patient_profile
    );

    const payload = {
      sub: user.user_id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      picture: undefined,
      profileCompleted,
    };
    const token = await this.jwt.signAsync(payload);
    return { token, user, profileCompleted };
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    /* redirects to GitHub */
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req, @Res() res) {
    const { token, profileCompleted } = await this.auth.handleGoogleLogin(req.user);
    const frontend = this.cfg.get('FRONTEND_URL');
    return res.redirect(
      `${frontend}/oauth/callback?token=${token}&profileCompleted=${profileCompleted}`,
    );
  }
}
