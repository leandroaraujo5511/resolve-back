import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiPropertyOptional({ example: 'Obras e Infraestrutura' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'Responsável por manutenção urbana e obras públicas.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  description: string;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'], example: 'ativo' })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';

  @ApiPropertyOptional({
    example: 'construct-outline',
    description:
      'Identificador do ícone (Ionicons outline) exibido no app cidadão',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]*$/, {
    message: 'Ícone: apenas minúsculas, números e hífens',
  })
  icon?: string;
}

