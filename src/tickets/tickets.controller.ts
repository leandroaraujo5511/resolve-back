import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { resolvePanelCompanyId } from '../common/tenant-scope';
import { AddTicketHistoryDto } from './dto/add-ticket-history.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query.dto';
import { PatchTicketDto } from './dto/patch-ticket.dto';
import { PaginatedTicketsResponseDto, TicketResponseDto } from './dto/ticket.response.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({
    summary: 'Lista chamados da empresa do token (paginado)',
    description:
      'Filtros: status, departmentId, priority, search. Resposta: data, total, page, limit.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: PaginatedTicketsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @UseGuards(JwtAuthGuard)
  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListTicketsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    return this.ticketsService.findAllPaginated(companyId, query);
  }

  @ApiOperation({
    summary: 'Adiciona comentário ao histórico do chamado',
    description:
      'Opcionalmente altera o status. `userId` do histórico vem do JWT.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: AddTicketHistoryDto })
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado' })
  @ApiBadRequestResponse({ description: 'Corpo inválido' })
  @UseGuards(JwtAuthGuard)
  @Post(':id/history')
  addHistory(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTicketHistoryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.ticketsService.addHistory(companyId, id, dto, user.sub);
  }

  @ApiOperation({
    summary: 'Atualiza status e/ou departamento do chamado',
    description:
      'Gera uma entrada no histórico quando houver alteração efetiva. Departamento deve ser do mesmo tenant.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: PatchTicketDto })
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado' })
  @ApiBadRequestResponse({
    description: 'Corpo inválido ou departamento de outro tenant',
  })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  patch(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchTicketDto,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.ticketsService.patchTicket(companyId, id, dto, user.sub);
  }

  @ApiOperation({
    summary: 'Detalhe do chamado com histórico',
    description: 'Somente se o ticket pertencer ao companyId do JWT.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou expirado' })
  @ApiNotFoundResponse({ description: 'Chamado não encontrado' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    return this.ticketsService.findOneByCompany(companyId, id);
  }
}
