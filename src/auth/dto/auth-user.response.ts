import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';

export class AuthUserResponseDto {
  @ApiProperty({ example: '8eb0871c-9f32-4cb6-bdf2-f84f4ccf6a21' })
  id: string;

  @ApiProperty({
    example: 'ad8a129f-705f-488d-b708-299fbc9ac2be',
    nullable: true,
    description: 'Ausente para super admin',
  })
  companyId: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Município vinculado à empresa (tenant)',
  })
  companyCityId: string | null;

  @ApiProperty({ example: 'Administrador Resolve' })
  name: string;

  @ApiProperty({ example: 'admin@resolve.local' })
  email: string;

  @ApiProperty({ example: '11999990000' })
  phone: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;

  @ApiProperty({ example: 'ativo', enum: ['ativo', 'inativo'] })
  status: 'ativo' | 'inativo';

  @ApiProperty({
    required: false,
    nullable: true,
    example: null,
  })
  departmentId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Subdepartamento opcional; restringe a visão aos tickets desse subdepartamento',
  })
  subDepartmentId?: string | null;

  @ApiProperty({
    description: 'Se true, o usuário deve alterar a senha antes de usar o painel',
    example: false,
  })
  mustChangePassword: boolean;
}

export class CreateUserResponseDto extends AuthUserResponseDto {
  @ApiProperty({
    enum: ['sent', 'failed', 'skipped'],
    description:
      'sent = e-mail enfileirado no gateway; failed = falha ao chamar gateway; skipped = não solicitado',
  })
  emailDeliveryStatus: 'sent' | 'failed' | 'skipped';
}

export class LoginResponseDto {
  @ApiProperty({ type: () => AuthUserResponseDto })
  user: AuthUserResponseDto;

  @ApiProperty({
    description: 'JWT de acesso (Authorization: Bearer)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4iLCJjb21wYW55SWQiOiIuLi4ifQ.signature',
  })
  token: string;

  @ApiProperty({
    description: 'JWT de renovação (POST /auth/refresh). Rotacionado a cada refresh.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'Novo access token' })
  token!: string;

  @ApiProperty({ description: 'Novo refresh token' })
  refreshToken!: string;
}
