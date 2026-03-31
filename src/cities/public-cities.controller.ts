import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { CityPublicResponseDto } from './dto/city-public.response.dto';
import { CityStateOptionDto } from './dto/city-state-option.dto';
import { ListPublicCitiesQueryDto } from './dto/list-public-cities.query.dto';

@ApiTags('Public')
@Controller('public/cities')
export class PublicCitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @ApiOperation({
    summary: 'Lista UFs com município ativo (cadastro app cidadão)',
    description: 'Rota pública; não requer autenticação.',
  })
  @ApiOkResponse({ type: [CityStateOptionDto] })
  @Get('states')
  listStates(): Promise<CityStateOptionDto[]> {
    return this.citiesService.findActiveStateOptions();
  }

  @ApiOperation({
    summary: 'Lista municípios ativos (cadastro no app cidadão)',
    description:
      'Rota pública; não requer autenticação. Opcional: filtro `stateUf` (2 letras).',
  })
  @ApiOkResponse({ type: [CityPublicResponseDto] })
  @Get()
  list(
    @Query() query: ListPublicCitiesQueryDto,
  ): Promise<CityPublicResponseDto[]> {
    return this.citiesService.findAllActive(query.stateUf);
  }
}
