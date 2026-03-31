import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CreateCityDto {
  @ApiProperty({ example: 'Teresina' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'PI', minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  stateUf: string;

  @ApiPropertyOptional({ enum: ['ativo', 'inativo'], default: 'ativo' })
  @IsOptional()
  @IsString()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';
}
