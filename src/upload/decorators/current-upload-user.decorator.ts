import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { UploadAuthContext } from '../guards/upload-auth.guard';

export const CurrentUploadUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UploadAuthContext => {
    const req = ctx.switchToHttp().getRequest<{
      uploadUser?: UploadAuthContext;
    }>();
    if (!req.uploadUser) {
      throw new UnauthorizedException();
    }
    return req.uploadUser;
  },
);
