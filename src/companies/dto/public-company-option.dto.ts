import { ApiProperty } from '@nestjs/swagger';

export class PublicCompanyOptionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;
}
