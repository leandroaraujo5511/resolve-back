import { ApiProperty } from '@nestjs/swagger';

export class CityPublicResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'São Paulo' })
  name: string;

  @ApiProperty({ example: 'SP' })
  stateUf: string;
}
