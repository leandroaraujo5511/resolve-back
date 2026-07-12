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
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import {
  resolvePanelCompanyId,
  resolvePanelDataScope,
} from '../common/tenant-scope';
import { AddTicketHistoryDto } from './dto/add-ticket-history.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query.dto';
import { PatchTicketDto } from './dto/patch-ticket.dto';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import {
  TransferOptionsResponseDto,
  TransferTicketResponseDto,
} from './dto/transfer-options.response.dto';
import {
  PaginatedTicketsResponseDto,
  TicketResponseDto,
} from './dto/ticket.response.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({
    summary: 'Lista chamados da empresa do token (paginado)',
    description:
      'Filtros: status, departmentId, priority, search. SECRETARIA vinculada a um departamento só vê chamados desse departamento.',
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
    const scope = resolvePanelDataScope(user);
    return this.ticketsService.findAllPaginated(
      companyId,
      query,
      scope,
    );
  }

  @ApiOperation({
    summary: 'Adiciona comentário ao histórico do chamado',
    description:
      'Opcionalmente altera o status. `userId` do histórico vem do JWT. Respeita escopo de departamento da SECRETARIA.',
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
    const scope = resolvePanelDataScope(user);
    return this.ticketsService.addHistory(
      companyId,
      id,
      dto,
      user.sub,
      scope,
    );
  }

  @ApiOperation({
    summary: 'Opções de destino para transferência (todos os depts ativos)',
    description:
      'Inclui subdepartamentos ativos. Disponível para quem tem acesso de leitura ao ticket (inclui SECRETARIA escopada).',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: TransferOptionsResponseDto })
  @UseGuards(JwtAuthGuard)
  @Get(':id/transfer-options')
  transferOptions(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    const scope = resolvePanelDataScope(user);
    return this.ticketsService.getTransferOptions(
      companyId,
      id,
      scope,
    );
  }

  @ApiOperation({
    summary: 'Transfere o chamado para outro departamento',
    description:
      'Justificativa obrigatória (≥10). Subdepartamento obrigatório se o destino tiver subdepts ativos (RN-047a). SECRETARIA escopada pode transferir para qualquer dept ativo e perde o acesso em seguida.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: TransferTicketDto })
  @ApiOkResponse({ type: TransferTicketResponseDto })
  @ApiConflictResponse({ description: 'Concorrência (expectedUpdatedAt)' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @UseGuards(JwtAuthGuard)
  @Post(':id/transfer')
  transfer(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyIdQuery: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferTicketDto,
  ) {
    const companyId = resolvePanelCompanyId(user, companyIdQuery);
    const scope = resolvePanelDataScope(user);
    return this.ticketsService.transferTicket(
      companyId,
      id,
      dto,
      user.sub,
      scope,
    );
  }

  @ApiOperation({
    summary: 'Atualiza status e/ou prioridade do chamado',
    description:
      'Para trocar departamento, use POST /tickets/:id/transfer. SECRETARIA vinculada só altera tickets do próprio departamento.',
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
    const scope = resolvePanelDataScope(user);
    return this.ticketsService.patchTicket(
      companyId,
      id,
      dto,
      user.sub,
      scope,
    );
  }

  @ApiOperation({
    summary: 'Detalhe do chamado com histórico',
    description:
      'Somente se o ticket pertencer ao companyId do JWT e ao departamento da SECRETARIA (quando vinculada).',
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
    const scope = resolvePanelDataScope(user);
    return this.ticketsService.findOneByCompany(
      companyId,
      id,
      scope,
    );
  }
}
