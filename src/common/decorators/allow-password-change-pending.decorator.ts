import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_PENDING_KEY =
  'allowPasswordChangePending';

/** Permite acesso mesmo com `mustChangePassword` (ex.: me, change-password). */
export const AllowPasswordChangePending = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_PENDING_KEY, true);
