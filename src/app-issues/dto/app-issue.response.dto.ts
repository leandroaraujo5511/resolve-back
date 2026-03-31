import { ApiProperty } from '@nestjs/swagger';

export class AppIssueResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  cityId: string;

  @ApiProperty({ nullable: true, required: false })
  citizenId: string | null;

  @ApiProperty({ nullable: true, required: false })
  citizenName: string | null;

  @ApiProperty({ nullable: true, required: false })
  citizenPhone: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true, required: false })
  appVersion: string | null;

  @ApiProperty({ nullable: true, required: false })
  deviceInfo: string | null;

  @ApiProperty({ type: [String] })
  attachments: string[];

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedAppIssuesResponseDto {
  @ApiProperty({ type: [AppIssueResponseDto] })
  data: AppIssueResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

