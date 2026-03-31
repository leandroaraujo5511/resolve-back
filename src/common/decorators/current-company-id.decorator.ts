import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../auth/interfaces/auth-user.interface';

export const CurrentCompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const id = request.user?.companyId;
    return id === undefined ? undefined : id;
  },
);
