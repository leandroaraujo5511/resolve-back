import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../database/entities/user.entity';

const PANEL_ASSIGNABLE_ROLES = [UserRole.ADMIN, UserRole.SECRETARIA] as const;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'maria@resolve.local' })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ example: '11999990000', description: 'Apenas dígitos com DDD' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ minLength: 6, description: 'Se informado, redefine a senha' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password?: string;

  @ApiPropertyOptional({ enum: [UserRole.ADMIN, UserRole.SECRETARIA] })
  @IsOptional()
  @IsIn(PANEL_ASSIGNABLE_ROLES)
  role?: UserRole;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'] })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';
}

