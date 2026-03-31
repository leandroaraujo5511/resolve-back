import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ListNeighborhoodsQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cityId: string;
}
