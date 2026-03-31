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
}

export interface JwtPayload {
  sub: string;
  companyId?: string | null;
  companyCityId?: string | null;
  email: string;
  role: UserRole;
}
