import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CitizenTicketRespondDto {
  @ApiPropertyOptional({
    description:
      'Comentário do cidadão. Informe texto e/ou anexos (ao menos um é obrigatório).',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comment?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Keys dos arquivos já enviados ao storage (presign + PUT).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  attachments?: string[];
}
