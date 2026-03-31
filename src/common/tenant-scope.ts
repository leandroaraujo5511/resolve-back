import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../database/entities/user.entity';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';

/**
 * Resolve o tenant do painel: ADMIN usa sempre o `companyId` do JWT;
 * SUPER_ADMIN deve informar `companyId` na query (contexto escolhido no front).
 */
export function resolvePanelCompanyId(
  user: JwtPayload,
  queryCompanyId?: string,
): string {
  if (user.role === UserRole.SUPER_ADMIN) {
    const id = queryCompanyId?.trim();
    if (!id) {
      throw new BadRequestException(
        'Informe companyId na query (contexto da empresa no painel).',
      );
    }
    return id;
  }
  const id = user.companyId?.trim();
  if (!id) {
    throw new ForbiddenException('Usuário sem vínculo de empresa');
  }
  return id;
}
