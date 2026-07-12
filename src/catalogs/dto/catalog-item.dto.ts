import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TicketCategorySubDepartmentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;
}

export class TicketCategoryItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'construct-outline',
  })
  icon?: string | null;

  @ApiPropertyOptional({
    type: [TicketCategorySubDepartmentDto],
    description: 'Subdepartamentos ativos (opcional na abertura do chamado)',
  })
  subDepartments?: TicketCategorySubDepartmentDto[];
}

export class NeighborhoodItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}
