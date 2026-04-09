import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CitizenRegisterDto {
  @ApiProperty({ example: '11987654321', description: 'Apenas dígitos com DDD' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,13}$/, {
    message: 'Informe o telefone apenas com dígitos (DDD + número)',
  })
  phone: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '1990-05-15', description: 'Data de nascimento (AAAA-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe a data de nascimento como AAAA-MM-DD',
  })
  birthDate: string;

  @ApiProperty({ example: 'senha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Município escolhido no cadastro (lista em GET /public/cities)',
  })
  @IsUUID()
  cityId: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Órgão / tenant em que o cidadão será atendido (GET /public/companies)',
  })
  @IsUUID()
  companyId: string;
}
