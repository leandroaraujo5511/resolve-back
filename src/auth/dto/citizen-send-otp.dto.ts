import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CitizenSendOtpDto {
  @ApiProperty({ example: '11987654321' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, {
    message: 'Informe o telefone apenas com dígitos (DDD + número)',
  })
  phone: string;
}
