import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RegisterTicketAttachmentItemDto {
  @ApiProperty({ description: 'Key retornada pelo presign PUT' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  storageKey: string;

  @ApiProperty({ example: 'evidencia.pdf' })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  originalFileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  contentType: string;

  @ApiProperty({ example: 2048000, description: 'Tamanho em bytes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  sizeBytes: number;
}

export class RegisterTicketAttachmentsDto {
  @ApiProperty({ type: [RegisterTicketAttachmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => RegisterTicketAttachmentItemDto)
  items: RegisterTicketAttachmentItemDto[];
}

export class RemoveTicketAttachmentDto {
  @ApiPropertyOptional({
    description: 'Motivo da remoção (auditoria)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class TicketAttachmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ticketId: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  storageKey: string;

  @ApiProperty()
  originalFileName: string;

  @ApiProperty()
  contentType: string;

  @ApiProperty({ description: 'Tamanho em bytes (número)' })
  sizeBytes: number;

  @ApiPropertyOptional({ nullable: true })
  uploadedByUserId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  uploadedByCitizenId?: string | null;

  @ApiProperty({ enum: ['ativo', 'removido'] })
  status: 'ativo' | 'removido';

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  removedAt?: Date | null;
}
