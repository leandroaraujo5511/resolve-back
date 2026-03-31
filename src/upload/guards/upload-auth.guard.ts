import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ExtractJwt } from 'passport-jwt';
import type { JwtPayload } from '../../auth/interfaces/auth-user.interface';
import type { CitizenJwtPayload } from '../../auth/interfaces/citizen-jwt.interface';

export type UploadAuthContext =
  | { kind: 'staff'; payload: JwtPayload }
  | { kind: 'citizen'; payload: CitizenJwtPayload };

@Injectable()
export class UploadAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      uploadUser?: UploadAuthContext;
      headers?: { authorization?: string };
    }>();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req as never);
    if (!token) {
      throw new UnauthorizedException('Bearer token obrigatório');
    }

    const staffSecret = this.config.get<string>('JWT_SECRET', 'resolve-secret');
    const citizenSecret = this.config.get<string>(
      'JWT_CITIZEN_SECRET',
      `${staffSecret}-citizen`,
    );

    try {
      const payload = await this.jwtService.verifyAsync<
        JwtPayload & { typ?: string }
      >(token, { secret: staffSecret });
      if (payload.typ === 'citizen') {
        throw new UnauthorizedException();
      }
      req.uploadUser = { kind: 'staff', payload };
      return true;
    } catch {
      try {
        const payload = await this.jwtService.verifyAsync<CitizenJwtPayload>(
          token,
          { secret: citizenSecret },
        );
        if (payload.typ !== 'citizen') {
          throw new UnauthorizedException();
        }
        req.uploadUser = { kind: 'citizen', payload };
        return true;
      } catch {
        throw new UnauthorizedException('Token inválido para upload');
      }
    }
  }
}
