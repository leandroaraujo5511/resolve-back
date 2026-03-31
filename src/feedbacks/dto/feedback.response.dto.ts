import { ApiProperty } from '@nestjs/swagger';
import { FeedbackType } from '../../database/entities/feedback.enums';

export class FeedbackResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty({ description: 'Cidade à qual o feedback pertence' })
  cityId: string;

  @ApiProperty({ required: false })
  cityName?: string;

  @ApiProperty()
  citizenId: string;

  @ApiProperty()
  citizenName: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Key da foto de perfil no storage (resolver com presign-get)',
  })
  citizenAvatarKey?: string | null;

  @ApiProperty({ enum: FeedbackType })
  type: FeedbackType;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [String] })
  attachments: string[];

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedFeedbacksResponseDto {
  @ApiProperty({ type: [FeedbackResponseDto] })
  data: FeedbackResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
