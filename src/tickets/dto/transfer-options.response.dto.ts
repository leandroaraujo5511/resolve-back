import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferOptionSubDepartmentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;
}

export class TransferOptionDepartmentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: [TransferOptionSubDepartmentDto] })
  subDepartments: TransferOptionSubDepartmentDto[];
}

export class TransferOptionsResponseDto {
  @ApiProperty({ type: [TransferOptionDepartmentDto] })
  departments: TransferOptionDepartmentDto[];
}

export class TransferTicketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  cityId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  citizenId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  neighborhoodId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressComplement?: string | null;

  @ApiPropertyOptional({ nullable: true })
  latitude?: number | null;

  @ApiPropertyOptional({ nullable: true })
  longitude?: number | null;

  @ApiProperty()
  protocol: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty()
  detailedDescription: string;

  @ApiProperty()
  departmentId: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  subDepartmentId?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  priority: string;

  @ApiProperty()
  citizenName: string;

  @ApiProperty()
  citizenPhone: string;

  @ApiProperty()
  location: string;

  @ApiProperty({ type: [String] })
  attachments: string[];

  @ApiProperty({ type: 'array' })
  history: unknown[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({
    description:
      'true quando o usuário escopado perdeu acesso ao ticket após a transferência',
  })
  accessLost: boolean;
}
