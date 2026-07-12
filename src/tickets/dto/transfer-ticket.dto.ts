import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class TransferTicketDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Departamento de destino (ativo, mesmo tenant)',
  })
  @IsUUID()
  departmentId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Obrigatório se o destino tiver subdepartamentos ativos; omitido/null caso contrário',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  subDepartmentId?: string | null;

  @ApiProperty({
    minLength: 10,
    example: 'Demanda relacionada à infraestrutura urbana.',
    description: 'Justificativa obrigatória (mínimo 10 caracteres)',
  })
  @IsString()
  @MinLength(10, {
    message: 'A justificativa deve ter no mínimo 10 caracteres',
  })
  justification: string;

  @ApiPropertyOptional({
    description:
      'Se true, o registro da transferência no histórico não é visível ao cidadão',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({
    description:
      'ISO 8601 de updatedAt do ticket para controle de concorrência (409 se divergir)',
    example: '2026-07-12T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
