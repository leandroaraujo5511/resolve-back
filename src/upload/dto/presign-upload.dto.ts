import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PresignUploadDto {
  @ApiProperty({ example: 'foto-buraco.jpg' })
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  filename: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  contentType: string;

  /** Super admin (painel): tenant onde o arquivo será armazenado */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  /** Painel: escopo do arquivo ao chamado (path tickets/{id}/) */
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  /** Tamanho declarado do arquivo (validação de limite) */
  @ApiPropertyOptional({ example: 2048000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  sizeBytes?: number;
}

export class PresignUploadResponseDto {
  @ApiProperty({ description: 'URL assinada para PUT do objeto' })
  url!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  bucket!: string;

  @ApiProperty({ example: 300 })
  expiresIn!: number;

  @ApiProperty({ example: 'PUT' })
  method!: 'PUT';
}

export class PresignGetResponseDto {
  @ApiProperty({ description: 'URL assinada para GET do objeto' })
  url!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  bucket!: string;

  @ApiProperty({ example: 300 })
  expiresIn!: number;

  @ApiProperty({ example: 'GET' })
  method!: 'GET';
}
