import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CitizenJwtAuthGuard } from '../auth/guards/citizen-jwt-auth.guard';
import { CurrentCitizen } from '../auth/decorators/current-citizen.decorator';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import { CatalogsService } from './catalogs.service';
import { NeighborhoodItemDto, TicketCategoryItemDto } from './dto/catalog-item.dto';

@ApiTags('Citizen / Catálogos')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  @ApiOperation({
    summary: 'Categorias de chamado (departamentos) para o app',
    description:
      'Filtra por empresa do token e por `visibleOnlyInCityId` quando configurado.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: TicketCategoryItemDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token do app inválido ou expirado' })
  @UseGuards(CitizenJwtAuthGuard)
  @Get('ticket-categories')
  ticketCategories(@CurrentCitizen() citizen: CitizenJwtPayload) {
    return this.catalogsService.listTicketCategories(citizen);
  }

  @ApiOperation({
    summary: 'Bairros do município do cidadão',
    description: 'Escopo pela cidade vinculada ao cadastro (JWT).',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: NeighborhoodItemDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Token do app inválido ou expirado' })
  @UseGuards(CitizenJwtAuthGuard)
  @Get('neighborhoods')
  neighborhoods(@CurrentCitizen() citizen: CitizenJwtPayload) {
    return this.catalogsService.listNeighborhoods(citizen);
  }
}
