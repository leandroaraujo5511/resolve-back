import { ApiProperty } from '@nestjs/swagger';

export class CityStateOptionDto {
  @ApiProperty({ example: 'PI' })
  uf: string;

  @ApiProperty({ example: 'Piauí' })
  name: string;
}
