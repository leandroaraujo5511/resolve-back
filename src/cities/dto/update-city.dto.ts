import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class UpdateCityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'PI' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  stateUf?: string;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'] })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';
}
