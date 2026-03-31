import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolvePanelCompanyId } from '../common/tenant-scope';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token do painel inválido' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({
    summary: 'Painel analítico (agregações)',
    description:
      'Métricas, distribuições e séries temporais do tenant. Filtros opcionais: município e intervalo de datas (criação para a maioria dos totais; resoluções usam `updatedAt` onde indicado). Séries diárias: últimos 90 dias se não houver período completo no filtro.',
  })
  @ApiOkResponse({ description: 'Payload consolidado de relatórios' })
  @Get('dashboard')
  getDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    return this.reportsService.getDashboard(companyId, query);
  }

  @ApiOperation({
    summary: 'Exportar chamados (até 15 mil linhas)',
    description:
      'Linhas tabulares para CSV/Excel; respeita os mesmos filtros do painel.',
  })
  @ApiOkResponse({ description: 'Lista de linhas + limite aplicado' })
  @Get('export/tickets')
  exportTickets(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    return this.reportsService.exportTicketsFlat(companyId, query);
  }

  @ApiOperation({
    summary: 'Exportar feedbacks (até 15 mil linhas)',
  })
  @ApiOkResponse({ description: 'Lista de linhas + limite aplicado' })
  @Get('export/feedbacks')
  exportFeedbacks(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    return this.reportsService.exportFeedbacksFlat(companyId, query);
  }

  @ApiOperation({
    summary: 'Exportar cidadãos cadastrados (até 15 mil linhas)',
  })
  @ApiOkResponse({ description: 'Lista de linhas + limite aplicado' })
  @Get('export/citizens')
  exportCitizens(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    return this.reportsService.exportCitizensFlat(companyId, query);
  }
}
