import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'resolve-secret'),
    });
  }

  validate(
    payload: JwtPayload & { typ?: string },
  ): JwtPayload {
    if (payload.typ === 'citizen') {
      throw new UnauthorizedException(
        'Use o token do painel nesta rota (não o token do app cidadão)',
      );
    }
    return payload;
  }
}
