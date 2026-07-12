import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketStatus } from '../../database/entities/ticket.enums';

export class TicketHistoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Usuário do painel (se aplicável)' })
  userId?: string | null;

  @ApiPropertyOptional({ description: 'Cidadão (app), se aplicável' })
  citizenId?: string | null;

  @ApiProperty({ required: false })
  isInternal?: boolean;

  @ApiPropertyOptional({
    enum: ['USER', 'CITIZEN', 'SYSTEM', 'INTEGRATION'],
    description: 'Tipo do autor no momento da ação',
  })
  actorType?: 'USER' | 'CITIZEN' | 'SYSTEM' | 'INTEGRATION';

  @ApiPropertyOptional({
    description: 'Nome do autor (snapshot); fallback genérico se legado',
  })
  actorDisplayName?: string;
}

export class TicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional({
    description: 'Município do chamado',
    format: 'uuid',
  })
  cityId?: string | null;

  @ApiPropertyOptional({
    description: 'Cidadão que abriu pelo app',
    format: 'uuid',
  })
  citizenId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  neighborhoodId?: string | null;

  @ApiPropertyOptional()
  addressLine?: string | null;

  @ApiPropertyOptional()
  addressComplement?: string | null;

  @ApiPropertyOptional()
  latitude?: number | null;

  @ApiPropertyOptional()
  longitude?: number | null;

  @ApiProperty({ example: '2026-000001' })
  protocol: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty()
  detailedDescription: string;

  @ApiProperty()
  departmentId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  subDepartmentId?: string | null;

  @ApiProperty({ enum: TicketStatus })
  status: TicketStatus;

  @ApiProperty({ enum: TicketPriority })
  priority: TicketPriority;

  @ApiProperty()
  citizenName: string;

  @ApiProperty()
  citizenPhone: string;

  @ApiProperty()
  location: string;

  @ApiProperty({ type: [String] })
  attachments: string[];

  @ApiProperty({ type: [TicketHistoryResponseDto] })
  history: TicketHistoryResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedTicketsResponseDto {
  @ApiProperty({ type: [TicketResponseDto] })
  data: TicketResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}
