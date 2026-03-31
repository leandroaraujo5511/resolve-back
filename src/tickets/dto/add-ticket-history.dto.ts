import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketStatus } from '../../database/entities/ticket.enums';

export class AddTicketHistoryDto {
  @ApiProperty({ example: 'Equipe acionada para vistoria no local.' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({
    description: 'Comentário interno (não exibido ao cidadão no app)',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({
    enum: TicketStatus,
    description: 'Se informado, atualiza o status do chamado',
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
