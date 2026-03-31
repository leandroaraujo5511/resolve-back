import { ApiProperty } from '@nestjs/swagger';

export class CompanyPanelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ required: false, nullable: true })
  document?: string;

  @ApiProperty({ enum: ['ativo', 'inativo'] })
  status: 'ativo' | 'inativo';

  @ApiProperty({ required: false, nullable: true })
  cityId?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
