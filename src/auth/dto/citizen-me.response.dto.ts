import { ApiProperty } from '@nestjs/swagger';

export class CitizenMeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  phone: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty()
  cityId: string;

  @ApiProperty({ required: false, example: 'São Paulo' })
  cityName?: string;

  @ApiProperty({
    required: false,
    description: 'Key da foto de perfil no storage (resolver com presign-get)',
  })
  avatarKey?: string | null;
}

export class CitizenLoginResponseDto {
  @ApiProperty({ type: () => CitizenMeResponseDto })
  user: CitizenMeResponseDto;

  @ApiProperty()
  token: string;
}
