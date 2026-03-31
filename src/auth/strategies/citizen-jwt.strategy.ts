import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { CitizenJwtPayload } from '../interfaces/citizen-jwt.interface';

@Injectable()
export class CitizenJwtStrategy extends PassportStrategy(Strategy, 'jwt-citizen') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_CITIZEN_SECRET',
        `${configService.get<string>('JWT_SECRET', 'resolve-secret')}-citizen`,
      ),
    });
  }

  validate(payload: CitizenJwtPayload & { typ?: string }): CitizenJwtPayload {
    if (payload.typ !== 'citizen') {
      throw new UnauthorizedException('Token inválido para o app cidadão');
    }
    return payload as CitizenJwtPayload;
  }
}
