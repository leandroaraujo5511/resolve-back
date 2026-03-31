import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Prefeitura de Teresina' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 'prefeitura-teresina',
    description: 'Identificador único (slug), letras minúsculas, números e hífens',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug inválido (use letras minúsculas, números e hífens)',
  })
  slug: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'], default: 'ativo' })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';

  @ApiPropertyOptional({
    description: 'Município de atuação no catálogo global (escopo do tenant)',
  })
  @IsOptional()
  @IsUUID('4')
  cityId?: string;
}
