import { ApiProperty } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ example: 'ad8a129f-705f-488d-b708-299fbc9ac2be' })
  id: string;

  @ApiProperty({ example: 'Município Demo' })
  name: string;

  @ApiProperty({ example: 'default-company' })
  slug: string;

  @ApiProperty({ required: false, nullable: true, example: null })
  document?: string | null;

  @ApiProperty({ example: 'ativo' })
  status: 'ativo' | 'inativo';

  @ApiProperty({ required: false, nullable: true })
  cityId?: string | null;

  @ApiProperty({ example: '2026-03-23T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-23T12:00:00.000Z' })
  updatedAt: Date;
}
