import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { PublicCompanyOptionDto } from './dto/public-company-option.dto';

@ApiTags('Public')
@Controller('public/companies')
export class PublicCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @ApiOperation({
    summary: 'Lista órgãos ativos (cadastro no app cidadão)',
    description: 'Rota pública; não requer autenticação.',
  })
  @ApiOkResponse({ type: [PublicCompanyOptionDto] })
  @Get()
  list(): Promise<PublicCompanyOptionDto[]> {
    return this.companiesService.findAllActivePublic();
  }
}
