import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(cfg: ConfigService) {
    super({
      clientID: cfg.get('GITHUB_CLIENT_ID'),
      clientSecret: cfg.get('GITHUB_CLIENT_SECRET'),
      callbackURL: cfg.get('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    const email =
      profile.emails && profile.emails.length ? profile.emails[0].value : `${profile.username}@github.com`;
    const name = profile.displayName || profile.username;
    const picture = profile.photos && profile.photos.length ? profile.photos[0].value : null;

    done(null, {
      id: profile.id,
      email,
      name,
      picture,
      provider: 'github',
    });
  }
}
