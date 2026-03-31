import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CitizenUpdateProfileDto {
  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'O nome deve ter ao menos 2 caracteres' })
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '11987654321' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,13}$/, {
    message: 'Informe o telefone apenas com dígitos (DDD + número)',
  })
  phone?: string;

  @ApiPropertyOptional({
    description:
      'Key do arquivo após upload (presign). Envie null para remover a foto.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(512)
  avatarKey?: string | null;
}
