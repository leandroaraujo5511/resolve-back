import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../database/entities/user.entity';

const PANEL_ASSIGNABLE_ROLES = [UserRole.ADMIN, UserRole.SECRETARIA] as const;

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'maria@resolve.local' })
  @IsEmail()
  @MaxLength(150)
  email: string;

  @ApiProperty({ example: '11999990000', description: 'Apenas dígitos com DDD' })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({
    description:
      'Obrigatória se sendWelcomeEmail for false/ausente. Ignorada (gerada) quando sendWelcomeEmail=true.',
    minLength: 6,
    example: 'Senha@123',
  })
  @ValidateIf((o: CreateUserDto) => o.sendWelcomeEmail !== true)
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password?: string;

  @ApiPropertyOptional({
    description: 'Enviar e-mail de boas-vindas com senha provisória (default UI: true)',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  sendWelcomeEmail?: boolean;

  @ApiPropertyOptional({
    description:
      'Exigir alteração de senha no primeiro login. Default: true se sendWelcomeEmail, senão false.',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === true || value === 'true',
  )
  @IsBoolean()
  requirePasswordChange?: boolean;

  @ApiPropertyOptional({
    enum: [UserRole.ADMIN, UserRole.SECRETARIA],
    default: UserRole.SECRETARIA,
  })
  @IsOptional()
  @IsIn(PANEL_ASSIGNABLE_ROLES)
  role?: UserRole;

  /** Obrigatório ao criar usuário como super admin (painel). */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Opcional. Deve pertencer ao departmentId. Restringe a visão aos tickets do subdepartamento.',
  })
  @IsOptional()
  @IsUUID()
  subDepartmentId?: string;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'], default: 'ativo' })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';
}
