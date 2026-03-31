import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CitizenJwtPayload } from '../interfaces/citizen-jwt.interface';

export const CurrentCitizen = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CitizenJwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: CitizenJwtPayload }>();
    return request.user;
  },
);
