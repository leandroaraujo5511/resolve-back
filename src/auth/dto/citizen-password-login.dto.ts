import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CitizenPasswordLoginDto {
  @ApiProperty({ example: '11987654321' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, {
    message: 'Informe o telefone apenas com dígitos (DDD + número)',
  })
  phone: string;

  @ApiProperty({ minLength: 6, example: 'senha123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password: string;
}
