import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CitizenJwtAuthGuard } from '../auth/guards/citizen-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentCitizen } from '../auth/decorators/current-citizen.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CitizenJwtPayload } from '../auth/interfaces/citizen-jwt.interface';
import type { JwtPayload } from '../auth/interfaces/auth-user.interface';
import { resolvePanelCompanyId } from '../common/tenant-scope';
import { CreateAppIssueDto } from './dto/create-app-issue.dto';
import {
  AppIssueResponseDto,
  PaginatedAppIssuesResponseDto,
} from './dto/app-issue.response.dto';
import { ListAppIssuesQueryDto } from './dto/list-app-issues.query.dto';
import { AppIssuesService } from './app-issues.service';

@ApiTags('Citizen / App issues')
@Controller()
export class AppIssuesController {
  constructor(private readonly appIssuesService: AppIssuesService) {}

  @ApiOperation({
    summary: 'Registrar problema no app (cidadão)',
    description:
      'Registra um relato de erro/bug no aplicativo cidadão, incluindo dados técnicos do aparelho e versão do app.',
  })
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: AppIssueResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Token do app inválido ou sessão expirada',
  })
  @UseGuards(CitizenJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('citizen/app-issues')
  createFromCitizen(
    @CurrentCitizen() citizen: CitizenJwtPayload,
    @Body() dto: CreateAppIssueDto,
  ) {
    return this.appIssuesService.createFromCitizen(citizen, dto);
  }

  @ApiOperation({
    summary: 'Listar problemas no app (painel, apenas SUPER_ADMIN)',
    description:
      'Retorna problemas relatados no aplicativo cidadão para o tenant atual. A rota deve ser protegida por permissão de SUPER_ADMIN no service.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: PaginatedAppIssuesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token do painel inválido' })
  @UseGuards(JwtAuthGuard)
  @Get('app-issues')
  listForPanel(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListAppIssuesQueryDto,
  ) {
    const companyId = resolvePanelCompanyId(user, query.companyId);
    return this.appIssuesService.findAllForCompany(user, companyId, query);
  }
}

