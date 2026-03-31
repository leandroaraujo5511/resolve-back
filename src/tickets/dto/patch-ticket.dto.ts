import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  TicketPriority,
  TicketStatus,
} from '../../database/entities/ticket.enums';

export class PatchTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Novo departamento (deve pertencer ao mesmo tenant)',
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
