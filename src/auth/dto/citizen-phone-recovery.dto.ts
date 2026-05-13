import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CitizenPhoneRecoveryDto {
  @ApiPropertyOptional({
    example: '1990-05-15',
    description:
      'AAAA-MM-DD (igual ao cadastro). Obrigatório se o cadastro tiver data de nascimento.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe a data de nascimento como AAAA-MM-DD',
  })
  birthDate?: string;

  @ApiPropertyOptional({
    description:
      'Senha atual. Obrigatória se o cadastro não tiver data de nascimento (confirma identidade).',
  })
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: '11987654321', description: 'WhatsApp antigo (apenas dígitos)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, {
    message: 'Informe o telefone antigo apenas com dígitos (DDD + número)',
  })
  oldPhone: string;

  @ApiProperty({ example: '21999887766', description: 'Novo WhatsApp (apenas dígitos)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, {
    message: 'Informe o novo telefone apenas com dígitos (DDD + número)',
  })
  newPhone: string;
}
