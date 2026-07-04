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

/**
 * Escopo por departamento no painel.
 * - SECRETARIA com `departmentId`: só acessa dados daquele departamento.
 * - SECRETARIA sem departamento (ou demais papéis): sem restrição (`null`).
 */
export function resolvePanelDepartmentScope(
  user: JwtPayload,
): string | null {
  if (user.role !== UserRole.SECRETARIA) {
    return null;
  }
  const id = user.departmentId?.trim();
  return id || null;
}

/**
 * Garante que o recurso do departamento está dentro do escopo do usuário.
 * Sem escopo (null), qualquer departamento do tenant é permitido.
 */
export function assertPanelDepartmentAccess(
  user: JwtPayload,
  resourceDepartmentId: string,
): void {
  const scope = resolvePanelDepartmentScope(user);
  if (scope && scope !== resourceDepartmentId) {
    throw new ForbiddenException(
      'Sem permissão para dados de outro departamento',
    );
  }
}

/**
 * SECRETARIA vinculada a um departamento não pode alterar cadastros de departamentos.
 */
export function assertCanManageDepartments(user: JwtPayload): void {
  if (resolvePanelDepartmentScope(user)) {
    throw new ForbiddenException(
      'Usuário restrito ao próprio departamento não pode gerenciar departamentos',
    );
  }
}
