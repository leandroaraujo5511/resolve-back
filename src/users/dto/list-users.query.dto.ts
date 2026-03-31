import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Super admin: filtrar por empresa. Omitir para listar todos os usuários.',
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Filtrar por departamento (mesmo tenant)',
    example: '8eb0871c-9f32-4cb6-bdf2-f84f4ccf6a21',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status do usuário',
    enum: ['ativo', 'inativo'],
    example: 'ativo',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';
}
