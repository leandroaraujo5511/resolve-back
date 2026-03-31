import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class ListPublicCitiesQueryDto {
  @ApiPropertyOptional({
    example: 'PI',
    description: 'Filtra municípios ativos pela UF (2 letras)',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  stateUf?: string;
}
