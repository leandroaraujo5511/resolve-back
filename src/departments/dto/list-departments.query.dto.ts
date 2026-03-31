import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListDepartmentsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Super admin: tenant em contexto',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status do departamento',
    enum: ['ativo', 'inativo'],
    example: 'ativo',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';
}
