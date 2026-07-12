import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../database/entities/user.entity';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';

export type PanelDataScope = {
  departmentId: string | null;
  subDepartmentId: string | null;
};

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
 * Escopo de dados no painel para SECRETARIA:
 * - com `departmentId`: só aquele departamento
 * - com `subDepartmentId` adicional: tickets desse subdepartamento **e** tickets sem subdepartamento (visíveis a todo o dept)
 * - sem vínculo (ou demais papéis): sem restrição
 */
export function resolvePanelDataScope(user: JwtPayload): PanelDataScope {
  if (user.role !== UserRole.SECRETARIA) {
    return { departmentId: null, subDepartmentId: null };
  }
  const departmentId = user.departmentId?.trim() || null;
  if (!departmentId) {
    return { departmentId: null, subDepartmentId: null };
  }
  const subDepartmentId = user.subDepartmentId?.trim() || null;
  return { departmentId, subDepartmentId };
}

/**
 * Escopo por departamento no painel.
 * - SECRETARIA com `departmentId`: só acessa dados daquele departamento.
 * - SECRETARIA sem departamento (ou demais papéis): sem restrição (`null`).
 */
export function resolvePanelDepartmentScope(
  user: JwtPayload,
): string | null {
  return resolvePanelDataScope(user).departmentId;
}

export function resolvePanelSubDepartmentScope(
  user: JwtPayload,
): string | null {
  return resolvePanelDataScope(user).subDepartmentId;
}

/**
 * Ticket no escopo do usuário?
 * Com subdepartamento no escopo: permite o próprio subdept **ou** `null` (compartilhado no dept).
 */
export function ticketMatchesPanelScope(
  ticket: { departmentId: string; subDepartmentId?: string | null },
  scope?: PanelDataScope | null,
): boolean {
  if (!scope?.departmentId) {
    return true;
  }
  if (ticket.departmentId !== scope.departmentId) {
    return false;
  }
  if (!scope.subDepartmentId) {
    return true;
  }
  return (
    ticket.subDepartmentId == null ||
    ticket.subDepartmentId === scope.subDepartmentId
  );
}

/**
 * Garante que o recurso do departamento está dentro do escopo do usuário.
 * Sem escopo (null), qualquer departamento do tenant é permitido.
 */
export function assertPanelDepartmentAccess(
  user: JwtPayload,
  resourceDepartmentId: string,
  resourceSubDepartmentId?: string | null,
): void {
  assertTicketInDataScope(
    {
      departmentId: resourceDepartmentId,
      subDepartmentId: resourceSubDepartmentId,
    },
    resolvePanelDataScope(user),
  );
}

/**
 * Valida ticket/recurso contra escopo de departamento/subdepartamento.
 * Tickets sem subdepartamento (`null`) ficam visíveis a todos no departamento.
 */
export function assertTicketInDataScope(
  ticket: { departmentId: string; subDepartmentId?: string | null },
  scope?: PanelDataScope | null,
): void {
  if (ticketMatchesPanelScope(ticket, scope)) {
    return;
  }
  if (scope?.departmentId && ticket.departmentId !== scope.departmentId) {
    throw new ForbiddenException(
      'Sem permissão para dados de outro departamento',
    );
  }
  throw new ForbiddenException(
    'Sem permissão para dados de outro subdepartamento',
  );
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
