import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
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

  @ApiProperty({ minLength: 6, example: 'Senha@123' })
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password: string;

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

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'], default: 'ativo' })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';
}

