import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAppIssueDto {
  @ApiProperty({
    description: 'Descrição do problema encontrado no app cidadão',
    maxLength: 4000,
  })
  @IsString()
  @MaxLength(4000)
  description: string;

  @ApiPropertyOptional({
    description: 'Versão do app cidadão de onde o problema foi enviado',
  })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Informações técnicas do aparelho (modelo, SO, etc.)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  deviceInfo?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Keys dos anexos (fotos/vídeos) já enviados para o storage',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Nome do cidadão, copiado do perfil no app',
  })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  citizenName?: string;

  @ApiPropertyOptional({
    description: 'Telefone do cidadão, copiado do perfil no app',
  })
  @IsPhoneNumber('BR')
  @IsOptional()
  citizenPhone?: string;
}

