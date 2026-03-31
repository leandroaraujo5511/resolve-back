import { ApiProperty } from '@nestjs/swagger';

export class CityPanelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  stateUf: string;

  @ApiProperty({ enum: ['ativo', 'inativo'] })
  status: 'ativo' | 'inativo';

  @ApiProperty()
  createdAt: Date;
}
