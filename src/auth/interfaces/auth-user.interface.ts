import { UserRole } from '../../database/entities/user.entity';

export interface AuthUser {
  id: string;
  /** `null` para super admin. */
  companyId: string | null;
  /** Município da empresa (`null` se não definido ou super admin). */
  companyCityId: string | null;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'ativo' | 'inativo';
  departmentId?: string;
  /** Escopo opcional dentro do departamento (SECRETARIA). */
  subDepartmentId?: string | null;
  mustChangePassword: boolean;
}

export interface JwtPayload {
  sub: string;
  companyId?: string | null;
  companyCityId?: string | null;
  email: string;
  role: UserRole;
  /** Presente quando o usuário do painel está vinculado a um departamento. */
  departmentId?: string | null;
  /** Presente quando o usuário está vinculado a um subdepartamento. */
  subDepartmentId?: string | null;
  mustChangePassword?: boolean;
}

export type EmailDeliveryStatus = 'sent' | 'failed' | 'skipped';

export interface CreateUserResult extends AuthUser {
  emailDeliveryStatus: EmailDeliveryStatus;
}
