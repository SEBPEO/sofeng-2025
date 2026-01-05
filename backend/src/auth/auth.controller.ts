import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private cfg: ConfigService,
    private users: UsersService,
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

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req) {
    const id = req.user?.userId || req.user?.sub;

    const dbUser = await this.users.findDbById(id);
    return dbUser ?? req.user;
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
