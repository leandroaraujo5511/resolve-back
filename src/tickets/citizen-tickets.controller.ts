import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CitizenJwtAuthGuard } from '../auth/guards/citizen-jwt-auth.guard';
import { CurrentCitizen } from '../auth/decorators/current-citizen.decorator';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import { CreateCitizenTicketDto } from './dto/create-citizen-ticket.dto';
import { CitizenTicketRespondDto } from './dto/citizen-ticket-respond.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query.dto';
import { PaginatedTicketsResponseDto, TicketResponseDto } from './dto/ticket.response.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Citizen / Tickets')
@Controller('citizen/tickets')
export class CitizenTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @ApiOperation({
    summary: 'Abre chamado (cidadão)',
    description:
      'Cidade e empresa vêm do cadastro/token. Valida departamento visível no município e bairro da cidade.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: CreateCitizenTicketDto })
  @ApiCreatedResponse({ type: TicketResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token do app inválido ou expirado' })
  @UseGuards(CitizenJwtAuthGuard)
  @Post()
  create(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Body() dto: CreateCitizenTicketDto,
  ) {
    return this.ticketsService.createFromCitizen(citizen, dto);
  }

  @ApiOperation({
    summary: 'Lista meus chamados (cidadão)',
    description:
      'Inclui chamados antigos sem citizenId vinculado, desde que o telefone coincida com o cadastro.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: PaginatedTicketsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token do app inválido ou expirado' })
  @UseGuards(CitizenJwtAuthGuard)
  @Get()
  listMine(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Query() query: ListTicketsQueryDto,
  ) {
    return this.ticketsService.findMineForCitizen(citizen, query);
  }

  @ApiOperation({
    summary: 'Detalhe do chamado (cidadão)',
    description: 'Histórico sem comentários internos.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token do app inválido ou expirado' })
  @UseGuards(CitizenJwtAuthGuard)
  @Get(':id')
  getOne(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketsService.findOneForCitizen(citizen, id);
  }

  @ApiOperation({
    summary: 'Responder ao chamado (cidadão)',
    description:
      'Disponível quando o status é AGUARDANDO_USUARIO. Aceita comentário e/ou novas evidências (keys após upload). Atualiza o status para em andamento.',
  })
  @ApiBearerAuth()
  @ApiBody({ type: CitizenTicketRespondDto })
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token do app inválido ou expirado' })
  @UseGuards(CitizenJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post(':id/respond')
  respond(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CitizenTicketRespondDto,
  ) {
    return this.ticketsService.citizenRespondWhenWaiting(citizen, id, dto);
  }
}
