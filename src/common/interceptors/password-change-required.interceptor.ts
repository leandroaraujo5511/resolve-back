import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ALLOW_PASSWORD_CHANGE_PENDING_KEY } from '../decorators/allow-password-change-pending.decorator';
import type { JwtPayload } from '../../auth/interfaces/auth-user.interface';

/**
 * Após os guards JWT, bloqueia o painel se `mustChangePassword` estiver ativo.
 */
@Injectable()
export class PasswordChangeRequiredInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const allow = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_PENDING_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allow) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (user?.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'É necessário alterar a senha antes de continuar',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }

    return next.handle();
  }
}
