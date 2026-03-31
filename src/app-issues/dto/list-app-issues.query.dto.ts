import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListAppIssuesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    description:
      'Opcional: companyId para SUPER_ADMIN listar problemas de outro tenant',
  })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional({
    description:
      'Opcional: cityId do contexto (enviado automaticamente pelo painel)',
  })
  @IsString()
  @IsOptional()
  cityId?: string;
}

