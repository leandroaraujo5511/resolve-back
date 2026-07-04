import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/entities/user.entity';
import {
  resolvePanelCompanyId,
  resolvePanelDepartmentScope,
} from '../common/tenant-scope';
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
      'Métricas, distribuições e séries temporais do tenant. Filtros opcionais: município e intervalo de datas (criação para a maioria dos totais; resoluções usam `updatedAt` onde indicado). Séries diárias: últimos 90 dias se não houver período completo no filtro. SECRETARIA não recebe métricas de feedback.',
  })
  @ApiOkResponse({ description: 'Payload consolidado de relatórios' })
  @Get('dashboard')
  async getDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    const departmentScope = resolvePanelDepartmentScope(user);
    const dash = await this.reportsService.getDashboard(
      companyId,
      query,
      departmentScope,
    );
    if (user.role === UserRole.SECRETARIA) {
      return {
        ...dash,
        overview: {
          ...dash.overview,
          feedbacksTotal: 0,
        },
        feedbacksByType: [],
        feedbacksDaily: [],
      };
    }
    return dash;
  }

  @ApiOperation({
    summary: 'Exportar chamados (até 15 mil linhas)',
    description:
      'Linhas tabulares para CSV/Excel; respeita os mesmos filtros do painel e o escopo de departamento da SECRETARIA.',
  })
  @ApiOkResponse({ description: 'Lista de linhas + limite aplicado' })
  @Get('export/tickets')
  exportTickets(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportsQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    const departmentScope = resolvePanelDepartmentScope(user);
    return this.reportsService.exportTicketsFlat(
      companyId,
      query,
      departmentScope,
    );
  }

  @ApiOperation({
    summary: 'Exportar feedbacks (até 15 mil linhas)',
    description: 'Apenas ADMIN e SUPER_ADMIN (SECRETARIA não tem acesso).',
  })
  @ApiOkResponse({ description: 'Lista de linhas + limite aplicado' })
  @ApiForbiddenResponse({ description: 'SECRETARIA sem permissão' })
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
