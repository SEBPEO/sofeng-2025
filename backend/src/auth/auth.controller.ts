import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private cfg: ConfigService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() { /* redirects to Google */ }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res) {
    const { token } = await this.auth.handleGoogleLogin(req.user);
    // For now: redirect to front with token in URL (later: cookie)
    const frontend = this.cfg.get('FRONTEND_URL');
    return res.redirect(`${frontend}/oauth/callback?token=${token}`);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req) {
    return req.user;
  }
}
