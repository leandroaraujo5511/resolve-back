import { ApiProperty } from '@nestjs/swagger';

export class DepartmentResponseDto {
  @ApiProperty({ example: '8eb0871c-9f32-4cb6-bdf2-f84f4ccf6a21' })
  id: string;

  @ApiProperty({ example: 'ad8a129f-705f-488d-b708-299fbc9ac2be' })
  companyId: string;

  @ApiProperty({ example: 'Saúde' })
  name: string;

  @ApiProperty({
    example: 'Gestão de unidades de saúde, postos e atendimento ao cidadão.',
  })
  description: string;

  @ApiProperty({ example: 'ativo', enum: ['ativo', 'inativo'] })
  status: 'ativo' | 'inativo';

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'construct-outline',
    description: 'Nome do ícone Ionicons (outline) no app cidadão',
  })
  icon?: string | null;

  @ApiProperty({ example: '2026-03-23T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-23T12:00:00.000Z' })
  updatedAt: Date;
}
