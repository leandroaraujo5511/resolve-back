import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TicketPriority } from '../../database/entities/ticket.enums';

export class CreateCitizenTicketDto {
  @ApiProperty({ format: 'uuid', description: 'Categoria / departamento do chamado' })
  @IsUUID()
  departmentId: string;

  @ApiProperty({ example: 'Buraco na via' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Buraco na esquina da Rua X com Y' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  shortDescription: string;

  @ApiProperty({
    example: 'Há semanas o buraco vem crescendo; risco para veículos.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  detailedDescription: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIA })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ format: 'uuid', description: 'Bairro (catálogo da sua cidade)' })
  @IsOptional()
  @IsUUID()
  neighborhoodId?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 450' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine?: string;

  @ApiPropertyOptional({ example: 'Próximo ao mercado' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressComplement?: string;

  @ApiPropertyOptional({ example: -23.55052 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -46.633308 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    description:
      'Texto livre de localização. Se omitido, será montado a partir do bairro e do endereço.',
    example: 'Centro — Rua das Flores, 450',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'URLs públicas ou keys retornadas após upload (ex.: R2)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
