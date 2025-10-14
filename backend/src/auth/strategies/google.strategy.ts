import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(cfg: ConfigService) {
    super({
      clientID: cfg.get('GOOGLE_CLIENT_ID'),
      clientSecret: cfg.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: cfg.get('GOOGLE_CALLBACK_URL'),
      scope: ['profile', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const picture = profile.photos?.[0]?.value;
    done(null, { id: profile.id, email, name, picture, provider: 'google' });
  }
}
