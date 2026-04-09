import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CitizenPhoneRecoveryDto {
  @ApiProperty({ example: '1990-05-15', description: 'AAAA-MM-DD (igual ao cadastro)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe a data de nascimento como AAAA-MM-DD',
  })
  birthDate: string;

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
