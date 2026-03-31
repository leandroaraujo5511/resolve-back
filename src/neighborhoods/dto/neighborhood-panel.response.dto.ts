import { ApiProperty } from '@nestjs/swagger';

export class NeighborhoodPanelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  cityId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['ativo', 'inativo'] })
  status: 'ativo' | 'inativo';

  @ApiProperty()
  createdAt: Date;
}
