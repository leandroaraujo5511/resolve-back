import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FeedbackType } from '../../database/entities/feedback.enums';

/**
 * O feedback é sempre gravado na cidade do cadastro do cidadão.
 * Não envie `cityId` no corpo — ele é ignorado/rejeitado pela API.
 */
export class CreateFeedbackCitizenDto {
  @ApiProperty({ enum: FeedbackType, example: FeedbackType.SUGESTAO })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({ example: 'Sugiro mais iluminação na praça central.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  description: string;

  @ApiPropertyOptional({
    description: 'Nome para exibição no painel (padrão: nome do cadastro)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  citizenName?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'URLs ou identificadores de mídia (upload dedicado no futuro)',
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  attachments?: string[];
}
