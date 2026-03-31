import { ApiProperty } from '@nestjs/swagger';

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
}

export class NeighborhoodItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;
}
